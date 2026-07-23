import { Pressable, View } from 'react-native';

import { styles } from '@/styles/components/ui/activity-card';

import { ThemedText } from '@/components/ui/themed-text';
import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_CONFIG, type ActivitySummary } from '@/types/activity';

type Props = {
  activity: ActivitySummary;
  onPress?: () => void;
};

export function ActivityCard({ activity, onPress }: Props) {
  const theme = useTheme();
  const cfg = CATEGORY_CONFIG[activity.category];

  const distanceLabel =
    activity.distance < 1
      ? `${Math.round(activity.distance * 1000)} m`
      : `${activity.distance.toFixed(1)} km`;

  const priceLabel =
    activity.priceMin === 0 && activity.priceMax === 0
      ? 'Gratuit'
      : activity.priceMin === activity.priceMax
        ? `${activity.priceMin} €`
        : `${activity.priceMin} – ${activity.priceMax} €`;

  const a11yLabel =
    `${activity.name}, ${cfg.label}. ` +
    `Note ${activity.avgRating.toFixed(1)} sur 5, ${activity.reviewCount} avis. ` +
    `${distanceLabel}. ${priceLabel}.`;

  return (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Ouvre le détail de l'activité"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.thumb, { backgroundColor: cfg.color + '22' }]}>
        <Icon name={cfg.icon} size={32} color={cfg.color} />
      </View>

      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={2} style={styles.name}>
          {activity.name}
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary" style={styles.categoryLabel}>
          {cfg.label}
        </ThemedText>

        <View style={styles.metaRow}>
          <Icon name="star" size={13} color={theme.accent} />
          <ThemedText type="small">{' '}{activity.avgRating.toFixed(1)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {' '}({activity.reviewCount})
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {' · '}{distanceLabel}
          </ThemedText>
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          {priceLabel}
        </ThemedText>
      </View>
    </Pressable>
  );
}
