import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { appConfig } from '../config';
import { createSessionStorage } from './storage';

// Native tokens/verifiers live in SecureStore; web uses per-tab sessionStorage.
// The adapter chunks/serializes writes and is not an offline roster cache.
const storage = createSessionStorage(Platform.OS === 'web' ? {
  getItem: async key => globalThis.sessionStorage.getItem(key),
  setItem: async (key, value) => { globalThis.sessionStorage.setItem(key, value); },
  removeItem: async key => { globalThis.sessionStorage.removeItem(key); },
} : {
  getItem: key => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: key => SecureStore.deleteItemAsync(key),
});

// All feature services share this client and auth lock. Public config grants no
// owner privileges: Supabase verifies the session and database access policies.
export const supabase = appConfig.configured ? createClient(appConfig.url!, appConfig.publishableKey!, {
  auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce', lock: processLock },
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
  if (Platform.OS === 'web') {
    try { if (module === 'parent' || (!module && globalThis.location.pathname.startsWith('/parent'))) globalThis.sessionStorage.setItem('parentplus.auth.return-module','parent'); else globalThis.sessionStorage.removeItem('parentplus.auth.return-module'); } catch { /* Login remains available if return intent cannot persist. */ }
  }
  const root = Platform.OS === 'web' ? `${globalThis.location.origin}/auth` : 'parentplus-coach://auth';
  return `${root}/${recovery ? 'recovery' : 'callback'}`;
}
