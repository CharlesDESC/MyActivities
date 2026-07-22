jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn(), genSalt: jest.fn() }));
jest.mock('express-rate-limit', () => () => (_req: any, _res: any, next: any) => next());
jest.mock('swagger-ui-express', () => ({
  serve: [],
  setup: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('js-yaml', () => ({ load: () => ({}) }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), readFileSync: () => '' }));
jest.mock('../../services/admin.service');

import request from 'supertest';
import app from '../../app';
import * as adminService from '../../services/admin.service';
import { generateAccessToken } from '../../lib/tokens';
import { AppError } from '../../middleware/errorHandler';

const mock = adminService as jest.Mocked<typeof adminService>;

const memberToken = generateAccessToken('user-1', 'member');
const adminToken = generateAccessToken('admin-1', 'admin');

const paginatedEmpty = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };

beforeEach(() => jest.clearAllMocks());

// ─── Users ────────────────────────────────────────────────────────────────────

describe('GET /v1/admin/users', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/v1/admin/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for admin', async () => {
    mock.listUsers.mockResolvedValue(paginatedEmpty as any);
    const res = await request(app)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('propagates service errors', async () => {
    mock.listUsers.mockRejectedValue(new AppError(500, 'DB error', 'DB_ERROR'));
    const res = await request(app)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });

  it('passes filters to service', async () => {
    mock.listUsers.mockResolvedValue(paginatedEmpty as any);
    await request(app)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ role: 'organizer', status: 'active', search: 'john' });
    expect(mock.listUsers).toHaveBeenCalledWith(expect.objectContaining({
      role: 'organizer', status: 'active', search: 'john',
    }));
  });
});

describe('PATCH /v1/admin/users/:userId/suspend', () => {
  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .patch('/v1/admin/users/u-1/suspend')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ reason: 'Spam', suspendUntil: '2026-12-31T00:00:00Z' });
    expect(res.status).toBe(403);
  });

  it('returns 400 if body is invalid', async () => {
    const res = await request(app)
      .patch('/v1/admin/users/u-1/suspend')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Spam' });
    expect(res.status).toBe(400);
  });

  it('returns 200 on success', async () => {
    mock.suspendUser.mockResolvedValue({
      id: 'u-1', email: 'u@example.com', pseudo: 'User', role: 'member',
      status: 'suspended', suspended_until: new Date('2026-12-31'),
    } as any);
    const res = await request(app)
      .patch('/v1/admin/users/u-1/suspend')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Spam', suspendUntil: '2026-12-31T00:00:00Z' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('suspended');
  });

  it('returns 404 if user not found', async () => {
    mock.suspendUser.mockRejectedValue(new AppError(404, 'Utilisateur introuvable.', 'NOT_FOUND'));
    const res = await request(app)
      .patch('/v1/admin/users/unknown/suspend')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Spam', suspendUntil: '2026-12-31T00:00:00Z' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /v1/admin/users/:userId', () => {
  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .delete('/v1/admin/users/u-1')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ reason: 'Violation TOS' });
    expect(res.status).toBe(403);
  });

  it('returns 400 if reason is missing', async () => {
    const res = await request(app)
      .delete('/v1/admin/users/u-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 204 on success', async () => {
    mock.deleteUserAdmin.mockResolvedValue();
    const res = await request(app)
      .delete('/v1/admin/users/u-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Violation TOS' });
    expect(res.status).toBe(204);
  });
});

describe('PATCH /v1/admin/users/:userId/role', () => {
  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .patch('/v1/admin/users/u-1/role')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ role: 'organizer' });
    expect(res.status).toBe(403);
  });

  it('returns 400 if role is invalid', async () => {
    const res = await request(app)
      .patch('/v1/admin/users/u-1/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'superuser' });
    expect(res.status).toBe(400);
  });

  it('returns 200 on success', async () => {
    mock.promoteUser.mockResolvedValue({
      id: 'u-1', email: 'u@example.com', pseudo: 'User', role: 'organizer', status: 'active',
    } as any);
    const res = await request(app)
      .patch('/v1/admin/users/u-1/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'organizer' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('organizer');
  });
});

// ─── Activities ───────────────────────────────────────────────────────────────

describe('GET /v1/admin/activities/pending', () => {
  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .get('/v1/admin/activities/pending')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 for admin', async () => {
    mock.listPendingActivities.mockResolvedValue(paginatedEmpty as any);
    const res = await request(app)
      .get('/v1/admin/activities/pending')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('propagates service errors', async () => {
    mock.listPendingActivities.mockRejectedValue(new AppError(500, 'DB error', 'DB_ERROR'));
    const res = await request(app)
      .get('/v1/admin/activities/pending')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(500);
  });
});

describe('PATCH /v1/admin/activities/:activityId/approve', () => {
  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .patch('/v1/admin/activities/act-1/approve')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 on success', async () => {
    mock.approveActivity.mockResolvedValue({
      id: 'act-1', name: 'Test', status: 'published', updated_at: new Date(),
    } as any);
    const res = await request(app)
      .patch('/v1/admin/activities/act-1/approve')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
  });

  it('returns 404 if activity not found or not pending', async () => {
    mock.approveActivity.mockRejectedValue(
      new AppError(404, 'Activité introuvable ou non en attente.', 'NOT_FOUND'),
    );
    const res = await request(app)
      .patch('/v1/admin/activities/unknown/approve')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /v1/admin/activities/:activityId/reject', () => {
  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .patch('/v1/admin/activities/act-1/reject')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ reason: 'Inappropriate content' });
    expect(res.status).toBe(403);
  });

  it('returns 400 if reason is missing', async () => {
    const res = await request(app)
      .patch('/v1/admin/activities/act-1/reject')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 on success', async () => {
    mock.rejectActivity.mockResolvedValue({
      id: 'act-1', name: 'Test', status: 'rejected',
      admin_note: 'Inappropriate content', updated_at: new Date(),
    } as any);
    const res = await request(app)
      .patch('/v1/admin/activities/act-1/reject')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Inappropriate content' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
    expect(res.body.admin_note).toBe('Inappropriate content');
  });
});
