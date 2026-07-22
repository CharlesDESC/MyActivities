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

export type ApiErrorDetail = {
  field: string;
  message: string;
};

type ApiErrorPayload = {
  message?: string;
  code?: string;
  details?: ApiErrorDetail[];
};

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

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });
  } catch {
    throw new ApiError(
      'Serveur injoignable. Vérifie ta connexion puis réessaie.',
      0,
      'NETWORK_ERROR',
    );
  }

  if (response.status === 401 && !skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) return request<T>(path, options);
    onUnauthenticated?.();
    throw new ApiError('Session expirée', 401, 'SESSION_EXPIRED');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiErrorPayload;
    throw new ApiError(
      body.message ?? `Erreur ${response.status}`,
      response.status,
      body.code,
      body.details,
    );
  }

  // DELETE et certains POST répondent légitimement sans corps. Tenter de lire
  // du JSON sur un 204/205 transformait auparavant un succès en SyntaxError.
  if (response.status === 204 || response.status === 205) return undefined as T;

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
    public readonly status: number,
    public readonly code?: string,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Message homogène pour les écrans, avec le code métier renvoyé par l'API. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  return error.code ? `${error.message} (code : ${error.code})` : error.message;
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
