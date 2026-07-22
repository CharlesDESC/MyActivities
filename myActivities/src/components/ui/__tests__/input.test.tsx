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

  it('has no visibility toggle for non-password inputs', async () => {
    await render(<Input label="Email" placeholder="mail" />);
    expect(screen.queryByLabelText('Afficher le mot de passe')).toBeNull();
  });
});
