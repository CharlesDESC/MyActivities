import { useCallback, useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import type { ActivityDetail, ActivityStatus } from '@/types/activity';

// Les DECIMAL PostgreSQL (prix, note) arrivent en chaînes → normalisation légère.
type RawActivity = Omit<ActivityDetail, 'priceMin' | 'priceMax' | 'avgRating'> & {
  priceMin: string | number;
  priceMax: string | number;
  avgRating: string | number | null;
};

function mapActivity(r: RawActivity): ActivityDetail {
  return {
    ...r,
    priceMin: Number(r.priceMin),
    priceMax: Number(r.priceMax),
    avgRating: r.avgRating === null ? null : Number(r.avgRating),
  };
}

/** Activités de l'organisateur connecté (`GET /organizers/me/activities`). */
export function useOrganizerActivities(status?: ActivityStatus) {
  const [activities, setActivities] = useState<ActivityDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = status ? `?status=${status}&limit=100` : '?limit=100';
      const result = await api.get<{ data: RawActivity[] }>(`/organizers/me/activities${query}`);
      setActivities(result.data.map(mapActivity));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => { refresh(); }, [refresh]);

  return { activities, isLoading, error, refresh };
}
