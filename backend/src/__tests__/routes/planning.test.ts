jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn(), genSalt: jest.fn() }));
jest.mock('express-rate-limit', () => () => (_req: any, _res: any, next: any) => next());
jest.mock('swagger-ui-express', () => ({
  serve: [],
  setup: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('js-yaml', () => ({ load: () => ({}) }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), readFileSync: () => '' }));
jest.mock('../../services/planning.service');

import request from 'supertest';
import app from '../../app';
import * as planningService from '../../services/planning.service';
import { generateAccessToken } from '../../lib/tokens';
import { AppError } from '../../middleware/errorHandler';

const mock = planningService as jest.Mocked<typeof planningService>;

const memberToken = generateAccessToken('user-1', 'member');

const paginatedEmpty = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };

beforeEach(() => jest.clearAllMocks());

describe('GET /v1/planning', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/v1/planning');
    expect(res.status).toBe(401);
  });

  it('returns 200 with authenticated user', async () => {
    mock.getPlanning.mockResolvedValue(paginatedEmpty);
    const res = await request(app)
      .get('/v1/planning')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('passes from/to filters to service', async () => {
    mock.getPlanning.mockResolvedValue(paginatedEmpty);
    const res = await request(app)
      .get('/v1/planning')
      .set('Authorization', `Bearer ${memberToken}`)
      .query({ from: '2026-01-01', to: '2026-12-31' });
    expect(res.status).toBe(200);
    expect(mock.getPlanning).toHaveBeenCalledWith('user-1', 1, 20, '2026-01-01', '2026-12-31');
  });

  it('returns 400 with invalid page', async () => {
    const res = await request(app)
      .get('/v1/planning')
      .set('Authorization', `Bearer ${memberToken}`)
      .query({ page: '0' });
    expect(res.status).toBe(400);
  });
});

describe('POST /v1/planning', () => {
  const validBody = {
    activityId: 'a0000000-0000-0000-0000-000000000001',
    scheduledAt: '2027-08-15T10:00:00.000Z',
  };

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/v1/planning').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 400 if activityId is missing', async () => {
    const res = await request(app)
      .post('/v1/planning')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ scheduledAt: '2026-08-15T10:00:00.000Z' });
    expect(res.status).toBe(400);
  });

  it('returns 400 if scheduledAt is missing', async () => {
    const res = await request(app)
      .post('/v1/planning')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ activityId: 'act-1' });
    expect(res.status).toBe(400);
  });

  it('returns 201 on success', async () => {
    mock.addToPlanning.mockResolvedValue({
      id: 'plan-1',
      scheduled_at: new Date('2026-08-15T10:00:00.000Z'),
      reminder_offset_minutes: null,
      created_at: new Date(),
    } as any);
    const res = await request(app)
      .post('/v1/planning')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('plan-1');
  });

  it('returns 404 if activity not found', async () => {
    mock.addToPlanning.mockRejectedValue(new AppError(404, 'Activité introuvable.', 'NOT_FOUND'));
    const res = await request(app)
      .post('/v1/planning')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(validBody);
    expect(res.status).toBe(404);
  });

  it('passes optional reminderOffset to service', async () => {
    mock.addToPlanning.mockResolvedValue({
      id: 'plan-2', scheduled_at: new Date(), reminder_offset_minutes: 30, created_at: new Date(),
    } as any);
    const res = await request(app)
      .post('/v1/planning')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ ...validBody, reminderOffset: 30 });
    expect(res.status).toBe(201);
    expect(mock.addToPlanning).toHaveBeenCalledWith('user-1', validBody.activityId, validBody.scheduledAt, 30, undefined);
  });

  it('accepts a slotId instead of scheduledAt', async () => {
    mock.addToPlanning.mockResolvedValue({
      id: 'plan-3', scheduled_at: new Date(), reminder_offset_minutes: null, created_at: new Date(),
    } as any);
    const slotId = 'b0000000-0000-0000-0000-000000000002';
    const res = await request(app)
      .post('/v1/planning')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ activityId: validBody.activityId, slotId });
    expect(res.status).toBe(201);
    expect(mock.addToPlanning).toHaveBeenCalledWith('user-1', validBody.activityId, undefined, undefined, slotId);
  });

  it('returns 400 if both slotId and scheduledAt are provided', async () => {
    const res = await request(app)
      .post('/v1/planning')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ ...validBody, slotId: 'b0000000-0000-0000-0000-000000000002' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /v1/planning/:planningId', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/v1/planning/plan-1');
    expect(res.status).toBe(401);
  });

  it('returns 204 on success', async () => {
    mock.removePlanning.mockResolvedValue();
    const res = await request(app)
      .delete('/v1/planning/plan-1')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 if entry not found', async () => {
    mock.removePlanning.mockRejectedValue(new AppError(404, 'Entrée introuvable.', 'NOT_FOUND'));
    const res = await request(app)
      .delete('/v1/planning/unknown')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 403 if not owner', async () => {
    mock.removePlanning.mockRejectedValue(new AppError(403, 'Accès refusé.', 'FORBIDDEN'));
    const res = await request(app)
      .delete('/v1/planning/plan-1')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });
});
