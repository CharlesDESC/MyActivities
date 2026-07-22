import { render, screen, fireEvent } from '@testing-library/react-native';

import { PlanningCard } from '@/components/ui/planning-card';
import type { PlanningEntry } from '@/types/planning';

const entry: PlanningEntry = {
  id: 'plan-1',
  scheduledAt: '2026-08-01T10:00:00.000Z',
  reminderOffsetMinutes: 30,
  createdAt: '2026-07-20T10:00:00.000Z',
  activity: {
    id: 'act-1', name: 'Escalade en salle', category: 'sport',
    address: '12 rue de la Paix', coverImageUrl: null,
    avgRating: 4.5, reviewCount: 12, priceMin: 10, priceMax: 25,
    latitude: 48.86, longitude: 2.35,
  },
};

describe('PlanningCard', () => {
  it('renders the activity name, category and address', async () => {
    await render(<PlanningCard entry={entry} onRemove={jest.fn()} />);
    expect(screen.getByText('Escalade en salle')).toBeTruthy();
    expect(screen.getByText('12 rue de la Paix')).toBeTruthy();
    expect(screen.getByText(/Sport/)).toBeTruthy();
  });

  it('calls onRemove when the remove button is pressed', async () => {
    const onRemove = jest.fn();
    await render(<PlanningCard entry={entry} onRemove={onRemove} />);
    fireEvent.press(screen.getByLabelText(/Retirer .* du planning/));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
