import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { Calendar, toDateKey } from '@/components/ui/calendar';

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

  it('navigates to the next month', async () => {
    await render(<Calendar markedDates={new Set()} selectedDate={null} onSelectDate={jest.fn()} />);
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    fireEvent.press(screen.getByText('›'));
    await waitFor(() =>
      expect(screen.getByText(`${MONTHS[next.getMonth()]} ${next.getFullYear()}`)).toBeTruthy(),
    );
  });
});
