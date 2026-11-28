import { Platform } from 'react-native';
import { supabase } from '../auth/client';

import { pushCopy, toKey, type PushState } from './pushRules';
export { pushCopy, toKey };
export type { PushState };
const web = () => Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof window !== 'undefined';
const ios = () => web() && /iPad|iPhone|iPod/.test(navigator.userAgent);
export const pushSupported = () => web() && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function pushState(): Promise<PushState> {
  if (!web()) return 'unsupported';
  if (!pushSupported()) return ios() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js'); const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  } catch { return 'off'; }
}
export async function enablePush(): Promise<PushState> {
  if (!pushSupported() || !supabase) return pushState();
  const key = await supabase.functions.invoke('notify-batch', { body: { action: 'key' } });
  const publicKey = (key.data as { publicKey?: string } | null)?.publicKey;
  if (key.error || !publicKey) throw new Error('Alerts are not available right now. Try again later.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  const reg = await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) });
  const json = sub.toJSON();
  const saved = await supabase.rpc('save_push_subscription', { push_endpoint: json.endpoint, push_p256dh: json.keys?.p256dh, push_auth: json.keys?.auth });
  if (saved.error) throw saved.error;
  return 'on';
}
export async function disablePush(): Promise<PushState> {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js'); const sub = await reg?.pushManager.getSubscription();
    if (sub) { await supabase?.rpc('remove_push_subscription', { push_endpoint: sub.endpoint }); await sub.unsubscribe(); }
  } catch { /* Turning off must never throw at the parent. */ }
  return pushState();
}
