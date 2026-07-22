import Constants from 'expo-constants';
import { Pressable, StyleSheet, Text } from 'react-native';

import { createUnavailableMapView } from './unavailable';
import { type MapProvider, type MapViewProps } from './types';

type MapboxModule = typeof import('@rnmapbox/maps');

const ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const isExpoGo = Constants.appOwnership === 'expo';

// Chargement dynamique : le module natif Mapbox n'existe pas dans Expo Go
// (il faut un development build : npx expo run:android / run:ios).
let mapbox: MapboxModule | null = null;
if (!isExpoGo && ACCESS_TOKEN) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@rnmapbox/maps') as MapboxModule;
    mod.default.setAccessToken(ACCESS_TOKEN);
    mapbox = mod;
  } catch {
    mapbox = null;
  }
}

function MapboxMapView({ center, zoom = 12, markers, onMarkerPress, style }: MapViewProps) {
  if (!mapbox) return null;
  const { MapView, Camera, MarkerView } = mapbox;

  return (
    <MapView style={style} scaleBarEnabled={false} attributionPosition={{ bottom: 4, right: 4 }}>
      <Camera
        centerCoordinate={[center.longitude, center.latitude]}
        zoomLevel={zoom}
        animationDuration={0}
      />
      {markers.map((marker) => (
        <MarkerView
          key={marker.id}
          coordinate={[marker.position.longitude, marker.position.latitude]}
        >
          <Pressable
            onPress={() => onMarkerPress?.(marker.id)}
            style={[styles.marker, { backgroundColor: marker.color }]}
          >
            <Text style={styles.markerLabel}>{marker.label}</Text>
          </Pressable>
        </MarkerView>
      ))}
    </MapView>
  );
}

function unavailableMessage(): string {
  if (isExpoGo) {
    return 'La carte Mapbox nécessite un development build (npx expo run:android ou run:ios) — elle ne peut pas s’afficher dans Expo Go.';
  }
  if (!ACCESS_TOKEN) {
    return 'Token Mapbox manquant : renseigne EXPO_PUBLIC_MAPBOX_TOKEN dans le fichier .env.';
  }
  return 'Le module natif Mapbox est introuvable — rebuilde l’app (npx expo run:android ou run:ios).';
}

export const mapboxProvider: MapProvider = {
  name: 'mapbox',
  isAvailable: () => mapbox !== null,
  MapView: mapbox ? MapboxMapView : createUnavailableMapView(unavailableMessage()),
};

const styles = StyleSheet.create({
  marker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  markerLabel: { fontSize: 16 },
});
