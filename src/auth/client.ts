import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { appConfig } from '../config';
import { createSessionStorage } from './storage';

const storage = createSessionStorage(Platform.OS === 'web' ? {
  getItem: async key => globalThis.sessionStorage.getItem(key),
  setItem: async (key, value) => { globalThis.sessionStorage.setItem(key, value); },
  removeItem: async key => { globalThis.sessionStorage.removeItem(key); },
} : {
  getItem: key => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: key => SecureStore.deleteItemAsync(key),
});

export const supabase = appConfig.configured ? createClient(appConfig.url!, appConfig.publishableKey!, {
  auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce', lock: processLock },
  global: {
    fetch: async (input, init) => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (init?.signal?.aborted) controller.abort();
      init?.signal?.addEventListener('abort', abort);
      const timer = setTimeout(abort, 15_000);
      try { return await fetch(input, { ...init, signal: controller.signal }); }
      finally { clearTimeout(timer); init?.signal?.removeEventListener('abort', abort); }
    },
  },
}) : null;

export function authRedirect(recovery = false) {
  const root = Platform.OS === 'web' ? `${globalThis.location.origin}/auth` : 'parentplus-coach://auth';
  return `${root}/${recovery ? 'recovery' : 'callback'}`;
}
