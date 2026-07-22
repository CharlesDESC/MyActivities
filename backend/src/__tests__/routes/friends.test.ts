jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn(), genSalt: jest.fn() }));
jest.mock('express-rate-limit', () => () => (_req: any, _res: any, next: any) => next());
jest.mock('swagger-ui-express', () => ({
  serve: [],
  setup: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('js-yaml', () => ({ load: () => ({}) }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), readFileSync: () => '' }));
jest.mock('../../services/friend.service');
jest.mock('../../services/user.service');
jest.mock('../../realtime', () => ({
  publishRealtime: jest.fn().mockResolvedValue(undefined),
  SOCKET_EVENTS: { FRIEND_REQUEST: 'friend:request', FRIEND_ACCEPTED: 'friend:accepted' },
}));

import request from 'supertest';
import app from '../../app';
import * as friendService from '../../services/friend.service';
import * as userService from '../../services/user.service';
import { publishRealtime } from '../../realtime';
import { generateAccessToken } from '../../lib/tokens';
import { AppError } from '../../middleware/errorHandler';

const friendMock = friendService as jest.Mocked<typeof friendService>;
const userMock = userService as jest.Mocked<typeof userService>;
const token = generateAccessToken('user-1', 'member');
const ADDRESSEE = '11111111-1111-1111-1111-111111111111';

beforeEach(() => jest.clearAllMocks());

describe('GET /v1/friends', () => {
  it('returns 401 without auth', async () => {
    expect((await request(app).get('/v1/friends')).status).toBe(401);
  });

  it('returns the friend list', async () => {
    friendMock.listFriends.mockResolvedValue([{ id: ADDRESSEE, pseudo: 'Bob', avatarUrl: null, friendsSince: new Date() }]);
    const res = await request(app).get('/v1/friends').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /v1/friends/requests', () => {
  it('returns pending requests', async () => {
    friendMock.listPendingRequests.mockResolvedValue([]);
    const res = await request(app).get('/v1/friends/requests').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('POST /v1/friends/requests', () => {
  it('returns 400 when addresseeId is not a uuid', async () => {
    const res = await request(app)
      .post('/v1/friends/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ addresseeId: 'nope' });
    expect(res.status).toBe(400);
  });

  it('creates a request and notifies the addressee', async () => {
    friendMock.sendRequest.mockResolvedValue({
      id: 'req-1', direction: 'outgoing', user: { id: ADDRESSEE, pseudo: 'Bob', avatarUrl: null }, createdAt: new Date(),
    });
    const res = await request(app)
      .post('/v1/friends/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ addresseeId: ADDRESSEE });
    expect(res.status).toBe(201);
    expect(publishRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'friend:request', recipients: [ADDRESSEE] }),
    );
  });

  it('propagates a 409 conflict', async () => {
    friendMock.sendRequest.mockRejectedValue(new AppError(409, 'Déjà amis.', 'ALREADY_FRIENDS'));
    const res = await request(app)
      .post('/v1/friends/requests')
      .set('Authorization', `Bearer ${token}`)
      .send({ addresseeId: ADDRESSEE });
    expect(res.status).toBe(409);
  });
});

describe('POST /v1/friends/requests/:id/accept', () => {
  it('accepts and notifies the requester', async () => {
    friendMock.respondRequest.mockResolvedValue({ accepted: true, requesterId: ADDRESSEE });
    const res = await request(app)
      .post('/v1/friends/requests/req-1/accept')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.accepted).toBe(true);
    expect(publishRealtime).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'friend:accepted', recipients: [ADDRESSEE] }),
    );
  });
});

describe('POST /v1/friends/requests/:id/decline', () => {
  it('declines without notifying', async () => {
    friendMock.respondRequest.mockResolvedValue({ accepted: false, requesterId: ADDRESSEE });
    const res = await request(app)
      .post('/v1/friends/requests/req-1/decline')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.accepted).toBe(false);
    expect(publishRealtime).not.toHaveBeenCalled();
  });
});

describe('DELETE /v1/friends/:userId', () => {
  it('removes a friend', async () => {
    friendMock.removeFriend.mockResolvedValue(undefined);
    const res = await request(app).delete(`/v1/friends/${ADDRESSEE}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });
});

describe('GET /v1/users/search', () => {
  it('returns 400 without a query', async () => {
    const res = await request(app).get('/v1/users/search').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns matching users', async () => {
    userMock.searchUsers.mockResolvedValue([{ id: ADDRESSEE, pseudo: 'Bob', avatarUrl: null }]);
    const res = await request(app).get('/v1/users/search?q=bo').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].pseudo).toBe('Bob');
  });
});
