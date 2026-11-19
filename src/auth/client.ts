import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { appConfig } from '../config';
import { createSessionStorage, createWebAuthStorage } from './storage';

// Native auth stays in SecureStore. Web sessions stay per-tab; only expiring
// email-link proofs are shared within this browser origin for new-tab callbacks.
const storageKey=appConfig.url?`sb-${new URL(appConfig.url).hostname.split('.')[0]}-auth-token`:'sb-unconfigured-auth-token';
// auth-js broadcasts full sessions on its storageKey channel. A per-document
// channel prevents another tab's account/recovery state replacing this tab's UI.
// The adapter maps persisted keys back to the stable project key, so reloads and
// already-signed-in tabs retain their own sessions. This ID is not a credential.
const clientStorageKey=Platform.OS==='web'?`${storageKey}-context-${globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`}`:storageKey;
const storage = Platform.OS === 'web' ? createWebAuthStorage({
  getItem: async key => globalThis.sessionStorage.getItem(key),
  setItem: async (key, value) => { globalThis.sessionStorage.setItem(key, value); },
  removeItem: async key => { globalThis.sessionStorage.removeItem(key); },
}, {
  getItem: async key => globalThis.localStorage.getItem(key),
  setItem: async(key,value) => {globalThis.localStorage.setItem(key,value);},
  removeItem: async key => {globalThis.localStorage.removeItem(key);},
},clientStorageKey,{projectStorageKey:storageKey}) : createSessionStorage({
  getItem: key => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: key => SecureStore.deleteItemAsync(key),
});

// Feature-specific recoverable operations share the app's platform-protected
// storage implementation under their own namespaced keys.
export const appSessionStorage = storage;

// All feature services share this client and auth lock. Public config grants no
// owner privileges: Supabase verifies the session and database access policies.
export const supabase = appConfig.configured ? createClient(appConfig.url!, appConfig.publishableKey!, {
  auth: { storage, storageKey:clientStorageKey, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce', lock: processLock },
  global: {
    fetch: async (input, init) => {
      // Bound requests so a disconnected screen can recover. Also respect caller aborts.
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (init?.signal?.aborted) controller.abort();
      init?.signal?.addEventListener('abort', abort);
      const requestURL = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const timer = setTimeout(abort, requestURL.endsWith('/functions/v1/scan-roster') ? 65_000 : requestURL.includes('/storage/v1/object/parentplus-class-media/') ? 90_000 : 15_000);
      try { return await fetch(input, { ...init, signal: controller.signal }); }
      finally { clearTimeout(timer); init?.signal?.removeEventListener('abort', abort); }
    },
  },
}) : null;

export function authRedirect(recovery = false, module?: 'coach' | 'parent') {
  let parentReturn=module==='parent';
  if (Platform.OS === 'web') {
    parentReturn=parentReturn||(!module&&globalThis.location.pathname.startsWith('/parent'));
    try { if (parentReturn) globalThis.sessionStorage.setItem('parentplus.auth.return-module','parent'); else globalThis.sessionStorage.removeItem('parentplus.auth.return-module'); } catch { /* Login remains available if return intent cannot persist. */ }
  }
  const root = Platform.OS === 'web' ? `${globalThis.location.origin}/auth` : 'parentplus-coach://auth';
  // Module is navigation intent only. Authentication still requires the verified
  // email code; a new email tab cannot read the requesting tab's session intent.
  return `${root}/${recovery ? 'recovery' : 'callback'}${Platform.OS==='web'?`?module=${parentReturn?'parent':'coach'}`:''}`;
}
