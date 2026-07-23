import { Text, type TextProps } from 'react-native';

import { styles } from '@/styles/components/ui/themed-text';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = 'default',
  themeColor,
  accessibilityRole,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const resolvedAccessibilityRole =
    accessibilityRole ?? (type === 'title' || type === 'subtitle' ? 'header' : undefined);

  return (
    <Text
      accessibilityRole={resolvedAccessibilityRole}
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.primary }],
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}
