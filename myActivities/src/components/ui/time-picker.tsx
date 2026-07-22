import { useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { styles } from '@/styles/components/ui/time-picker';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string | null;
  onChange: (time: string) => void;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateFromTime(value: string | null): Date {
  const date = new Date();
  const match = value?.match(/^(\d{2}):(\d{2})$/);
  if (match) date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  else date.setMinutes(Math.floor(date.getMinutes() / 5) * 5 + 5, 0, 0);
  return date;
}

export function TimePicker({ value, onChange }: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const pickerValue = useMemo(() => dateFromTime(value), [value]);

  function handleChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setVisible(false);
    if (event.type === 'dismissed' || !date) return;
    onChange(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
  }

  function openPicker() {
    if (!value) {
      const initialValue = dateFromTime(null);
      onChange(`${pad(initialValue.getHours())}:${pad(initialValue.getMinutes())}`);
    }
    setVisible(true);
  }

  return (
    <View>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={value ? `Heure choisie ${value}` : 'Choisir une heure'}
        style={[styles.trigger, { backgroundColor: theme.backgroundSelected }]}>
        <Icon name="schedule" size={20} themeColor="textSecondary" />
        <ThemedText style={styles.value} themeColor={value ? 'text' : 'textSecondary'}>
          {value ?? 'Choisir une heure'}
        </ThemedText>
        <Icon name="expand-more" size={20} themeColor="textSecondary" />
      </Pressable>

      {visible && (
        <>
          <DateTimePicker
            value={pickerValue}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour
            minuteInterval={5}
            onChange={handleChange}
            style={styles.iosPicker}
          />
          {Platform.OS === 'ios' && (
            <View style={styles.iosActions}>
              <Button label="Valider l'heure" variant="ghost" onPress={() => setVisible(false)} />
            </View>
          )}
        </>
      )}
    </View>
  );
}
