import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { type MapViewProps } from './types';

// Rendu de repli quand le fournisseur de carte n'est pas utilisable
// (Expo Go sans module natif, web, token manquant).
export function createUnavailableMapView(message: string) {
  return function UnavailableMapView({ style }: MapViewProps) {
    return (
      <ThemedView type="backgroundElement" style={[styles.container, style]}>
        <ThemedText style={styles.icon}>🗺️</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      </ThemedView>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  icon: { fontSize: 32 },
  message: { textAlign: 'center' },
});
