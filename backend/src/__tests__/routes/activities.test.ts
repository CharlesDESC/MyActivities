jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn(), genSalt: jest.fn() }));
jest.mock('express-rate-limit', () => () => (_req: any, _res: any, next: any) => next());
jest.mock('swagger-ui-express', () => ({
  serve: [],
  setup: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('js-yaml', () => ({ load: () => ({}) }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), readFileSync: () => '' }));
jest.mock('../../services/activity.service');
jest.mock('../../services/slot.service');

import request from 'supertest';
import app from '../../app';
import * as activityService from '../../services/activity.service';
import * as slotService from '../../services/slot.service';
import { generateAccessToken } from '../../lib/tokens';
import { AppError } from '../../middleware/errorHandler';

const mock = activityService as jest.Mocked<typeof activityService>;
const slotMock = slotService as jest.Mocked<typeof slotService>;

const memberToken = generateAccessToken('user-1', 'member');
const organizerToken = generateAccessToken('org-1', 'organizer');
const adminToken = generateAccessToken('admin-1', 'admin');

const paginatedEmpty = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };

beforeEach(() => jest.clearAllMocks());

describe('GET /v1/activities/:id/slots', () => {
  const slot = {
    id: 'slot-1',
    activityId: 'act-1',
    startsAt: '2099-01-01T10:00:00.000Z',
    endsAt: null,
    capacity: 10,
    booked: 3,
    remaining: 7,
  };

  it('returns 200 with the slots (no auth required)', async () => {
    slotMock.listSlots.mockResolvedValue([slot]);

    const res = await request(app).get('/v1/activities/act-1/slots');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(slotMock.listSlots).toHaveBeenCalledWith('act-1', undefined, undefined);
  });

  it('forwards the date range to the service', async () => {
    slotMock.listSlots.mockResolvedValue([]);

    const res = await request(app)
      .get('/v1/activities/act-1/slots')
      .query({ from: '2099-01-01T00:00:00.000Z', to: '2099-01-31T00:00:00.000Z' });

    expect(res.status).toBe(200);
    expect(slotMock.listSlots).toHaveBeenCalledWith(
      'act-1',
      '2099-01-01T00:00:00.000Z',
      '2099-01-31T00:00:00.000Z',
    );
  });

  it('returns 400 on a malformed date', async () => {
    const res = await request(app).get('/v1/activities/act-1/slots').query({ from: '01-01-2099' });
    expect(res.status).toBe(400);
  });

  it('propagates service errors', async () => {
    slotMock.listSlots.mockRejectedValue(new AppError(404, 'Activité introuvable.', 'NOT_FOUND'));
    const res = await request(app).get('/v1/activities/unknown/slots');
    expect(res.status).toBe(404);
  });
});

describe('POST /v1/activities/:id/slots', () => {
  const validBody = { slots: [{ startsAt: '2099-01-01T10:00:00.000Z', capacity: 10 }] };

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/v1/activities/act-1/slots').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 403 for a member', async () => {
    const res = await request(app)
      .post('/v1/activities/act-1/slots')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(validBody);
    expect(res.status).toBe(403);
  });

  it('returns 400 when a slot is in the past', async () => {
    const res = await request(app)
      .post('/v1/activities/act-1/slots')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ slots: [{ startsAt: '2020-01-01T10:00:00.000Z', capacity: 10 }] });
    expect(res.status).toBe(400);
  });

  it('returns 201 for the organizer', async () => {
    slotMock.createSlots.mockResolvedValue([
      { id: 'slot-1', activityId: 'act-1', startsAt: '2099-01-01T10:00:00.000Z', endsAt: null, capacity: 10, booked: 0, remaining: 10 },
    ]);

    const res = await request(app)
      .post('/v1/activities/act-1/slots')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(1);
    expect(slotMock.createSlots).toHaveBeenCalledWith('act-1', 'org-1', 'organizer', validBody.slots);
  });

  it('returns 403 when the organizer does not own the activity', async () => {
    slotMock.createSlots.mockRejectedValue(new AppError(403, 'Accès refusé.', 'FORBIDDEN'));

    const res = await request(app)
      .post('/v1/activities/act-1/slots')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(validBody);

    expect(res.status).toBe(403);
  });

  it('returns 201 for an admin', async () => {
    slotMock.createSlots.mockResolvedValue([]);

    const res = await request(app)
      .post('/v1/activities/act-1/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody);

    expect(res.status).toBe(201);
  });
});

describe('GET /v1/activities', () => {
  it('returns 200 with list (no auth required)', async () => {
    mock.listActivities.mockResolvedValue(paginatedEmpty);
    const res = await request(app).get('/v1/activities').query({ lat: '48.8', lng: '2.3' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns 400 when lat/lng missing', async () => {
    const res = await request(app).get('/v1/activities');
    expect(res.status).toBe(400);
  });

  it('propagates service errors', async () => {
    mock.listActivities.mockRejectedValue(new AppError(500, 'DB error', 'DB_ERROR'));
    const res = await request(app).get('/v1/activities').query({ lat: '48.8', lng: '2.3' });
    expect(res.status).toBe(500);
  });
});

describe('GET /v1/activities/:id', () => {
  it('returns 200 with activity detail', async () => {
    mock.getActivity.mockResolvedValue({ id: 'act-1', name: 'Test' } as any);
    const res = await request(app).get('/v1/activities/act-1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('act-1');
  });

  it('returns 404 if not found', async () => {
    mock.getActivity.mockRejectedValue(new AppError(404, 'Activité introuvable.', 'NOT_FOUND'));
    const res = await request(app).get('/v1/activities/unknown');
    expect(res.status).toBe(404);
  });
});

describe('POST /v1/activities', () => {
  const validBody = {
    name: 'Bowling Night',
    category: 'sport',
    description: 'Fun bowling evening for everyone who loves to play',
    priceMin: 5,
    priceMax: 20,
  };

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/v1/activities').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 403 for member role', async () => {
    const res = await request(app)
      .post('/v1/activities')
      .set('Authorization', `Bearer ${memberToken}`)
      .send(validBody);
    expect(res.status).toBe(403);
  });

  it('returns 400 when body is invalid', async () => {
    const res = await request(app)
      .post('/v1/activities')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ name: 'Only name' });
    expect(res.status).toBe(400);
  });

  it('returns 201 for organizer with valid body', async () => {
    mock.createActivity.mockResolvedValue({
      id: 'act-new', name: 'Bowling Night', category: 'sport', status: 'pending', created_at: new Date(),
    } as any);
    const res = await request(app)
      .post('/v1/activities')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('act-new');
  });

  it('returns 201 for admin with valid body', async () => {
    mock.createActivity.mockResolvedValue({
      id: 'act-new2', name: 'Bowling Night', category: 'sport', status: 'pending', created_at: new Date(),
    } as any);
    const res = await request(app)
      .post('/v1/activities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody);
    expect(res.status).toBe(201);
  });
});

describe('PATCH /v1/activities/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).patch('/v1/activities/act-1').send({ name: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for member', async () => {
    const res = await request(app)
      .patch('/v1/activities/act-1')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(403);
  });

  it('returns 200 for organizer', async () => {
    mock.updateActivity.mockResolvedValue({
      id: 'act-1', name: 'Updated', category: 'sport', status: 'pending', updated_at: new Date(),
    } as any);
    const res = await request(app)
      .patch('/v1/activities/act-1')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('returns 404 if not found', async () => {
    mock.updateActivity.mockRejectedValue(new AppError(404, 'Activité introuvable.', 'NOT_FOUND'));
    const res = await request(app)
      .patch('/v1/activities/unknown')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ name: 'New name' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /v1/activities/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/v1/activities/act-1');
    expect(res.status).toBe(401);
  });

  it('returns 204 for organizer (owner)', async () => {
    mock.deleteActivity.mockResolvedValue();
    const res = await request(app)
      .delete('/v1/activities/act-1')
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(204);
  });

  it('returns 403 if organizer does not own it', async () => {
    mock.deleteActivity.mockRejectedValue(new AppError(403, 'Accès refusé.', 'FORBIDDEN'));
    const res = await request(app)
      .delete('/v1/activities/act-1')
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 204 for admin', async () => {
    mock.deleteActivity.mockResolvedValue();
    const res = await request(app)
      .delete('/v1/activities/act-1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });
});
