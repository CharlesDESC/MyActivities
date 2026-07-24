import { lookupSiret } from '../../lib/siret';

const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch;
});

describe('lookupSiret', () => {
  it('returns an exact active establishment', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          etat_administratif: 'A',
          nom_complet: 'ClimbUp',
          matching_etablissements: [{
            siret: '73282932000074',
            etat_administratif: 'A',
            geo_adresse: '12 rue de Test 69000 Lyon',
            latitude: '45.7',
            longitude: '4.8',
          }],
        }],
      }),
    });

    await expect(lookupSiret('73282932000074')).resolves.toEqual({
      name: 'ClimbUp',
      address: '12 rue de Test 69000 Lyon',
      latitude: 45.7,
      longitude: 4.8,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('q=73282932000074'),
      { headers: { Accept: 'application/json' } },
    );
  });

  it('rejects a result that does not contain the exact SIRET', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          etat_administratif: 'A',
          matching_etablissements: [{
            siret: '11111111111111',
            etat_administratif: 'A',
          }],
        }],
      }),
    });

    await expect(lookupSiret('73282932000074')).resolves.toBeNull();
  });

  it.each([
    ['closed company', 'C', 'A'],
    ['closed establishment', 'A', 'C'],
  ])('rejects a %s', async (_label, companyStatus, establishmentStatus) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{
          etat_administratif: companyStatus,
          matching_etablissements: [{
            siret: '73282932000074',
            etat_administratif: establishmentStatus,
          }],
        }],
      }),
    });

    await expect(lookupSiret('73282932000074')).resolves.toBeNull();
  });

  it('fails closed when the external API is unavailable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(lookupSiret('73282932000074')).resolves.toBeNull();
  });
});
