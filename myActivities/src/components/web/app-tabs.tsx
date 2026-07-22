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
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="dashboard" href="/dashboard" asChild>
            <TabButton icon={<SymbolView name={{ ios: 'chart.bar.fill', web: 'dashboard' }} size={14} />}>
              Tableau de bord
            </TabButton>
          </TabTrigger>
          <TabTrigger name="my-activities" href="/my-activities" asChild>
            <TabButton icon={<SymbolView name={{ ios: 'list.bullet', web: 'event_note' }} size={14} />}>
              Mes activités
            </TabButton>
          </TabTrigger>
          <TabTrigger name="messages" href="/messages" asChild>
            <TabButton
              icon={<SymbolView name={{ ios: 'message', web: 'chat' }} size={14} />}>
              Messages
            </TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton
              icon={
                <SymbolView name={{ ios: 'person.circle', web: 'account_circle' }} size={14} />
              }>
              Profil
            </TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
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

function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {props.children}
      </ThemedView>
    </View>
  );
}

