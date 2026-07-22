import { View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/context/auth';

/** N'affiche son contenu qu'aux organisateurs/admins ; sinon un message d'accès. */
export function OrganizerOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const allowed = user?.role === 'organizer' || user?.role === 'admin';

  if (!allowed) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 }}>
        <Icon name="lock" size={40} themeColor="textSecondary" />
        <ThemedText type="subtitle">Espace organisateur</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          Cette section est réservée aux comptes organisateurs.
        </ThemedText>
      </View>
    );
  }
  return <>{children}</>;
}
