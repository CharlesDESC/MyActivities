import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import ChatScreen from '@/app/(tabs)/messages/[conversationId]';
import { useChat } from '@/hooks/use-chat';
import type { Message } from '@/types/message';

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  useLocalSearchParams: () => ({
    conversationId: 'new',
    recipientId: 'user-2',
    peerPseudo: 'Bob',
  }),
}));

jest.mock('@/context/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('@/hooks/use-realtime', () => ({ useRealtime: jest.fn() }));
jest.mock('@/hooks/use-chat', () => ({ useChat: jest.fn() }));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({
    backgroundElement: '#ffffff',
    text: '#111111',
    textSecondary: '#666666',
  }),
}));

const mockUseChat = useChat as jest.Mock;
const mockSend = jest.fn();
const sentMessage: Message = {
  id: 'message-1',
  conversationId: 'conversation-created',
  content: 'Bonjour',
  createdAt: '2026-07-22T17:00:00.000Z',
  readAt: null,
  sender: { id: 'user-1', pseudo: 'Alice', avatarUrl: null },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSend.mockResolvedValue(sentMessage);
  mockUseChat.mockReturnValue({
    messages: [],
    isLoading: false,
    isSending: false,
    error: null,
    send: mockSend,
    markRead: jest.fn(),
  });
});

describe('ChatScreen', () => {
  it('always returns to the conversations list', async () => {
    await render(<ChatScreen />);

    await fireEvent.press(screen.getByLabelText('Retour aux conversations'));

    expect(mockReplace).toHaveBeenCalledWith('/messages');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('replaces the new route with the persisted conversation after the first message', async () => {
    await render(<ChatScreen />);

    await act(async () => {
      fireEvent.changeText(screen.getByLabelText('Champ de message'), 'Bonjour');
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Envoyer'));
    });

    expect(mockSend).toHaveBeenCalledWith('Bonjour');
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/messages/[conversationId]',
      params: {
        conversationId: 'conversation-created',
        peerPseudo: 'Bob',
      },
    }));
  });
});
