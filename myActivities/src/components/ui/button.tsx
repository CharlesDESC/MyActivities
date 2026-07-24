import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { styles } from '@/styles/components/ui/button';

import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
};

const CONTAINER_STYLE = {
  primary: styles.primary,
  ghost: styles.ghost,
  danger: styles.danger,
} as const;

const LABEL_STYLE = {
  primary: styles.labelPrimary,
  ghost: styles.labelGhost,
  danger: styles.labelDanger,
} as const;

export function Button({
  label,
  loading,
  variant = 'primary',
  style,
  disabled,
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const foregroundColor =
    variant === 'primary' ? '#ffffff' : variant === 'ghost' ? theme.primary : theme.error;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loading ? `${label}, chargement en cours` : label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        CONTAINER_STYLE[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      {...props}>
      {loading ? (
        <ActivityIndicator color={foregroundColor} size="small" />
      ) : (
        <ThemedText
          type="smallBold"
          style={[LABEL_STYLE[variant], { color: foregroundColor }]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}
