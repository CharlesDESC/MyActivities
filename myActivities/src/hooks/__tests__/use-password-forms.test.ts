import { act, renderHook } from '@testing-library/react-native';

import { useForgotPasswordForm } from '@/hooks/use-forgot-password-form';
import { useResetPasswordForm } from '@/hooks/use-reset-password-form';
import { api, ApiError } from '@/lib/api';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { post: jest.fn() } };
});

const mockPost = api.post as jest.Mock;

beforeEach(() => mockPost.mockReset());

describe('useForgotPasswordForm — validation', () => {
  async function mount(email: string) {
    const { result } = await renderHook(() => useForgotPasswordForm());
    await act(async () => result.current.setField('email', email));
    const submit = () => act(async () => { await result.current.submit(); });
    return { result, submit };
  }

  it('starts empty and unsent', async () => {
    const { result } = await renderHook(() => useForgotPasswordForm());

    expect(result.current.values.email).toBe('');
    expect(result.current.sent).toBe(false);
  });

  it('requires the email', async () => {
    const { result, submit } = await mount('');

    await submit();

    expect(result.current.errors.email).toBe("L'email est requis");
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    const { result, submit } = await mount('pas-un-email');

    await submit();

    expect(result.current.errors.email).toBe('Email invalide');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('clears the error when the user types again', async () => {
    const { result, submit } = await mount('bad');
    await submit();

    await act(async () => result.current.setField('email', 'user@example.com'));

    expect(result.current.errors.email).toBeUndefined();
  });
});

describe('useForgotPasswordForm — envoi', () => {
  async function mountValid() {
    const { result } = await renderHook(() => useForgotPasswordForm());
    await act(async () => result.current.setField('email', 'user@example.com'));
    const submit = () => act(async () => { await result.current.submit(); });
    return { result, submit };
  }

  it('posts the request without auth', async () => {
    mockPost.mockResolvedValue({});
    const { submit } = await mountValid();

    await submit();

    expect(mockPost).toHaveBeenCalledWith(
      '/auth/forgot-password',
      { email: 'user@example.com' },
      { skipAuth: true },
    );
  });

  it('reports success after a successful call', async () => {
    mockPost.mockResolvedValue({});
    const { result, submit } = await mountValid();

    await submit();

    expect(result.current.sent).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
  });

  // Règle anti-énumération OWASP : l'écran ne doit jamais révéler si l'email existe.
  it('still reports success when the server errors, to prevent account enumeration', async () => {
    mockPost.mockRejectedValue(new ApiError('Utilisateur introuvable', 404));
    const { result, submit } = await mountValid();

    await submit();

    expect(result.current.sent).toBe(true);
    expect(result.current.errors.global).toBeUndefined();
  });

  it('stays silent on a network failure too', async () => {
    mockPost.mockRejectedValue(new Error('offline'));
    const { result, submit } = await mountValid();

    await submit();

    expect(result.current.sent).toBe(true);
  });
});

describe('useResetPasswordForm — validation', () => {
  async function mount(password: string, confirmPassword = password) {
    const { result } = await renderHook(() => useResetPasswordForm());
    await act(async () => {
      result.current.setField('password', password);
      result.current.setField('confirmPassword', confirmPassword);
    });
    const submit = (token = 'reset-token') =>
      act(async () => { await result.current.submit(token); });
    return { result, submit };
  }

  it('starts empty and not done', async () => {
    const { result } = await renderHook(() => useResetPasswordForm());

    expect(result.current.values).toEqual({ password: '', confirmPassword: '' });
    expect(result.current.done).toBe(false);
  });

  it('requires a password', async () => {
    const { result, submit } = await mount('');

    await submit();

    expect(result.current.errors.password).toBe('Le mot de passe est requis');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('requires 8 characters minimum', async () => {
    const { result, submit } = await mount('Ab1');

    await submit();

    expect(result.current.errors.password).toBe('Au moins 8 caractères');
  });

  it('requires an uppercase letter and a digit', async () => {
    const { result, submit } = await mount('alllowercase1');

    await submit();

    expect(result.current.errors.password).toBe('Doit contenir une majuscule et un chiffre');
  });

  it('rejects a mismatched confirmation', async () => {
    const { result, submit } = await mount('MyPass1word', 'AutreMdp1');

    await submit();

    expect(result.current.errors.confirmPassword).toBe('Les mots de passe ne correspondent pas');
  });
});

describe('useResetPasswordForm — envoi', () => {
  async function mountValid() {
    const { result } = await renderHook(() => useResetPasswordForm());
    await act(async () => {
      result.current.setField('password', 'MyPass1word');
      result.current.setField('confirmPassword', 'MyPass1word');
    });
    const submit = (token = 'reset-token') =>
      act(async () => { await result.current.submit(token); });
    return { result, submit };
  }

  it('posts the token alongside the new password', async () => {
    mockPost.mockResolvedValue({});
    const { submit } = await mountValid();

    await submit('token-from-deep-link');

    expect(mockPost).toHaveBeenCalledWith(
      '/auth/reset-password',
      { token: 'token-from-deep-link', password: 'MyPass1word' },
      { skipAuth: true },
    );
  });

  it('flags the reset as done on success', async () => {
    mockPost.mockResolvedValue({});
    const { result, submit } = await mountValid();

    await submit();

    expect(result.current.done).toBe(true);
  });

  it('surfaces an expired-token message', async () => {
    mockPost.mockRejectedValue(new ApiError('Token invalide ou expiré.', 400));
    const { result, submit } = await mountValid();

    await submit();

    expect(result.current.errors.global).toBe('Token invalide ou expiré.');
    expect(result.current.done).toBe(false);
  });

  it('falls back to a generic message on a network failure', async () => {
    mockPost.mockRejectedValue(new Error('offline'));
    const { result, submit } = await mountValid();

    await submit();

    expect(result.current.errors.global).toBe('Une erreur est survenue');
    expect(result.current.isSubmitting).toBe(false);
  });
});
