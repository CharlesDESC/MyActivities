import { Pressable, View } from 'react-native';

import { styles } from '@/styles/components/ui/star-rating';
import { ThemedText } from '@/components/ui/themed-text';

type Props = {
  value: number;
  max?: number;
  size?: 'small' | 'normal';
  onRate?: (rating: number) => void;
};

export function StarRating({ value, max = 5, size = 'normal', onRate }: Props) {
  const starStyle = size === 'small' ? styles.starSmall : styles.star;

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
        return onRate ? (
          <Pressable
            key={i}
            onPress={() => onRate(i + 1)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`Noter ${i + 1} étoile${i > 0 ? 's' : ''} sur ${max}`}>
            <ThemedText style={starStyle}>{filled ? '⭐' : '☆'}</ThemedText>
          </Pressable>
        ) : (
          <ThemedText key={i} style={starStyle}>{filled ? '⭐' : '☆'}</ThemedText>
        );
      })}
    </View>
  );
}
