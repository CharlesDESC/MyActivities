import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

import type { MapPosition } from '@/lib/map';

type LocationSource = 'device' | 'unavailable';

type UserLocationState = {
  position: MapPosition | null;
  source: LocationSource | null;
  isLocating: boolean;
  message: string | null;
  refresh: () => Promise<void>;
};

const CURRENT_POSITION_TIMEOUT_MS = 5_000;
const LAST_POSITION_MAX_AGE_MS = 15 * 60_000;

function logLocation(step: string, details?: unknown): void {
  if (!__DEV__) return;
  const prefix = `[location] ${step}`;
  if (details === undefined) {
    console.info(prefix);
    return;
  }
  console.info(prefix, details);
}

function logLocationError(step: string, error: unknown): void {
  if (!__DEV__) return;
  const details =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          code: 'code' in error ? error.code : undefined,
        }
      : error;
  // console.info conserve la trace de debug sans ouvrir la LogBox rouge.
  console.info(`[location] ${step}`, details);
}

async function getCurrentPositionWithTimeout(): Promise<Location.LocationObject> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Délai GPS dépassé (${CURRENT_POSITION_TIMEOUT_MS} ms)`)),
      CURRENT_POSITION_TIMEOUT_MS
    );
  });

  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      }),
      timeout,
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

/**
 * Demande la position au premier affichage. Sans position réelle, aucune
 * coordonnée de secours n'est utilisée : les écrans géolocalisés restent désactivés.
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
    logLocation('position reçue', {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    });
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
    const startedAt = Date.now();
    let lastKnownPosition: Location.LocationObject | null = null;
    logLocation('actualisation démarrée');
    if (mounted.current) setState((previous) => ({ ...previous, isLocating: true }));
    try {
      logLocation('vérification des services GPS');
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      logLocation('services GPS vérifiés', { enabled: servicesEnabled });
      if (!servicesEnabled) {
        if (mounted.current) {
          setState({
            position: null,
            source: 'unavailable',
            isLocating: false,
            message: 'Le GPS est désactivé. Active la localisation de l’appareil puis réessaie.',
          });
        }
        return;
      }

      logLocation('demande de permission de localisation');
      const permission = await Location.requestForegroundPermissionsAsync();
      logLocation('permission reçue', {
        status: permission.status,
        canAskAgain: permission.canAskAgain,
        granted: permission.granted,
      });
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        if (mounted.current) {
          setState({
            position: null,
            source: 'unavailable',
            isLocating: false,
            message:
              'Autorisation de localisation refusée. Autorise MyActivities dans les réglages.',
          });
        }
        return;
      }

      logLocation('recherche d’une dernière position récente');
      try {
        lastKnownPosition = await Location.getLastKnownPositionAsync({
          maxAge: LAST_POSITION_MAX_AGE_MS,
          requiredAccuracy: 1_000,
        });
        if (lastKnownPosition) {
          logLocation('dernière position récente disponible');
          applyDevicePosition(lastKnownPosition);
        } else {
          logLocation('aucune dernière position récente');
        }
      } catch (error) {
        logLocationError('lecture de la dernière position impossible', error);
      }

      // Une position courante est demandée ensuite, avec notre propre délai :
      // Expo peut sinon attendre environ 30 secondes sur certains émulateurs.
      logLocation('demande de position courante', {
        timeoutMs: CURRENT_POSITION_TIMEOUT_MS,
      });
      const location = await getCurrentPositionWithTimeout();
      logLocation('position courante récupérée', { durationMs: Date.now() - startedAt });
      applyDevicePosition(location);
    } catch (error) {
      logLocationError(`échec après ${Date.now() - startedAt} ms`, error);
      if (mounted.current && !lastKnownPosition) {
        setState({
          position: null,
          source: 'unavailable',
          isLocating: false,
          message: 'Position indisponible. Vérifie le GPS et les autorisations puis réessaie.',
        });
      }
    }
  }, [applyDevicePosition]);

  useEffect(() => {
    mounted.current = true;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function startLocation() {
      logLocation('initialisation du hook');
      await refresh();
      if (cancelled) return;

      try {
        logLocation('vérification de la permission avant le suivi');
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== Location.PermissionStatus.GRANTED) {
          logLocation('suivi non démarré : permission absente', { status: permission.status });
          return;
        }

        logLocation('démarrage du suivi de position');
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 100,
            timeInterval: 30_000,
          },
          applyDevicePosition
        );
        logLocation('suivi de position démarré');
      } catch (error) {
        logLocationError('impossible de démarrer le suivi de position', error);
        // La position ponctuelle reste utilisable si le suivi continu échoue.
      }
    }

    void startLocation();
    return () => {
      logLocation('arrêt du hook');
      cancelled = true;
      mounted.current = false;
      subscription?.remove();
    };
  }, [applyDevicePosition, refresh]);

  return { ...state, refresh };
}
