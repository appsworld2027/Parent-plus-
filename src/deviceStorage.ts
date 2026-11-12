import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createSessionStorage } from './auth/storage';

// Private local app metadata uses the same chunk/commit mechanism as sessions,
// under separate keys. This is device persistence, not backend/offline sync.
export const deviceStorage = createSessionStorage(Platform.OS === 'web' ? {
  getItem: async key => globalThis.sessionStorage.getItem(key),
  setItem: async (key, value) => { globalThis.sessionStorage.setItem(key, value); },
  removeItem: async key => { globalThis.sessionStorage.removeItem(key); },
} : {
  getItem: key => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: key => SecureStore.deleteItemAsync(key),
});
