import { act, renderHook, waitFor } from '@testing-library/react-native';

import { usePlanning } from '@/hooks/use-planning';
import { api, ApiError } from '@/lib/api';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } };
});

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockDelete = api.delete as jest.Mock;

const rawEntry = {
  id: 'plan-1',
  scheduledAt: '2026-08-01T10:00:00.000Z',
  reminderOffset: 30,
  createdAt: '2026-07-20T10:00:00.000Z',
  activity: {
    id: 'act-1',
    name: 'Escalade en salle',
    category: 'sport',
    address: '12 rue de la Paix, Paris',
    coverImage: 'https://cdn.example/act-1.jpg',
    avgRating: 4.5,
    reviewCount: 12,
    priceMin: 10,
    priceMax: 25,
    latitude: 48.86,
    longitude: 2.35,
  },
};

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ data: [] });
  mockPost.mockReset().mockResolvedValue({});
  mockDelete.mockReset().mockResolvedValue(undefined);
});

/** Monte le hook et attend la fin du chargement initial. */
async function mountPlanning() {
  const { result } = await renderHook(() => usePlanning());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

describe('usePlanning — chargement', () => {
  it('fetches the planning on mount', async () => {
    await mountPlanning();

    expect(mockGet).toHaveBeenCalledWith('/planning');
  });

  it('maps the API shape to the app model', async () => {
    mockGet.mockResolvedValue({ data: [rawEntry] });

    const result = await mountPlanning();

    expect(result.current.entries[0]).toMatchObject({
      id: 'plan-1',
      // le champ est renommé côté app
      reminderOffsetMinutes: 30,
      activity: {
        id: 'act-1',
        name: 'Escalade en salle',
        coverImageUrl: 'https://cdn.example/act-1.jpg',
      },
    });
  });

  it('keeps a null reminder as null', async () => {
    mockGet.mockResolvedValue({ data: [{ ...rawEntry, reminderOffset: null }] });

    const result = await mountPlanning();

    expect(result.current.entries[0].reminderOffsetMinutes).toBeNull();
  });

  it('starts with an empty planning without erroring', async () => {
    const result = await mountPlanning();

    expect(result.current.entries).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('exposes the server message on failure', async () => {
    mockGet.mockRejectedValue(new ApiError('Session expirée', 401));

    const { result } = await renderHook(() => usePlanning());

    await waitFor(() => expect(result.current.error).toBe('Session expirée'));
  });

  it('falls back to a generic message on a network failure', async () => {
    mockGet.mockRejectedValue(new Error('offline'));

    const { result } = await renderHook(() => usePlanning());

    await waitFor(() => expect(result.current.error).toBe('Erreur de chargement'));
  });
});

describe('usePlanning — retrait d\'une entrée', () => {
  it('deletes on the server then drops it from the local list', async () => {
    mockGet.mockResolvedValue({ data: [rawEntry, { ...rawEntry, id: 'plan-2' }] });
    const result = await mountPlanning();

    await act(async () => { await result.current.removeEntry('plan-1'); });

    expect(mockDelete).toHaveBeenCalledWith('/planning/plan-1');
    expect(result.current.entries.map((e) => e.id)).toEqual(['plan-2']);
  });

  it('leaves the list untouched when the delete fails', async () => {
    mockGet.mockResolvedValue({ data: [rawEntry] });
    mockDelete.mockRejectedValue(new ApiError('Accès refusé.', 403));
    const result = await mountPlanning();

    await expect(
      act(async () => { await result.current.removeEntry('plan-1'); }),
    ).rejects.toThrow('Accès refusé.');

    expect(result.current.entries).toHaveLength(1);
  });
});

describe('usePlanning — ajout d\'une entrée', () => {
  it('books a slot when a slotId is given', async () => {
    const result = await mountPlanning();

    await act(async () => { await result.current.addToPlanning('act-1', { slotId: 'slot-9' }); });

    expect(mockPost).toHaveBeenCalledWith('/planning', { activityId: 'act-1', slotId: 'slot-9' });
  });

  it('books a free date when a scheduledAt is given', async () => {
    const result = await mountPlanning();

    await act(async () => {
      await result.current.addToPlanning('act-1', { scheduledAt: '2026-08-01T10:00:00.000Z' });
    });

    expect(mockPost).toHaveBeenCalledWith('/planning', {
      activityId: 'act-1',
      scheduledAt: '2026-08-01T10:00:00.000Z',
    });
  });

  it('refreshes the planning after a successful add', async () => {
    const result = await mountPlanning();
    expect(mockGet).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.addToPlanning('act-1', { slotId: 'slot-9' }); });

    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('propagates a full-slot conflict to the caller', async () => {
    mockPost.mockRejectedValue(new ApiError('Ce créneau est complet.', 409));
    const result = await mountPlanning();

    await expect(
      act(async () => { await result.current.addToPlanning('act-1', { slotId: 'slot-9' }); }),
    ).rejects.toThrow('Ce créneau est complet.');
  });
});
