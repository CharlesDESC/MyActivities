import { act, renderHook } from '@testing-library/react-native';

import { useLoginForm } from '@/hooks/use-login-form';
import { ApiError } from '@/lib/api';

const mockLogin = jest.fn();

jest.mock('@/context/auth', () => ({
  useAuth: () => ({ login: mockLogin, logout: jest.fn(), user: null, isLoading: false }),
}));

beforeEach(() => mockLogin.mockReset());

async function mountForm(overrides: Partial<{ pseudo: string; password: string }> = {}) {
  const { result } = await renderHook(() => useLoginForm());
  const values = { pseudo: 'Charles', password: 'MyPass1word', ...overrides };

  await act(async () => {
    result.current.setField('pseudo', values.pseudo);
    result.current.setField('password', values.password);
  });

  const submit = () => act(async () => { await result.current.submit(); });
  return { result, submit };
}

describe('useLoginForm — état initial', () => {
  it('starts empty and idle', async () => {
    const { result } = await renderHook(() => useLoginForm());

    expect(result.current.values).toEqual({ pseudo: '', password: '' });
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });
});

describe('useLoginForm — validation', () => {
  it('requires a pseudo of at least 3 characters', async () => {
    const { result, submit } = await mountForm({ pseudo: 'ab' });

    await submit();

    expect(result.current.errors.pseudo).toBe('Au moins 3 caractères');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('requires a pseudo at all', async () => {
    const { result, submit } = await mountForm({ pseudo: '' });

    await submit();

    expect(result.current.errors.pseudo).toBe('Au moins 3 caractères');
  });

  it('requires a password', async () => {
    const { result, submit } = await mountForm({ password: '' });

    await submit();

    expect(result.current.errors.password).toBe('Le mot de passe est requis');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('clears the error when the user edits the field', async () => {
    const { result, submit } = await mountForm({ pseudo: 'ab' });
    await submit();

    await act(async () => result.current.setField('pseudo', 'Charles'));

    expect(result.current.errors.pseudo).toBeUndefined();
  });
});

describe('useLoginForm — envoi', () => {
  it('logs in with the pseudo, not the email', async () => {
    mockLogin.mockResolvedValue(undefined);
    const { submit } = await mountForm();

    await submit();

    expect(mockLogin).toHaveBeenCalledWith('Charles', 'MyPass1word');
  });

  it('shows the server message on bad credentials', async () => {
    mockLogin.mockRejectedValue(new ApiError('Pseudo ou mot de passe incorrect.', 401));
    const { result, submit } = await mountForm();

    await submit();

    expect(result.current.errors.global).toBe('Pseudo ou mot de passe incorrect.');
  });

  it('relays the unverified-email message from the backend', async () => {
    mockLogin.mockRejectedValue(new ApiError('Vérifiez votre email avant de vous connecter.', 403));
    const { result, submit } = await mountForm();

    await submit();

    expect(result.current.errors.global).toBe('Vérifiez votre email avant de vous connecter.');
  });

  it('falls back to a generic message on a network failure', async () => {
    mockLogin.mockRejectedValue(new Error('Network request failed'));
    const { result, submit } = await mountForm();

    await submit();

    expect(result.current.errors.global).toBe('Une erreur est survenue');
  });

  it('releases the submitting flag on success and on failure', async () => {
    mockLogin.mockResolvedValue(undefined);
    const ok = await mountForm();
    await ok.submit();
    expect(ok.result.current.isSubmitting).toBe(false);

    mockLogin.mockRejectedValue(new ApiError('Boom', 500));
    const ko = await mountForm();
    await ko.submit();
    expect(ko.result.current.isSubmitting).toBe(false);
  });
});
