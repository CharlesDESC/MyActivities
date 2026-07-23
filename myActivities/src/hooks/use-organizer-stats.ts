import { useCallback, useEffect, useState } from 'react';

import { api, getApiErrorMessage } from '@/lib/api';
import type { OrganizerStat } from '@/types/activity';

// PostgreSQL renvoie COUNT()/DECIMAL en chaînes : on normalise en nombres.
type RawStat = {
  activityId: string;
  activityName: string;
  views: number;
  planningAdds: string | number;
  avgRating: string | number | null;
  reviewCount: number;
};

function mapStat(r: RawStat): OrganizerStat {
  return {
    activityId: r.activityId,
    activityName: r.activityName,
    views: Number(r.views) || 0,
    planningAdds: Number(r.planningAdds) || 0,
    avgRating: r.avgRating === null ? null : Number(r.avgRating),
    reviewCount: Number(r.reviewCount) || 0,
  };
}

/** Statistiques du tableau de bord organisateur (`GET /organizers/me/stats`). */
export function useOrganizerStats() {
  const [stats, setStats] = useState<OrganizerStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // L'API renvoie directement le tableau de stats (pas d'enveloppe `{ data }`).
      const result = await api.get<RawStat[]>('/organizers/me/stats');
      setStats(result.map(mapStat));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erreur de chargement'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const totals = stats.reduce(
    (acc, s) => ({
      views: acc.views + s.views,
      planningAdds: acc.planningAdds + s.planningAdds,
      reviewCount: acc.reviewCount + s.reviewCount,
    }),
    { views: 0, planningAdds: 0, reviewCount: 0 },
  );

  return { stats, totals, isLoading, error, refresh };
}
