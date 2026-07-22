import { TextInput, View, type TextInputProps } from 'react-native';

import { styles } from '@/styles/components/ui/input';

import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, style, ...props }: InputProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <TextInput
        accessibilityLabel={label}
        accessibilityState={{ disabled: props.editable === false }}
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundElement,
            color: theme.text,
            borderColor: error ? '#EF4444' : 'transparent',
          },
          style,
        ]}
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        {...props}
      />
      {error && (
        <ThemedText
          type="small"
          style={styles.error}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

