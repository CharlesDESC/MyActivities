import { useEffect } from 'react';

import { useAuth } from '@/context/auth';
import { STORAGE_KEYS } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';
import { getRealtimeClient } from '@/lib/socket';

/**
 * Gère le cycle de vie de la connexion temps réel selon l'état d'authentification :
 * connecte quand un utilisateur est connecté, déconnecte au logout.
 */
export function useRealtime() {
  const { user } = useAuth();
  const client = getRealtimeClient();

  useEffect(() => {
    if (user) {
      client.connect(() => tokenStorage.get(STORAGE_KEYS.ACCESS_TOKEN));
    } else {
      client.disconnect();
    }
  }, [user, client]);

  return client;
}
