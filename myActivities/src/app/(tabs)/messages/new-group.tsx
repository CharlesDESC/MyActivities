import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/app/new-group';
import { ThemedText } from '@/components/ui/themed-text';
import { Icon } from '@/components/ui/icon';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme';
import { useFriends } from '@/hooks/use-friends';
import { useCreateGroup } from '@/hooks/use-create-group';

export default function NewGroupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { friends, isLoading } = useFriends();
  const { create, isCreating, error } = useCreateGroup();

  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canCreate = title.trim().length > 0 && selected.size > 0 && !isCreating;

  async function handleCreate() {
    if (!canCreate) return;
    try {
      const convo = await create(title, [...selected]);
      // Remplace l'écran de création par la conversation nouvellement créée.
      router.replace({
        pathname: '/messages/[conversationId]',
        params: { conversationId: convo.id, peerPseudo: convo.title ?? 'Groupe' },
      });
    } catch {
      /* l'erreur est exposée via `error` */
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/messages')} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Retour aux conversations">
            <Icon name="arrow-back" size={24} />
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>Nouveau groupe</ThemedText>
        </View>

        <View style={styles.form}>
          <Input label="Nom du groupe" placeholder="Ex. Rando dimanche" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            Sélectionne les amis à ajouter ({selected.size})
          </ThemedText>
        </View>

        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          refreshing={isLoading}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isSelected = selected.has(item.id);
            return (
              <Pressable
                onPress={() => toggle(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={item.pseudo}>
                <View style={styles.row}>
                  <Icon name="account-circle" size={28} themeColor="textSecondary" />
                  <ThemedText type="smallBold" style={styles.rowName} numberOfLines={1}>{item.pseudo}</ThemedText>
                  <View style={[styles.checkbox, { borderColor: theme.textSecondary }, isSelected && styles.checkboxOn]}>
                    {isSelected && <Icon name="check" size={14} color="#ffffff" />}
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={!isLoading ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Ajoute d’abord des amis pour créer un groupe.
            </ThemedText>
          ) : null}
        />

        <View style={styles.footer}>
          {error && <ThemedText type="small" style={styles.error}>{error}</ThemedText>}
          <Button label="Créer le groupe" loading={isCreating} disabled={!canCreate} onPress={handleCreate} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
