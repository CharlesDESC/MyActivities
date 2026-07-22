import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getRealtimeClient } from '@/lib/socket';
import type { Message } from '@/types/message';

type UseChatParams = { conversationId?: string; recipientId?: string };

/** Fusionne des messages sans doublon (par id), triés par ordre chronologique. */
function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Gère une conversation : historique (REST), réception temps réel et envoi
 * (socket, avec repli REST). Supporte une conversation encore inexistante :
 * l'`id` est déduit du premier message envoyé.
 */
export function useChat({ conversationId: initialId, recipientId }: UseChatParams) {
  const [conversationId, setConversationId] = useState<string | undefined>(initialId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!!initialId);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Id courant lisible dans les listeners sans re-souscription.
  const convoRef = useRef<string | undefined>(initialId);
  useEffect(() => { convoRef.current = conversationId; }, [conversationId]);

  useEffect(() => {
    // `isLoading` démarre déjà à `!!initialId` : rien à charger sans conversation existante.
    if (!initialId) return;
    let active = true;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.get<{ data: Message[] }>(`/messages/conversations/${initialId}`);
        if (active) setMessages(mergeMessages([], result.data));
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Erreur de chargement');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [initialId]);

  // Temps réel : messages entrants de CETTE conversation.
  useEffect(() => {
    const client = getRealtimeClient();
    return client.on('message:new', (msg) => {
      if (msg.conversationId === convoRef.current) {
        setMessages((prev) => mergeMessages(prev, [msg]));
      }
    });
  }, []);

  const send = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return undefined;
    setIsSending(true);
    setError(null);
    const client = getRealtimeClient();
    try {
      let message: Message;
      if (recipientId) {
        // Direct (nouveau ou existant) : identifié par le destinataire.
        try {
          message = await client.sendMessage({ recipientId, content: trimmed });
        } catch {
          message = await api.post<Message>('/messages', { recipientId, content: trimmed });
        }
      } else if (convoRef.current) {
        // Groupe / conversation existante : identifiée par son id.
        const id = convoRef.current;
        try {
          message = await client.sendGroupMessage({ conversationId: id, content: trimmed });
        } catch {
          message = await api.post<Message>(`/messages/conversations/${id}`, { content: trimmed });
        }
      } else {
        throw new ApiError('Aucun destinataire.', 400);
      }
      if (!convoRef.current) {
        convoRef.current = message.conversationId;
        setConversationId(message.conversationId);
      }
      setMessages((prev) => mergeMessages(prev, [message]));
      return message;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible');
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [recipientId]);

  const markRead = useCallback(async () => {
    const id = convoRef.current;
    if (!id) return;
    const client = getRealtimeClient();
    try {
      await client.markRead(id);
    } catch {
      try { await api.post(`/messages/conversations/${id}/read`); } catch { /* best-effort */ }
    }
  }, []);

  return { messages, conversationId, isLoading, isSending, error, send, markRead };
}
