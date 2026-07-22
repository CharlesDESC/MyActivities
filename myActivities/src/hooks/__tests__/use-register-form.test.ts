import { act, renderHook } from '@testing-library/react-native';

import { useRegisterForm } from '@/hooks/use-register-form';
import { api, ApiError } from '@/lib/api';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return { ...actual, api: { post: jest.fn() } };
});

const mockPost = api.post as jest.Mock;

beforeEach(() => mockPost.mockReset());

type Field = 'email' | 'pseudo' | 'password' | 'confirmPassword';
type Form = ReturnType<typeof useRegisterForm>;

const VALID: Record<Field, string> = {
  email: 'user@example.com',
  pseudo: 'Charles',
  password: 'MyPass1word',
  confirmPassword: 'MyPass1word',
};

/**
 * Monte le hook et le remplit avec un jeu de valeurs valides, surchargeable.
 * `renderHook` est asynchrone depuis RNTL v14, d'où le await.
 */
async function mountForm(overrides: Partial<Record<Field, string>> = {}) {
  const { result } = await renderHook(() => useRegisterForm());
  const values = { ...VALID, ...overrides };

  await act(async () => {
    (Object.keys(values) as Field[]).forEach((key) => result.current.setField(key, values[key]));
  });

  const submit = () => act(async () => { await result.current.submit(); });
  return { result: result as { current: Form }, submit };
}

describe('useRegisterForm — état initial', () => {
  it('starts empty, idle and unregistered', async () => {
    const { result } = await renderHook(() => useRegisterForm());

    expect(result.current.values).toEqual({ email: '', pseudo: '', password: '', confirmPassword: '' });
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.registered).toBe(false);
  });
});

describe('useRegisterForm — saisie', () => {
  it('updates the edited field', async () => {
    const { result } = await renderHook(() => useRegisterForm());

    await act(async () => result.current.setField('pseudo', 'Charles'));

    expect(result.current.values.pseudo).toBe('Charles');
  });

  it('clears the field error as soon as the user types again', async () => {
    const { result } = await renderHook(() => useRegisterForm());

    await act(async () => { await result.current.submit(); });
    expect(result.current.errors.pseudo).toBeDefined();

    await act(async () => result.current.setField('pseudo', 'Charles'));
    expect(result.current.errors.pseudo).toBeUndefined();
  });
});

describe('useRegisterForm — validation', () => {
  it('requires the email', async () => {
    const { result, submit } = await mountForm({ email: '' });

    await submit();

    expect(result.current.errors.email).toBe("L'email est requis");
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    const { result, submit } = await mountForm({ email: 'pas-un-email' });

    await submit();

    expect(result.current.errors.email).toBe('Email invalide');
  });

  it('requires a pseudo of at least 3 characters', async () => {
    const { result, submit } = await mountForm({ pseudo: 'ab' });

    await submit();

    expect(result.current.errors.pseudo).toBe('Au moins 3 caractères');
  });

  it('requires a password', async () => {
    const { result, submit } = await mountForm({ password: '', confirmPassword: '' });

    await submit();

    expect(result.current.errors.password).toBe('Le mot de passe est requis');
  });

  it('requires 8 characters minimum', async () => {
    const { result, submit } = await mountForm({ password: 'Ab1', confirmPassword: 'Ab1' });

    await submit();

    expect(result.current.errors.password).toBe('Au moins 8 caractères');
  });

  it('requires an uppercase letter — mirroring the backend rule', async () => {
    const { result, submit } = await mountForm({
      password: 'alllowercase1',
      confirmPassword: 'alllowercase1',
    });

    await submit();

    expect(result.current.errors.password).toBe('Doit contenir une majuscule et un chiffre');
  });

  it('requires a digit', async () => {
    const { result, submit } = await mountForm({
      password: 'NoDigitsHere',
      confirmPassword: 'NoDigitsHere',
    });

    await submit();

    expect(result.current.errors.password).toBe('Doit contenir une majuscule et un chiffre');
  });

  it('rejects a mismatched confirmation', async () => {
    const { result, submit } = await mountForm({ confirmPassword: 'AutreMdp1' });

    await submit();

    expect(result.current.errors.confirmPassword).toBe('Les mots de passe ne correspondent pas');
  });

  it('reports every invalid field at once', async () => {
    const { result, submit } = await mountForm({
      email: 'bad',
      pseudo: 'x',
      password: 'short',
      confirmPassword: 'other',
    });

    await submit();

    expect(Object.keys(result.current.errors).sort()).toEqual([
      'confirmPassword',
      'email',
      'password',
      'pseudo',
    ]);
  });
});

describe('useRegisterForm — envoi', () => {
  it('posts the registration without the confirmation field', async () => {
    mockPost.mockResolvedValue({});
    const { submit } = await mountForm();

    await submit();

    expect(mockPost).toHaveBeenCalledWith(
      '/auth/register',
      { email: 'user@example.com', pseudo: 'Charles', password: 'MyPass1word' },
      { skipAuth: true },
    );
  });

  it('flags the form as registered on success', async () => {
    mockPost.mockResolvedValue({});
    const { result, submit } = await mountForm();

    await submit();

    expect(result.current.registered).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('surfaces the server message on a 409', async () => {
    mockPost.mockRejectedValue(new ApiError('Ce pseudo est déjà pris.', 409));
    const { result, submit } = await mountForm();

    await submit();

    expect(result.current.errors.global).toBe('Ce pseudo est déjà pris.');
    expect(result.current.registered).toBe(false);
  });

  it('falls back to a generic message on a network failure', async () => {
    mockPost.mockRejectedValue(new Error('Network request failed'));
    const { result, submit } = await mountForm();

    await submit();

    expect(result.current.errors.global).toBe('Une erreur est survenue');
  });

  it('releases the submitting flag even when the call fails', async () => {
    mockPost.mockRejectedValue(new ApiError('Boom', 500));
    const { result, submit } = await mountForm();

    await submit();

    expect(result.current.isSubmitting).toBe(false);
  });
});
