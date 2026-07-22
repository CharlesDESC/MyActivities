import { io, Socket } from 'socket.io-client';

import type { Message } from '@/types/message';
import type { RealtimeClient, RealtimeEventName, RealtimeEventMap } from './types';

// La socket vise l'origine du serveur (sans le préfixe REST /v1).
const SOCKET_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace(/\/v1\/?$/, '');

type Handler = (payload: unknown) => void;

type SendAck = { ok: boolean; data?: Message; error?: { message: string } };
type SimpleAck = { ok: boolean; error?: { message: string } };

/** Implémentation Socket.IO de la couche temps réel abstraite. */
export class SocketIORealtimeClient implements RealtimeClient {
  private socket: Socket | null = null;
  private readonly handlers = new Map<string, Set<Handler>>();

  connect(getToken: () => Promise<string | null>): void {
    if (this.socket) return; // idempotent : une seule connexion partagée

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      // Rappelé à chaque (re)connexion → toujours le token courant (rafraîchi par le REST).
      auth: (cb: (data: { token: string }) => void) => {
        getToken().then((token) => cb({ token: token ?? '' }));
      },
    });

    // Relaie les événements serveur vers le registre d'abonnés local.
    this.socket.on('message:new', (p) => this.emit('message:new', p));
    this.socket.on('conversation:read', (p) => this.emit('conversation:read', p));
    this.socket.on('conversation:new', (p) => this.emit('conversation:new', p));
    this.socket.on('conversation:updated', (p) => this.emit('conversation:updated', p));
    this.socket.on('friend:request', (p) => this.emit('friend:request', p));
    this.socket.on('friend:accepted', (p) => this.emit('friend:accepted', p));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.handlers.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  on<E extends RealtimeEventName>(
    event: E,
    handler: (payload: RealtimeEventMap[E]) => void,
  ): () => void {
    const set = this.handlers.get(event) ?? new Set<Handler>();
    set.add(handler as Handler);
    this.handlers.set(event, set);
    return () => {
      this.handlers.get(event)?.delete(handler as Handler);
    };
  }

  private emit(event: string, payload: unknown): void {
    this.handlers.get(event)?.forEach((h) => h(payload));
  }

  sendMessage(input: { recipientId: string; content: string }): Promise<Message> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('SOCKET_OFFLINE'));
      this.socket.emit('message:send', input, (ack: SendAck) => {
        if (ack?.ok && ack.data) resolve(ack.data);
        else reject(new Error(ack?.error?.message ?? 'Envoi impossible.'));
      });
    });
  }

  sendGroupMessage(input: { conversationId: string; content: string }): Promise<Message> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('SOCKET_OFFLINE'));
      this.socket.emit('message:send-group', input, (ack: SendAck) => {
        if (ack?.ok && ack.data) resolve(ack.data);
        else reject(new Error(ack?.error?.message ?? 'Envoi impossible.'));
      });
    });
  }

  markRead(conversationId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('SOCKET_OFFLINE'));
      this.socket.emit('message:read', { conversationId }, (ack: SimpleAck) => {
        if (ack?.ok) resolve();
        else reject(new Error(ack?.error?.message ?? 'Erreur.'));
      });
    });
  }
}
