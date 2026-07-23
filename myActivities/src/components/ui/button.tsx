import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { styles } from '@/styles/components/ui/button';

import { ThemedText } from '@/components/ui/themed-text';

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

const SPINNER_COLOR = {
  primary: '#ffffff',
  ghost: '#208AEF',
  danger: '#EF4444',
} as const;

export function Button({
  label,
  loading,
  variant = 'primary',
  style,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
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
        <ActivityIndicator color={SPINNER_COLOR[variant]} size="small" />
      ) : (
        <ThemedText type="smallBold" style={LABEL_STYLE[variant]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

