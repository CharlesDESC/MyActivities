import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';
import { getRealtimeClient } from '@/lib/socket';

type ConversationUnread = { unreadCount: number };

/** Total global de messages non lus, synchronisé par les événements Socket.IO. */
export function useUnreadMessageCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      const result = await api.get<{ data: ConversationUnread[] }>('/messages/conversations');
      // Un message reçu puis lu peut déclencher deux requêtes très rapprochées :
      // une réponse ancienne ne doit jamais réafficher un badge déjà acquitté.
      if (requestId === latestRequest.current) {
        setUnreadCount(result.data.reduce((total, conversation) => total + conversation.unreadCount, 0));
      }
    } catch {
      // Un badge indisponible ne doit pas empêcher la navigation principale.
    }
  }, []);

  useEffect(() => {
    // Le setState intervient après la réponse réseau, pas pendant l'effet.
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const client = getRealtimeClient();
    const offMessage = client.on('message:new', () => { void refresh(); });
    const offRead = client.on('conversation:read', () => { void refresh(); });
    const offNew = client.on('conversation:new', () => { void refresh(); });
    const offUpdated = client.on('conversation:updated', () => { void refresh(); });
    return () => { offMessage(); offRead(); offNew(); offUpdated(); };
  }, [refresh]);

  return unreadCount;
}
