import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import ProfileScreen from '@/app/(tabs)/profile';
import { useAuth } from '@/context/auth';

jest.mock('@/context/auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({ backgroundSelected: '#eeeeee' }),
}));

const mockUseAuth = useAuth as jest.Mock;
const mockLogout = jest.fn();
const mockConfirm = jest.fn();
const originalConfirm = globalThis.confirm;

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'web');
  Object.defineProperty(globalThis, 'confirm', {
    value: mockConfirm.mockReturnValue(true),
    configurable: true,
  });
  mockLogout.mockResolvedValue(undefined);
  mockUseAuth.mockReturnValue({
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      pseudo: 'Admin',
      role: 'admin',
    },
    logout: mockLogout,
  });
});

afterAll(() => {
  Object.defineProperty(globalThis, 'confirm', {
    value: originalConfirm,
    configurable: true,
  });
});

describe('ProfileScreen — déconnexion web', () => {
  it('confirms in the browser then logs out', async () => {
    await render(<ProfileScreen />);

    await fireEvent.press(screen.getByLabelText('Se déconnecter'));

    expect(mockConfirm).toHaveBeenCalled();
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  });
});
