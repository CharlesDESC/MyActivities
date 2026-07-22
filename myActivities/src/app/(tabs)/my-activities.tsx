import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/app/my-activities';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { WebContainer } from '@/components/web/web-container';
import { OrganizerOnly } from '@/components/organizer/organizer-only';
import { useOrganizerActivities } from '@/hooks/use-organizer-activities';
import { ACTIVITY_STATUS_CONFIG, CATEGORY_CONFIG } from '@/types/activity';

export default function MyActivitiesScreen() {
  const router = useRouter();
  const { activities, isLoading, error, refresh } = useOrganizerActivities();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <OrganizerOnly>
          <WebContainer>
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>Mes activités</ThemedText>
              <Button label="Nouvelle activité" style={styles.newBtn} onPress={() => router.push('/activity/new')} />
            </View>

            {error ? (
              <View style={styles.center}>
                <ThemedText type="small" themeColor="textSecondary">{error}</ThemedText>
                <Button label="Réessayer" variant="ghost" onPress={refresh} />
              </View>
            ) : isLoading ? (
              <ActivityIndicator style={styles.center} />
            ) : (
              <FlatList
                data={activities}
                keyExtractor={(item) => item.id}
                refreshing={isLoading}
                onRefresh={refresh}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                  const status = item.status ? ACTIVITY_STATUS_CONFIG[item.status] : null;
                  const cat = CATEGORY_CONFIG[item.category];
                  return (
                    <Pressable
                      onPress={() => router.push({ pathname: '/activity/edit/[id]', params: { id: item.id } })}
                      accessibilityRole="button"
                      accessibilityLabel={`Éditer ${item.name}`}>
                      <ThemedView type="backgroundElement" style={styles.row}>
                        <Icon name={cat.icon} size={24} color={cat.color} />
                        <View style={styles.rowBody}>
                          <ThemedText type="smallBold" numberOfLines={1}>{item.name}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{item.address}</ThemedText>
                        </View>
                        {status && (
                          <View style={[styles.badge, { backgroundColor: status.color }]}>
                            <ThemedText style={styles.badgeText}>{status.label}</ThemedText>
                          </View>
                        )}
                      </ThemedView>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.empty}>
                    <Icon name="inbox" size={44} themeColor="textSecondary" />
                    <ThemedText type="smallBold">Aucune activité</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                      Crée ta première activité pour la publier immédiatement.
                    </ThemedText>
                  </View>
                }
              />
            )}
          </WebContainer>
        </OrganizerOnly>
      </SafeAreaView>
    </ThemedView>
  );
}
