import * as SecureStore from 'expo-secure-store';

/**
 * Stockage des tokens d'auth. Variante native : expo-secure-store (Keychain /
 * Keystore). La variante web (`token-storage.web.ts`) utilise `localStorage`,
 * car expo-secure-store n'existe pas sur le web — Metro choisit le bon fichier
 * selon la plateforme.
 */
export const tokenStorage = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
