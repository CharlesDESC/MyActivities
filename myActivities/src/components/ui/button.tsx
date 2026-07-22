import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { styles } from '@/styles/components/ui/button';

import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  style?: ViewStyle;
};

export function Button({
  label,
  loading,
  variant = 'primary',
  style,
  disabled,
  ...props
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      {...props}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#ffffff' : '#208AEF'} size="small" />
      ) : (
        <ThemedText type="smallBold" style={isPrimary ? styles.labelPrimary : styles.labelGhost}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

