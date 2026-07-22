import { useCallback, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/context/auth';

export function useReview(activityId: string, onSuccess?: () => void) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRating = useCallback(
    async (rating: number) => {
      if (!user) return;
      setIsSubmitting(true);
      setError(null);
      try {
        await api.post(`/activities/${activityId}/reviews`, { rating });
        onSuccess?.();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erreur lors de la soumission');
      } finally {
        setIsSubmitting(false);
      }
    },
    [activityId, user, onSuccess],
  );

  return { submitRating, isSubmitting, error };
}
