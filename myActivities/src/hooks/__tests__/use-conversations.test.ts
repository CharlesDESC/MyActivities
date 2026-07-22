import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useConversations } from '@/hooks/use-conversations';
import { api, ApiError } from '@/lib/api';
import type { Conversation } from '@/types/message';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn() } };
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

const conversation: Conversation = {
  id: 'conv-1',
  type: 'direct',
  title: null,
  otherParticipant: { id: 'user-2', pseudo: 'Bob', avatarUrl: null },
  participants: [{ id: 'user-2', pseudo: 'Bob', avatarUrl: null, role: 'member' }],
  lastMessage: { content: 'Salut', createdAt: '2026-07-21T10:00:00.000Z', senderId: 'user-2' },
  unreadCount: 2,
  updatedAt: '2026-07-21T10:00:00.000Z',
};

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ data: [conversation] });
});

async function mountHook() {
  const { result } = await renderHook(() => useConversations());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

describe('useConversations', () => {
  it('fetches conversations on mount', async () => {
    const result = await mountHook();
    expect(mockGet).toHaveBeenCalledWith('/messages/conversations');
    expect(result.current.conversations).toHaveLength(1);
  });

  it('exposes the server message on failure', async () => {
    mockGet.mockRejectedValue(new ApiError('Session expirée', 401));
    const { result } = await renderHook(() => useConversations());
    await waitFor(() => expect(result.current.error).toBe('Session expirée'));
  });

  it('falls back to a generic message on a network error', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useConversations());
    await waitFor(() => expect(result.current.error).toBe('Erreur de chargement'));
  });

  it('refreshes the list when a realtime message arrives', async () => {
    await mountHook();
    expect(mockGet).toHaveBeenCalledTimes(1);

    await act(async () => { listeners['message:new']({}); });
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });

  it('refreshes the list on a read receipt', async () => {
    await mountHook();
    await act(async () => { listeners['conversation:read']({}); });
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });

  it('refreshes when added to a new conversation (group)', async () => {
    await mountHook();
    await act(async () => { listeners['conversation:new']({ conversationId: 'grp-1' }); });
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });

  it('refreshes when a conversation is updated', async () => {
    await mountHook();
    await act(async () => { listeners['conversation:updated']({ conversationId: 'grp-1' }); });
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });
});
