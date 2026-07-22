jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn(), genSalt: jest.fn() }));
jest.mock('express-rate-limit', () => () => (_req: any, _res: any, next: any) => next());
jest.mock('swagger-ui-express', () => ({
  serve: [],
  setup: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('js-yaml', () => ({ load: () => ({}) }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), readFileSync: () => '' }));
jest.mock('../../services/review.service');

import request from 'supertest';
import app from '../../app';
import * as reviewService from '../../services/review.service';
import { generateAccessToken } from '../../lib/tokens';
import { AppError } from '../../middleware/errorHandler';

const mock = reviewService as jest.Mocked<typeof reviewService>;

const memberToken = generateAccessToken('user-1', 'member');
const adminToken = generateAccessToken('admin-1', 'admin');

const ACT = 'act-1';
const REV = 'rev-1';

beforeEach(() => jest.clearAllMocks());

describe('GET /v1/activities/:activityId/reviews', () => {
  it('returns 200 without auth', async () => {
    mock.listReviews.mockResolvedValue({
      avgRating: 4.5, reviewCount: 2,
      data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    const res = await request(app).get(`/v1/activities/${ACT}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.avgRating).toBe(4.5);
  });

  it('returns 404 if activity not found', async () => {
    mock.listReviews.mockRejectedValue(new AppError(404, 'Activité introuvable.', 'NOT_FOUND'));
    const res = await request(app).get(`/v1/activities/unknown/reviews`);
    expect(res.status).toBe(404);
  });

  it('returns 400 on invalid sort value', async () => {
    const res = await request(app).get(`/v1/activities/${ACT}/reviews`).query({ sort: 'invalid' });
    expect(res.status).toBe(400);
  });
});

describe('POST /v1/activities/:activityId/reviews', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post(`/v1/activities/${ACT}/reviews`).send({ rating: 4 });
    expect(res.status).toBe(401);
  });

  it('returns 400 if rating is missing', async () => {
    const res = await request(app)
      .post(`/v1/activities/${ACT}/reviews`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 if rating is out of range', async () => {
    const res = await request(app)
      .post(`/v1/activities/${ACT}/reviews`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it('returns 201 on success', async () => {
    mock.createReview.mockResolvedValue({ id: REV, rating: 4, created_at: new Date() } as any);
    const res = await request(app)
      .post(`/v1/activities/${ACT}/reviews`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ rating: 4 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(REV);
  });

  it('returns 409 if review already exists', async () => {
    mock.createReview.mockRejectedValue(new AppError(409, 'Déjà noté.', 'REVIEW_ALREADY_EXISTS'));
    const res = await request(app)
      .post(`/v1/activities/${ACT}/reviews`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ rating: 4 });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /v1/activities/:activityId/reviews/:reviewId', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).patch(`/v1/activities/${ACT}/reviews/${REV}`).send({ rating: 3 });
    expect(res.status).toBe(401);
  });

  it('returns 400 if rating is invalid', async () => {
    const res = await request(app)
      .patch(`/v1/activities/${ACT}/reviews/${REV}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ rating: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 200 on success', async () => {
    mock.updateReview.mockResolvedValue({
      id: REV, rating: 3, created_at: new Date(), updated_at: new Date(),
    } as any);
    const res = await request(app)
      .patch(`/v1/activities/${ACT}/reviews/${REV}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ rating: 3 });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(3);
  });

  it('returns 403 if not owner', async () => {
    mock.updateReview.mockRejectedValue(new AppError(403, 'Accès refusé.', 'FORBIDDEN'));
    const res = await request(app)
      .patch(`/v1/activities/${ACT}/reviews/${REV}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ rating: 3 });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /v1/activities/:activityId/reviews/:reviewId', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete(`/v1/activities/${ACT}/reviews/${REV}`);
    expect(res.status).toBe(401);
  });

  it('returns 204 on success (owner)', async () => {
    mock.deleteReview.mockResolvedValue();
    const res = await request(app)
      .delete(`/v1/activities/${ACT}/reviews/${REV}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(204);
  });

  it('returns 204 on success (admin)', async () => {
    mock.deleteReview.mockResolvedValue();
    const res = await request(app)
      .delete(`/v1/activities/${ACT}/reviews/${REV}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 if review not found', async () => {
    mock.deleteReview.mockRejectedValue(new AppError(404, 'Avis introuvable.', 'NOT_FOUND'));
    const res = await request(app)
      .delete(`/v1/activities/${ACT}/reviews/unknown`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(404);
  });
});
