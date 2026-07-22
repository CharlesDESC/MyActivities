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
import { AppError } from '../../middleware/errorHandler';

const mock = authService as jest.Mocked<typeof authService>;

beforeEach(() => jest.clearAllMocks());

describe('GET /verify-email (page HTML)', () => {
  it('returns 400 when the token is missing', async () => {
    const res = await request(app).get('/verify-email');
    expect(res.status).toBe(400);
    expect(res.text).toContain('Lien invalide');
    expect(mock.verifyEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when the token is not a string (repeated query param)', async () => {
    const res = await request(app).get('/verify-email?token=a&token=b');
    expect(res.status).toBe(400);
  });

  it('returns the confirmation page on success', async () => {
    mock.verifyEmail.mockResolvedValue(undefined as any);

    const res = await request(app).get('/verify-email?token=valid-token');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Email vérifié');
    expect(mock.verifyEmail).toHaveBeenCalledWith('valid-token');
  });

  it('relays the AppError status and message', async () => {
    mock.verifyEmail.mockRejectedValue(new AppError(400, 'Token invalide ou expiré.', 'INVALID_TOKEN'));

    const res = await request(app).get('/verify-email?token=expired');

    expect(res.status).toBe(400);
    expect(res.text).toContain('Token invalide ou expiré.');
  });

  it('falls back to a generic 500 page on an unexpected error', async () => {
    mock.verifyEmail.mockRejectedValue(new Error('connexion perdue'));

    const res = await request(app).get('/verify-email?token=any');

    expect(res.status).toBe(500);
    expect(res.text).toContain('Une erreur est survenue');
    expect(res.text).not.toContain('connexion perdue'); // pas de fuite d'interne
  });
});

describe('GET /reset-password (formulaire HTML)', () => {
  it('returns 400 when the token is missing', async () => {
    const res = await request(app).get('/reset-password');
    expect(res.status).toBe(400);
    expect(res.text).toContain('Lien invalide');
  });

  it('renders the form carrying the token', async () => {
    const res = await request(app).get('/reset-password?token=abc123');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Réinitialiser le mot de passe');
    expect(res.text).toContain('value="abc123"');
  });

  it('escapes the token to prevent HTML injection', async () => {
    const res = await request(app).get('/reset-password').query({ token: '"><script>alert(1)</script>' });

    expect(res.status).toBe(200);
    expect(res.text).not.toContain('<script>alert(1)</script>');
    expect(res.text).toContain('&lt;script&gt;');
  });
});

describe('POST /reset-password (soumission du formulaire)', () => {
  it('re-renders the form with an error when the password is too weak', async () => {
    const res = await request(app)
      .post('/reset-password')
      .type('form')
      .send({ token: 'abc123', password: 'weak' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Mot de passe invalide');
    expect(res.text).toContain('value="abc123"'); // le token est conservé
    expect(mock.resetPassword).not.toHaveBeenCalled();
  });

  it('re-renders the form when the token is missing from the body', async () => {
    const res = await request(app).post('/reset-password').type('form').send({ password: 'Valid1password' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Mot de passe invalide');
  });

  it('returns the success page when the reset goes through', async () => {
    mock.resetPassword.mockResolvedValue(undefined as any);

    const res = await request(app)
      .post('/reset-password')
      .type('form')
      .send({ token: 'abc123', password: 'Valid1password' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Mot de passe mis à jour');
    expect(mock.resetPassword).toHaveBeenCalledWith('abc123', 'Valid1password');
  });

  it('relays the AppError status and message', async () => {
    mock.resetPassword.mockRejectedValue(new AppError(400, 'Token invalide ou expiré.', 'INVALID_TOKEN'));

    const res = await request(app)
      .post('/reset-password')
      .type('form')
      .send({ token: 'expired', password: 'Valid1password' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Token invalide ou expiré.');
  });

  it('falls back to a generic 500 page on an unexpected error', async () => {
    mock.resetPassword.mockRejectedValue(new Error('connexion perdue'));

    const res = await request(app)
      .post('/reset-password')
      .type('form')
      .send({ token: 'abc123', password: 'Valid1password' });

    expect(res.status).toBe(500);
    expect(res.text).toContain('Une erreur est survenue');
  });
});
