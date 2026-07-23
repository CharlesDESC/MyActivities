jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn(), genSalt: jest.fn() }));
jest.mock('express-rate-limit', () => () => (_req: any, _res: any, next: any) => next());
jest.mock('swagger-ui-express', () => ({
  serve: [],
  setup: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('js-yaml', () => ({ load: () => ({}) }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), readFileSync: () => '' }));
jest.mock('../../services/message.service');
jest.mock('../../realtime', () => ({
  publishRealtime: jest.fn().mockResolvedValue(undefined),
  SOCKET_EVENTS: {
    MESSAGE_NEW: 'message:new',
    CONVERSATION_READ: 'conversation:read',
    CONVERSATION_NEW: 'conversation:new',
    CONVERSATION_UPDATED: 'conversation:updated',
  },
}));

import request from 'supertest';
import app from '../../app';
import * as messageService from '../../services/message.service';
import { publishRealtime } from '../../realtime';
import { generateAccessToken } from '../../lib/tokens';
import { AppError } from '../../middleware/errorHandler';

const mock = messageService as jest.Mocked<typeof messageService>;
const token = generateAccessToken('user-1', 'member');
const RECIPIENT = '11111111-1111-1111-1111-111111111111';
const CONV = '22222222-2222-2222-2222-222222222222';
const OTHER = '33333333-3333-3333-3333-333333333333';

const mockMessage = {
  id: 'msg-1', conversationId: CONV, content: 'Bonjour', createdAt: new Date(), readAt: null,
  sender: { id: 'user-1', pseudo: 'Alice', avatarUrl: null },
};

beforeEach(() => jest.clearAllMocks());

describe('GET /v1/messages/conversations', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/v1/messages/conversations');
    expect(res.status).toBe(401);
  });

  it('returns 200 with the conversation list', async () => {
    mock.listConversations.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    const res = await request(app).get('/v1/messages/conversations').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(0);
  });
});

describe('GET /v1/messages/conversations/:conversationId', () => {
  it('returns 200 with the message history', async () => {
    mock.getMessages.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    const res = await request(app).get(`/v1/messages/conversations/${CONV}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('returns 403 if the user is not a participant', async () => {
    mock.getMessages.mockRejectedValue(new AppError(403, 'Accès refusé.', 'FORBIDDEN'));
    const res = await request(app).get(`/v1/messages/conversations/${CONV}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /v1/messages/conversations/:conversationId/read', () => {
  it('marks the conversation read and notifies participants including the reader', async () => {
    mock.markConversationRead.mockResolvedValue({
      conversationId: CONV, updated: 2, readerId: 'user-1', recipientIds: [RECIPIENT],
    });
    const res = await request(app)
      .post(`/v1/messages/conversations/${CONV}/read`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ conversationId: CONV, updated: 2 });
    expect(publishRealtime).toHaveBeenCalledWith(expect.objectContaining({
      type: 'conversation:read',
      recipients: [RECIPIENT, 'user-1'],
    }));
  });
});

describe('POST /v1/messages/conversations/:conversationId (send to existing)', () => {
  it('returns 201 and fans out to all participants', async () => {
    mock.sendToConversation.mockResolvedValue({ message: mockMessage, recipientIds: ['user-1', RECIPIENT, OTHER] });
    const res = await request(app)
      .post(`/v1/messages/conversations/${CONV}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Salut le groupe' });
    expect(res.status).toBe(201);
    expect(publishRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'message:new', recipients: ['user-1', RECIPIENT, OTHER] }),
    );
  });

  it('returns 400 if content is empty', async () => {
    const res = await request(app)
      .post(`/v1/messages/conversations/${CONV}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /v1/messages/conversations/:conversationId', () => {
  it('returns 204 and notifies every participant of the deletion', async () => {
    mock.deleteConversation.mockResolvedValue({ participantIds: ['user-1', RECIPIENT] });
    const res = await request(app)
      .delete(`/v1/messages/conversations/${CONV}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(mock.deleteConversation).toHaveBeenCalledWith('user-1', CONV);
    expect(publishRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'conversation:updated', recipients: ['user-1', RECIPIENT] }),
    );
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete(`/v1/messages/conversations/${CONV}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 if the user is not a participant', async () => {
    mock.deleteConversation.mockRejectedValue(new AppError(403, 'Accès refusé.', 'FORBIDDEN'));
    const res = await request(app)
      .delete(`/v1/messages/conversations/${CONV}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /v1/messages (direct)', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/v1/messages').send({ recipientId: RECIPIENT, content: 'hi' });
    expect(res.status).toBe(401);
  });

  it('returns 400 if recipientId is not a uuid', async () => {
    const res = await request(app)
      .post('/v1/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientId: 'not-a-uuid', content: 'hi' });
    expect(res.status).toBe(400);
  });

  it('returns 201 and publishes the realtime event on success', async () => {
    mock.sendMessage.mockResolvedValue({ message: mockMessage, recipientIds: ['user-1', RECIPIENT] });
    const res = await request(app)
      .post('/v1/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientId: RECIPIENT, content: 'Bonjour' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('msg-1');
    expect(publishRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'message:new', recipients: ['user-1', RECIPIENT] }),
    );
  });

  it('returns 403 if the recipient is not a friend', async () => {
    mock.sendMessage.mockRejectedValue(new AppError(403, 'Vous devez être amis.', 'NOT_FRIENDS'));
    const res = await request(app)
      .post('/v1/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientId: RECIPIENT, content: 'Bonjour' });
    expect(res.status).toBe(403);
  });
});

describe('POST /v1/messages/groups', () => {
  const groupConvo = {
    id: 'grp-1', type: 'group' as const, title: 'Team', otherParticipant: null,
    participants: [
      { id: 'user-1', pseudo: 'Alice', avatarUrl: null, role: 'admin' as const },
      { id: RECIPIENT, pseudo: 'Bob', avatarUrl: null, role: 'member' as const },
    ],
    lastMessage: null, unreadCount: 0, updatedAt: new Date(),
  };

  it('creates a group and notifies members', async () => {
    mock.createGroup.mockResolvedValue(groupConvo);
    const res = await request(app)
      .post('/v1/messages/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Team', memberIds: [RECIPIENT] });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('group');
    expect(publishRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'conversation:new', recipients: [RECIPIENT] }),
    );
  });

  it('returns 400 if memberIds is empty', async () => {
    const res = await request(app)
      .post('/v1/messages/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Team', memberIds: [] });
    expect(res.status).toBe(400);
  });
});

describe('group membership routes', () => {
  it('PATCH /groups/:id renames the group', async () => {
    mock.renameGroup.mockResolvedValue({
      conversation: {
        id: CONV, type: 'group', title: 'New', otherParticipant: null, participants: [],
        lastMessage: null, unreadCount: 0, updatedAt: new Date(),
      },
      participantIds: ['user-1', RECIPIENT],
    });
    const res = await request(app)
      .patch(`/v1/messages/groups/${CONV}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New' });
    expect(res.status).toBe(200);
    expect(publishRealtime).toHaveBeenCalledWith(expect.objectContaining({ type: 'conversation:updated' }));
  });

  it('POST /groups/:id/members adds a member', async () => {
    mock.addMember.mockResolvedValue({ addedUserId: OTHER, participantIds: ['user-1', RECIPIENT, OTHER] });
    const res = await request(app)
      .post(`/v1/messages/groups/${CONV}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: OTHER });
    expect(res.status).toBe(201);
    expect(publishRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'conversation:new', recipients: [OTHER] }),
    );
  });

  it('DELETE /groups/:id/members/:userId (self) leaves the group', async () => {
    mock.leaveGroup.mockResolvedValue({ participantIds: [RECIPIENT] });
    const res = await request(app)
      .delete(`/v1/messages/groups/${CONV}/members/user-1`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(mock.leaveGroup).toHaveBeenCalled();
    expect(mock.removeMember).not.toHaveBeenCalled();
  });

  it('DELETE /groups/:id/members/:userId (other) removes the member', async () => {
    mock.removeMember.mockResolvedValue({ removedUserId: OTHER, participantIds: ['user-1', RECIPIENT] });
    const res = await request(app)
      .delete(`/v1/messages/groups/${CONV}/members/${OTHER}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(mock.removeMember).toHaveBeenCalled();
  });
});
