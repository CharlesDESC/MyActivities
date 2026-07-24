import { render, screen, fireEvent } from '@testing-library/react-native';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders its label', async () => {
    await render(<Button label="Valider" />);
    expect(screen.getByText('Valider')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<Button label="Valider" onPress={onPress} />);
    fireEvent.press(screen.getByText('Valider'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Valider" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText('Valider'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('hides the label and shows a spinner while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Valider" onPress={onPress} loading />);
    expect(screen.queryByText('Valider')).toBeNull();
    expect(screen.getByLabelText('Valider, chargement en cours')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ busy: true, disabled: true }),
    );
    // loading implique disabled
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders the ghost variant', async () => {
    await render(<Button label="Retour" variant="ghost" />);
    expect(screen.getByText('Retour')).toBeTruthy();
  });
});
