import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useNearbyActivities } from '@/hooks/use-activities';
import { api, ApiError } from '@/lib/api';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn() } };
});

const mockGet = api.get as jest.Mock;

const PARIS = { latitude: 48.8566, longitude: 2.3522 };

// Le backend renvoie les DECIMAL PostgreSQL en chaînes : le hook doit les convertir.
const rawItem = {
  id: 'act-1',
  name: 'Escalade en salle',
  category: 'sport',
  address: '12 rue de la Paix, Paris',
  coverImage: null,
  avgRating: '4.5',
  reviewCount: 12,
  priceMin: '10.00',
  priceMax: '25.50',
  latitude: 48.86,
  longitude: 2.35,
  distance: '1200.75',
};

beforeEach(() => {
  mockGet.mockReset();
  mockGet.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } });
});

describe('useNearbyActivities — requête', () => {
  it('queries the backend with the centre and radius', async () => {
    await renderHook(() => useNearbyActivities(PARIS, 10));

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('lat=48.8566');
    expect(url).toContain('lng=2.3522');
    expect(url).toContain('radius=10');
  });

  it('defaults the radius to 50 km', async () => {
    await renderHook(() => useNearbyActivities(PARIS));

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockGet.mock.calls[0][0]).toContain('radius=50');
  });

  it('refetches when the centre moves', async () => {
    const { result } = await renderHook(() => useNearbyActivities(PARIS));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.refetch(); });

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});

describe('useNearbyActivities — conversion des données', () => {
  it('converts the string decimals coming from PostgreSQL to numbers', async () => {
    mockGet.mockResolvedValue({ data: [rawItem], meta: {} });

    const { result } = await renderHook(() => useNearbyActivities(PARIS));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activities[0]).toMatchObject({
      id: 'act-1',
      name: 'Escalade en salle',
      avgRating: 4.5,
      priceMin: 10,
      priceMax: 25.5,
      distance: 1200.75,
    });
  });

  it('maps a null rating to 0 so the stars render', async () => {
    mockGet.mockResolvedValue({ data: [{ ...rawItem, avgRating: null }], meta: {} });

    const { result } = await renderHook(() => useNearbyActivities(PARIS));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activities[0].avgRating).toBe(0);
  });

  it('keeps a null cover image as null', async () => {
    mockGet.mockResolvedValue({ data: [rawItem], meta: {} });

    const { result } = await renderHook(() => useNearbyActivities(PARIS));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activities[0].coverImage).toBeNull();
  });

  it('returns an empty list when nothing is nearby', async () => {
    const { result } = await renderHook(() => useNearbyActivities(PARIS));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activities).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

describe('useNearbyActivities — erreurs', () => {
  it('exposes the server message', async () => {
    mockGet.mockRejectedValue(new ApiError('Service indisponible', 503));

    const { result } = await renderHook(() => useNearbyActivities(PARIS));

    await waitFor(() => expect(result.current.error).toBe('Service indisponible'));
    expect(result.current.isLoading).toBe(false);
  });

  it('falls back to a generic message on a network failure', async () => {
    mockGet.mockRejectedValue(new Error('offline'));

    const { result } = await renderHook(() => useNearbyActivities(PARIS));

    await waitFor(() => expect(result.current.error).toBe('Erreur de chargement'));
  });

  it('clears a previous error on a successful refetch', async () => {
    mockGet.mockRejectedValueOnce(new ApiError('Boom', 500));
    const { result } = await renderHook(() => useNearbyActivities(PARIS));
    await waitFor(() => expect(result.current.error).toBe('Boom'));

    mockGet.mockResolvedValue({ data: [rawItem], meta: {} });
    await act(async () => { await result.current.refetch(); });

    expect(result.current.error).toBeNull();
    expect(result.current.activities).toHaveLength(1);
  });
});
