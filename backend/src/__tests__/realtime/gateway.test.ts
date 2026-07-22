jest.mock('../../services/message.service');

import {
  authenticateHandshake,
  toAckError,
  handleSend,
  handleSendGroup,
  handleRead,
  dispatchToRooms,
  registerSocket,
} from '../../realtime/gateway';
import * as messageService from '../../services/message.service';
import { generateAccessToken } from '../../lib/tokens';
import { AppError } from '../../middleware/errorHandler';
import { SOCKET_EVENTS, roomForUser } from '../../realtime/events';
import { JwtPayload } from '../../types';

const mock = messageService as jest.Mocked<typeof messageService>;
const user: JwtPayload = { sub: 'user-1', role: 'member' };
const RECIPIENT = '11111111-1111-1111-1111-111111111111';
const CONV = '22222222-2222-2222-2222-222222222222';

beforeEach(() => jest.clearAllMocks());

describe('authenticateHandshake', () => {
  it('returns the payload for a valid token', () => {
    const token = generateAccessToken('user-1', 'member');
    expect(authenticateHandshake(token)).toMatchObject({ sub: 'user-1', role: 'member' });
  });

  it('returns null for an invalid token', () => {
    expect(authenticateHandshake('garbage')).toBeNull();
  });

  it('returns null for a non-string or empty token', () => {
    expect(authenticateHandshake(undefined)).toBeNull();
    expect(authenticateHandshake(42)).toBeNull();
    expect(authenticateHandshake('')).toBeNull();
  });
});

describe('toAckError', () => {
  it('maps an AppError to its code and message', () => {
    expect(toAckError(new AppError(404, 'Introuvable.', 'NOT_FOUND'))).toEqual({
      ok: false, error: { code: 'NOT_FOUND', message: 'Introuvable.' },
    });
  });

  it('maps a generic error to INTERNAL_ERROR', () => {
    expect(toAckError(new Error('boom'))).toMatchObject({ ok: false, error: { code: 'INTERNAL_ERROR' } });
  });
});

describe('handleSend', () => {
  const broker = { publish: jest.fn().mockResolvedValue(undefined) } as any;

  it('persists the message, publishes it and acknowledges success', async () => {
    const message = { id: 'msg-1', conversationId: CONV } as any;
    mock.sendMessage.mockResolvedValue({ message, recipientIds: ['user-1', RECIPIENT] });
    const ack = jest.fn();

    await handleSend(broker, user, { recipientId: RECIPIENT, content: 'Bonjour' }, ack);

    expect(mock.sendMessage).toHaveBeenCalledWith('user-1', 'member', RECIPIENT, 'Bonjour');
    expect(broker.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: SOCKET_EVENTS.MESSAGE_NEW, recipients: ['user-1', RECIPIENT] }),
    );
    expect(ack).toHaveBeenCalledWith({ ok: true, data: message });
  });

  it('acknowledges a validation error without calling the service', async () => {
    const ack = jest.fn();
    await handleSend(broker, user, { recipientId: 'nope', content: '' }, ack);
    expect(mock.sendMessage).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('tolerates a missing ack callback', async () => {
    mock.sendMessage.mockResolvedValue({ message: { id: 'msg-2' } as any, recipientIds: [] });
    await expect(
      handleSend(broker, user, { recipientId: RECIPIENT, content: 'x' }, undefined),
    ).resolves.toBeUndefined();
  });
});

describe('handleSendGroup', () => {
  const broker = { publish: jest.fn().mockResolvedValue(undefined) } as any;

  it('sends to an existing conversation and fans out to every participant', async () => {
    const message = { id: 'msg-9', conversationId: CONV } as any;
    mock.sendToConversation.mockResolvedValue({ message, recipientIds: ['user-1', RECIPIENT, 'user-3'] });
    const ack = jest.fn();

    await handleSendGroup(broker, user, { conversationId: CONV, content: 'Salut' }, ack);

    expect(mock.sendToConversation).toHaveBeenCalledWith('user-1', CONV, 'Salut');
    expect(broker.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: SOCKET_EVENTS.MESSAGE_NEW, recipients: ['user-1', RECIPIENT, 'user-3'] }),
    );
    expect(ack).toHaveBeenCalledWith({ ok: true, data: message });
  });

  it('acknowledges a validation error', async () => {
    const ack = jest.fn();
    await handleSendGroup(broker, user, { conversationId: 'nope', content: '' }, ack);
    expect(mock.sendToConversation).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
});

describe('handleRead', () => {
  const broker = { publish: jest.fn().mockResolvedValue(undefined) } as any;

  it('marks read, notifies every participant including the reader and acknowledges', async () => {
    mock.markConversationRead.mockResolvedValue({
      conversationId: CONV, updated: 2, readerId: 'user-1', recipientIds: [RECIPIENT],
    });
    const ack = jest.fn();

    await handleRead(broker, user, { conversationId: CONV }, ack);

    expect(broker.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SOCKET_EVENTS.CONVERSATION_READ,
        recipients: [RECIPIENT, 'user-1'],
      }),
    );
    expect(ack).toHaveBeenCalledWith({ ok: true, data: { conversationId: CONV, updated: 2 } });
  });

  it('acknowledges a service error', async () => {
    mock.markConversationRead.mockRejectedValue(new AppError(403, 'Accès refusé.', 'FORBIDDEN'));
    const ack = jest.fn();
    await handleRead(broker, user, { conversationId: CONV }, ack);
    expect(ack).toHaveBeenCalledWith({ ok: false, error: { code: 'FORBIDDEN', message: 'Accès refusé.' } });
  });
});

describe('dispatchToRooms', () => {
  it('emits the event to every recipient room', () => {
    const emit = jest.fn();
    const io = { to: jest.fn().mockReturnValue({ emit }) } as any;

    dispatchToRooms(io, { type: SOCKET_EVENTS.MESSAGE_NEW, recipients: ['user-1', 'user-2'], payload: { id: 'm' } });

    expect(io.to).toHaveBeenCalledWith(roomForUser('user-1'));
    expect(io.to).toHaveBeenCalledWith(roomForUser('user-2'));
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith(SOCKET_EVENTS.MESSAGE_NEW, { id: 'm' });
  });
});

describe('registerSocket', () => {
  it('joins the user room and wires the message handlers', () => {
    const broker = { publish: jest.fn(), subscribe: jest.fn(), close: jest.fn() } as any;
    const handlers: Record<string, Function> = {};
    const socket = {
      data: { user },
      join: jest.fn(),
      on: jest.fn((event: string, cb: Function) => { handlers[event] = cb; }),
    } as any;

    registerSocket(broker, socket);

    expect(socket.join).toHaveBeenCalledWith(roomForUser('user-1'));
    expect(handlers[SOCKET_EVENTS.MESSAGE_SEND]).toBeInstanceOf(Function);
    expect(handlers[SOCKET_EVENTS.MESSAGE_SEND_GROUP]).toBeInstanceOf(Function);
    expect(handlers[SOCKET_EVENTS.MESSAGE_READ]).toBeInstanceOf(Function);

    // le handler câblé délègue bien au service
    mock.sendMessage.mockResolvedValue({ message: { id: 'm' } as any, recipientIds: [] });
    handlers[SOCKET_EVENTS.MESSAGE_SEND]({ recipientId: RECIPIENT, content: 'hi' }, undefined);
    expect(mock.sendMessage).toHaveBeenCalled();
  });
});
