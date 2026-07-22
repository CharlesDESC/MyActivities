/**
 * Contrat temps réel partagé entre le broker Pub/Sub, la gateway Socket.IO
 * et les clients. Centralise les noms d'événements et le canal Redis.
 */

/** Canal Redis Pub/Sub pour le fan-out temps réel inter-instances (scaling Render). */
export const REALTIME_CHANNEL = 'messaging:events';

/** Noms d'événements Socket.IO (contrat client ↔ serveur). */
export const SOCKET_EVENTS = {
  MESSAGE_SEND: 'message:send',                 // client → serveur : envoyer un message direct
  MESSAGE_SEND_GROUP: 'message:send-group',     // client → serveur : envoyer vers une conversation existante
  MESSAGE_NEW: 'message:new',                   // serveur → client : nouveau message reçu
  MESSAGE_READ: 'message:read',                 // client → serveur : marquer une conversation lue
  CONVERSATION_READ: 'conversation:read',       // serveur → client : l'autre a lu vos messages
  CONVERSATION_NEW: 'conversation:new',         // serveur → client : ajouté à une (nouvelle) conversation
  CONVERSATION_UPDATED: 'conversation:updated', // serveur → client : conversation modifiée (membre, titre…)
  FRIEND_REQUEST: 'friend:request',             // serveur → client : demande d'ami reçue
  FRIEND_ACCEPTED: 'friend:accepted',           // serveur → client : demande d'ami acceptée
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Room Socket.IO personnelle d'un utilisateur (gère le multi-appareils). */
export function roomForUser(userId: string): string {
  return `user:${userId}`;
}

/** Événement diffusé par le broker vers les rooms des destinataires. */
export interface RealtimeEvent {
  type: SocketEvent;
  recipients: string[];
  payload: unknown;
}
