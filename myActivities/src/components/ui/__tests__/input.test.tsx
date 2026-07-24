import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Input } from '@/components/ui/input';
import { MINIMUM_TOUCH_TARGET } from '@/constants/accessibility';

describe('Input', () => {
  it('renders a label when provided', async () => {
    await render(<Input label="Email" placeholder="ton@email.fr" />);
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('ton@email.fr')).toBeTruthy();
  });

  it('shows an error message', async () => {
    await render(<Input label="Email" error="Email invalide" />);
    const error = screen.getByText('Email invalide');
    expect(error).toHaveProp('accessibilityRole', 'alert');
    expect(error).toHaveProp('accessibilityLiveRegion', 'polite');
  });

  it('forwards text changes', async () => {
    const onChangeText = jest.fn();
    await render(<Input placeholder="Pseudo" onChangeText={onChangeText} />);
    fireEvent.changeText(screen.getByPlaceholderText('Pseudo'), 'charles');
    expect(onChangeText).toHaveBeenCalledWith('charles');
  });

  it('toggles password visibility', async () => {
    await render(<Input label="Mot de passe" placeholder="secret" secureTextEntry />);
    // Masqué par défaut : le bouton propose d'afficher, le champ est masqué.
    expect(screen.getByPlaceholderText('secret').props.secureTextEntry).toBe(true);

    fireEvent.press(screen.getByLabelText('Afficher le mot de passe'));
    // Désormais visible : le bouton propose de masquer, le champ est en clair.
    const hideBtn = await screen.findByLabelText('Masquer le mot de passe');
    expect(screen.getByPlaceholderText('secret').props.secureTextEntry).toBe(false);

    fireEvent.press(hideBtn);
    expect(await screen.findByLabelText('Afficher le mot de passe')).toBeTruthy();
  });

  it('gives the password visibility action a large touch target', async () => {
    await render(<Input label="Mot de passe" secureTextEntry />);
    const action = screen.getByLabelText('Afficher le mot de passe');
    const style = StyleSheet.flatten(action.props.style);

    expect(style.minWidth).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET);
    expect(style.minHeight).toBeGreaterThanOrEqual(MINIMUM_TOUCH_TARGET);
  });

  it('has no visibility toggle for non-password inputs', async () => {
    await render(<Input label="Email" placeholder="mail" />);
    expect(screen.queryByLabelText('Afficher le mot de passe')).toBeNull();
  });
});
