import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { styles } from '@/styles/components/ui/calendar';
import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Clé locale YYYY-MM-DD (pas d'UTC : un créneau à 23h doit rester sur son jour local) */
export function toDateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Grille du mois : semaines de 7 cases (lundi → dimanche), null = hors mois */
function buildWeeks(monthStart: Date): (Date | null)[][] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0

  const cells: (Date | null)[] = Array(offset).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

type Props = {
  /** Jours sélectionnables (clés YYYY-MM-DD, typiquement les jours ayant des créneaux) */
  markedDates: Set<string>;
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
  /** Autorise tous les jours à partir d'aujourd'hui (activité sans créneaux imposés). */
  allowAnyFutureDate?: boolean;
};

export function Calendar({
  markedDates,
  selectedDate,
  onSelectDate,
  allowAnyFutureDate = false,
}: Props) {
  const theme = useTheme();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [month, setMonth] = useState(currentMonthStart);

  const weeks = useMemo(() => buildWeeks(month), [month]);
  const canGoPrev = month.getTime() > currentMonthStart.getTime();

  const changeMonth = (delta: number) =>
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => changeMonth(-1)}
          disabled={!canGoPrev}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Mois précédent"
          accessibilityState={{ disabled: !canGoPrev }}
          style={[styles.navButton, !canGoPrev && styles.navDisabled]}>
          <ThemedText type="smallBold">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold" accessibilityRole="header">
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </ThemedText>
        <Pressable
          onPress={() => changeMonth(1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Mois suivant"
          style={styles.navButton}>
          <ThemedText type="smallBold">›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((label, i) => (
          <View key={i} style={styles.dayCell}>
            <ThemedText type="small" themeColor="textSecondary">
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((date, di) => {
            if (!date) return <View key={di} style={styles.dayCell} />;

            const key = toDateKey(date);
            const hasSlots = markedDates.has(key);
            const selectable = date.getTime() >= today.getTime() && (allowAnyFutureDate || hasSlots);
            const isSelected = key === selectedDate;

            return (
              <Pressable
                key={di}
                disabled={!selectable}
                onPress={() => onSelectDate(key)}
                accessibilityRole="button"
                accessibilityLabel={`${date.getDate()} ${MONTHS[date.getMonth()]}${hasSlots ? ', créneaux disponibles' : selectable ? ', disponible' : ''}`}
                accessibilityState={{ disabled: !selectable, selected: isSelected }}
                style={[styles.dayCell, isSelected && { backgroundColor: theme.text }]}>
                <ThemedText
                  type="small"
                  style={{
                    color: isSelected ? theme.background : theme.text,
                    opacity: selectable || isSelected ? 1 : 0.35,
                    fontWeight: selectable ? '600' : '400',
                  }}>
                  {date.getDate()}
                </ThemedText>
                {selectable && !isSelected && (
                  <View style={[styles.dot, { backgroundColor: theme.text }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
