jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn(), genSalt: jest.fn() }));
jest.mock('express-rate-limit', () => () => (_req: any, _res: any, next: any) => next());
jest.mock('swagger-ui-express', () => ({
  serve: [],
  setup: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('js-yaml', () => ({ load: () => ({}) }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), readFileSync: () => '' }));
jest.mock('../../services/user.service');

import request from 'supertest';
import app from '../../app';
import * as userService from '../../services/user.service';
import { generateAccessToken } from '../../lib/tokens';
import { AppError } from '../../middleware/errorHandler';

const mock = userService as jest.Mocked<typeof userService>;

const memberToken = generateAccessToken('user-1', 'member');

const fakeUser = {
  id: 'user-1',
  email: 'test@example.com',
  pseudo: 'TestUser',
  role: 'member',
  status: 'active',
  avatar_url: null,
  email_verified: true,
  created_at: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('GET /v1/users/me', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('returns 200 with authenticated user', async () => {
    mock.getMe.mockResolvedValue(fakeUser as any);
    const res = await request(app)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('user-1');
    expect(res.body.email).toBe('test@example.com');
  });

  it('returns 404 if user not found', async () => {
    mock.getMe.mockRejectedValue(new AppError(404, 'Utilisateur introuvable.', 'NOT_FOUND'));
    const res = await request(app)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /v1/users/me', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).patch('/v1/users/me').send({ pseudo: 'NewName' });
    expect(res.status).toBe(401);
  });

  it('returns 400 if body is invalid (empty object)', async () => {
    mock.updateMe.mockRejectedValue(new AppError(400, 'Aucun champ à mettre à jour.', 'NO_FIELDS'));
    const res = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 with updated user', async () => {
    mock.updateMe.mockResolvedValue({ ...fakeUser, pseudo: 'NewName' } as any);
    const res = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ pseudo: 'NewName' });
    expect(res.status).toBe(200);
    expect(res.body.pseudo).toBe('NewName');
  });

  it('returns 200 with updated avatar_url', async () => {
    mock.updateMe.mockResolvedValue({ ...fakeUser, avatar_url: 'https://example.com/avatar.jpg' } as any);
    const res = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ avatar_url: 'https://example.com/avatar.jpg' });
    expect(res.status).toBe(200);
    expect(res.body.avatar_url).toBe('https://example.com/avatar.jpg');
  });
});

describe('DELETE /v1/users/me', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/v1/users/me').send({ password: 'MyPass1word!' });
    expect(res.status).toBe(401);
  });

  it('returns 400 if password is missing', async () => {
    const res = await request(app)
      .delete('/v1/users/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 204 on successful deletion', async () => {
    mock.deleteMe.mockResolvedValue();
    const res = await request(app)
      .delete('/v1/users/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ password: 'MyPass1word!' });
    expect(res.status).toBe(204);
  });

  it('returns 401 if password is incorrect', async () => {
    mock.deleteMe.mockRejectedValue(new AppError(401, 'Mot de passe incorrect.', 'INVALID_PASSWORD'));
    const res = await request(app)
      .delete('/v1/users/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  });
});
