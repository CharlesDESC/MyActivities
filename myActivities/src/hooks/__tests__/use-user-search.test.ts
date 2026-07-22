import { act, renderHook } from '@testing-library/react-native';

import { useUserSearch } from '@/hooks/use-user-search';
import { api, ApiError } from '@/lib/api';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn() } };
});

const mockGet = api.get as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  mockGet.mockReset().mockResolvedValue({ data: [{ id: 'user-2', pseudo: 'Bob', avatarUrl: null }] });
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

/** Applique une requête (flush de l'effet passif) puis avance l'anti-rebond. */
async function type(result: { current: { setQuery: (q: string) => void } }, ...queries: string[]) {
  for (const q of queries) {
    await act(async () => { result.current.setQuery(q); });
  }
  await act(async () => { jest.advanceTimersByTime(300); });
}

describe('useUserSearch', () => {
  it('searches (debounced) and stores results', async () => {
    const { result } = await renderHook(() => useUserSearch());
    await type(result, 'bob');

    expect(mockGet).toHaveBeenCalledWith('/users/search?q=bob');
    expect(result.current.results).toHaveLength(1);
  });

  it('does not call the API for a blank query and clears results', async () => {
    const { result } = await renderHook(() => useUserSearch());
    await type(result, '   ');

    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('encodes the query string', async () => {
    const { result } = await renderHook(() => useUserSearch());
    await type(result, 'a b');
    expect(mockGet).toHaveBeenCalledWith('/users/search?q=a%20b');
  });

  it('debounces rapid typing into a single request', async () => {
    const { result } = await renderHook(() => useUserSearch());
    await type(result, 'b', 'bo', 'bob');

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/users/search?q=bob');
  });

  it('exposes the backend error code when search fails', async () => {
    mockGet.mockRejectedValue(new ApiError('Accès refusé', 403, 'FORBIDDEN'));
    const { result } = await renderHook(() => useUserSearch());
    await type(result, 'bob');

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBe('Accès refusé (code : FORBIDDEN)');
  });
});
