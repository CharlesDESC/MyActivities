import request from 'supertest';
import app from '../../app';

describe('reverse proxy configuration', () => {
  it('trusts exactly the configured number of proxy hops', () => {
    expect(app.get('trust proxy')).toBe(1);
  });

  it('keeps the rate limiter operational with X-Forwarded-For', async () => {
    const response = await request(app)
      .post('/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.10')
      .send({ pseudo: 'ab' });

    // Le corps est volontairement invalide : le rate limiter doit laisser la
    // requête atteindre Zod, qui répond 400, et non produire une erreur 500.
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
