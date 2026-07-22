import { Image } from 'expo-image';
import { Linking, Pressable } from 'react-native';

import { styles } from '@/styles/components/web/web-badge';

export function WebBadge() {
  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => Linking.openURL('https://expo.dev')}>
      <Image
        source={require('@/assets/images/expo-badge-white.png')}
        style={styles.image}
        contentFit="contain"
      />
    </Pressable>
  );
}

