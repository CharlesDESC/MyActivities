import { Server as HttpServer } from 'node:http';
import { createBroker, MessageBroker } from './broker';
import { createMessagingGateway } from './gateway';
import { RealtimeEvent } from './events';

let broker: MessageBroker | null = null;

/** Initialise le broker Pub/Sub + la gateway Socket.IO sur le serveur HTTP. */
export function initRealtime(httpServer: HttpServer): void {
  broker = createBroker();
  createMessagingGateway(httpServer, broker);
}

/**
 * Publie un événement temps réel si la couche realtime est initialisée.
 * No-op sinon (ex. en test, ou API démarrée sans serveur socket) — permet aux
 * routes REST de déclencher le fan-out sans dépendre du bootstrap.
 */
export async function publishRealtime(event: RealtimeEvent): Promise<void> {
  if (broker) await broker.publish(event);
}

export * from './events';
export type { MessageBroker } from './broker';
