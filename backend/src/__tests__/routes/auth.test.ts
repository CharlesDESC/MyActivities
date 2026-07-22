jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn(), genSalt: jest.fn() }));
jest.mock('express-rate-limit', () => () => (_req: any, _res: any, next: any) => next());
jest.mock('swagger-ui-express', () => ({
  serve: [],
  setup: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('js-yaml', () => ({ load: () => ({}) }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), readFileSync: () => '' }));
jest.mock('../../services/auth.service');

import request from 'supertest';
import app from '../../app';
import * as authService from '../../services/auth.service';
import { generateAccessToken } from '../../lib/tokens';
import { AppError } from '../../middleware/errorHandler';

const mockAuth = authService as jest.Mocked<typeof authService>;

beforeEach(() => jest.clearAllMocks());

describe('POST /v1/auth/register', () => {
  it('returns 400 if body is invalid', async () => {
    const res = await request(app).post('/v1/auth/register').send({ email: 'bad-email' });
    expect(res.status).toBe(400);
  });

  it('returns 400 if password does not meet requirements', async () => {
    const res = await request(app).post('/v1/auth/register').send({
      email: 'test@example.com', pseudo: 'Test', password: 'weak',
    });
    expect(res.status).toBe(400);
  });

  it('returns 201 on successful registration', async () => {
    mockAuth.register.mockResolvedValue({ user: { id: 'u-1' } as any, verificationToken: 'tok' });
    const res = await request(app).post('/v1/auth/register').send({
      email: 'test@example.com', pseudo: 'Test', password: 'MyPass1word!',
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Compte créé');
  });

  it('returns 400 if the SIRET is not 14 digits', async () => {
    const res = await request(app).post('/v1/auth/register').send({
      email: 'orga@example.com', pseudo: 'Orga', password: 'MyPass1word!', siret: '123',
    });
    expect(res.status).toBe(400);
  });

  it('forwards a valid SIRET to the service (organizer signup)', async () => {
    mockAuth.register.mockResolvedValue({ user: { id: 'u-1', role: 'organizer' } as any, verificationToken: 'tok' });
    const res = await request(app).post('/v1/auth/register').send({
      email: 'orga@example.com', pseudo: 'Orga', password: 'MyPass1word!', siret: '73282932000074',
    });
    expect(res.status).toBe(201);
    expect(mockAuth.register).toHaveBeenCalledWith('orga@example.com', 'Orga', 'MyPass1word!', '73282932000074');
  });

  it('never leaks the verification token outside of development', async () => {
    mockAuth.register.mockResolvedValue({ user: { id: 'u-1' } as any, verificationToken: 'tok' });
    const res = await request(app).post('/v1/auth/register').send({
      email: 'test@example.com', pseudo: 'Test', password: 'MyPass1word!',
    });
    expect(res.body._devToken).toBeUndefined();
  });

  it('exposes the verification token in development to ease local testing', async () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    mockAuth.register.mockResolvedValue({ user: { id: 'u-1' } as any, verificationToken: 'tok' });

    const res = await request(app).post('/v1/auth/register').send({
      email: 'test@example.com', pseudo: 'Test', password: 'MyPass1word!',
    });

    expect(res.body._devToken).toBe('tok');
    process.env.NODE_ENV = previousEnv;
  });

  it('propagates service errors (e.g. 409 duplicate email)', async () => {
    mockAuth.register.mockRejectedValue(new AppError(409, 'email exists', 'EMAIL_ALREADY_EXISTS'));
    const res = await request(app).post('/v1/auth/register').send({
      email: 'test@example.com', pseudo: 'Test', password: 'MyPass1word!',
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /v1/auth/login', () => {
  it('returns 400 if body is invalid', async () => {
    const res = await request(app).post('/v1/auth/login').send({ pseudo: 'ab' });
    expect(res.status).toBe(400);
  });

  it('returns 200 with tokens on success', async () => {
    mockAuth.login.mockResolvedValue({
      accessToken: 'acc.tok', refreshToken: 'ref.tok', expiresIn: 900,
      user: { id: 'u-1', email: 'test@example.com', pseudo: 'TestUser', role: 'member' } as any,
    });
    const res = await request(app).post('/v1/auth/login').send({
      pseudo: 'TestUser', password: 'MyPass1word!',
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('acc.tok');
    expect(res.body.refreshToken).toBe('ref.tok');
  });

  it('returns 401 for invalid credentials', async () => {
    mockAuth.login.mockRejectedValue(new AppError(401, 'Pseudo ou mot de passe incorrect.', 'INVALID_CREDENTIALS'));
    const res = await request(app).post('/v1/auth/login').send({
      pseudo: 'TestUser', password: 'WrongPass1!',
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /v1/auth/refresh', () => {
  it('returns 400 if refreshToken is missing', async () => {
    const res = await request(app).post('/v1/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('returns 200 with new tokens', async () => {
    mockAuth.refresh.mockResolvedValue({ accessToken: 'new.acc', refreshToken: 'new.ref', expiresIn: 900 });
    const res = await request(app).post('/v1/auth/refresh').send({ refreshToken: 'sometoken' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('new.acc');
  });
});

describe('POST /v1/auth/logout', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).post('/v1/auth/logout').send({ refreshToken: 'tok' });
    expect(res.status).toBe(401);
  });

  it('returns 204 when authenticated', async () => {
    mockAuth.logout.mockResolvedValue();
    const token = generateAccessToken('user-1', 'member');
    const res = await request(app)
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken: 'sometoken' });
    expect(res.status).toBe(204);
  });

  it('returns 400 when the refresh token is missing from the body', async () => {
    const token = generateAccessToken('user-1', 'member');
    const res = await request(app)
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('propagates service errors', async () => {
    mockAuth.logout.mockRejectedValue(new AppError(500, 'DB error', 'DB_ERROR'));
    const token = generateAccessToken('user-1', 'member');
    const res = await request(app)
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({ refreshToken: 'sometoken' });
    expect(res.status).toBe(500);
  });
});

describe('POST /v1/auth/forgot-password', () => {
  it('always returns 200 (anti-enumeration)', async () => {
    mockAuth.forgotPassword.mockResolvedValue(undefined);
    const res = await request(app).post('/v1/auth/forgot-password').send({ email: 'anyone@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Si un compte');
  });

  it('returns 400 on a malformed email', async () => {
    const res = await request(app).post('/v1/auth/forgot-password').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('propagates service errors', async () => {
    mockAuth.forgotPassword.mockRejectedValue(new AppError(500, 'SMTP down', 'EMAIL_ERROR'));
    const res = await request(app).post('/v1/auth/forgot-password').send({ email: 'anyone@example.com' });
    expect(res.status).toBe(500);
  });
});

describe('POST /v1/auth/reset-password', () => {
  it('returns 400 if body is invalid', async () => {
    const res = await request(app).post('/v1/auth/reset-password').send({ token: 'tok' });
    expect(res.status).toBe(400);
  });

  it('returns 200 on success', async () => {
    mockAuth.resetPassword.mockResolvedValue();
    const res = await request(app).post('/v1/auth/reset-password').send({
      token: 'validtoken', password: 'NewPass1word!',
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Mot de passe mis à jour');
  });
});

describe('GET /v1/auth/verify-email/:token', () => {
  it('returns 200 on valid token', async () => {
    mockAuth.verifyEmail.mockResolvedValue();
    const res = await request(app).get('/v1/auth/verify-email/sometoken');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('vérifié');
  });

  it('returns 400 on invalid token', async () => {
    mockAuth.verifyEmail.mockRejectedValue(new AppError(400, 'Token invalide', 'INVALID_VERIFICATION_TOKEN'));
    const res = await request(app).get('/v1/auth/verify-email/badtoken');
    expect(res.status).toBe(400);
  });
});
