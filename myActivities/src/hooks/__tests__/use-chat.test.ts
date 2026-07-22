import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useChat } from '@/hooks/use-chat';
import { api, ApiError } from '@/lib/api';
import type { Message } from '@/types/message';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { get: jest.fn(), post: jest.fn() } };
});

const mockSendMessage = jest.fn();
const mockSendGroupMessage = jest.fn();
const mockMarkRead = jest.fn();
const listeners: Record<string, (payload: unknown) => void> = {};
jest.mock('@/lib/socket', () => ({
  getRealtimeClient: () => ({
    on: (event: string, cb: (payload: unknown) => void) => {
      listeners[event] = cb;
      return () => { delete listeners[event]; };
    },
    sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    sendGroupMessage: (...args: unknown[]) => mockSendGroupMessage(...args),
    markRead: (...args: unknown[]) => mockMarkRead(...args),
  }),
}));

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;

function msg(id: string, over: Partial<Message> = {}): Message {
  return {
    id, conversationId: 'conv-1', content: `m-${id}`, createdAt: `2026-07-21T10:0${id}:00.000Z`,
    readAt: null, sender: { id: 'user-1', pseudo: 'Alice', avatarUrl: null }, ...over,
  };
}

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ data: [] });
  mockPost.mockReset().mockResolvedValue(msg('9'));
  mockSendMessage.mockReset();
  mockSendGroupMessage.mockReset();
  mockMarkRead.mockReset().mockResolvedValue(undefined);
});

describe('useChat — historique', () => {
  it('loads history when a conversationId is provided', async () => {
    mockGet.mockResolvedValue({ data: [msg('1'), msg('2')] });
    const { result } = await renderHook(() => useChat({ conversationId: 'conv-1', recipientId: 'user-2' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGet).toHaveBeenCalledWith('/messages/conversations/conv-1');
    expect(result.current.messages.map((m) => m.id)).toEqual(['1', '2']);
  });

  it('does not load history for a brand new conversation', async () => {
    const { result } = await renderHook(() => useChat({ recipientId: 'user-2' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('useChat — envoi', () => {
  it('sends through the socket and appends the returned message', async () => {
    mockSendMessage.mockResolvedValue(msg('1'));
    const { result } = await renderHook(() => useChat({ conversationId: 'conv-1', recipientId: 'user-2' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.send('Bonjour'); });

    expect(mockSendMessage).toHaveBeenCalledWith({ recipientId: 'user-2', content: 'Bonjour' });
    expect(result.current.messages.map((m) => m.id)).toContain('1');
  });

  it('falls back to REST when the socket send fails', async () => {
    mockSendMessage.mockRejectedValue(new Error('SOCKET_OFFLINE'));
    mockPost.mockResolvedValue(msg('7'));
    const { result } = await renderHook(() => useChat({ conversationId: 'conv-1', recipientId: 'user-2' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.send('Bonjour'); });

    expect(mockPost).toHaveBeenCalledWith('/messages', { recipientId: 'user-2', content: 'Bonjour' });
    expect(result.current.messages.map((m) => m.id)).toContain('7');
  });

  it('adopts the conversationId returned on the first message', async () => {
    mockSendMessage.mockResolvedValue(msg('1', { conversationId: 'conv-new' }));
    const { result } = await renderHook(() => useChat({ recipientId: 'user-2' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.send('Premier'); });
    expect(result.current.conversationId).toBe('conv-new');
  });

  it('sends to a group via the conversation id (no recipientId)', async () => {
    mockSendGroupMessage.mockResolvedValue(msg('1', { conversationId: 'grp-1' }));
    const { result } = await renderHook(() => useChat({ conversationId: 'grp-1' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.send('Salut le groupe'); });

    expect(mockSendGroupMessage).toHaveBeenCalledWith({ conversationId: 'grp-1', content: 'Salut le groupe' });
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(result.current.messages.map((m) => m.id)).toContain('1');
  });

  it('falls back to REST for a group when the socket send fails', async () => {
    mockSendGroupMessage.mockRejectedValue(new Error('SOCKET_OFFLINE'));
    mockPost.mockResolvedValue(msg('8', { conversationId: 'grp-1' }));
    const { result } = await renderHook(() => useChat({ conversationId: 'grp-1' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.send('Salut'); });

    expect(mockPost).toHaveBeenCalledWith('/messages/conversations/grp-1', { content: 'Salut' });
    expect(result.current.messages.map((m) => m.id)).toContain('8');
  });

  it('ignores an empty draft', async () => {
    const { result } = await renderHook(() => useChat({ conversationId: 'conv-1', recipientId: 'user-2' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.send('   '); });
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('surfaces the error and rethrows when both channels fail', async () => {
    mockSendMessage.mockRejectedValue(new Error('SOCKET_OFFLINE'));
    mockPost.mockRejectedValue(new ApiError('Destinataire introuvable.', 404));
    const { result } = await renderHook(() => useChat({ conversationId: 'conv-1', recipientId: 'user-2' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.send('x')).rejects.toThrow('Destinataire introuvable.');
    });
    await waitFor(() => expect(result.current.error).toBe('Destinataire introuvable.'));
  });
});

describe('useChat — temps réel & lecture', () => {
  it('appends an incoming message for this conversation only', async () => {
    const { result } = await renderHook(() => useChat({ conversationId: 'conv-1', recipientId: 'user-2' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { listeners['message:new'](msg('5', { conversationId: 'conv-1' })); });
    expect(result.current.messages.map((m) => m.id)).toContain('5');

    await act(async () => { listeners['message:new'](msg('6', { conversationId: 'other' })); });
    expect(result.current.messages.map((m) => m.id)).not.toContain('6');
  });

  it('marks the conversation read through the socket', async () => {
    const { result } = await renderHook(() => useChat({ conversationId: 'conv-1', recipientId: 'user-2' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.markRead(); });
    expect(mockMarkRead).toHaveBeenCalledWith('conv-1');
  });
});
