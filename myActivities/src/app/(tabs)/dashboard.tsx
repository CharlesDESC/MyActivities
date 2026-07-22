import { useEffect } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/app/dashboard';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { WebContainer } from '@/components/web/web-container';
import { OrganizerOnly } from '@/components/organizer/organizer-only';
import { useOrganizerStats } from '@/hooks/use-organizer-stats';
import { useEstablishment } from '@/hooks/use-establishment';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.statCard}>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </ThemedView>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { stats, totals, isLoading, error, refresh } = useOrganizerStats();
  const { establishment, isLoading: establishmentLoading, error: establishmentError } = useEstablishment();

  useEffect(() => {
    if (!establishmentLoading && !establishmentError && !establishment) {
      router.replace('/establishment' as never);
    }
  }, [establishment, establishmentError, establishmentLoading, router]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <OrganizerOnly>
          <WebContainer>
            <ThemedText type="title" style={styles.title}>Tableau de bord</ThemedText>

            {establishmentLoading || (!establishment && !establishmentError) ? (
              <ActivityIndicator style={styles.center} />
            ) : establishmentError ? (
              <View style={styles.center}>
                <ThemedText type="small" themeColor="textSecondary">{establishmentError}</ThemedText>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <ThemedText type="small" themeColor="textSecondary">{error}</ThemedText>
                <Button label="Réessayer" variant="ghost" onPress={refresh} />
              </View>
            ) : isLoading ? (
              <ActivityIndicator style={styles.center} />
            ) : (
              <>
                <View style={styles.statsRow}>
                  <StatCard label="Vues cumulées" value={totals.views} />
                  <StatCard label="Ajouts au planning" value={totals.planningAdds} />
                  <StatCard label="Avis reçus" value={totals.reviewCount} />
                </View>

                <ThemedText type="subtitle" style={styles.sectionTitle}>Par activité</ThemedText>
                <FlatList
                  data={stats}
                  keyExtractor={(item) => item.activityId}
                  refreshing={isLoading}
                  onRefresh={refresh}
                  contentContainerStyle={styles.list}
                  renderItem={({ item }) => (
                    <ThemedView type="backgroundElement" style={styles.row}>
                      <ThemedText type="smallBold" style={styles.rowName} numberOfLines={1}>{item.activityName}</ThemedText>
                      <View style={styles.stat}>
                        <Icon name="visibility" size={14} themeColor="textSecondary" />
                        <ThemedText type="small" themeColor="textSecondary">{item.views}</ThemedText>
                      </View>
                      <View style={styles.stat}>
                        <Icon name="event" size={14} themeColor="textSecondary" />
                        <ThemedText type="small" themeColor="textSecondary">{item.planningAdds}</ThemedText>
                      </View>
                      <View style={styles.stat}>
                        <Icon name="star" size={14} color="#F59E0B" />
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.avgRating !== null ? item.avgRating.toFixed(1) : '—'} ({item.reviewCount})
                        </ThemedText>
                      </View>
                    </ThemedView>
                  )}
                  ListEmptyComponent={
                    <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                      Aucune activité publiée pour l’instant.
                    </ThemedText>
                  }
                />
              </>
            )}
          </WebContainer>
        </OrganizerOnly>
      </SafeAreaView>
    </ThemedView>
  );
}
