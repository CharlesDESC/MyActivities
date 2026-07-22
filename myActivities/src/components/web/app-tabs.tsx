import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';

import { styles } from '@/styles/components/web/app-tabs';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';

export default function AppTabs() {
  return (
    <Tabs style={styles.shell}>
      <TabList asChild>
        <WebHeader>
          <TabTrigger name="dashboard" href="/dashboard" asChild>
            <TabButton icon={<SymbolView name={{ ios: 'chart.bar.fill', web: 'dashboard' }} size={16} />}>
              Tableau de bord
            </TabButton>
          </TabTrigger>
          <TabTrigger name="my-activities" href="/my-activities" asChild>
            <TabButton icon={<SymbolView name={{ ios: 'list.bullet', web: 'event_note' }} size={16} />}>
              Mes activités
            </TabButton>
          </TabTrigger>
          <TabTrigger name="messages" href="/messages" asChild>
            <TabButton icon={<SymbolView name={{ ios: 'message', web: 'chat' }} size={16} />}>
              Messages
            </TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton
              icon={<SymbolView name={{ ios: 'person.circle', web: 'account_circle' }} size={16} />}>
              Profil
            </TabButton>
          </TabTrigger>
        </WebHeader>
      </TabList>
      <TabSlot style={styles.slot} />
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: React.ReactNode };

function TabButton({ children, isFocused, icon, ...props }: TabButtonProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        {icon}
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

/** Barre de navigation supérieure de la console web organisateur : marque à
 *  gauche, onglets à droite, alignés sur la largeur de contenu. En flux normal
 *  (non absolue) pour ne pas recouvrir le contenu des écrans. */
function WebHeader({ children, style, ...props }: TabListProps) {
  return (
    <ThemedView type="background" {...props} style={[styles.headerBar, style]}>
      <View style={styles.headerInner}>
        <View style={styles.brand}>
          <ThemedText type="subtitle" style={styles.brandName}>
            MyActivities
          </ThemedText>
          <View style={styles.brandPill}>
            <ThemedText style={styles.brandPillText}>Organisateur</ThemedText>
          </View>
        </View>
        <View style={styles.tabs}>{children}</View>
      </View>
    </ThemedView>
  );
}
