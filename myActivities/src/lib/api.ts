import { tokenStorage } from '@/lib/token-storage';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/v1';

let onUnauthenticated: (() => void) | null = null;

export function setUnauthenticatedCallback(cb: () => void) {
  onUnauthenticated = cb;
}

type RequestOptions = RequestInit & { skipAuth?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, headers: extraHeaders, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await tokenStorage.get(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  console.log('[api] request ->', `${BASE_URL}${path}`);
  const response = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers }).catch((err) => {
    console.log('[api] fetch threw ->', err);
    throw err;
  });

  if (response.status === 401 && !skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) return request<T>(path, options);
    onUnauthenticated?.();
    throw new ApiError('Session expirée', 401);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new ApiError(body.message ?? `Erreur ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}

async function tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = await tokenStorage.get(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) return false;

    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await tokenStorage.remove(STORAGE_KEYS.ACCESS_TOKEN);
      await tokenStorage.remove(STORAGE_KEYS.REFRESH_TOKEN);
      return false;
    }

    const { accessToken } = await response.json() as { accessToken: string };
    await tokenStorage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
