import { useCallback, useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import type { ActivitySlot } from '@/types/activity';

export function useActivitySlots(activityId: string) {
  const [slots, setSlots] = useState<ActivitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    try {
      setError(null);
      const result = await api.get<{ data: ActivitySlot[] }>(`/activities/${activityId}/slots`);
      setSlots(result.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return { slots, isLoading, error, refetch: fetchSlots };
}
