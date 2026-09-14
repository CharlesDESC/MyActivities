import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useGroupActivities } from '@/hooks/use-group-activities';
import { api, ApiError } from '@/lib/api';

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => jest.requireActual('react').useEffect(callback, [callback]),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'), api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));
const listeners: Record<string, (event: { conversationId: string }) => void> = {};
jest.mock('@/lib/socket', () => ({ getRealtimeClient: () => ({
  on: (event: string, callback: (event: { conversationId: string }) => void) => {
    listeners[event] = callback;
    return () => { delete listeners[event]; };
  },
}) }));
const get = api.get as jest.Mock;
const post = api.post as jest.Mock;
const remove = api.delete as jest.Mock;
const details = { id: 'g', type: 'group', participants: [{ id: 'u', role: 'member' }] };
const proposal = { id: 'a', name: 'Bowling', available: true, addedBy: 'u' };

beforeEach(() => {
  jest.resetAllMocks();
  get.mockImplementation(async (path: string) => path.endsWith('/details') ? details : { data: [proposal], hasMore: false });
});
async function mount() {
  const hook = await renderHook(() => useGroupActivities('g'));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

it('loads persisted proposals for ordinary members', async () => {
  const { result } = await mount();
  expect(result.current.conversation).toEqual(details);
  expect(result.current.activities).toEqual([proposal]);
});
it('does not request group activities for a direct conversation', async () => {
  get.mockResolvedValue({ ...details, type: 'direct' });
  const { result } = await mount();
  expect(get).toHaveBeenCalledTimes(1);
  expect(result.current.activities).toEqual([]);
});
it.each([false, true])('saves then reloads for remove=%s', async (removing) => {
  const { result } = await mount();
  await act(async () => { expect(await result.current.change('a', removing)).toBe(true); });
  expect(removing ? remove : post).toHaveBeenCalled();
  expect(get).toHaveBeenCalledTimes(4);
  expect(result.current.busy).toBe(false);
});
it('retains proposals and exposes a duplicate error', async () => {
  post.mockRejectedValue(new ApiError('Déjà proposée', 409));
  const { result } = await mount();
  await act(async () => { expect(await result.current.change('a')).toBe(false); });
  expect(result.current.error).toBe('Déjà proposée');
  expect(result.current.activities).toEqual([proposal]);
});
it('prevents duplicate submissions while a write is pending', async () => {
  let resolve!: () => void;
  post.mockReturnValue(new Promise<void>((r) => { resolve = r; }));
  const { result } = await mount();
  await act(async () => {
    const pending = result.current.change('a');
    expect(await result.current.change('a')).toBe(false);
    resolve();
    await pending;
  });
  expect(post).toHaveBeenCalledTimes(1);
});
it('reloads only for changes to this conversation and unsubscribes', async () => {
  const { unmount } = await mount();
  await act(async () => { listeners['conversation:updated']({ conversationId: 'other' }); });
  expect(get).toHaveBeenCalledTimes(2);
  await act(async () => { listeners['conversation:updated']({ conversationId: 'g' }); });
  expect(get).toHaveBeenCalledTimes(4);
  await unmount();
  expect(listeners['conversation:updated']).toBeUndefined();
});
it('clears private data after membership is revoked', async () => {
  const { result } = await mount();
  get.mockRejectedValue(new ApiError('Accès refusé', 403));
  await act(async () => { await result.current.refresh(); });
  expect(result.current.activities).toEqual([]);
  expect(result.current.conversation).toBeNull();
  expect(result.current.error).toBe('Accès refusé');
});
it('paginates and deduplicates proposals', async () => {
  get.mockImplementation(async (path: string) => path.endsWith('/details') ? details : { data: [proposal], hasMore: true });
  const { result } = await mount();
  get.mockResolvedValue({ data: [proposal, { ...proposal, id: 'b' }], hasMore: false });
  await act(async () => { await result.current.loadMore(); });
  expect(get).toHaveBeenLastCalledWith('/messages/groups/g/activities?limit=20&page=2');
  expect(result.current.activities.map((p) => p.id)).toEqual(['a', 'b']);
  expect(result.current.hasMore).toBe(false);
});
it('keeps the list and allows retry when pagination fails', async () => {
  get.mockImplementation(async (path: string) => path.endsWith('/details') ? details : { data: [proposal], hasMore: true });
  const { result } = await mount();
  get.mockRejectedValue(new Error('offline'));
  await act(async () => { await result.current.loadMore(); });
  expect(result.current.activities).toEqual([proposal]);
  expect(result.current.error).toBe('Chargement impossible.');
  expect(result.current.loading).toBe(false);
});
it('encodes a search and supports later pages', async () => {
  const { result } = await mount();
  await act(async () => { await result.current.search('  Café & sport  ', 2); });
  expect(get).toHaveBeenLastCalledWith('/messages/groups/g/activity-search?search=Caf%C3%A9%20%26%20sport&limit=20&page=2');
});
it('ignores an older refresh that completes after the latest one', async () => {
  const { result } = await mount();
  let resolve!: (data: unknown) => void;
  get.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
  await act(async () => {
    const old = result.current.refresh();
    get.mockResolvedValueOnce(details).mockResolvedValueOnce({ data: [], hasMore: false });
    await result.current.refresh();
    resolve(details);
    await old;
  });
  expect(result.current.activities).toEqual([]);
});
