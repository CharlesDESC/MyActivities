import { mapboxProvider } from './mapbox';
import { type MapProvider } from './types';

// Fournisseur de carte actif. Pour changer (ex. Google Maps) : écrire un
// nouvel adaptateur respectant MapProvider et le référencer ici — les écrans
// n'ont pas à changer.
const activeProvider: MapProvider = mapboxProvider;

export function getMapProvider(): MapProvider {
  return activeProvider;
}

export { type MapMarker, type MapPosition, type MapViewProps } from './types';
