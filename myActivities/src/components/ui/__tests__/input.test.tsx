import { render, screen, fireEvent } from '@testing-library/react-native';

import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders a label when provided', async () => {
    await render(<Input label="Email" placeholder="ton@email.fr" />);
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('ton@email.fr')).toBeTruthy();
  });

  it('shows an error message', async () => {
    await render(<Input label="Email" error="Email invalide" />);
    expect(screen.getByText('Email invalide')).toBeTruthy();
  });

  it('forwards text changes', async () => {
    const onChangeText = jest.fn();
    await render(<Input placeholder="Pseudo" onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByPlaceholderText('Pseudo'), 'charles');
    expect(onChangeText).toHaveBeenCalledWith('charles');
  });
});
