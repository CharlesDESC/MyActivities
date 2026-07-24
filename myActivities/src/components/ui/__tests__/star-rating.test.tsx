import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { StarRating } from '@/components/ui/star-rating';
import { MINIMUM_TOUCH_TARGET } from '@/constants/accessibility';

describe('StarRating', () => {
  it('fills the rounded number of stars', async () => {
    await render(<StarRating value={3} />);
    expect(screen.getAllByTestId('star-filled')).toHaveLength(3);
    expect(screen.getAllByTestId('star-empty')).toHaveLength(2);
  });

  it('rounds the value to the nearest star', async () => {
    await render(<StarRating value={3.6} />);
    expect(screen.getAllByTestId('star-filled')).toHaveLength(4);
  });

  it('respects a custom max', async () => {
    await render(<StarRating value={0} max={3} />);
    expect(screen.getAllByTestId('star-empty')).toHaveLength(3);
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

    fireEvent.press(screen.getAllByTestId('star-empty')[3]);
    expect(onRate).toHaveBeenCalledWith(4);
  });

  it('exposes the selected rating and a large target for every interactive star', async () => {
    await render(<StarRating value={3} onRate={jest.fn()} />);
    const thirdStar = screen.getByLabelText('Noter 3 étoiles sur 5');
    const style = StyleSheet.flatten(thirdStar.props.style);

    expect(thirdStar).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
    expect(style.minWidth).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET);
    expect(style.minHeight).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET);
  });
});
