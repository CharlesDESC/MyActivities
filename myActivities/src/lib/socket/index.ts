import type { RealtimeClient } from './types';
import { SocketIORealtimeClient } from './socketio';

let client: RealtimeClient | null = null;

/** Renvoie le client temps réel partagé (singleton). */
export function getRealtimeClient(): RealtimeClient {
  if (!client) client = new SocketIORealtimeClient();
  return client;
}

/** Réinitialise le singleton — usage tests uniquement. */
export function __resetRealtimeClient(): void {
  client = null;
}

export type { RealtimeClient, RealtimeEventName, RealtimeEventMap } from './types';
