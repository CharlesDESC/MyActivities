import { useCallback, useEffect, useState } from 'react';

import { api, getApiErrorMessage } from '@/lib/api';
import { getRealtimeClient } from '@/lib/socket';
import type { Friend, FriendRequest } from '@/types/friend';

/**
 * Gère les amis et les demandes en attente. Rafraîchit automatiquement à la
 * réception d'un événement temps réel `friend:request` / `friend:accepted`.
 */
export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [f, r] = await Promise.all([
        api.get<{ data: Friend[] }>('/friends'),
        api.get<{ data: FriendRequest[] }>('/friends/requests'),
      ]);
      setFriends(f.data);
      setRequests(r.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erreur de chargement'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const client = getRealtimeClient();
    const offReq = client.on('friend:request', () => { refresh(); });
    const offAcc = client.on('friend:accepted', () => { refresh(); });
    return () => { offReq(); offAcc(); };
  }, [refresh]);

  const sendRequest = useCallback(async (addresseeId: string) => {
    setError(null);
    try {
      await api.post('/friends/requests', { addresseeId });
      await refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, "Impossible d'envoyer la demande"));
    }
  }, [refresh]);

  const accept = useCallback(async (requestId: string) => {
    setError(null);
    try {
      await api.post(`/friends/requests/${requestId}/accept`);
      await refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, "Impossible d'accepter la demande"));
    }
  }, [refresh]);

  const decline = useCallback(async (requestId: string) => {
    setError(null);
    try {
      await api.post(`/friends/requests/${requestId}/decline`);
      await refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Impossible de refuser la demande'));
    }
  }, [refresh]);

  const remove = useCallback(async (userId: string) => {
    setError(null);
    try {
      await api.delete(`/friends/${userId}`);
      await refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, "Impossible de retirer l'ami"));
    }
  }, [refresh]);

  const incoming = requests.filter((r) => r.direction === 'incoming');
  const outgoing = requests.filter((r) => r.direction === 'outgoing');

  return { friends, requests, incoming, outgoing, isLoading, error, refresh, sendRequest, accept, decline, remove };
}
