jest.mock('socket.io-client', () => {
  const socket = {
    connected: false,
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  return { io: jest.fn(() => socket), __socket: socket };
});

import { io } from 'socket.io-client';
import { SocketIORealtimeClient } from '@/lib/socket/socketio';
import type { Message } from '@/types/message';

const mod = jest.requireMock('socket.io-client') as any;
const socket = mod.__socket;
const ioMock = io as jest.Mock;

const message: Message = {
  id: 'msg-1', conversationId: 'conv-1', content: 'Salut', createdAt: '2026-07-21T10:00:00.000Z',
  readAt: null, sender: { id: 'user-1', pseudo: 'Alice', avatarUrl: null },
};

beforeEach(() => {
  socket.connected = false;
  socket.on.mockReset();
  socket.emit.mockReset();
  socket.disconnect.mockReset();
  ioMock.mockClear();
});

function captured(event: string): (payload: unknown) => void {
  const call = (socket.on as jest.Mock).mock.calls.find((c: any[]) => c[0] === event);
  return call[1];
}

describe('SocketIORealtimeClient — connexion', () => {
  it('ouvre une seule connexion (idempotent) et relaie les événements serveur', () => {
    const client = new SocketIORealtimeClient();
    client.connect(async () => 'token-123');
    client.connect(async () => 'token-123');

    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(socket.on).toHaveBeenCalledWith('message:new', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('conversation:read', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('conversation:new', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('conversation:updated', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('friend:request', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('friend:accepted', expect.any(Function));
  });

  it('relaie un événement conversation:new vers les abonnés', () => {
    const client = new SocketIORealtimeClient();
    client.connect(async () => 't');
    const handler = jest.fn();
    client.on('conversation:new', handler);
    captured('conversation:new')({ conversationId: 'grp-1' });
    expect(handler).toHaveBeenCalledWith({ conversationId: 'grp-1' });
  });

  it('fournit le token courant au handshake', async () => {
    const getToken = jest.fn(async () => 'token-xyz');
    const client = new SocketIORealtimeClient();
    client.connect(getToken);

    const authFn = ioMock.mock.calls[0][1].auth as (cb: (d: { token: string }) => void) => void;
    const cb = jest.fn();
    authFn(cb);
    await Promise.resolve();
    expect(getToken).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ token: 'token-xyz' });
  });

  it('envoie une chaîne vide si aucun token', async () => {
    const client = new SocketIORealtimeClient();
    client.connect(async () => null);
    const authFn = ioMock.mock.calls[0][1].auth as (cb: (d: { token: string }) => void) => void;
    const cb = jest.fn();
    authFn(cb);
    await Promise.resolve();
    expect(cb).toHaveBeenCalledWith({ token: '' });
  });
});

describe('SocketIORealtimeClient — abonnements', () => {
  it('notifie les abonnés puis les retire au désabonnement', () => {
    const client = new SocketIORealtimeClient();
    client.connect(async () => 't');
    const handler = jest.fn();
    const off = client.on('message:new', handler);

    captured('message:new')(message);
    expect(handler).toHaveBeenCalledWith(message);

    off();
    captured('message:new')(message);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('SocketIORealtimeClient — envoi', () => {
  it('rejette quand la socket est hors-ligne', async () => {
    const client = new SocketIORealtimeClient();
    client.connect(async () => 't');
    socket.connected = false;
    await expect(client.sendMessage({ recipientId: 'r', content: 'hi' })).rejects.toThrow('SOCKET_OFFLINE');
  });

  it('résout avec le message renvoyé par l’ack', async () => {
    socket.emit.mockImplementation((_ev: string, _p: unknown, ack: (a: unknown) => void) => ack({ ok: true, data: message }));
    const client = new SocketIORealtimeClient();
    client.connect(async () => 't');
    socket.connected = true;

    await expect(client.sendMessage({ recipientId: 'r', content: 'hi' })).resolves.toEqual(message);
    expect(socket.emit).toHaveBeenCalledWith('message:send', { recipientId: 'r', content: 'hi' }, expect.any(Function));
  });

  it('rejette avec le message d’erreur de l’ack', async () => {
    socket.emit.mockImplementation((_ev: string, _p: unknown, ack: (a: unknown) => void) => ack({ ok: false, error: { message: 'Destinataire introuvable.' } }));
    const client = new SocketIORealtimeClient();
    client.connect(async () => 't');
    socket.connected = true;

    await expect(client.sendMessage({ recipientId: 'r', content: 'hi' })).rejects.toThrow('Destinataire introuvable.');
  });

  it('sendGroupMessage émet message:send-group et résout avec l’ack', async () => {
    socket.emit.mockImplementation((_ev: string, _p: unknown, ack: (a: unknown) => void) => ack({ ok: true, data: message }));
    const client = new SocketIORealtimeClient();
    client.connect(async () => 't');
    socket.connected = true;

    await expect(client.sendGroupMessage({ conversationId: 'grp-1', content: 'hi' })).resolves.toEqual(message);
    expect(socket.emit).toHaveBeenCalledWith('message:send-group', { conversationId: 'grp-1', content: 'hi' }, expect.any(Function));
  });

  it('sendGroupMessage rejette hors-ligne', async () => {
    const client = new SocketIORealtimeClient();
    client.connect(async () => 't');
    socket.connected = false;
    await expect(client.sendGroupMessage({ conversationId: 'grp-1', content: 'hi' })).rejects.toThrow('SOCKET_OFFLINE');
  });
});

describe('SocketIORealtimeClient — lecture & déconnexion', () => {
  it('marque une conversation lue via la socket', async () => {
    socket.emit.mockImplementation((_ev: string, _p: unknown, ack: (a: unknown) => void) => ack({ ok: true }));
    const client = new SocketIORealtimeClient();
    client.connect(async () => 't');
    socket.connected = true;

    await expect(client.markRead('conv-1')).resolves.toBeUndefined();
    expect(socket.emit).toHaveBeenCalledWith('message:read', { conversationId: 'conv-1' }, expect.any(Function));
  });

  it('rejette markRead hors-ligne', async () => {
    const client = new SocketIORealtimeClient();
    client.connect(async () => 't');
    socket.connected = false;
    await expect(client.markRead('conv-1')).rejects.toThrow('SOCKET_OFFLINE');
  });

  it('ferme la connexion et repasse hors-ligne', () => {
    const client = new SocketIORealtimeClient();
    client.connect(async () => 't');
    socket.connected = true;
    expect(client.isConnected()).toBe(true);

    client.disconnect();
    expect(socket.disconnect).toHaveBeenCalled();
    expect(client.isConnected()).toBe(false);
  });
});
