import { Alert, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/app/messages';
import { ThemedText } from '@/components/ui/themed-text';
import { Icon } from '@/components/ui/icon';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useConversations } from '@/hooks/use-conversations';
import type { Conversation } from '@/types/message';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/** Nom affiché d'une conversation : titre du groupe, ou pseudo de l'autre membre. */
function conversationName(c: Conversation): string {
  if (c.type === 'group') return c.title ?? 'Groupe';
  return c.otherParticipant?.pseudo ?? 'Conversation';
}

export default function ConversationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { conversations, isLoading, error, refresh, remove } = useConversations();

  function confirmDelete(c: Conversation) {
    Alert.alert(
      'Supprimer la conversation',
      `Supprimer définitivement « ${conversationName(c)} » et tous ses messages ? La conversation sera aussi retirée pour l'autre participant.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            remove(c.id).catch(() => {
              Alert.alert('Suppression impossible', 'Réessaie dans un instant.');
            });
          },
        },
      ],
    );
  }

  function openConversation(c: Conversation) {
    router.push({
      pathname: '/messages/[conversationId]',
      params: {
        conversationId: c.id,
        peerPseudo: conversationName(c),
        // Un direct est identifié par le destinataire ; un groupe par son id seul.
        ...(c.type === 'direct' && c.otherParticipant ? { recipientId: c.otherParticipant.id } : {}),
      },
    });
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
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>Messages</ThemedText>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push('/messages/friends')}
              accessibilityRole="button"
              accessibilityLabel="Amis">
              <Icon name="group" size={24} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/messages/new-group')}
              accessibilityRole="button"
              accessibilityLabel="Nouveau groupe">
              <Icon name="add" size={24} />
            </Pressable>
          </View>
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          refreshing={isLoading}
          onRefresh={refresh}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} />
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openConversation(item)}
              onLongPress={() => confirmDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={`Conversation ${conversationName(item)}`}
              accessibilityHint="Appui long pour supprimer">
              <View style={styles.row}>
                <ThemedView type="backgroundElement" style={styles.avatar}>
                  <Icon name={item.type === 'group' ? 'group' : 'account-circle'} size={28} themeColor="textSecondary" />
                </ThemedView>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {conversationName(item)}
                    </ThemedText>
                    {item.lastMessage && (
                      <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
                        {formatTime(item.lastMessage.createdAt)}
                      </ThemedText>
                    )}
                  </View>
                  <View style={styles.rowTop}>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      numberOfLines={1}
                      style={styles.preview}>
                      {item.lastMessage?.content ?? 'Nouvelle conversation'}
                    </ThemedText>
                    {item.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <ThemedText style={styles.unreadText}>{item.unreadCount}</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Icon name="chat-bubble-outline" size={44} themeColor="textSecondary" />
                <ThemedText type="smallBold">Aucune conversation</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Ajoute des amis puis démarre une conversation ou crée un groupe.
                </ThemedText>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}
