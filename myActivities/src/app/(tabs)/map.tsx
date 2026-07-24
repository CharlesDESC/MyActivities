import { useCallback } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/app/map';
import { ActivityCard } from '@/components/ui/activity-card';
import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/ui/themed-text';
import { Icon } from '@/components/ui/icon';
import { ThemedView } from '@/components/ui/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useNearbyActivities } from '@/hooks/use-activities';
import { useUserLocation } from '@/hooks/use-user-location';
import { getMapProvider, type MapMarker } from '@/lib/map';
import { CATEGORY_CONFIG } from '@/types/activity';

// Résolu une seule fois : le composant carte reste stable entre les rendus
const { MapView } = getMapProvider();

export default function MapScreen() {
  const router = useRouter();
  const location = useUserLocation();
  const refreshLocation = location.refresh;
  const { activities, isLoading, error, refetch } = useNearbyActivities(location.position);

  const refreshNearby = useCallback(async () => {
    await refreshLocation();
    await refetch();
  }, [refreshLocation, refetch]);

  const markers: MapMarker[] = activities
    .filter((a) => a.latitude !== undefined && a.longitude !== undefined)
    .map((a) => ({
      id: a.id,
      position: { latitude: a.latitude!, longitude: a.longitude! },
      label: CATEGORY_CONFIG[a.category].label,
      color: CATEGORY_CONFIG[a.category].color,
    }));

  const openActivity = (id: string) => router.push({ pathname: '/activity/[id]', params: { id } });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {location.position ? (
          <>
            <View style={styles.mapContainer}>
              <MapView
                center={location.position}
                zoom={12}
                markers={markers}
                onMarkerPress={openActivity}
                style={styles.map}
              />
            </View>
            <FlatList
              data={activities}
              refreshing={isLoading || location.isLocating}
              onRefresh={refreshNearby}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ActivityCard activity={item} onPress={() => openActivity(item.id)} />
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: BottomTabInset + Spacing.four },
              ]}
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  <ThemedText type="subtitle">Autour de moi</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Activités triées par distance
                  </ThemedText>
                  {/* GPS banner */}
                  <ThemedView
                    type="backgroundElement"
                    style={styles.locationBanner}
                    accessibilityLiveRegion="polite">
                    <Icon name="place" size={16} themeColor="textSecondary" />
                    <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                      {location.source === 'device'
                        ? 'Résultats dans un rayon de 50 km autour de ta position'
                        : (location.message ?? 'Recherche de ta position…')}
                    </ThemedText>
                  </ThemedView>
                </View>
              }
              ListEmptyComponent={
                isLoading || location.isLocating ? (
                  <View
                    accessible
                    accessibilityLiveRegion="polite"
                    accessibilityLabel="Chargement des activités à proximité"
                    style={styles.emptyState}>
                    <ActivityIndicator accessible={false} size="large" />
                  </View>
                ) : (
                  <View
                    accessible
                    accessibilityRole={error ? 'alert' : undefined}
                    accessibilityLiveRegion={error ? 'assertive' : 'polite'}
                    accessibilityLabel={
                      error
                        ? `Impossible de charger les activités. ${error}`
                        : 'Aucune activité à proximité'
                    }
                    style={styles.emptyState}>
                    <Icon
                      name={error ? 'error-outline' : 'map'}
                      size={40}
                      themeColor="textSecondary"
                    />
                    <ThemedText type="smallBold">
                      {error
                        ? 'Impossible de charger les activités'
                        : 'Aucune activité à proximité'}
                    </ThemedText>
                    {error && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {error}
                      </ThemedText>
                    )}
                  </View>
                )
              }
            />
          </>
        ) : (
          <View style={styles.locationRequired}>
            <ThemedView type="backgroundElement" style={styles.locationRequiredCard}>
              {location.isLocating ? (
                <>
                  <ActivityIndicator accessible={false} size="large" />
                  <ThemedText type="smallBold" accessibilityLiveRegion="polite">
                    Recherche de ta position…
                  </ThemedText>
                </>
              ) : (
                <>
                  <Icon name="location-off" size={48} themeColor="textSecondary" />
                  <ThemedText type="subtitle" accessibilityLiveRegion="polite">
                    Carte désactivée
                  </ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.locationRequiredText}>
                    {location.message ??
                      'La localisation est nécessaire pour afficher les activités autour de toi.'}
                  </ThemedText>
                  <Button label="Réessayer" variant="ghost" onPress={refreshLocation} />
                </>
              )}
            </ThemedView>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}
