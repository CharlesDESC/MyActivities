import { render, screen, fireEvent } from '@testing-library/react-native';

import { StarRating } from '@/components/ui/star-rating';

describe('StarRating', () => {
  it('fills the rounded number of stars', async () => {
    await render(<StarRating value={3} />);
    expect(screen.getAllByText('⭐')).toHaveLength(3);
    expect(screen.getAllByText('☆')).toHaveLength(2);
  });

  it('rounds the value to the nearest star', async () => {
    await render(<StarRating value={3.6} />);
    expect(screen.getAllByText('⭐')).toHaveLength(4);
  });

  it('respects a custom max', async () => {
    await render(<StarRating value={0} max={3} />);
    expect(screen.getAllByText('☆')).toHaveLength(3);
  });

  it('is read-only (no press handler) by default', async () => {
    const onRate = jest.fn();
    await render(<StarRating value={2} />);
    // Aucun élément pressable : rien ne se passe
    expect(onRate).not.toHaveBeenCalled();
  });

  it('reports the pressed star (1-indexed) when interactive', async () => {
    const onRate = jest.fn();
    await render(<StarRating value={0} onRate={onRate} />);

    fireEvent.press(screen.getAllByText('☆')[3]);
    expect(onRate).toHaveBeenCalledWith(4);
  });
});
