import { ActivityIndicator, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/app/map';
import { ActivityCard } from '@/components/ui/activity-card';
import { ThemedText } from '@/components/ui/themed-text';
import { Icon } from '@/components/ui/icon';
import { ThemedView } from '@/components/ui/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useNearbyActivities } from '@/hooks/use-activities';
import { getMapProvider, type MapMarker, type MapPosition } from '@/lib/map';
import { CATEGORY_CONFIG } from '@/types/activity';

// Position simulée — Lyon centre
// TODO: remplacer par la position réelle (expo-location) après consentement RGPD
const LYON_CENTER: MapPosition = { latitude: 45.764, longitude: 4.8357 };

// Résolu une seule fois : le composant carte reste stable entre les rendus
const { MapView } = getMapProvider();

export default function MapScreen() {
  const router = useRouter();
  const { activities, isLoading, error } = useNearbyActivities(LYON_CENTER);

  const markers: MapMarker[] = activities
    .filter((a) => a.latitude !== undefined && a.longitude !== undefined)
    .map((a) => ({
      id: a.id,
      position: { latitude: a.latitude!, longitude: a.longitude! },
      label: CATEGORY_CONFIG[a.category].label,
      color: CATEGORY_CONFIG[a.category].color,
    }));

  const openActivity = (id: string) =>
    router.push({ pathname: '/activity/[id]', params: { id } });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.mapContainer}>
          <MapView
            center={LYON_CENTER}
            zoom={12}
            markers={markers}
            onMarkerPress={openActivity}
            style={styles.map}
          />
        </View>
        <FlatList
          data={activities}
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
              <ThemedView type="backgroundElement" style={styles.locationBanner}>
                <Icon name="place" size={16} themeColor="textSecondary" />
                <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                  Localisation simulée — Lyon centre
                </ThemedText>
              </ThemedView>
            </View>
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name={error ? 'error-outline' : 'map'} size={40} themeColor="textSecondary" />
                <ThemedText type="smallBold">
                  {error ? 'Impossible de charger les activités' : 'Aucune activité à proximité'}
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
      </SafeAreaView>
    </ThemedView>
  );
}
