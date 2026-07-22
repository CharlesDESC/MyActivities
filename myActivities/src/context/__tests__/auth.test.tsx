import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { AuthProvider, useAuth } from '@/context/auth';
import { api, ApiError, STORAGE_KEYS } from '@/lib/api';

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    api: { get: jest.fn(), post: jest.fn() },
    setUnauthenticatedCallback: jest.fn(),
  };
});

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;

const USER = { id: 'user-1', email: 'user@example.com', pseudo: 'Charles', role: 'member' as const };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  globalThis.resetSecureStore();
});

/** Monte le provider et attend la fin de la restauration de session. */
async function mountAuth() {
  const { result } = await renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

describe('useAuth — garde-fou', () => {
  it('throws when used outside of an AuthProvider', async () => {
    // React journalise l'erreur de rendu : on la masque pour garder la sortie lisible.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useAuth())).rejects.toThrow(
      'useAuth doit être utilisé dans un AuthProvider',
    );

    spy.mockRestore();
  });
});

describe('AuthProvider — restauration de session au démarrage', () => {
  it('stays logged out when no token is stored', async () => {
    const result = await mountAuth();

    expect(result.current.user).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('restores the user from a stored token', async () => {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, 'stored-token');
    mockGet.mockResolvedValue(USER);

    const result = await mountAuth();

    expect(mockGet).toHaveBeenCalledWith('/users/me');
    expect(result.current.user).toEqual(USER);
  });

  it('clears the stored tokens when the session is no longer valid', async () => {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, 'revoked');
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, 'revoked-refresh');
    mockGet.mockRejectedValue(new ApiError('Session expirée', 401));

    const result = await mountAuth();

    expect(result.current.user).toBeNull();
    expect(await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
  });

  it('keeps the tokens on a non-401 error — a server outage is not a logout', async () => {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, 'valid-token');
    mockGet.mockRejectedValue(new ApiError('Service indisponible', 503));

    const result = await mountAuth();

    expect(result.current.user).toBeNull();
    expect(await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN)).toBe('valid-token');
  });

  it('always ends the loading state', async () => {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, 'token');
    mockGet.mockRejectedValue(new Error('offline'));

    const result = await mountAuth();

    expect(result.current.isLoading).toBe(false);
  });
});

describe('AuthProvider — connexion', () => {
  it('logs in with the pseudo and stores both tokens', async () => {
    mockPost.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', user: USER });
    const result = await mountAuth();

    await act(async () => { await result.current.login('Charles', 'MyPass1word'); });

    expect(mockPost).toHaveBeenCalledWith(
      '/auth/login',
      { pseudo: 'Charles', password: 'MyPass1word' },
      { skipAuth: true },
    );
    expect(await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN)).toBe('access');
    expect(await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN)).toBe('refresh');
    expect(result.current.user).toEqual(USER);
  });

  it('propagates bad credentials to the form and stores nothing', async () => {
    mockPost.mockRejectedValue(new ApiError('Pseudo ou mot de passe incorrect.', 401));
    const result = await mountAuth();

    await expect(
      act(async () => { await result.current.login('Charles', 'wrong'); }),
    ).rejects.toThrow('Pseudo ou mot de passe incorrect.');

    expect(result.current.user).toBeNull();
    expect(await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
  });
});

describe('AuthProvider — déconnexion', () => {
  async function mountLoggedIn() {
    mockPost.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', user: USER });
    const result = await mountAuth();
    await act(async () => { await result.current.login('Charles', 'MyPass1word'); });
    return result;
  }

  it('notifies the server then clears the session', async () => {
    const result = await mountLoggedIn();
    mockPost.mockResolvedValue({});

    await act(async () => { await result.current.logout(); });

    expect(mockPost).toHaveBeenLastCalledWith('/auth/logout', { refreshToken: 'refresh' });
    expect(result.current.user).toBeNull();
    expect(await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
  });

  // Sans ça, un backend injoignable enfermerait l'utilisateur dans une session morte.
  it('clears the session even when the server call fails', async () => {
    const result = await mountLoggedIn();
    mockPost.mockRejectedValue(new ApiError('Service indisponible', 503));

    await act(async () => { await result.current.logout(); });

    expect(result.current.user).toBeNull();
    expect(await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
  });
});
