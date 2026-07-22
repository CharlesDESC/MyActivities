import { Pressable, View } from 'react-native';

import { styles } from '@/styles/components/ui/star-rating';
import { Icon } from '@/components/ui/icon';

type Props = {
  value: number;
  max?: number;
  size?: 'small' | 'normal';
  onRate?: (rating: number) => void;
};

const AMBER = '#F59E0B';

export function StarRating({ value, max = 5, size = 'normal', onRate }: Props) {
  const iconSize = size === 'small' ? 16 : 22;

  return (
    <View
      style={styles.row}
      // En lecture seule, la note est annoncée comme un tout ; en mode interactif,
      // chaque étoile est un bouton distinct (labels ci-dessous).
      accessible={!onRate}
      accessibilityRole={onRate ? undefined : 'image'}
      accessibilityLabel={onRate ? undefined : `Note : ${Math.round(value)} sur ${max}`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value);
        const testID = filled ? 'star-filled' : 'star-empty';
        const star = <Icon name={filled ? 'star' : 'star-border'} size={iconSize} color={AMBER} />;
        return onRate ? (
          <Pressable
            key={i}
            onPress={() => onRate(i + 1)}
            hitSlop={4}
            testID={testID}
            accessibilityRole="button"
            accessibilityLabel={`Noter ${i + 1} étoile${i > 0 ? 's' : ''} sur ${max}`}>
            {star}
          </Pressable>
        ) : (
          <View key={i} testID={testID}>
            {star}
          </View>
        );
      })}
    </View>
  );
}
