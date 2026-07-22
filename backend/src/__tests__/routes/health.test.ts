jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn(), genSalt: jest.fn() }));
jest.mock('express-rate-limit', () => () => (_req: any, _res: any, next: any) => next());
jest.mock('swagger-ui-express', () => ({
  serve: [],
  setup: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('js-yaml', () => ({ load: () => ({}) }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), readFileSync: () => '' }));

import request from 'supertest';
import app from '../../app';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});
