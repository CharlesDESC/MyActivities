import { useCallback, useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
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
      setError(err instanceof ApiError ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Temps réel : tout changement (message, lecture, groupe) rafraîchit la liste.
  useEffect(() => {
    const client = getRealtimeClient();
    const offNew = client.on('message:new', () => { fetchConversations(); });
    const offRead = client.on('conversation:read', () => { fetchConversations(); });
    const offConvNew = client.on('conversation:new', () => { fetchConversations(); });
    const offConvUpd = client.on('conversation:updated', () => { fetchConversations(); });
    return () => { offNew(); offRead(); offConvNew(); offConvUpd(); };
  }, [fetchConversations]);

  return { conversations, isLoading, error, refresh: fetchConversations };
}
