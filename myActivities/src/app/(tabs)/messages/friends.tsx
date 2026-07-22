import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/app/friends';
import { ThemedText } from '@/components/ui/themed-text';
import { Icon } from '@/components/ui/icon';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme';
import { useFriends } from '@/hooks/use-friends';
import { useUserSearch } from '@/hooks/use-user-search';

type Tab = 'friends' | 'requests' | 'search';

/** Onglet de la barre segmentée (Amis / Demandes / Rechercher). */
function SegTab({ label, badge, active, onPress }: { label: string; badge?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityRole="button" accessibilityLabel={label}>
      <ThemedView type={active ? 'backgroundSelected' : 'backgroundElement'} style={styles.tabInner}>
        <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
          {label}{badge ? ` (${badge})` : ''}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export default function FriendsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { friends, incoming, outgoing, isLoading, refresh, sendRequest, accept, decline, remove } = useFriends();
  const { query, setQuery, results, isSearching } = useUserSearch();
  const [tab, setTab] = useState<Tab>('friends');

  const friendIds = new Set(friends.map((f) => f.id));
  const pendingIds = new Set([...incoming, ...outgoing].map((r) => r.user.id));

  function openDirect(userId: string, pseudo: string) {
    router.push({
      pathname: '/messages/[conversationId]',
      params: { conversationId: 'new', recipientId: userId, peerPseudo: pseudo },
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/messages')} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Retour aux conversations">
            <Icon name="arrow-back" size={24} />
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>Amis</ThemedText>
        </View>

        <View style={styles.tabs}>
          <SegTab label="Mes amis" badge={friends.length} active={tab === 'friends'} onPress={() => setTab('friends')} />
          <SegTab label="Demandes" badge={incoming.length} active={tab === 'requests'} onPress={() => setTab('requests')} />
          <SegTab label="Rechercher" active={tab === 'search'} onPress={() => setTab('search')} />
        </View>

        {tab === 'search' && (
          <View style={styles.searchBox}>
            <Input
              placeholder="Rechercher un pseudo…"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
          </View>
        )}

        {tab === 'friends' && (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            refreshing={isLoading}
            onRefresh={refresh}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Icon name="account-circle" size={28} themeColor="textSecondary" />
                <ThemedText type="smallBold" style={styles.rowName} numberOfLines={1}>{item.pseudo}</ThemedText>
                <Button label="Message" variant="ghost" style={styles.smallBtn} onPress={() => openDirect(item.id, item.pseudo)} />
                <Pressable onPress={() => remove(item.id)} accessibilityRole="button" accessibilityLabel={`Retirer ${item.pseudo}`}>
                  <Icon name="close" size={18} color={theme.textSecondary} />
                </Pressable>
              </View>
            )}
            ListEmptyComponent={!isLoading ? <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>Aucun ami pour l’instant.</ThemedText> : null}
          />
        )}

        {tab === 'requests' && (
          <FlatList
            data={incoming}
            keyExtractor={(item) => item.id}
            refreshing={isLoading}
            onRefresh={refresh}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              outgoing.length > 0 ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                  {outgoing.length} demande(s) envoyée(s) en attente
                </ThemedText>
              ) : null
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Icon name="account-circle" size={28} themeColor="textSecondary" />
                <ThemedText type="smallBold" style={styles.rowName} numberOfLines={1}>{item.user.pseudo}</ThemedText>
                <Button label="Accepter" style={styles.smallBtn} onPress={() => accept(item.id)} />
                <Button label="Refuser" variant="ghost" style={styles.smallBtn} onPress={() => decline(item.id)} />
              </View>
            )}
            ListEmptyComponent={!isLoading ? <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>Aucune demande reçue.</ThemedText> : null}
          />
        )}

        {tab === 'search' && (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isFriend = friendIds.has(item.id);
              const isPending = pendingIds.has(item.id);
              return (
                <View style={styles.row}>
                  <Icon name="account-circle" size={28} themeColor="textSecondary" />
                  <ThemedText type="smallBold" style={styles.rowName} numberOfLines={1}>{item.pseudo}</ThemedText>
                  {isFriend ? (
                    <ThemedText type="small" themeColor="textSecondary">Ami</ThemedText>
                  ) : isPending ? (
                    <ThemedText type="small" themeColor="textSecondary">En attente</ThemedText>
                  ) : (
                    <Button label="Ajouter" style={styles.smallBtn} onPress={() => sendRequest(item.id)} />
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              query.trim().length > 0 && !isSearching ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>Aucun utilisateur trouvé.</ThemedText>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}
