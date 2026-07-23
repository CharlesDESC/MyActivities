import { useCallback, useEffect, useState } from 'react';

import { api, getApiErrorMessage } from '@/lib/api';
import { getRealtimeClient } from '@/lib/socket';
import type { Conversation } from '@/types/message';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.get<{ data: Conversation[] }>('/messages/conversations');
      setConversations(result.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erreur de chargement'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Supprime (masque) une conversation pour l'utilisateur courant. Retrait
  // optimiste de la liste ; en cas d'échec on recharge pour rétablir l'état réel.
  const remove = useCallback(async (conversationId: string) => {
    const previous = conversations;
    setConversations((list) => list.filter((c) => c.id !== conversationId));
    try {
      await api.delete(`/messages/conversations/${conversationId}`);
    } catch (err) {
      setConversations(previous);
      setError(getApiErrorMessage(err, 'Suppression impossible'));
      throw err;
    }
  }, [conversations]);

  // Temps réel : tout changement (message, lecture, groupe) rafraîchit la liste.
  useEffect(() => {
    const client = getRealtimeClient();
    const offNew = client.on('message:new', () => { fetchConversations(); });
    const offRead = client.on('conversation:read', () => { fetchConversations(); });
    const offConvNew = client.on('conversation:new', () => { fetchConversations(); });
    const offConvUpd = client.on('conversation:updated', () => { fetchConversations(); });
    return () => { offNew(); offRead(); offConvNew(); offConvUpd(); };
  }, [fetchConversations]);

  return { conversations, isLoading, error, refresh: fetchConversations, remove };
}
