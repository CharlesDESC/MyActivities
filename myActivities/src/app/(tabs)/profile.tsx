import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { styles } from '@/styles/app/profile';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';

const ROLE_LABEL: Record<string, string> = {
  member: 'Membre',
  organizer: 'Organisateur',
  admin: 'Administrateur',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  function handleLogout() {
    Alert.alert(
      'Se déconnecter ?',
      'Tu devras te reconnecter pour accéder à ton compte.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: logout },
      ],
    );
  }

  if (!user) return null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <ThemedView type="backgroundElement" style={styles.avatar}>
              <Icon name="account-circle" size={48} themeColor="textSecondary" />
            </ThemedView>
            <ThemedText type="subtitle">{user.pseudo}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {ROLE_LABEL[user.role] ?? user.role}
            </ThemedText>
          </View>

          {/* Informations */}
          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              INFORMATIONS
            </ThemedText>

            <View style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary">Email</ThemedText>
              <ThemedText type="small" style={styles.rowLabel} numberOfLines={1}>
                {user.email}
              </ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />

            <View style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary">Pseudo</ThemedText>
              <ThemedText type="small" style={styles.rowLabel}>{user.pseudo}</ThemedText>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />

            <View style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary">Rôle</ThemedText>
              <ThemedText type="small" style={styles.rowLabel}>
                {ROLE_LABEL[user.role] ?? user.role}
              </ThemedText>
            </View>
          </ThemedView>

          {/* Messagerie */}
          <Pressable onPress={() => router.push('/messages')} accessibilityRole="button" accessibilityLabel="Ouvrir la messagerie">
            <ThemedView type="backgroundElement" style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Icon name="chat" size={18} />
                <ThemedText type="small">Messages</ThemedText>
              </View>
              <Icon name="chevron-right" size={20} themeColor="textSecondary" />
            </ThemedView>
          </Pressable>

          {/* Déconnexion */}
          <View style={styles.logoutRow}>
            <ThemedView
              type="backgroundElement"
              style={styles.row}>
              <ThemedText
                type="small"
                style={{ color: '#EF4444', fontWeight: '600', flex: 1 }}
                onPress={handleLogout}
                accessibilityRole="button"
                accessibilityLabel="Se déconnecter">
                Se déconnecter
              </ThemedText>
            </ThemedView>
          </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
