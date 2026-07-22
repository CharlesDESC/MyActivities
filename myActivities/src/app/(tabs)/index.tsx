import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/app/index';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityCard } from '@/components/ui/activity-card';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useNearbyActivities } from '@/hooks/use-activities';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_CONFIG, type ActivityCategory } from '@/types/activity';

// Position simulée — Lyon centre
// TODO: remplacer par la position réelle (expo-location) après consentement RGPD
const LYON_CENTER = { latitude: 45.764, longitude: 4.8357 };

const CATEGORIES: ActivityCategory[] = [
  'sport', 'culture', 'gastronomie', 'nature', 'bien_etre', 'art', 'musique',
];

function getGreeting(pseudo: string): string {
  const h = new Date().getHours();
  const salut = h < 12 ? 'Bonjour' : h < 18 ? 'Bonne après-midi' : 'Bonsoir';
  return `${salut}, ${pseudo} 👋`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | null>(null);
  const { activities, isLoading, error } = useNearbyActivities(LYON_CENTER);

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

              {/* Search bar */}
              <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.searchIcon}>🔍</ThemedText>
                <TextInput
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
                        {cfg.emoji} {cfg.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Section label */}
              <View style={styles.sectionLabel}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {filtered.length} activité{filtered.length !== 1 ? 's' : ''} autour de toi
                </ThemedText>
              </View>
            </View>
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.empty}>
                <ActivityIndicator size="large" />
              </View>
            ) : error ? (
              <View style={styles.empty}>
                <ThemedText style={styles.emptyEmoji}>😕</ThemedText>
                <ThemedText type="smallBold">Impossible de charger les activités</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  {error}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.empty}>
                <ThemedText style={styles.emptyEmoji}>🔍</ThemedText>
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

