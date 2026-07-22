import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { styles } from '@/styles/components/ui/input';

import { ThemedText } from '@/components/ui/themed-text';
import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, style, secureTextEntry, ...props }: InputProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <View style={styles.wrapper}>
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <View style={styles.field}>
        <TextInput
          accessibilityLabel={label}
          accessibilityState={{ disabled: props.editable === false }}
          // Masqué par défaut ; le bouton œil bascule la visibilité.
          secureTextEntry={isPassword && !visible}
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundElement,
              color: theme.text,
              borderColor: error ? '#EF4444' : 'transparent',
            },
            isPassword && styles.inputWithAction,
            style,
          ]}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
            <Icon name={visible ? 'visibility-off' : 'visibility'} size={20} themeColor="textSecondary" />
          </Pressable>
        )}
      </View>
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
