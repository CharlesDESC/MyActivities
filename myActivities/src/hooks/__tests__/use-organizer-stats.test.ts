import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useOrganizerStats } from '@/hooks/use-organizer-stats';
import { api, ApiError } from '@/lib/api';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn() } };
});

const mockGet = api.get as jest.Mock;

beforeEach(() => mockGet.mockReset().mockResolvedValue([]));

async function mount() {
  const { result } = await renderHook(() => useOrganizerStats());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

describe('useOrganizerStats', () => {
  it('loads, normalizes and totals the organizer statistics', async () => {
    mockGet.mockResolvedValue([
      { activityId: 'a1', activityName: 'Poterie', views: 12, planningAdds: '3', avgRating: '4.5', reviewCount: 2 },
      { activityId: 'a2', activityName: 'Peinture', views: 8, planningAdds: 2, avgRating: null, reviewCount: 1 },
    ]);

    const result = await mount();

    expect(mockGet).toHaveBeenCalledWith('/organizers/me/stats');
    expect(result.current.stats[0]).toMatchObject({ views: 12, planningAdds: 3, avgRating: 4.5, reviewCount: 2 });
    expect(result.current.stats[1].avgRating).toBeNull();
    expect(result.current.totals).toEqual({ views: 20, planningAdds: 5, reviewCount: 3 });
  });

  it('falls back to zero for invalid numeric values', async () => {
    mockGet.mockResolvedValue([
      { activityId: 'a1', activityName: 'Poterie', views: Number.NaN, planningAdds: 'x', avgRating: '0', reviewCount: Number.NaN },
    ]);

    const result = await mount();

    expect(result.current.stats[0]).toMatchObject({ views: 0, planningAdds: 0, avgRating: 0, reviewCount: 0 });
  });

  it('exposes an API error', async () => {
    mockGet.mockRejectedValue(new ApiError('Accès refusé', 403));
    const result = await mount();
    expect(result.current.error).toBe('Accès refusé');
  });

  it('uses a generic message for an unexpected error', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const result = await mount();
    expect(result.current.error).toBe('Erreur de chargement');
  });

  it('refreshes and clears a previous error', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    const result = await mount();

    await act(async () => { await result.current.refresh(); });

    expect(result.current.error).toBeNull();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
