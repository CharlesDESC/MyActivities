import { useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import type { ActivityCategory, ActivityDetail } from '@/types/activity';
import type { ReviewListResult } from '@/types/review';

type RawDetail = {
  id: string; name: string; category: string; description: string;
  address: string; latitude: number; longitude: number;
  // Les DECIMAL PostgreSQL arrivent en chaînes ("12.00") — convertis dans mapDetail
  avgRating: string | null; reviewCount: number;
  priceMin: string; priceMax: string; coverImage: string | null;
  openingHours: Record<string, string> | null;
  accessibility: { pmr: boolean; stroller: boolean };
  websiteUrl: string | null; photos: string[];
  organizer: { id: string; pseudo: string };
  createdAt: string; updatedAt: string;
};

type RawReviewList = {
  avgRating: string | null; reviewCount: number;
  data: Array<{
    id: string; rating: number; createdAt: string; updatedAt: string | null;
    author: { id: string; pseudo: string; avatarUrl: string | null };
  }>;
  meta: { total: number; page: number; limit: number; totalPages: number };
};

function mapDetail(r: RawDetail): ActivityDetail {
  return {
    id: r.id, name: r.name, category: r.category as ActivityCategory,
    description: r.description, address: r.address,
    latitude: r.latitude, longitude: r.longitude,
    avgRating: r.avgRating === null ? null : Number(r.avgRating),
    reviewCount: r.reviewCount,
    priceMin: Number(r.priceMin), priceMax: Number(r.priceMax),
    coverImageUrl: r.coverImage, openingHours: r.openingHours,
    accessibilityPmr: r.accessibility.pmr, accessibilityStroller: r.accessibility.stroller,
    websiteUrl: r.websiteUrl, photos: r.photos,
    organizer: r.organizer, createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}

export function useActivityDetail(id: string) {
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [reviews, setReviews] = useState<ReviewListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      api.get<RawDetail>(`/activities/${id}`),
      api.get<RawReviewList>(`/activities/${id}/reviews`),
    ])
      .then(([rawActivity, rawReviews]) => {
        if (cancelled) return;
        setActivity(mapDetail(rawActivity));
        setReviews({
          avgRating: rawReviews.avgRating === null ? null : Number(rawReviews.avgRating),
          reviewCount: rawReviews.reviewCount,
          data: rawReviews.data.map((r) => ({
            id: r.id, rating: r.rating,
            createdAt: r.createdAt, updatedAt: r.updatedAt,
            author: { id: r.author.id, pseudo: r.author.pseudo, avatarUrl: r.author.avatarUrl },
          })),
          meta: rawReviews.meta,
        });
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof ApiError ? err.message : 'Erreur de chargement');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  return { activity, reviews, isLoading, error };
}
