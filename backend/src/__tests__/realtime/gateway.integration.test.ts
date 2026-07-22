jest.mock('../../services/message.service');

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server as IOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { createMessagingGateway } from '../../realtime/gateway';
import { MessageBroker, RealtimeHandler } from '../../realtime/broker';
import { RealtimeEvent, SOCKET_EVENTS } from '../../realtime/events';
import * as messageService from '../../services/message.service';
import { generateAccessToken } from '../../lib/tokens';

const mock = messageService as jest.Mocked<typeof messageService>;

// Broker in-memory : reboucle immédiatement `publish` vers l'abonné (la gateway),
// ce qui permet de tester la boucle socket complète sans Redis.
class MemoryBroker implements MessageBroker {
  private handler: RealtimeHandler | null = null;
  publish(event: RealtimeEvent): Promise<void> {
    this.handler?.(event);
    return Promise.resolve();
  }
  subscribe(handler: RealtimeHandler): void {
    this.handler = handler;
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}

let server: http.Server;
let io: IOServer;
let port: number;

const RECIPIENT = '11111111-1111-1111-1111-111111111111';

beforeAll((done) => {
  server = http.createServer();
  io = createMessagingGateway(server, new MemoryBroker());
  server.listen(0, () => {
    port = (server.address() as AddressInfo).port;
    done();
  });
});

afterAll(async () => {
  io.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => jest.clearAllMocks());

function connect(token: string | undefined): ClientSocket {
  return ioClient(`http://localhost:${port}`, {
    auth: token ? { token } : {},
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
}

describe('Socket.IO gateway (intégration)', () => {
  it('rejette une connexion sans token JWT valide', (done) => {
    const client = connect('token-invalide');
    client.on('connect_error', (err) => {
      expect(err.message).toBe('Token JWT manquant ou invalide.');
      client.close();
      done();
    });
  });

  it('accepte un client authentifié, envoie un message et le rediffuse en temps réel', (done) => {
    const message = {
      id: 'msg-1', conversationId: 'conv-1', content: 'Bonjour', createdAt: new Date(), readAt: null,
      sender: { id: 'user-1', pseudo: 'Alice', avatarUrl: null },
    };
    mock.sendMessage.mockResolvedValue({ message, recipientIds: ['user-1', RECIPIENT] } as any);

    const token = generateAccessToken('user-1', 'member');
    const client = connect(token);

    // L'expéditeur fait partie des destinataires → il doit recevoir message:new
    client.on(SOCKET_EVENTS.MESSAGE_NEW, (received: { id: string }) => {
      expect(received.id).toBe('msg-1');
      client.close();
      done();
    });

    client.on('connect', () => {
      client.emit(SOCKET_EVENTS.MESSAGE_SEND, { recipientId: RECIPIENT, content: 'Bonjour' }, (ack: any) => {
        expect(ack.ok).toBe(true);
        expect(mock.sendMessage).toHaveBeenCalledWith('user-1', 'member', RECIPIENT, 'Bonjour');
      });
    });
  });
});
