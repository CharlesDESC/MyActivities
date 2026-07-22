import { useCallback, useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import type { Establishment } from '@/types/establishment';

export function useEstablishment() {
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: Establishment[] }>('/establishments');
      setEstablishment(response.data[0] ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger l'établissement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { establishment, isLoading, error, refresh };
}
