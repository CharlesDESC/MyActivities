jest.mock('../../config', () => ({
  config: { mapbox: { accessToken: 'pk.test' } },
}));

import { resolvePermanentAddress, searchAddresses } from '../../lib/mapbox-geocoding';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch as typeof fetch;

const feature = {
  geometry: { coordinates: [4.835, 45.767] },
  properties: {
    mapbox_id: 'address.123',
    full_address: '12 rue de la République, 69001 Lyon, France',
  },
};

beforeEach(() => {
  mockFetch.mockReset().mockResolvedValue({
    ok: true,
    json: async () => ({ features: [feature] }),
  });
});

describe('Mapbox geocoding', () => {
  it('returns temporary address suggestions', async () => {
    const result = await searchAddresses('12 rue de la République');

    expect(result[0]).toEqual({
      mapboxId: 'address.123',
      address: '12 rue de la République, 69001 Lyon, France',
      latitude: 45.767,
      longitude: 4.835,
    });
    const url = String(mockFetch.mock.calls[0][0]);
    expect(url).toContain('permanent=false');
    expect(url).toContain('autocomplete=true');
    expect(url).toContain('country=fr');
  });

  it('resolves the selected address with permanent storage enabled', async () => {
    await resolvePermanentAddress('address.123');

    const url = String(mockFetch.mock.calls[0][0]);
    expect(url).toContain('q=address.123');
    expect(url).toContain('permanent=true');
    expect(url).toContain('autocomplete=false');
  });

  it('throws a controlled error when Mapbox rejects the request', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(searchAddresses('12 rue')).rejects.toMatchObject({
      statusCode: 502,
      code: 'MAPBOX_ERROR',
    });
  });

  it('throws when the permanent address no longer exists', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) });
    await expect(resolvePermanentAddress('address.missing')).rejects.toMatchObject({
      statusCode: 422,
      code: 'ADDRESS_NOT_FOUND',
    });
  });
});
