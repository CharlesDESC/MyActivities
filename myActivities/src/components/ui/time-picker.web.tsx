import { TextInput } from 'react-native';

import { styles } from '@/styles/components/ui/time-picker';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string | null;
  onChange: (time: string) => void;
};

export function TimePicker({ value, onChange }: Props) {
  const theme = useTheme();

  return (
    <TextInput
      value={value ?? ''}
      onChangeText={onChange}
      placeholder="HH:mm"
      placeholderTextColor={theme.textSecondary}
      accessibilityLabel="Choisir une heure au format heures minutes"
      inputMode="numeric"
      maxLength={5}
      style={[
        styles.webInput,
        { backgroundColor: theme.backgroundSelected, color: theme.text },
      ]}
    />
  );
}
