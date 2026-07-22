import { renderHook, waitFor } from '@testing-library/react-native';

import { useActivityDetail } from '@/hooks/use-activity-detail';
import { api, ApiError } from '@/lib/api';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn() } };
});

const mockGet = api.get as jest.Mock;

const rawDetail = {
  id: 'act-1', name: 'Escalade', category: 'sport', description: 'Bloc indoor',
  address: '12 rue de la Paix', latitude: 48.86, longitude: 2.35,
  avgRating: '4.50', reviewCount: 12, priceMin: '10.00', priceMax: '25.00',
  coverImage: 'https://cdn/x.jpg', openingHours: { lundi: '9h-18h' },
  accessibility: { pmr: true, stroller: false },
  websiteUrl: null, photos: [],
  organizer: { id: 'org-1', pseudo: 'GrimpeClub' },
  createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z',
};

const rawReviews = {
  avgRating: '4.50', reviewCount: 12,
  data: [{ id: 'rev-1', rating: 5, createdAt: '2026-07-10T00:00:00.000Z', updatedAt: null,
    author: { id: 'user-2', pseudo: 'Bob', avatarUrl: null } }],
  meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

beforeEach(() => {
  mockGet.mockReset().mockImplementation((url: string) =>
    Promise.resolve(url.endsWith('/reviews') ? rawReviews : rawDetail),
  );
});

describe('useActivityDetail', () => {
  it('loads the activity and its reviews', async () => {
    const { result } = await renderHook(() => useActivityDetail('act-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGet).toHaveBeenCalledWith('/activities/act-1');
    expect(mockGet).toHaveBeenCalledWith('/activities/act-1/reviews');
    expect(result.current.error).toBeNull();
  });

  it('maps DECIMAL strings to numbers and flattens accessibility', async () => {
    const { result } = await renderHook(() => useActivityDetail('act-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activity).toMatchObject({
      avgRating: 4.5,
      priceMin: 10,
      priceMax: 25,
      accessibilityPmr: true,
      accessibilityStroller: false,
      coverImageUrl: 'https://cdn/x.jpg',
      organizer: { id: 'org-1', pseudo: 'GrimpeClub' },
    });
    expect(result.current.reviews?.avgRating).toBe(4.5);
    expect(result.current.reviews?.data[0]).toMatchObject({ id: 'rev-1', rating: 5 });
  });

  it('keeps a null avgRating as null', async () => {
    mockGet.mockImplementation((url: string) =>
      Promise.resolve(url.endsWith('/reviews')
        ? { ...rawReviews, avgRating: null }
        : { ...rawDetail, avgRating: null }),
    );
    const { result } = await renderHook(() => useActivityDetail('act-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activity?.avgRating).toBeNull();
    expect(result.current.reviews?.avgRating).toBeNull();
  });

  it('exposes the server message on failure', async () => {
    mockGet.mockRejectedValue(new ApiError('Activité introuvable.', 404));
    const { result } = await renderHook(() => useActivityDetail('act-1'));
    await waitFor(() => expect(result.current.error).toBe('Activité introuvable.'));
  });

  it('falls back to a generic message on a network error', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useActivityDetail('act-1'));
    await waitFor(() => expect(result.current.error).toBe('Erreur de chargement'));
  });
});
