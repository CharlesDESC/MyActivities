import * as SecureStore from 'expo-secure-store';

import { api, ApiError, STORAGE_KEYS, setUnauthenticatedCallback } from '@/lib/api';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

/** Réponse fetch minimale. */
function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  global.resetSecureStore();
  setUnauthenticatedCallback(() => {});
});

describe('api — construction de la requête', () => {
  it('prefixes the path with the base URL', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }));

    await api.get('/activities');

    expect(mockFetch.mock.calls[0][0]).toContain('/activities');
  });

  it('sends JSON content type', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await api.get('/activities');

    expect(mockFetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
  });

  it('attaches the stored access token', async () => {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, 'my-token');
    mockFetch.mockResolvedValue(jsonResponse({}));

    await api.get('/users/me');

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer my-token');
  });

  it('omits the Authorization header when no token is stored', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await api.get('/activities');

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('never reads the token when skipAuth is set', async () => {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, 'my-token');
    mockFetch.mockResolvedValue(jsonResponse({}));

    await api.post('/auth/login', { pseudo: 'a' }, { skipAuth: true });

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('merges caller-provided headers', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await api.get('/activities', { headers: { 'X-Trace': 'abc' } });

    expect(mockFetch.mock.calls[0][1].headers['X-Trace']).toBe('abc');
  });
});

describe('api — verbes HTTP', () => {
  beforeEach(() => mockFetch.mockResolvedValue(jsonResponse({ id: '1' })));

  it.each([
    ['get', 'GET'],
    ['delete', 'DELETE'],
  ] as const)('%s issues a %s', async (method, verb) => {
    await api[method]('/activities/1');
    expect(mockFetch.mock.calls[0][1].method).toBe(verb);
  });

  it.each([
    ['post', 'POST'],
    ['patch', 'PATCH'],
    ['put', 'PUT'],
  ] as const)('%s issues a %s with a serialized body', async (method, verb) => {
    await api[method]('/activities', { name: 'Escalade' });

    const init = mockFetch.mock.calls[0][1];
    expect(init.method).toBe(verb);
    expect(JSON.parse(init.body)).toEqual({ name: 'Escalade' });
  });

  it('returns the parsed payload', async () => {
    await expect(api.get('/activities/1')).resolves.toEqual({ id: '1' });
  });
});

describe('api — gestion des erreurs', () => {
  it('throws an ApiError carrying the server message and status', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Activité introuvable.' }, 404));

    await expect(api.get('/activities/unknown')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Activité introuvable.',
      status: 404,
    });
  });

  it('falls back to a generic message when the body carries none', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 500));

    await expect(api.get('/activities')).rejects.toThrow('Erreur 500');
  });

  it('falls back to a generic message when the body is not JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not json');
      },
    });

    await expect(api.get('/activities')).rejects.toThrow('Erreur 502');
  });

  it('propagates network failures', async () => {
    mockFetch.mockRejectedValue(new Error('Network request failed'));

    await expect(api.get('/activities')).rejects.toThrow('Network request failed');
  });
});

describe('api — rafraîchissement automatique du token', () => {
  it('refreshes then replays the request on a 401', async () => {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, 'expired');
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token');

    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 401)) // requête initiale
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'fresh' })) // refresh
      .mockResolvedValueOnce(jsonResponse({ id: 'user-1' })); // rejeu

    await expect(api.get('/users/me')).resolves.toEqual({ id: 'user-1' });

    expect(await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN)).toBe('fresh');
    expect(mockFetch.mock.calls[2][1].headers.Authorization).toBe('Bearer fresh');
  });

  it('gives up and signals logout when there is no refresh token', async () => {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, 'expired');
    const onUnauthenticated = jest.fn();
    setUnauthenticatedCallback(onUnauthenticated);

    mockFetch.mockResolvedValue(jsonResponse({}, 401));

    await expect(api.get('/users/me')).rejects.toMatchObject({ message: 'Session expirée', status: 401 });
    expect(onUnauthenticated).toHaveBeenCalled();
  });

  it('clears both tokens when the refresh itself is rejected', async () => {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, 'expired');
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, 'revoked');

    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ message: 'Token révoqué' }, 401));

    await expect(api.get('/users/me')).rejects.toMatchObject({ status: 401 });

    expect(await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
  });

  it('treats a network failure during refresh as a failed refresh', async () => {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, 'expired');
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token');

    mockFetch
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockRejectedValueOnce(new Error('offline'));

    await expect(api.get('/users/me')).rejects.toMatchObject({ message: 'Session expirée' });
  });

  it('does not try to refresh on a 401 from a skipAuth call', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Pseudo ou mot de passe incorrect.' }, 401));

    await expect(
      api.post('/auth/login', { pseudo: 'a', password: 'b' }, { skipAuth: true }),
    ).rejects.toThrow('Pseudo ou mot de passe incorrect.');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('ApiError', () => {
  it('is an Error carrying a status', () => {
    const err = new ApiError('Interdit', 403);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(403);
  });
});
