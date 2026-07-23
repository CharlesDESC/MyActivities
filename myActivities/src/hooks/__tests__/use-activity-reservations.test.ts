import { renderHook, waitFor } from '@testing-library/react-native';

import { useActivityReservations } from '@/hooks/use-activity-reservations';
import { api, ApiError } from '@/lib/api';
import type { ActivityReservations } from '@/types/activity';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn() } };
});

const mockGet = api.get as jest.Mock;

const DATA: ActivityReservations = {
  activityId: 'act-1',
  activityName: 'Atelier poterie',
  slots: [
    {
      id: 'slot-1', startsAt: '2099-08-15T10:00:00.000Z', endsAt: null,
      capacity: 20, booked: 2, remaining: 18,
      attendees: [
        { userId: 'u1', pseudo: 'Bob', avatarUrl: null, reservedAt: '2099-08-01T09:00:00.000Z' },
        { userId: 'u2', pseudo: 'Alice', avatarUrl: null, reservedAt: '2099-08-02T09:00:00.000Z' },
      ],
    },
    {
      id: 'slot-2', startsAt: '2099-08-16T10:00:00.000Z', endsAt: null,
      capacity: 10, booked: 1, remaining: 9,
      attendees: [{ userId: 'u3', pseudo: 'Chloé', avatarUrl: null, reservedAt: '2099-08-03T09:00:00.000Z' }],
    },
  ],
};

beforeEach(() => mockGet.mockReset().mockResolvedValue(DATA));

describe('useActivityReservations', () => {
  it('fetches reservations for the activity and sums the bookings', async () => {
    const { result } = await renderHook(() => useActivityReservations('act-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGet).toHaveBeenCalledWith('/organizers/me/activities/act-1/reservations');
    expect(result.current.reservations?.slots).toHaveLength(2);
    expect(result.current.totalBooked).toBe(3);
  });

  it('does not fetch without an activity id', async () => {
    const { result } = await renderHook(() => useActivityReservations(''));
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('exposes the server error message', async () => {
    mockGet.mockRejectedValue(new ApiError('Accès refusé', 403));
    const { result } = await renderHook(() => useActivityReservations('act-1'));
    await waitFor(() => expect(result.current.error).toBe('Accès refusé'));
    expect(result.current.totalBooked).toBe(0);
  });

  it('falls back to a generic message on an unexpected error', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useActivityReservations('act-1'));
    await waitFor(() => expect(result.current.error).toBe('Erreur de chargement'));
  });
});
