import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Calendar, toDateKey } from '@/components/ui/calendar';
import { MINIMUM_TOUCH_TARGET } from '@/constants/accessibility';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

describe('toDateKey', () => {
  it('formats a local YYYY-MM-DD key (pas d’UTC)', () => {
    expect(toDateKey(new Date(2026, 7, 1))).toBe('2026-08-01'); // index 7 = août
    expect(toDateKey(new Date(2026, 0, 9))).toBe('2026-01-09');
  });
});

describe('Calendar', () => {
  const today = new Date();

  it('renders the current month and weekday headers', async () => {
    await render(<Calendar markedDates={new Set()} selectedDate={null} onSelectDate={jest.fn()} />);
    expect(screen.getByText(`${MONTHS[today.getMonth()]} ${today.getFullYear()}`)).toBeTruthy();
    // L M M J V S D → deux "M" (mardi + mercredi)
    expect(screen.getAllByText('M')).toHaveLength(2);
  });

  it('selects a marked day and reports its key', async () => {
    const onSelectDate = jest.fn();
    const key = toDateKey(today);
    await render(<Calendar markedDates={new Set([key])} selectedDate={null} onSelectDate={onSelectDate} />);

    fireEvent.press(screen.getByText(String(today.getDate())));
    expect(onSelectDate).toHaveBeenCalledWith(key);
  });

  it('allows any future day for an activity without predefined slots', async () => {
    const onSelectDate = jest.fn();
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    await render(
      <Calendar
        markedDates={new Set()}
        selectedDate={null}
        onSelectDate={onSelectDate}
        allowAnyFutureDate
      />,
    );

    fireEvent.press(screen.getByText('›'));
    await waitFor(() =>
      expect(screen.getByText(`${MONTHS[next.getMonth()]} ${next.getFullYear()}`)).toBeTruthy(),
    );
    fireEvent.press(screen.getByLabelText(`1 ${MONTHS[next.getMonth()]}, disponible`));

    expect(onSelectDate).toHaveBeenCalledWith(toDateKey(next));
  });

  it('navigates to the next month', async () => {
    await render(<Calendar markedDates={new Set()} selectedDate={null} onSelectDate={jest.fn()} />);
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    fireEvent.press(screen.getByText('›'));
    await waitFor(() =>
      expect(screen.getByText(`${MONTHS[next.getMonth()]} ${next.getFullYear()}`)).toBeTruthy(),
    );
  });

  it('keeps month navigation and day targets above the project minimums', async () => {
    const key = toDateKey(today);
    await render(
      <Calendar markedDates={new Set([key])} selectedDate={null} onSelectDate={jest.fn()} />,
    );

    const nextButton = screen.getByLabelText('Mois suivant');
    const dayButton = screen.getByLabelText(
      `${today.getDate()} ${MONTHS[today.getMonth()]}, créneaux disponibles`,
    );
    const nextStyle = StyleSheet.flatten(nextButton.props.style);
    const dayStyle = StyleSheet.flatten(dayButton.props.style);

    expect(nextStyle.minWidth).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET);
    expect(nextStyle.minHeight).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET);
    expect(dayStyle.minWidth).toBeGreaterThanOrEqual(24);
    expect(dayStyle.minHeight).toBeGreaterThanOrEqual(24);
  });
});
