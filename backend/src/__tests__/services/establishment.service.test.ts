jest.mock('../../db/pool', () => ({
  pool: { query: jest.fn() },
}));
jest.mock('../../lib/siret');
jest.mock('../../lib/ign-geocoding');

import { pool } from '../../db/pool';
import { lookupSiret } from '../../lib/siret';
import { resolveAddress } from '../../lib/ign-geocoding';
import * as service from '../../services/establishment.service';

const mockQuery = pool.query as jest.Mock;
const mockLookup = lookupSiret as jest.Mock;
const mockResolveAddress = resolveAddress as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockResolveAddress.mockResolvedValue({
    addressId: 'ban-address-123',
    address: '12 rue de la République, 69001 Lyon',
    latitude: 45.767,
    longitude: 4.835,
  });
});

const row = {
  id: 'est-1',
  name: 'ClimbUp Lyon',
  address: '12 rue de la République, 69001 Lyon',
  latitude: 45.767,
  longitude: 4.835,
  addressId: 'ban-address-123',
  phone: null,
  websiteUrl: null,
  organizerId: 'org-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('establishment.service — listOrganizerEstablishments', () => {
  it('returns the organizer establishments without leaking organizerId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const result = await service.listOrganizerEstablishments('org-1');
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('organizerId');
    expect(result[0].id).toBe('est-1');
  });
});

describe('establishment.service — getEstablishment', () => {
  it('throws 404 when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(service.getEstablishment('nope', 'org-1', 'organizer'))
      .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('throws 403 when the establishment belongs to another organizer', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...row, organizerId: 'other' }] });
    await expect(service.getEstablishment('est-1', 'org-1', 'organizer'))
      .rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('lets an admin read any establishment', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...row, organizerId: 'other' }] });
    const result = await service.getEstablishment('est-1', 'admin-1', 'admin');
    expect(result.id).toBe('est-1');
  });
});

describe('establishment.service — resolveOwnedEstablishment', () => {
  it('returns address + position for the owner', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const result = await service.resolveOwnedEstablishment('est-1', 'org-1');
    expect(result).toEqual({ address: row.address, latitude: row.latitude, longitude: row.longitude });
  });

  it('throws 403 for a non-owner (even admin, ownership is strict here)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...row, organizerId: 'other' }] });
    await expect(service.resolveOwnedEstablishment('est-1', 'org-1'))
      .rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('establishment.service — createEstablishment', () => {
  it('inserts and returns the created establishment', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                  // uniqueness check
      .mockResolvedValueOnce({ rows: [{ id: 'est-1' }] })   // INSERT RETURNING id
      .mockResolvedValueOnce({ rows: [row] });              // getEstablishment
    const result = await service.createEstablishment('org-1', {
      name: 'ClimbUp Lyon',
      addressId: 'ban-address-123',
      address: '12 rue de la République, 69001 Lyon',
    });
    expect(result.id).toBe('est-1');
    const insertParams = mockQuery.mock.calls[1][1] as unknown[];
    // longitude AVANT latitude (ST_MakePoint(lng, lat))
    expect(insertParams.slice(0, 5)).toEqual([
      'org-1', 'ClimbUp Lyon', '12 rue de la République, 69001 Lyon', 4.835, 45.767,
    ]);
  });

  it('rejects a second establishment for the same account', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'est-1' }] });
    await expect(service.createEstablishment('org-1', {
      name: 'Autre établissement',
      addressId: 'ban-address-456',
      address: '14 rue de la République, 69001 Lyon',
    })).rejects.toMatchObject({ statusCode: 409, code: 'ESTABLISHMENT_EXISTS' });
    expect(mockResolveAddress).not.toHaveBeenCalled();
  });
});

describe('establishment.service — updateEstablishment', () => {
  it('throws 403 for a non-owner', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...row, organizerId: 'other' }] });
    await expect(service.updateEstablishment('est-1', 'org-1', 'organizer', { name: 'X' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('updates the name for the owner', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [row] })   // fetchEstablishment (ownership)
      .mockResolvedValueOnce({ rows: [] })      // UPDATE
      .mockResolvedValueOnce({ rows: [{ ...row, name: 'Nouveau nom' }] }); // getEstablishment
    const result = await service.updateEstablishment('est-1', 'org-1', 'organizer', { name: 'Nouveau nom' });
    expect(result.name).toBe('Nouveau nom');
    expect(mockQuery.mock.calls[1][0]).toContain('name =');
  });
});

describe('establishment.service — deleteEstablishment', () => {
  it('deletes for the owner', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [row] })   // fetchEstablishment
      .mockResolvedValueOnce({ rows: [] });     // DELETE
    await expect(service.deleteEstablishment('est-1', 'org-1', 'organizer')).resolves.toBeUndefined();
  });
});

describe('establishment.service — prefillFromSiret', () => {
  it('throws 404 when the account has no SIRET', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ siret: null }] });
    await expect(service.prefillFromSiret('org-1')).rejects.toMatchObject({ code: 'NO_SIRET' });
  });

  it('throws 404 when the SIRET matches nothing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ siret: '12345678901234' }] });
    mockLookup.mockResolvedValueOnce(null);
    await expect(service.prefillFromSiret('org-1')).rejects.toMatchObject({ code: 'SIRET_NOT_FOUND' });
  });

  it('returns the prefill data from the SIRET lookup', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ siret: '12345678901234' }] });
    mockLookup.mockResolvedValueOnce({ name: 'ClimbUp', address: '12 rue', latitude: 45.7, longitude: 4.8 });
    const result = await service.prefillFromSiret('org-1');
    expect(result.name).toBe('ClimbUp');
    expect(mockLookup).toHaveBeenCalledWith('12345678901234');
  });
});
