import { render, screen, fireEvent } from '@testing-library/react-native';

import { ActivityCard } from '@/components/ui/activity-card';
import type { ActivitySummary } from '@/types/activity';

function makeActivity(over: Partial<ActivitySummary> = {}): ActivitySummary {
  return {
    id: 'act-1', name: 'Escalade en salle', category: 'sport',
    distance: 2.34, avgRating: 4.5, reviewCount: 12,
    priceMin: 10, priceMax: 25, address: '12 rue de la Paix',
    ...over,
  };
}

describe('ActivityCard', () => {
  it('renders name and category label', async () => {
    await render(<ActivityCard activity={makeActivity()} />);
    expect(screen.getByText('Escalade en salle')).toBeTruthy();
    expect(screen.getByText('Sport')).toBeTruthy();
  });

  it('shows a price range', async () => {
    await render(<ActivityCard activity={makeActivity({ priceMin: 10, priceMax: 25 })} />);
    expect(screen.getByText('10 – 25 €')).toBeTruthy();
  });

  it('shows a single price when min equals max', async () => {
    await render(<ActivityCard activity={makeActivity({ priceMin: 15, priceMax: 15 })} />);
    expect(screen.getByText('15 €')).toBeTruthy();
  });

  it('shows "Gratuit" when free', async () => {
    await render(<ActivityCard activity={makeActivity({ priceMin: 0, priceMax: 0 })} />);
    expect(screen.getByText('Gratuit')).toBeTruthy();
  });

  it('formats distance in metres under 1 km', async () => {
    await render(<ActivityCard activity={makeActivity({ distance: 0.45 })} />);
    expect(screen.getByText(/450 m/)).toBeTruthy();
  });

  it('formats distance in kilometres from 1 km', async () => {
    await render(<ActivityCard activity={makeActivity({ distance: 2.34 })} />);
    expect(screen.getByText(/2\.3 km/)).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(<ActivityCard activity={makeActivity()} onPress={onPress} />);
    fireEvent.press(screen.getByText('Escalade en salle'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes one meaningful accessible name for the whole card', async () => {
    await render(<ActivityCard activity={makeActivity()} onPress={jest.fn()} />);

    expect(
      screen.getByLabelText(
        /Escalade en salle, Sport\. Note 4\.5 sur 5, 12 avis\. 2\.3 km\. 10 .* 25/,
      ),
    ).toHaveProp('accessibilityRole', 'button');
  });
});
