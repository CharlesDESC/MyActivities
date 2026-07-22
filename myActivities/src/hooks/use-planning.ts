import { useCallback, useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import type { ActivityCategory } from '@/types/activity';
import type { PlanningEntry } from '@/types/planning';

type RawEntry = {
  id: string; scheduledAt: string; reminderOffset: number | null; createdAt: string;
  activity: {
    id: string; name: string; category: string; address: string;
    coverImage: string | null; avgRating: number | null;
    reviewCount: number; priceMin: number; priceMax: number;
    latitude: number; longitude: number;
  };
};

function mapEntry(r: RawEntry): PlanningEntry {
  return {
    id: r.id, scheduledAt: r.scheduledAt,
    reminderOffsetMinutes: r.reminderOffset, createdAt: r.createdAt,
    activity: {
      id: r.activity.id, name: r.activity.name,
      category: r.activity.category as ActivityCategory,
      address: r.activity.address, coverImageUrl: r.activity.coverImage,
      avgRating: r.activity.avgRating, reviewCount: r.activity.reviewCount,
      priceMin: r.activity.priceMin, priceMax: r.activity.priceMax,
      latitude: r.activity.latitude, longitude: r.activity.longitude,
    },
  };
}

export function usePlanning() {
  const [entries, setEntries] = useState<PlanningEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanning = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.get<{ data: RawEntry[] }>('/planning');
      setEntries(result.data.map(mapEntry));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlanning(); }, [fetchPlanning]);

  const removeEntry = useCallback(async (entryId: string) => {
    await api.delete(`/planning/${entryId}`);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }, []);

  const addToPlanning = useCallback(
    async (
      activityId: string,
      booking: { slotId: string } | { scheduledAt: string },
    ): Promise<void> => {
      await api.post('/planning', { activityId, ...booking });
      await fetchPlanning();
    },
    [fetchPlanning],
  );

  return { entries, isLoading, error, removeEntry, addToPlanning, refresh: fetchPlanning };
}
