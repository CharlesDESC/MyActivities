import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useUnreadMessageCount } from '@/hooks/use-unread-message-count';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
}));

const listeners: Record<string, () => void> = {};
jest.mock('@/lib/socket', () => ({
  getRealtimeClient: () => ({
    on: (event: string, callback: () => void) => {
      listeners[event] = callback;
      return () => { delete listeners[event]; };
    },
  }),
}));

const mockGet = api.get as jest.Mock;

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({
    data: [{ unreadCount: 2 }, { unreadCount: 3 }],
  });
});

describe('useUnreadMessageCount', () => {
  it('sums unread messages from every conversation', async () => {
    const { result } = await renderHook(() => useUnreadMessageCount());
    await waitFor(() => expect(result.current).toBe(5));
    expect(mockGet).toHaveBeenCalledWith('/messages/conversations');
  });

  it.each(['message:new', 'conversation:read', 'conversation:new', 'conversation:updated'])(
    'refreshes the badge after %s',
    async (event) => {
      const { result } = await renderHook(() => useUnreadMessageCount());
      await waitFor(() => expect(result.current).toBe(5));
      mockGet.mockResolvedValueOnce({ data: [{ unreadCount: 1 }] });

      await act(async () => { listeners[event](); });

      await waitFor(() => expect(result.current).toBe(1));
    },
  );

  it('keeps navigation usable when the badge request fails', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useUnreadMessageCount());
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });
});
