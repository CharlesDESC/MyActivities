import { ActivityIndicator, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '@/styles/app/dashboard';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { WebContainer } from '@/components/web/web-container';
import { OrganizerOnly } from '@/components/organizer/organizer-only';
import { useOrganizerStats } from '@/hooks/use-organizer-stats';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.statCard}>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </ThemedView>
  );
}

export default function DashboardScreen() {
  const { stats, totals, isLoading, error, refresh } = useOrganizerStats();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <OrganizerOnly>
          <WebContainer>
            <ThemedText type="title" style={styles.title}>Tableau de bord</ThemedText>

            {error ? (
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
                      <ThemedText type="small" themeColor="textSecondary">👁 {item.views}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">📅 {item.planningAdds}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        ⭐ {item.avgRating !== null ? item.avgRating.toFixed(1) : '—'} ({item.reviewCount})
                      </ThemedText>
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
