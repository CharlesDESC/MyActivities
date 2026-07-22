import type { Message, ReadReceipt } from '@/types/message';

/**
 * Événements serveur → client (le client s'y abonne via `on`).
 * Le contrat de noms est partagé avec la gateway backend (`SOCKET_EVENTS`).
 */
export type RealtimeEventMap = {
  'message:new': Message;
  'conversation:read': ReadReceipt;
  'conversation:new': { conversationId: string };
  'conversation:updated': { conversationId: string };
  'friend:request': { requestId: string };
  'friend:accepted': { userId: string };
};

export type RealtimeEventName = keyof RealtimeEventMap;

/**
 * Abstraction du transport temps réel — permet de remplacer Socket.IO par une
 * autre implémentation sans toucher aux hooks/écrans (même logique que la couche
 * cartographique abstraite du projet).
 */
export interface RealtimeClient {
  /** Ouvre (ou réutilise) la connexion. `getToken` est rappelé à chaque reconnexion. */
  connect(getToken: () => Promise<string | null>): void;
  disconnect(): void;
  isConnected(): boolean;

  /** Abonnement à un événement serveur. Retourne une fonction de désabonnement. */
  on<E extends RealtimeEventName>(
    event: E,
    handler: (payload: RealtimeEventMap[E]) => void,
  ): () => void;

  /** Envoie un message direct via la socket (rejette si hors-ligne → repli REST côté hook). */
  sendMessage(input: { recipientId: string; content: string }): Promise<Message>;

  /** Envoie un message vers une conversation existante (direct ou groupe). */
  sendGroupMessage(input: { conversationId: string; content: string }): Promise<Message>;

  /** Marque une conversation comme lue via la socket. */
  markRead(conversationId: string): Promise<void>;
}
