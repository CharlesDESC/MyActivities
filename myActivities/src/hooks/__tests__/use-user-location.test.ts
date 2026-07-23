import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useUserLocation } from '@/hooks/use-user-location';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted' },
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

const mockPermission = Location.requestForegroundPermissionsAsync as jest.Mock;
const mockExistingPermission = Location.getForegroundPermissionsAsync as jest.Mock;
const mockServicesEnabled = Location.hasServicesEnabledAsync as jest.Mock;
const mockLastKnown = Location.getLastKnownPositionAsync as jest.Mock;
const mockCurrent = Location.getCurrentPositionAsync as jest.Mock;
const mockWatch = Location.watchPositionAsync as jest.Mock;

beforeEach(() => {
  mockPermission.mockReset().mockResolvedValue({ status: 'granted' });
  mockExistingPermission.mockReset().mockResolvedValue({ status: 'granted' });
  mockServicesEnabled.mockReset().mockResolvedValue(true);
  mockLastKnown.mockReset().mockResolvedValue(null);
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
      expect(result.current.position).toEqual({ latitude: 43.2965, longitude: 5.3698 })
    );
    expect(result.current.position).toEqual({ latitude: 43.2965, longitude: 5.3698 });
  });

  it('uses a recent last known position when the current request fails', async () => {
    mockLastKnown.mockResolvedValue({
      coords: { latitude: 44.8378, longitude: -0.5792 },
      timestamp: Date.now(),
    });
    mockCurrent.mockRejectedValue(new Error('GPS unavailable'));
    const { result } = await renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.isLocating).toBe(false));
    expect(result.current.position).toEqual({ latitude: 44.8378, longitude: -0.5792 });
    expect(result.current.source).toBe('device');
    expect(result.current.message).toBeNull();
  });

  it('does not expose a fallback position when permission is denied', async () => {
    mockPermission.mockResolvedValue({ status: 'denied' });
    const { result } = await renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.isLocating).toBe(false));
    expect(result.current.position).toBeNull();
    expect(result.current.source).toBe('unavailable');
    expect(result.current.message).toContain('localisation refusée');
    expect(mockCurrent).not.toHaveBeenCalled();
  });

  it('explains when GPS services are disabled', async () => {
    mockServicesEnabled.mockResolvedValue(false);
    const { result } = await renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.isLocating).toBe(false));
    expect(result.current.position).toBeNull();
    expect(result.current.source).toBe('unavailable');
    expect(result.current.message).toContain('GPS est désactivé');
    expect(mockPermission).not.toHaveBeenCalled();
  });

  it('keeps geolocated screens disabled when the location service fails', async () => {
    mockCurrent.mockRejectedValue(new Error('GPS unavailable'));
    const { result } = await renderHook(() => useUserLocation());

    await waitFor(() => expect(result.current.source).toBe('unavailable'));
    expect(result.current.position).toBeNull();
    expect(result.current.message).toContain('Position indisponible');
  });
});
