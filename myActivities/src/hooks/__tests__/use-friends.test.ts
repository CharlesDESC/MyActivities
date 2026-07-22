import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFriends } from '@/hooks/use-friends';
import { api, ApiError } from '@/lib/api';
import type { Friend, FriendRequest } from '@/types/friend';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() } };
});

const listeners: Record<string, (payload: unknown) => void> = {};
jest.mock('@/lib/socket', () => ({
  getRealtimeClient: () => ({
    on: (event: string, cb: (payload: unknown) => void) => {
      listeners[event] = cb;
      return () => { delete listeners[event]; };
    },
  }),
}));

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
const mockDelete = api.delete as jest.Mock;

const friend: Friend = { id: 'user-2', pseudo: 'Bob', avatarUrl: null, friendsSince: '2026-07-20T10:00:00.000Z' };
const incoming: FriendRequest = { id: 'req-1', direction: 'incoming', user: { id: 'user-3', pseudo: 'Carol', avatarUrl: null }, createdAt: '2026-07-21T10:00:00.000Z' };
const outgoing: FriendRequest = { id: 'req-2', direction: 'outgoing', user: { id: 'user-4', pseudo: 'Dan', avatarUrl: null }, createdAt: '2026-07-21T10:00:00.000Z' };

function stubLists() {
  mockGet.mockImplementation((path: string) =>
    path === '/friends'
      ? Promise.resolve({ data: [friend] })
      : Promise.resolve({ data: [incoming, outgoing] }),
  );
}

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset().mockResolvedValue({});
  mockDelete.mockReset().mockResolvedValue(undefined);
  stubLists();
});

async function mountHook() {
  const { result } = await renderHook(() => useFriends());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

describe('useFriends', () => {
  it('loads friends and requests on mount, splitting by direction', async () => {
    const result = await mountHook();
    expect(mockGet).toHaveBeenCalledWith('/friends');
    expect(mockGet).toHaveBeenCalledWith('/friends/requests');
    expect(result.current.friends).toHaveLength(1);
    expect(result.current.incoming.map((r) => r.id)).toEqual(['req-1']);
    expect(result.current.outgoing.map((r) => r.id)).toEqual(['req-2']);
  });

  it('sends a friend request then refreshes', async () => {
    const result = await mountHook();
    await act(async () => { await result.current.sendRequest('user-9'); });
    expect(mockPost).toHaveBeenCalledWith('/friends/requests', { addresseeId: 'user-9' });
    expect(mockGet).toHaveBeenCalledTimes(4); // 2 au montage + 2 au refresh
  });

  it('accepts a request', async () => {
    const result = await mountHook();
    await act(async () => { await result.current.accept('req-1'); });
    expect(mockPost).toHaveBeenCalledWith('/friends/requests/req-1/accept');
  });

  it('declines a request', async () => {
    const result = await mountHook();
    await act(async () => { await result.current.decline('req-1'); });
    expect(mockPost).toHaveBeenCalledWith('/friends/requests/req-1/decline');
  });

  it('removes a friend', async () => {
    const result = await mountHook();
    await act(async () => { await result.current.remove('user-2'); });
    expect(mockDelete).toHaveBeenCalledWith('/friends/user-2');
  });

  it('refreshes on a realtime friend:request event', async () => {
    await mountHook();
    await act(async () => { listeners['friend:request']({ requestId: 'req-x' }); });
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(4));
  });

  it('exposes a mutation error instead of creating an unhandled rejection', async () => {
    mockPost.mockRejectedValue(new ApiError('Demande déjà envoyée', 409, 'REQUEST_EXISTS'));
    const result = await mountHook();

    await act(async () => { await result.current.sendRequest('user-9'); });

    expect(result.current.error).toBe('Demande déjà envoyée (code : REQUEST_EXISTS)');
  });

  it('exposes an error message on failure', async () => {
    mockGet.mockReset().mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useFriends());
    await waitFor(() => expect(result.current.error).toBe('Erreur de chargement'));
  });
});
