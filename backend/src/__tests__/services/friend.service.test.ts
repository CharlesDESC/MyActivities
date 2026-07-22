jest.mock('../../db/pool', () => ({
  pool: { query: jest.fn() },
}));

import { pool } from '../../db/pool';
import * as friendService from '../../services/friend.service';

const mockQuery = pool.query as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('friend.service — sendRequest', () => {
  it('throws 422 when adding oneself', async () => {
    await expect(friendService.sendRequest('user-1', 'user-1')).rejects.toMatchObject({
      statusCode: 422,
      code: 'CANNOT_FRIEND_SELF',
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws 404 when the addressee does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(friendService.sendRequest('user-1', 'user-2')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 409 when already friends', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-2', pseudo: 'Bob', avatarUrl: null }] }) // addressee
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: 'accepted' }] });                          // existing
    await expect(friendService.sendRequest('user-1', 'user-2')).rejects.toMatchObject({
      statusCode: 409,
      code: 'ALREADY_FRIENDS',
    });
  });

  it('throws 409 when a request is already pending', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-2', pseudo: 'Bob', avatarUrl: null }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: 'pending' }] });
    await expect(friendService.sendRequest('user-1', 'user-2')).rejects.toMatchObject({
      statusCode: 409,
      code: 'REQUEST_PENDING',
    });
  });

  it('creates an outgoing pending request', async () => {
    const now = new Date();
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-2', pseudo: 'Bob', avatarUrl: null }] }) // addressee
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })                                                 // no existing
      .mockResolvedValueOnce({ rows: [{ id: 'req-1', createdAt: now }] });                              // insert

    const req = await friendService.sendRequest('user-1', 'user-2');
    expect(req).toMatchObject({ id: 'req-1', direction: 'outgoing', user: { id: 'user-2' } });
  });
});

describe('friend.service — respondRequest', () => {
  it('throws 404 when the request is not addressed to the user', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(friendService.respondRequest('user-1', 'req-x', true)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 409 when the request is already resolved', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ requester_id: 'user-2', status: 'accepted' }] });
    await expect(friendService.respondRequest('user-1', 'req-1', true)).rejects.toMatchObject({
      statusCode: 409,
      code: 'REQUEST_RESOLVED',
    });
  });

  it('accepts a pending request and returns the requester id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ requester_id: 'user-2', status: 'pending' }] })
      .mockResolvedValueOnce({ rows: [] }); // update accepted

    const result = await friendService.respondRequest('user-1', 'req-1', true);
    expect(result).toEqual({ accepted: true, requesterId: 'user-2' });
  });

  it('declines a pending request (deletes it)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ requester_id: 'user-2', status: 'pending' }] })
      .mockResolvedValueOnce({ rows: [] }); // delete

    const result = await friendService.respondRequest('user-1', 'req-1', false);
    expect(result).toEqual({ accepted: false, requesterId: 'user-2' });
  });
});

describe('friend.service — removeFriend', () => {
  it('throws 404 when there is no relation to remove', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    await expect(friendService.removeFriend('user-1', 'user-2')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('removes an existing relation', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    await expect(friendService.removeFriend('user-1', 'user-2')).resolves.toBeUndefined();
  });
});

describe('friend.service — areFriends', () => {
  it('returns true when an accepted relation exists', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] });
    await expect(friendService.areFriends('user-1', 'user-2')).resolves.toBe(true);
  });

  it('returns false otherwise', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(friendService.areFriends('user-1', 'user-2')).resolves.toBe(false);
  });
});

describe('friend.service — listing', () => {
  it('lists accepted friends', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'user-2', pseudo: 'Bob', avatarUrl: null, friendsSince: new Date() }] });
    const friends = await friendService.listFriends('user-1');
    expect(friends).toHaveLength(1);
    expect(friends[0].pseudo).toBe('Bob');
  });

  it('lists pending requests with direction', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'req-1', direction: 'incoming', user: { id: 'user-2', pseudo: 'Bob', avatarUrl: null }, createdAt: new Date() },
        { id: 'req-2', direction: 'outgoing', user: { id: 'user-3', pseudo: 'Carol', avatarUrl: null }, createdAt: new Date() },
      ],
    });
    const requests = await friendService.listPendingRequests('user-1');
    expect(requests.map((r) => r.direction)).toEqual(['incoming', 'outgoing']);
  });
});
