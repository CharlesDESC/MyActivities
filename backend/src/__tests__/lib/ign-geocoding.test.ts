import { resolveAddress, searchAddresses } from '../../lib/ign-geocoding';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as typeof fetch;

const feature = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [4.835, 45.767] },
  properties: {
    id: '69381_1234',
    banId: 'ban-address-123',
    label: '12 rue de la République 69001 Lyon',
  },
};

beforeEach(() => {
  mockFetch.mockReset().mockResolvedValue({
    ok: true,
    json: async () => ({ type: 'FeatureCollection', features: [feature] }),
  });
});

describe('IGN geocoding', () => {
  it('returns normalized address suggestions', async () => {
    const result = await searchAddresses('12 rue de la République');

    expect(result[0]).toEqual({
      addressId: 'ban-address-123',
      address: '12 rue de la République 69001 Lyon',
      latitude: 45.767,
      longitude: 4.835,
    });
    const url = String(mockFetch.mock.calls[0][0]);
    expect(url).toContain('https://data.geopf.fr/geocodage/search?');
    expect(url).toContain('index=address');
    expect(url).toContain('limit=5');
    expect(url).toContain('q=12+rue+de+la+R%C3%A9publique');
  });

  it('verifies the selected address against a fresh IGN response', async () => {
    const result = await resolveAddress(
      'ban-address-123',
      '12 rue de la République 69001 Lyon',
    );

    expect(result.addressId).toBe('ban-address-123');
    const url = String(mockFetch.mock.calls[0][0]);
    expect(url).toContain('limit=10');
  });

  it('throws a controlled error when the Géoplateforme rejects the request', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(searchAddresses('12 rue')).rejects.toMatchObject({
      statusCode: 502,
      code: 'GEOPLATFORM_ERROR',
    });
  });

  it('throws when the selected address no longer exists', async () => {
    await expect(resolveAddress('ban-address-missing', '12 rue')).rejects.toMatchObject({
      statusCode: 422,
      code: 'ADDRESS_NOT_FOUND',
    });
  });

  it('ignores malformed features', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [{ properties: { label: 'Sans coordonnées' } }] }),
    });
    await expect(searchAddresses('12 rue')).resolves.toEqual([]);
  });
});
