import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { FALLBACK_POSITION, useUserLocation } from '@/hooks/use-user-location';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted' },
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

const mockPermission = Location.requestForegroundPermissionsAsync as jest.Mock;
const mockExistingPermission = Location.getForegroundPermissionsAsync as jest.Mock;
const mockServicesEnabled = Location.hasServicesEnabledAsync as jest.Mock;
const mockCurrent = Location.getCurrentPositionAsync as jest.Mock;
const mockWatch = Location.watchPositionAsync as jest.Mock;

beforeEach(() => {
  mockPermission.mockReset().mockResolvedValue({ status: 'granted' });
  mockExistingPermission.mockReset().mockResolvedValue({ status: 'granted' });
  mockServicesEnabled.mockReset().mockResolvedValue(true);
  mockCurrent.mockReset().mockResolvedValue({ coords: { latitude: 48.8566, longitude: 2.3522 } });
  mockWatch.mockReset().mockResolvedValue({ remove: jest.fn() });
});

describe('useUserLocation', () => {
  it('uses the current device position after consent', async () => {
    const { result } = await renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.isLocating).toBe(false));
    expect(result.current.position).toEqual({ latitude: 48.8566, longitude: 2.3522 });
    expect(result.current.source).toBe('device');
  });

  it('updates the position when the device moves', async () => {
    const { result } = await renderHook(() => useUserLocation());

    await waitFor(() => expect(mockWatch).toHaveBeenCalled());
    const onPosition = mockWatch.mock.calls[0][1];
    await act(async () => {
      onPosition({ coords: { latitude: 43.2965, longitude: 5.3698 } });
    });

    await waitFor(() =>
      expect(result.current.position).toEqual({ latitude: 43.2965, longitude: 5.3698 }),
    );
    expect(result.current.position).toEqual({ latitude: 43.2965, longitude: 5.3698 });
  });

  it('falls back to Lyon when permission is denied', async () => {
    mockPermission.mockResolvedValue({ status: 'denied' });
    const { result } = await renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.isLocating).toBe(false));
    expect(result.current.position).toEqual(FALLBACK_POSITION);
    expect(result.current.source).toBe('fallback');
    expect(result.current.message).toContain('Localisation refusée');
    expect(mockCurrent).not.toHaveBeenCalled();
  });

  it('explains when GPS services are disabled', async () => {
    mockServicesEnabled.mockResolvedValue(false);
    const { result } = await renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.isLocating).toBe(false));
    expect(result.current.position).toEqual(FALLBACK_POSITION);
    expect(result.current.message).toContain('GPS désactivé');
    expect(mockPermission).not.toHaveBeenCalled();
  });

  it('falls back cleanly when the location service fails', async () => {
    mockCurrent.mockRejectedValue(new Error('GPS unavailable'));
    const { result } = await renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.source).toBe('fallback'));
    expect(result.current.position).toEqual(FALLBACK_POSITION);
    expect(result.current.message).toContain('Position indisponible');
  });
});
