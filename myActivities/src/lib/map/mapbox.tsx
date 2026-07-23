import Constants from 'expo-constants';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

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

/** URL Mapbox Static Images : fonctionne dans Expo Go sans module natif. */
export function buildStaticMapUrl(
  center: MapViewProps['center'],
  zoom: number,
  markers: MapViewProps['markers'],
  accessToken: string,
): string {
  const userPin = `pin-s+208aef(${center.longitude},${center.latitude})`;
  const activityPins = markers.slice(0, 25).map((marker) => {
    const color = marker.color.replace('#', '').toLowerCase();
    return `pin-s+${color}(${marker.position.longitude},${marker.position.latitude})`;
  });
  const overlays = [userPin, ...activityPins].join(',');
  const camera = `${center.longitude},${center.latitude},${zoom},0`;

  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${overlays}/${camera}/600x360@2x?access_token=${encodeURIComponent(accessToken)}&logo=true&attribution=true`;
}

/** Document Mapbox GL JS embarqué dans Expo Go via react-native-webview. */
export function buildInteractiveMapHtml(
  center: MapViewProps['center'],
  zoom: number,
  markers: MapViewProps['markers'],
  accessToken: string,
): string {
  const config = JSON.stringify({ center, zoom, markers, accessToken }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css" rel="stylesheet" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; overflow: hidden; }
    body { background: #e5e7eb; }
    #error { display: none; box-sizing: border-box; height: 100%; padding: 24px; align-items: center; justify-content: center; text-align: center; font: 14px sans-serif; color: #4b5563; }
  </style>
</head>
<body>
  <div id="map"></div><div id="error">Impossible de charger la carte Mapbox.</div>
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js"></script>
  <script>
    const config = ${config};
    const reportError = () => {
      document.getElementById('map').style.display = 'none';
      document.getElementById('error').style.display = 'flex';
    };
    try {
      mapboxgl.accessToken = config.accessToken;
      const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [config.center.longitude, config.center.latitude],
        zoom: config.zoom,
        attributionControl: true
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      new mapboxgl.Marker({ color: '#208AEF', scale: 0.85 })
        .setLngLat([config.center.longitude, config.center.latitude])
        .addTo(map);
      config.markers.forEach((item) => {
        const marker = new mapboxgl.Marker({ color: item.color, scale: 0.78 })
          .setLngLat([item.position.longitude, item.position.latitude])
          .setPopup(new mapboxgl.Popup({ offset: 20 }).setText(item.label))
          .addTo(map);
        marker.getElement().addEventListener('click', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker', id: item.id }));
        });
      });
      map.on('load', () => window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' })));
      map.on('error', (event) => {
        if (!event || !event.error) return;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map-error' }));
      });
    } catch (error) {
      reportError();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map-error' }));
    }
  </script>
</body>
</html>`;
}

const StaticMapError = createUnavailableMapView(
  'Impossible de charger la carte Mapbox. Vérifie la connexion et le token public.',
);

function StaticMapboxImage({ center, zoom = 12, markers }: Omit<MapViewProps, 'style'>) {
  const uri = useMemo(
    () => buildStaticMapUrl(center, zoom, markers, ACCESS_TOKEN),
    [center, markers, zoom],
  );
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (failedUri === uri) {
    return <StaticMapError center={center} zoom={zoom} markers={markers} style={styles.fill} />;
  }

  return (
    <Image
      source={{ uri }}
      style={styles.fill}
      resizeMode="cover"
      accessibilityLabel="Carte Mapbox des activités autour de ta position"
      onError={() => setFailedUri(uri)}
    />
  );
}

/** Carte Mapbox interactive compatible Expo Go, avec image statique de secours. */
function ExpoGoMapboxMapView({ center, zoom = 12, markers, onMarkerPress, style }: MapViewProps) {
  const html = useMemo(
    () => buildInteractiveMapHtml(center, zoom, markers, ACCESS_TOKEN),
    [center, markers, zoom],
  );
  const [failedHtml, setFailedHtml] = useState<string | null>(null);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
      if (message.type === 'marker' && message.id) onMarkerPress?.(message.id);
      if (message.type === 'map-error') setFailedHtml(html);
    } catch {
      // Un message non JSON provenant de la page n'affecte pas la carte.
    }
  }

  return (
    <View style={[styles.staticContainer, style]}>
      {failedHtml === html ? (
        <StaticMapboxImage center={center} zoom={zoom} markers={markers} />
      ) : (
        <WebView
          key={html}
          source={{ html, baseUrl: 'https://api.mapbox.com' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMessage}
          onError={() => setFailedHtml(html)}
          onHttpError={() => setFailedHtml(html)}
          style={styles.fill}
          accessibilityLabel="Carte Mapbox interactive des activités"
        />
      )}
      <View style={styles.staticBadge} pointerEvents="none">
        <Text style={styles.staticBadgeText}>Mapbox</Text>
      </View>
    </View>
  );
}

function unavailableMessage(): string {
  if (!ACCESS_TOKEN) {
    return 'Token Mapbox manquant : renseigne EXPO_PUBLIC_MAPBOX_TOKEN dans le fichier .env.';
  }
  return 'Le module natif Mapbox est introuvable — rebuilde l’app (npx expo run:android ou run:ios).';
}

export const mapboxProvider: MapProvider = {
  name: 'mapbox',
  isAvailable: () => mapbox !== null || ACCESS_TOKEN.length > 0,
  MapView: mapbox
    ? MapboxMapView
    : ACCESS_TOKEN
      ? ExpoGoMapboxMapView
      : createUnavailableMapView(unavailableMessage()),
};

const styles = StyleSheet.create({
  staticContainer: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  fill: { width: '100%', height: '100%' },
  staticBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  staticBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
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
