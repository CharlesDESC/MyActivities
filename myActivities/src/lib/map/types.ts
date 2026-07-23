import { type ComponentType } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';

export type MapPosition = { latitude: number; longitude: number };

export type MapMarker = {
  id: string;
  position: MapPosition;
  /** Emoji ou court texte affiché dans la pastille du marqueur */
  label: string;
  color: string;
};

export type MapViewProps = {
  center: MapPosition;
  zoom?: number;
  markers: MapMarker[];
  onMarkerPress?: (markerId: string) => void;
  style?: StyleProp<ViewStyle>;
};

// Pattern adaptateur : chaque fournisseur de carte (Mapbox, Google Maps…)
// implémente ce contrat. Les écrans ne dépendent que de MapViewProps —
// changer de fournisseur ne demande aucune modification des écrans.
export type MapProvider = {
  name: string;
  /** false si aucune variante de la carte ne peut s'afficher (token manquant, par exemple). */
  isAvailable: () => boolean;
  MapView: ComponentType<MapViewProps>;
};
