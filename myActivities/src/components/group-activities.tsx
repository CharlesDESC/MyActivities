import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { useGroupActivities, type ActivityChoice } from '@/hooks/use-group-activities';
import { getApiErrorMessage } from '@/lib/api';

export function GroupActivities({ conversationId }: { conversationId: string }) {
  const group = useGroupActivities(conversationId);
  const { user } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [query, setQuery] = useState('');
  const [choices, setChoices] = useState<ActivityChoice[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const searchPage = useRef(1);
  const searchRevision = useRef(0);
  const admin = group.conversation?.participants.some((p) => p.id === user?.id && p.role === 'admin');

  // Ignore old searches after closing the picker or changing conversations.
  useEffect(() => () => { searchRevision.current++; }, [conversationId]);

  async function search(nextPage = 1) {
    const current = ++searchRevision.current;
    setSearching(true);
    setSearchError(null);
    try {
      const result = await group.search(query, nextPage);
      if (current !== searchRevision.current) return;
      setChoices((previous) => nextPage === 1 ? result.data : [...previous, ...result.data]);
      setMore(result.hasMore);
      searchPage.current = nextPage;
    } catch (err) {
      if (current === searchRevision.current) setSearchError(getApiErrorMessage(err, 'Recherche impossible.'));
    } finally {
      if (current === searchRevision.current) setSearching(false);
    }
  }

  function close() {
    searchRevision.current++;
    setSearching(false);
    setOpen(false);
    setSelecting(false);
  }

  if (!group.conversation) {
    return group.error ? <View style={styles.feedback}>
      <ThemedText accessibilityRole="alert">{group.error}</ThemedText>
      <Button label="Réessayer le chargement du groupe" variant="ghost" onPress={group.refresh} />
    </View> : null;
  }
  if (group.conversation.type !== 'group') return null;

  return <>
    <Button label="Activités du groupe" variant="ghost" onPress={() => { setOpen(true); void group.refresh(); }} />
    <Modal visible={open} animationType="slide" onRequestClose={close}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">Activités du groupe</ThemedText>
            <ThemedText>{group.conversation.title}</ThemedText>
            <Button label="Retour aux messages" variant="ghost" onPress={close} />
            <ThemedText type="small">Proposez une activité à faire ensemble. Chacun réserve sa place séparément.</ThemedText>
            {group.error && <ThemedText accessibilityRole="alert">{group.error}</ThemedText>}
            <Button label="Actualiser les propositions" variant="ghost" loading={group.loading} onPress={group.refresh} />
            {!group.loading && !group.activities.length && <ThemedText>Aucune activité proposée.</ThemedText>}
            {group.activities.map((activity) => <View key={activity.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{activity.name}</ThemedText>
              <ThemedText type="small">Proposée par {activity.addedByPseudo ?? 'un ancien membre'}</ThemedText>
              {activity.available && <Button label={`Voir ${activity.name}`} variant="ghost" onPress={() => {
                close();
                router.push({ pathname: '/activity/[id]', params: { id: activity.id } });
              }} />}
              {(admin || activity.addedBy === user?.id) && <Button label={`Retirer ${activity.name}`} variant="ghost" disabled={group.busy} onPress={() => group.change(activity.id, true)} />}
            </View>)}
            {group.hasMore && <Button label="Plus de propositions" loading={group.loading} onPress={group.loadMore} />}
            <Button label="Proposer une activité" disabled={group.busy} onPress={() => { setSelecting(true); void search(); }} />
            {selecting && <View style={styles.content}>
              <TextInput value={query} onChangeText={(value) => {
                setQuery(value); searchRevision.current++; setSearching(false); setChoices([]); setMore(false);
              }} placeholder="Nom de l’activité" placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Rechercher une activité" maxLength={100}
                style={[styles.input, { color: theme.text, borderColor: theme.textSecondary }]}
                onSubmitEditing={() => search()} />
              <Button label="Rechercher" loading={searching} onPress={() => search()} />
              {searchError && <ThemedText accessibilityRole="alert">{searchError}</ThemedText>}
              {!searching && !searchError && !choices.length && <ThemedText>Aucune activité à afficher. Essayez une autre recherche.</ThemedText>}
              {choices.map((activity) => <View key={activity.id} style={styles.card}>
                <ThemedText type="smallBold">{activity.name}</ThemedText>
                <ThemedText type="small">{activity.address}</ThemedText>
                <Button label={`Proposer ${activity.name}`} disabled={group.busy || searching} onPress={async () => {
                  if (await group.change(activity.id)) {
                    searchRevision.current++;
                    setSelecting(false);
                    setChoices([]);
                  }
                }} />
              </View>)}
              {more && <Button label="Plus de résultats" loading={searching} onPress={() => search(searchPage.current + 1)} />}
            </View>}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, gap: 12 },
  feedback: { padding: 8 }, card: { padding: 12, gap: 8, borderRadius: 12 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 8, padding: 12 },
});
