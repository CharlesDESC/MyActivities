import { Alert, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '@/styles/app/planning';
import { PlanningCard } from '@/components/ui/planning-card';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { usePlanning } from '@/hooks/use-planning';
import type { PlanningEntry } from '@/types/planning';

export default function PlanningScreen() {
  const { entries, isLoading, error, removeEntry, refresh } = usePlanning();

  function handleRemove(entry: PlanningEntry) {
    Alert.alert(
      'Supprimer ?',
      `Retirer "${entry.activity.name}" de ton planning ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => removeEntry(entry.id),
        },
      ],
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Icon name="error-outline" size={36} themeColor="textSecondary" />
        <ThemedText type="subtitle">Erreur de chargement</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{error}</ThemedText>
        <Button label="Réessayer" variant="ghost" onPress={refresh} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          refreshing={isLoading}
          onRefresh={refresh}
          renderItem={({ item }) => (
            <PlanningCard entry={item} onRemove={() => handleRemove(item)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <ThemedText type="subtitle">Mon planning</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {entries.length} activité{entries.length !== 1 ? 's' : ''} planifiée{entries.length !== 1 ? 's' : ''}
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Icon name="event" size={44} themeColor="textSecondary" />
                <ThemedText type="smallBold">Aucune activité planifiée</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Explore les activités autour de toi et ajoute-en à ton planning !
                </ThemedText>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}
