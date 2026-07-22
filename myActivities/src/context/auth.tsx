import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { api, ApiError, STORAGE_KEYS, setUnauthenticatedCallback } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';

export type User = {
  id: string;
  email: string;
  pseudo: string;
  role: 'member' | 'organizer' | 'admin';
  siret?: string | null;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (pseudo: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(async () => {
    await tokenStorage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    await tokenStorage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthenticatedCallback(clearSession);
  }, [clearSession]);

  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStorage.get(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
          const me = await api.get<User>('/users/me');
          setUser(me);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await clearSession();
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [clearSession]);

  const login = useCallback(async (pseudo: string, password: string) => {
    const { accessToken, refreshToken, user: loggedUser } = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/login', { pseudo, password }, { skipAuth: true });

    await tokenStorage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    await tokenStorage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    setUser(loggedUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore server errors on logout
    }
    await clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
