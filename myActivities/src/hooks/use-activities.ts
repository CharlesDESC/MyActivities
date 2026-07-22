import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { api, getApiErrorMessage } from '@/lib/api';
import type { ActivityCategory, ActivitySummary } from '@/types/activity';

// Réponse de GET /v1/activities — les DECIMAL PostgreSQL arrivent en chaînes
type RawListItem = {
  id: string;
  name: string;
  category: string;
  address: string;
  coverImage: string | null;
  avgRating: string | null;
  reviewCount: number;
  priceMin: string;
  priceMax: string;
  latitude: number;
  longitude: number;
  distance: string;
};

type RawList = {
  data: RawListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

function mapItem(r: RawListItem): ActivitySummary {
  return {
    id: r.id,
    name: r.name,
    category: r.category as ActivityCategory,
    distance: Number(r.distance),
    avgRating: r.avgRating === null ? 0 : Number(r.avgRating),
    reviewCount: r.reviewCount,
    priceMin: Number(r.priceMin),
    priceMax: Number(r.priceMax),
    address: r.address,
    coverImage: r.coverImage,
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

export function useNearbyActivities(
  center: { latitude: number; longitude: number } | null,
  radiusKm = 50,
) {
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!center) return;
    setIsLoading(true);
    try {
      setError(null);
      const result = await api.get<RawList>(
        `/activities?lat=${center.latitude}&lng=${center.longitude}&radius=${radiusKm}&limit=50`,
      );
      setActivities(result.data.map(mapItem));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erreur de chargement'));
    } finally {
      setIsLoading(false);
    }
  }, [center, radiusKm]);

  // Recharge aussi quand l'utilisateur revient sur l'onglet après qu'une
  // nouvelle activité a été publiée depuis le back-office.
  useFocusEffect(useCallback(() => {
    void fetchActivities();
  }, [fetchActivities]));

  return { activities, isLoading, error, refetch: fetchActivities };
}
