import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import type { MapPosition } from '@/lib/map';

export const FALLBACK_POSITION: MapPosition = { latitude: 45.764, longitude: 4.8357 };

type LocationSource = 'device' | 'fallback';

type UserLocationState = {
  position: MapPosition | null;
  source: LocationSource | null;
  isLocating: boolean;
  message: string | null;
  refresh: () => Promise<void>;
};

/**
 * Demande la position au premier affichage. Le refus ou une panne GPS ne bloque
 * jamais l'application : Lyon reste le centre de repli, clairement signalé.
 */
export function useUserLocation(): UserLocationState {
  const mounted = useRef(true);
  const [state, setState] = useState<Omit<UserLocationState, 'refresh'>>({
    position: null,
    source: null,
    isLocating: true,
    message: null,
  });

  const applyDevicePosition = useCallback((location: Location.LocationObject) => {
    if (!mounted.current) return;
    setState({
      position: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      source: 'device',
      isLocating: false,
      message: null,
    });
  }, []);

  const refresh = useCallback(async () => {
    if (mounted.current) setState((previous) => ({ ...previous, isLocating: true }));
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        if (mounted.current) {
          setState({
            position: FALLBACK_POSITION,
            source: 'fallback',
            isLocating: false,
            message: 'GPS désactivé : active la localisation puis actualise la page.',
          });
        }
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        if (mounted.current) {
          setState({
            position: FALLBACK_POSITION,
            source: 'fallback',
            isLocating: false,
            message: 'Localisation refusée : autorise-la dans les réglages du téléphone.',
          });
        }
        return;
      }

      // Une position courante évite de rester bloqué sur une ancienne position
      // mise en cache par l'émulateur ou le téléphone.
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      });
      applyDevicePosition(location);
    } catch {
      if (mounted.current) {
        setState({
          position: FALLBACK_POSITION,
          source: 'fallback',
          isLocating: false,
          message: 'Position indisponible : vérifie le GPS puis actualise la page.',
        });
      }
    }
  }, [applyDevicePosition]);

  useEffect(() => {
    mounted.current = true;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function startLocation() {
      await refresh();
      if (cancelled) return;

      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== Location.PermissionStatus.GRANTED) return;

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 100,
            timeInterval: 30_000,
          },
          applyDevicePosition,
        );
      } catch {
        // La position ponctuelle reste utilisable si le suivi continu échoue.
      }
    }

    void startLocation();
    return () => {
      cancelled = true;
      mounted.current = false;
      subscription?.remove();
    };
  }, [applyDevicePosition, refresh]);

  return { ...state, refresh };
}
