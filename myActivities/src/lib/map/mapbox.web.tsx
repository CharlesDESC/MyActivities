import { createUnavailableMapView } from './unavailable';
import { type MapProvider } from './types';

// Variante web : le SDK natif Mapbox n'existe pas sur le web.
// (Un adaptateur mapbox-gl JS pourra être ajouté ici plus tard.)
export const mapboxProvider: MapProvider = {
  name: 'mapbox',
  isAvailable: () => false,
  MapView: createUnavailableMapView(
    'La carte n’est pas encore disponible sur le web — utilise l’app mobile.',
  ),
};
