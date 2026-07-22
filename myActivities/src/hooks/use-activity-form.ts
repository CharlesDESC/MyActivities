import { useCallback, useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import type { ActivityCategory, ActivityDetail } from '@/types/activity';

/** État du formulaire : les champs numériques sont saisis en texte, convertis à l'envoi. */
export type ActivityFormState = {
  name: string;
  category: ActivityCategory;
  description: string;
  priceMin: string;
  priceMax: string;
  websiteUrl: string;
  pmr: boolean;
  stroller: boolean;
};

type FormErrors = Partial<Record<keyof ActivityFormState | 'global', string>>;

const EMPTY: ActivityFormState = {
  name: '', category: 'autre', description: '', priceMin: '', priceMax: '',
  websiteUrl: '', pmr: false, stroller: false,
};

function fromActivity(a: ActivityDetail): ActivityFormState {
  return {
    name: a.name,
    category: a.category,
    description: a.description,
    priceMin: String(a.priceMin),
    priceMax: String(a.priceMax),
    websiteUrl: a.websiteUrl ?? '',
    pmr: a.accessibilityPmr,
    stroller: a.accessibilityStroller,
  };
}

/**
 * Gère la création (`POST /activities`) ou l'édition (`PATCH /activities/:id`)
 * d'une activité. `initial` préremplit le formulaire en mode édition.
 */
export function useActivityForm(options: { activityId?: string; initial?: ActivityDetail | null } = {}) {
  const { activityId, initial } = options;
  const [values, setValues] = useState<ActivityFormState>(initial ? fromActivity(initial) : EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Préremplit quand la donnée initiale arrive (chargement asynchrone).
  useEffect(() => {
    if (initial) setValues(fromActivity(initial));
  }, [initial]);

  const setField = useCallback(<K extends keyof ActivityFormState>(field: K, value: ActivityFormState[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, global: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: FormErrors = {};
    if (values.name.trim().length < 3) next.name = 'Au moins 3 caractères';
    if (values.description.trim().length < 20) next.description = 'Au moins 20 caractères';
    const min = Number(values.priceMin);
    const max = Number(values.priceMax);
    if (values.priceMin === '' || Number.isNaN(min) || min < 0) next.priceMin = 'Prix invalide';
    if (values.priceMax === '' || Number.isNaN(max) || max < 0) next.priceMax = 'Prix invalide';
    if (!next.priceMin && !next.priceMax && min > max) next.priceMin = 'Le prix min doit être ≤ au prix max';

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [values]);

  const submit = useCallback(async (): Promise<ActivityDetail | null> => {
    if (!validate()) return null;
    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, global: undefined }));
    const payload = {
      name: values.name.trim(),
      category: values.category,
      description: values.description.trim(),
      priceMin: Number(values.priceMin),
      priceMax: Number(values.priceMax),
      accessibility: { pmr: values.pmr, stroller: values.stroller },
      websiteUrl: values.websiteUrl.trim() || null,
    };
    try {
      return activityId
        ? await api.patch<ActivityDetail>(`/activities/${activityId}`, payload)
        : await api.post<ActivityDetail>('/activities', payload);
    } catch (err) {
      setErrors((prev) => ({ ...prev, global: err instanceof ApiError ? err.message : 'Enregistrement impossible' }));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [activityId, values, validate]);

  return { values, errors, isSubmitting, isEditing: !!activityId, setField, submit };
}
