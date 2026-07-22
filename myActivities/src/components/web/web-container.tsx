import { View, type ViewProps } from 'react-native';

import { styles } from '@/styles/components/web/web-container';

/** Conteneur desktop : centre le contenu et le borne à `MaxContentWidth`. */
export function WebContainer({ children, style, ...props }: ViewProps) {
  return (
    <View style={styles.outer} {...props}>
      <View style={[styles.inner, style]}>{children}</View>
    </View>
  );
}
