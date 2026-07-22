import { useEffect, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { styles } from '@/styles/app/messages';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/auth';
import { useChat } from '@/hooks/use-chat';
import { useRealtime } from '@/hooks/use-realtime';
import type { Message } from '@/types/message';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ conversationId?: string; recipientId?: string; peerPseudo?: string }>();
  useRealtime(); // maintient la connexion socket

  // Sentinelle "new" → conversation encore inexistante (id déduit du 1er message envoyé).
  const conversationId = params.conversationId === 'new' ? undefined : params.conversationId;

  const { messages, isLoading, isSending, send, markRead } = useChat({
    conversationId,
    recipientId: params.recipientId,
  });

  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  // Marque la conversation lue à l'ouverture et à chaque nouveau message affiché.
  useEffect(() => { markRead(); }, [markRead, messages.length]);

  // Fait défiler vers le dernier message.
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  async function handleSend() {
    const content = draft;
    setDraft('');
    try {
      await send(content);
    } catch {
      setDraft(content); // restaure le brouillon en cas d'échec
    }
  }

  const canSend = draft.trim().length > 0 && !isSending;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Retour">
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerTitle} numberOfLines={1}>
            {params.peerPseudo ?? 'Conversation'}
          </ThemedText>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            refreshing={isLoading}
            contentContainerStyle={styles.threadContent}
            renderItem={({ item }) => {
              const mine = item.sender.id === user?.id;
              return (
                <ThemedView
                  type={mine ? 'background' : 'backgroundElement'}
                  style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <ThemedText type="small" style={mine ? styles.bubbleTextMine : undefined}>
                    {item.content}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={[styles.bubbleTime, mine ? styles.bubbleTextMine : { color: theme.textSecondary }]}>
                    {formatTime(item.createdAt)}
                  </ThemedText>
                </ThemedView>
              );
            }}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.empty}>
                  <ThemedText style={styles.emptyEmoji}>💬</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                    Envoie le premier message.
                  </ThemedText>
                </View>
              ) : null
            }
          />

          <View style={styles.inputBar}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="Votre message…"
              placeholderTextColor={theme.textSecondary}
              value={draft}
              onChangeText={setDraft}
              multiline
              accessibilityLabel="Champ de message"
            />
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={[styles.sendButton, !canSend && styles.sendDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Envoyer">
              <ThemedText style={styles.sendIcon}>↑</ThemedText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
