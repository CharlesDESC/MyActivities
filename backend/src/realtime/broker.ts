import { EventEmitter } from 'node:events';
import Redis from 'ioredis';
import { config } from '../config';
import { REALTIME_CHANNEL, RealtimeEvent } from './events';

export type RealtimeHandler = (event: RealtimeEvent) => void;

/**
 * Broker Publish/Subscribe (pattern **Observer**) : découple la production
 * d'un événement temps réel de sa distribution aux sockets.
 */
export interface MessageBroker {
  publish(event: RealtimeEvent): Promise<void>;
  subscribe(handler: RealtimeHandler): void;
  close(): Promise<void>;
}

const LOCAL_EVENT = 'realtime';

function safeParse(raw: string): RealtimeEvent | null {
  try {
    return JSON.parse(raw) as RealtimeEvent;
  } catch {
    return null;
  }
}

/**
 * Implémentation par-dessus Redis Pub/Sub.
 * - Redis disponible : fan-out inter-instances (montée en charge horizontale).
 * - Redis absent : repli transparent sur un EventEmitter in-process (mono-instance),
 *   même logique « best-effort » que le cache d'activités du projet.
 *
 * Les deux chemins convergent vers un unique EventEmitter local, ce qui évite
 * toute double livraison : soit `publish` réussit et l'événement revient par le
 * canal Redis, soit il échoue et il est émis localement — jamais les deux.
 */
export class RedisBroker implements MessageBroker {
  private readonly local = new EventEmitter();

  constructor(
    private readonly pub: Redis,
    private readonly sub: Redis,
  ) {
    // Avec `lazyConnect`, SUBSCRIBE ne doit être envoyé qu'une fois la connexion
    // prête. Sinon, `enableOfflineQueue: false` abandonne silencieusement la
    // commande initiale et aucun événement n'est ensuite rediffusé.
    this.sub.on('ready', () => {
      void this.sub.subscribe(REALTIME_CHANNEL).catch(() => {
        /* Redis indisponible : on fonctionnera en mode in-process. */
      });
    });
    this.sub.on('message', (_channel: string, raw: string) => {
      const event = safeParse(raw);
      if (event) this.local.emit(LOCAL_EVENT, event);
    });

    // Connexions explicites : le publisher et le subscriber restent séparés,
    // comme l'exige Redis Pub/Sub. Ioredis gère ensuite les reconnexions.
    void this.pub.connect().catch(() => { /* repli local dans publish */ });
    void this.sub.connect().catch(() => { /* repli local dans publish */ });
  }

  async publish(event: RealtimeEvent): Promise<void> {
    if (this.pub.status !== 'ready') {
      this.local.emit(LOCAL_EVENT, event);
      return;
    }
    try {
      await this.pub.publish(REALTIME_CHANNEL, JSON.stringify(event));
    } catch {
      // Redis KO → livraison locale directe (mono-instance)
      this.local.emit(LOCAL_EVENT, event);
    }
  }

  subscribe(handler: RealtimeHandler): void {
    this.local.on(LOCAL_EVENT, handler);
  }

  async close(): Promise<void> {
    await Promise.allSettled([this.pub.quit(), this.sub.quit()]);
  }
}

/** Construit le broker de production à partir de la config (2 connexions dédiées). */
export function createBroker(): MessageBroker {
  const options = {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  } as const;

  const pub = new Redis(config.redisUrl, options);
  const sub = new Redis(config.redisUrl, options);

  const silence = (err: Error) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[Broker] Redis error:', err.message);
    }
  };
  pub.on('error', silence);
  sub.on('error', silence);

  return new RedisBroker(pub, sub);
}
