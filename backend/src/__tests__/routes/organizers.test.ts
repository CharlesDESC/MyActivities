jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn(), genSalt: jest.fn() }));
jest.mock('express-rate-limit', () => () => (_req: any, _res: any, next: any) => next());
jest.mock('swagger-ui-express', () => ({
  serve: [],
  setup: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('js-yaml', () => ({ load: () => ({}) }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), readFileSync: () => '' }));
jest.mock('../../db/pool');

import request from 'supertest';
import app from '../../app';
import { pool } from '../../db/pool';
import { generateAccessToken } from '../../lib/tokens';

const mockQuery = pool.query as jest.Mock;

const memberToken = generateAccessToken('user-1', 'member');
const organizerToken = generateAccessToken('org-1', 'organizer');
const adminToken = generateAccessToken('admin-1', 'admin');

beforeEach(() => jest.clearAllMocks());

describe('GET /v1/organizers/me/activities', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/v1/organizers/me/activities');
    expect(res.status).toBe(401);
  });

  it('returns 403 for member', async () => {
    const res = await request(app)
      .get('/v1/organizers/me/activities')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for organizer', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);
    const res = await request(app)
      .get('/v1/organizers/me/activities')
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it('returns 200 for admin', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);
    const res = await request(app)
      .get('/v1/organizers/me/activities')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('filters by status when provided', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any);
    const res = await request(app)
      .get('/v1/organizers/me/activities')
      .set('Authorization', `Bearer ${organizerToken}`)
      .query({ status: 'pending' });
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('a.status = $'),
      expect.arrayContaining(['pending']),
    );
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .get('/v1/organizers/me/activities')
      .set('Authorization', `Bearer ${organizerToken}`)
      .query({ status: 'invalid_status' });
    expect(res.status).toBe(400);
  });
});

describe('GET /v1/organizers/me/stats', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/v1/organizers/me/stats');
    expect(res.status).toBe(401);
  });

  it('returns 403 for member', async () => {
    const res = await request(app)
      .get('/v1/organizers/me/stats')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with stats for organizer', async () => {
    const fakeStats = [
      { activityId: 'act-1', activityName: 'Test', views: 42, avgRating: 4.5, reviewCount: 10, planningAdds: '5' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: fakeStats, rowCount: 1 } as any);
    const res = await request(app)
      .get('/v1/organizers/me/stats')
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeStats);
  });

  it('returns empty array when no activities', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    const res = await request(app)
      .get('/v1/organizers/me/stats')
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('propagates database errors', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connexion perdue'));
    const res = await request(app)
      .get('/v1/organizers/me/stats')
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(500);
  });
});

describe('GET /v1/organizers/me/activities/:activityId/reservations', () => {
  const ACT = 'act-1';

  it('returns 401 without auth', async () => {
    const res = await request(app).get(`/v1/organizers/me/activities/${ACT}/reservations`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for member', async () => {
    const res = await request(app)
      .get(`/v1/organizers/me/activities/${ACT}/reservations`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with slots and attendees for the owner', async () => {
    const slots = [
      {
        id: 'slot-1', startsAt: '2099-08-15T10:00:00.000Z', endsAt: null,
        capacity: 20, booked: 1, remaining: 19,
        attendees: [{ userId: 'user-2', pseudo: 'Bob', avatarUrl: null, reservedAt: '2099-08-01T09:00:00.000Z' }],
      },
    ];
    mockQuery
      .mockResolvedValueOnce({ rows: [{ organizer_id: 'org-1', name: 'Atelier' }], rowCount: 1 } as any) // ownership
      .mockResolvedValueOnce({ rows: slots, rowCount: 1 } as any);                                        // slots + attendees
    const res = await request(app)
      .get(`/v1/organizers/me/activities/${ACT}/reservations`)
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ activityId: ACT, activityName: 'Atelier' });
    expect(res.body.slots[0].attendees[0].pseudo).toBe('Bob');
  });

  it('returns 404 when the activity does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    const res = await request(app)
      .get(`/v1/organizers/me/activities/${ACT}/reservations`)
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 403 when the organizer does not own the activity', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ organizer_id: 'someone-else', name: 'Atelier' }], rowCount: 1 } as any);
    const res = await request(app)
      .get(`/v1/organizers/me/activities/${ACT}/reservations`)
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(403);
  });

  it('lets an admin read any activity reservations', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ organizer_id: 'org-1', name: 'Atelier' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    const res = await request(app)
      .get(`/v1/organizers/me/activities/${ACT}/reservations`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.slots).toEqual([]);
  });
});
