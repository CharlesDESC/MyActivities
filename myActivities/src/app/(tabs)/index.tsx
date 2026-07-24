import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/app/index';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityCard } from '@/components/ui/activity-card';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Icon } from '@/components/ui/icon';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useNearbyActivities } from '@/hooks/use-activities';
import { useUserLocation } from '@/hooks/use-user-location';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_CONFIG, type ActivityCategory } from '@/types/activity';

const CATEGORIES: ActivityCategory[] = [
  'sport', 'culture', 'gastronomie', 'nature', 'bien_etre', 'art', 'musique',
];

function getGreeting(pseudo: string): string {
  const h = new Date().getHours();
  const salut = h < 12 ? 'Bonjour' : h < 18 ? 'Bonne après-midi' : 'Bonsoir';
  return `${salut}, ${pseudo}`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | null>(null);
  const location = useUserLocation();
  const refreshLocation = location.refresh;
  const { activities, isLoading, error, refetch } = useNearbyActivities(location.position);

  const refreshNearby = useCallback(async () => {
    await refreshLocation();
    await refetch();
  }, [refreshLocation, refetch]);

  const filtered = useMemo(() => {
    let list = activities;
    if (selectedCategory) {
      list = list.filter((a) => a.category === selectedCategory);
    }
    if (search.trim().length >= 3) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          CATEGORY_CONFIG[a.category].label.toLowerCase().includes(q) ||
          a.address.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activities, search, selectedCategory]);

  const toggleCategory = useCallback((cat: ActivityCategory) => {
    setSelectedCategory((prev) => (prev === cat ? null : cat));
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={filtered}
          refreshing={isLoading || location.isLocating}
          onRefresh={refreshNearby}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActivityCard
              activity={item}
              onPress={() => router.push({ pathname: '/activity/[id]', params: { id: item.id } })}
            />
          )}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: BottomTabInset + Spacing.four },
          ]}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Greeting */}
              <View style={styles.greetingSection}>
                <ThemedText type="subtitle">
                  {getGreeting(user?.pseudo ?? 'toi')}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {"Que veux-tu faire aujourd'hui ?"}
                </ThemedText>
              </View>

              {location.message && (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.locationNotice}
                  accessibilityLiveRegion="polite">
                  {location.message}
                </ThemedText>
              )}

              {/* Search bar */}
              <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement }]}>
                <Icon name="search" size={18} themeColor="textSecondary" />
                <TextInput
                  accessibilityLabel="Rechercher une activité"
                  placeholder="Rechercher une activité..."
                  placeholderTextColor={theme.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                  style={[styles.searchInput, { color: theme.text }]}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Category chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Toutes les catégories"
                  accessibilityState={{ selected: selectedCategory === null }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        selectedCategory === null ? theme.text : theme.backgroundElement,
                    },
                  ]}
                  onPress={() => setSelectedCategory(null)}>
                  <ThemedText
                    type="small"
                    style={{
                      color: selectedCategory === null ? theme.background : theme.text,
                      fontWeight: '600',
                    }}>
                    Tout
                  </ThemedText>
                </Pressable>

                {CATEGORIES.map((cat) => {
                  const cfg = CATEGORY_CONFIG[cat];
                  const active = selectedCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      accessibilityRole="button"
                      accessibilityLabel={`Catégorie ${cfg.label}`}
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.chip,
                        { backgroundColor: active ? cfg.color : theme.backgroundElement },
                      ]}
                      onPress={() => toggleCategory(cat)}>
                      <ThemedText
                        type="small"
                        style={{ color: active ? '#ffffff' : theme.text, fontWeight: '600' }}>
                        {cfg.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Section label */}
              <View style={styles.sectionLabel}>
                <ThemedText
                  type="smallBold"
                  themeColor="textSecondary"
                  accessibilityLiveRegion="polite">
                  {filtered.length} activité{filtered.length !== 1 ? 's' : ''} autour de toi
                </ThemedText>
              </View>
            </View>
          }
          ListEmptyComponent={
            isLoading || location.isLocating ? (
              <View
                accessible
                accessibilityLiveRegion="polite"
                accessibilityLabel="Chargement des activités"
                style={styles.empty}>
                <ActivityIndicator accessible={false} size="large" />
              </View>
            ) : error ? (
              <View
                accessible
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                accessibilityLabel={`Impossible de charger les activités. ${error}`}
                style={styles.empty}>
                <Icon name="error-outline" size={40} themeColor="textSecondary" />
                <ThemedText type="smallBold">Impossible de charger les activités</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  {error}
                </ThemedText>
              </View>
            ) : (
              <View
                accessible
                accessibilityLiveRegion="polite"
                accessibilityLabel="Aucune activité trouvée. Essaie d'autres mots-clés ou modifie tes filtres."
                style={styles.empty}>
                <Icon name="search-off" size={40} themeColor="textSecondary" />
                <ThemedText type="smallBold">Aucune activité trouvée</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  {"Essaie d'autres mots-clés ou modifie tes filtres."}
                </ThemedText>
              </View>
            )
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}
