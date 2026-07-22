import { Pressable, View } from 'react-native';

import { styles } from '@/styles/components/ui/planning-card';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_CONFIG } from '@/types/activity';
import type { PlanningEntry } from '@/types/planning';

type Props = {
  entry: PlanningEntry;
  onRemove: () => void;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.getDate().toString(),
    month: d.toLocaleString('fr-FR', { month: 'short' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function PlanningCard({ entry, onRemove }: Props) {
  const theme = useTheme();
  const cfg = CATEGORY_CONFIG[entry.activity.category];
  const { day, month, time } = formatDate(entry.scheduledAt);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {/* Date strip */}
      <View style={[styles.dateStrip, { backgroundColor: cfg.color + '22' }]}>
        <ThemedText style={[styles.dateDay, { color: cfg.color }]}>{day}</ThemedText>
        <ThemedText style={[styles.dateMonth, { color: cfg.color }]}>{month}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.dateTime}>{time}</ThemedText>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={2} style={styles.name}>
          {entry.activity.name}
        </ThemedText>
        <ThemedText type="small" style={[styles.categoryLabel, { color: cfg.color }]}>
          {cfg.emoji} {cfg.label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.address}>
          {entry.activity.address}
        </ThemedText>
      </View>

      {/* Remove button */}
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Retirer ${entry.activity.name} du planning`}
        style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.5 }]}>
        <ThemedText style={{ fontSize: 18, color: theme.textSecondary }}>✕</ThemedText>
      </Pressable>
    </ThemedView>
  );
}
