/**
 * Variante web de {@link tokenStorage} : expo-secure-store n'a pas
 * d'implémentation web (ses appels lèvent une exception), donc on stocke les
 * tokens dans `localStorage`. Suffisant pour la console organisateur web ;
 * chaque appel est protégé si `localStorage` est indisponible (SSR / privé).
 */
export const tokenStorage = {
  get: async (key: string): Promise<string | null> => {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set: async (key: string, value: string): Promise<void> => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      /* localStorage indisponible : token non persisté (session en mémoire) */
    }
  },
  remove: async (key: string): Promise<void> => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* no-op */
    }
  },
};
