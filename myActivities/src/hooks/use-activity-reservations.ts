import { useCallback, useEffect, useState } from 'react';

import { api, getApiErrorMessage } from '@/lib/api';
import type { ActivityReservations } from '@/types/activity';

/**
 * Réservations d'une activité de l'organisateur connecté
 * (`GET /organizers/me/activities/:id/reservations`) : créneaux + participants.
 */
export function useActivityReservations(activityId: string) {
  const [reservations, setReservations] = useState<ActivityReservations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!activityId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.get<ActivityReservations>(
        `/organizers/me/activities/${activityId}/reservations`,
      );
      setReservations(result);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erreur de chargement'));
    } finally {
      setIsLoading(false);
    }
  }, [activityId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Nombre total de réservations sur tous les créneaux (compteur d'en-tête).
  const totalBooked = reservations?.slots.reduce((acc, s) => acc + s.booked, 0) ?? 0;

  return { reservations, totalBooked, isLoading, error, refresh };
}
