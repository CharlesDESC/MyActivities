import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useOrganizerActivities } from '@/hooks/use-organizer-activities';
import { api, ApiError } from '@/lib/api';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn() } };
});

const mockGet = api.get as jest.Mock;

const RAW_ACTIVITY = {
  id: 'act-1',
  name: 'Atelier poterie',
  category: 'art' as const,
  description: 'Une description suffisamment longue.',
  address: '10 rue des Arts',
  latitude: 48.85,
  longitude: 2.35,
  avgRating: '4.5',
  reviewCount: 8,
  priceMin: '15.50',
  priceMax: '30',
  coverImageUrl: null,
  openingHours: null,
  accessibilityPmr: true,
  accessibilityStroller: false,
  websiteUrl: null,
  photos: [],
  organizer: { id: 'org-1', pseudo: 'Organisateur' },
  status: 'published' as const,
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
};

beforeEach(() => mockGet.mockReset().mockResolvedValue({ data: [] }));

async function mount(status?: 'pending' | 'published') {
  const { result } = await renderHook(() => useOrganizerActivities(status));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

describe('useOrganizerActivities', () => {
  it('loads every activity when no status is selected', async () => {
    await mount();
    expect(mockGet).toHaveBeenCalledWith('/organizers/me/activities?limit=100');
  });

  it('adds the selected status to the query', async () => {
    await mount('pending');
    expect(mockGet).toHaveBeenCalledWith('/organizers/me/activities?status=pending&limit=100');
  });

  it('normalizes PostgreSQL decimal strings and preserves null ratings', async () => {
    mockGet.mockResolvedValue({
      data: [RAW_ACTIVITY, { ...RAW_ACTIVITY, id: 'act-2', avgRating: null, priceMin: 0, priceMax: 10 }],
    });

    const result = await mount();

    expect(result.current.activities[0]).toMatchObject({ priceMin: 15.5, priceMax: 30, avgRating: 4.5 });
    expect(result.current.activities[1].avgRating).toBeNull();
  });

  it('exposes an API error', async () => {
    mockGet.mockRejectedValue(new ApiError('Accès refusé', 403));
    const result = await mount();
    expect(result.current.error).toBe('Accès refusé');
  });

  it('uses a generic message for a network failure', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const result = await mount();
    expect(result.current.error).toBe('Erreur de chargement');
  });

  it('can refresh after a failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: [RAW_ACTIVITY] });
    const result = await mount();

    await act(async () => { await result.current.refresh(); });

    expect(result.current.error).toBeNull();
    expect(result.current.activities).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
