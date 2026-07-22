import { renderHook, waitFor } from '@testing-library/react-native';

import { useRealtime } from '@/hooks/use-realtime';

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
jest.mock('@/lib/socket', () => ({
  getRealtimeClient: () => ({ connect: mockConnect, disconnect: mockDisconnect }),
}));

let mockUser: { id: string } | null = null;
jest.mock('@/context/auth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

beforeEach(() => {
  mockConnect.mockReset();
  mockDisconnect.mockReset();
  mockUser = null;
});

describe('useRealtime', () => {
  it('connects when a user is authenticated', async () => {
    mockUser = { id: 'user-1' };
    await renderHook(() => useRealtime());
    await waitFor(() => expect(mockConnect).toHaveBeenCalled());
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it('disconnects when there is no user', async () => {
    mockUser = null;
    await renderHook(() => useRealtime());
    await waitFor(() => expect(mockDisconnect).toHaveBeenCalled());
    expect(mockConnect).not.toHaveBeenCalled();
  });
});
