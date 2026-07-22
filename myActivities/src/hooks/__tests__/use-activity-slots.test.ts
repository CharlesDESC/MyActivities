import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useActivitySlots } from '@/hooks/use-activity-slots';
import { api, ApiError } from '@/lib/api';
import type { ActivitySlot } from '@/types/activity';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn() } };
});

const mockGet = api.get as jest.Mock;

const slot: ActivitySlot = {
  id: 'slot-1', startsAt: '2026-08-01T10:00:00.000Z', endsAt: '2026-08-01T12:00:00.000Z',
  capacity: 10, booked: 3, remaining: 7,
};

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ data: [slot] });
});

async function mountHook() {
  const { result } = await renderHook(() => useActivitySlots('act-1'));
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

describe('useActivitySlots', () => {
  it('fetches the slots of the activity on mount', async () => {
    const result = await mountHook();
    expect(mockGet).toHaveBeenCalledWith('/activities/act-1/slots');
    expect(result.current.slots).toEqual([slot]);
    expect(result.current.error).toBeNull();
  });

  it('exposes the server message on failure', async () => {
    mockGet.mockRejectedValue(new ApiError('Activité introuvable.', 404));
    const { result } = await renderHook(() => useActivitySlots('act-1'));
    await waitFor(() => expect(result.current.error).toBe('Activité introuvable.'));
  });

  it('falls back to a generic message on a network error', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useActivitySlots('act-1'));
    await waitFor(() => expect(result.current.error).toBe('Erreur de chargement'));
  });

  it('refetches on demand', async () => {
    const result = await mountHook();
    expect(mockGet).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.refetch(); });
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
