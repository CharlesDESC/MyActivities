jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn(), genSalt: jest.fn() }));
jest.mock('express-rate-limit', () => () => (_req: any, _res: any, next: any) => next());
jest.mock('swagger-ui-express', () => ({
  serve: [],
  setup: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('js-yaml', () => ({ load: () => ({}) }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), readFileSync: () => '' }));
jest.mock('../../services/establishment.service');
jest.mock('../../lib/ign-geocoding');

import request from 'supertest';
import app from '../../app';
import * as establishmentService from '../../services/establishment.service';
import { generateAccessToken } from '../../lib/tokens';
import { AppError } from '../../middleware/errorHandler';
import { searchAddresses } from '../../lib/ign-geocoding';

const mock = establishmentService as jest.Mocked<typeof establishmentService>;

const memberToken = generateAccessToken('user-1', 'member');
const organizerToken = generateAccessToken('org-1', 'organizer');

const validBody = {
  name: 'ClimbUp Lyon',
  addressId: 'ban-address-123',
  address: '12 rue de la République 69001 Lyon',
};

beforeEach(() => jest.clearAllMocks());

describe('GET /v1/establishments', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/v1/establishments');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a member', async () => {
    const res = await request(app).get('/v1/establishments').set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with the organizer establishments', async () => {
    mock.listOrganizerEstablishments.mockResolvedValue([{ id: 'est-1' } as any]);
    const res = await request(app).get('/v1/establishments').set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(mock.listOrganizerEstablishments).toHaveBeenCalledWith('org-1');
  });
});

describe('GET /v1/establishments/prefill', () => {
  it('returns the SIRET prefill', async () => {
    mock.prefillFromSiret.mockResolvedValue({ name: 'ClimbUp', address: '12 rue', latitude: 45.7, longitude: 4.8 });
    const res = await request(app).get('/v1/establishments/prefill').set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('ClimbUp');
    expect(mock.prefillFromSiret).toHaveBeenCalledWith('org-1');
  });

  it('returns 404 when there is no SIRET', async () => {
    mock.prefillFromSiret.mockRejectedValue(new AppError(404, 'Aucun SIRET associé à ce compte.', 'NO_SIRET'));
    const res = await request(app).get('/v1/establishments/prefill').set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /v1/establishments', () => {
  it('returns 400 when body is invalid', async () => {
    const res = await request(app)
      .post('/v1/establishments')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ name: 'X' });
    expect(res.status).toBe(400);
  });

  it('returns 201 for organizer with a valid body', async () => {
    mock.createEstablishment.mockResolvedValue({ id: 'est-new', ...validBody } as any);
    const res = await request(app)
      .post('/v1/establishments')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('est-new');
    expect(mock.createEstablishment).toHaveBeenCalledWith('org-1', expect.objectContaining({ name: 'ClimbUp Lyon' }));
  });
});

describe('GET /v1/establishments/address-search', () => {
  it('returns IGN suggestions', async () => {
    (searchAddresses as jest.Mock).mockResolvedValue([{ addressId: 'ban-address-123', address: '12 rue' }]);
    const res = await request(app)
      .get('/v1/establishments/address-search?q=12%20rue')
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('PATCH /v1/establishments/:id', () => {
  it('returns 200 for the owner', async () => {
    mock.updateEstablishment.mockResolvedValue({ id: 'est-1', ...validBody, name: 'Nouveau' } as any);
    const res = await request(app)
      .patch('/v1/establishments/est-1')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ name: 'Nouveau' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nouveau');
  });
});

describe('DELETE /v1/establishments/:id', () => {
  it('returns 204 for the owner', async () => {
    mock.deleteEstablishment.mockResolvedValue();
    const res = await request(app)
      .delete('/v1/establishments/est-1')
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(204);
  });
});
