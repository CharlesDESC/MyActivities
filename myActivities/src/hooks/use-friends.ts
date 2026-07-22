import { useCallback, useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
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
      setError(err instanceof ApiError ? err.message : 'Erreur de chargement');
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
    await api.post('/friends/requests', { addresseeId });
    await refresh();
  }, [refresh]);

  const accept = useCallback(async (requestId: string) => {
    await api.post(`/friends/requests/${requestId}/accept`);
    await refresh();
  }, [refresh]);

  const decline = useCallback(async (requestId: string) => {
    await api.post(`/friends/requests/${requestId}/decline`);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (userId: string) => {
    await api.delete(`/friends/${userId}`);
    await refresh();
  }, [refresh]);

  const incoming = requests.filter((r) => r.direction === 'incoming');
  const outgoing = requests.filter((r) => r.direction === 'outgoing');

  return { friends, requests, incoming, outgoing, isLoading, error, refresh, sendRequest, accept, decline, remove };
}
