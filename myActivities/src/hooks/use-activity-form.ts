import { useCallback, useEffect, useState } from 'react';

import { api, ApiError, getApiErrorMessage } from '@/lib/api';
import { combineLocalDateAndTime } from '@/lib/scheduling';
import type { ActivityCategory, ActivityDetail } from '@/types/activity';

/** État du formulaire : les champs numériques sont saisis en texte, convertis à l'envoi. */
export type ActivityFormState = {
  name: string;
  category: ActivityCategory;
  description: string;
  priceMin: string;
  priceMax: string;
  websiteUrl: string;
  eventDate: string;
  eventTime: string;
  capacity: string;
  pmr: boolean;
  stroller: boolean;
};

type FormErrors = Partial<Record<keyof ActivityFormState | 'global', string>>;

const API_FIELD_TO_FORM_FIELD: Record<string, keyof ActivityFormState> = {
  name: 'name',
  category: 'category',
  description: 'description',
  priceMin: 'priceMin',
  priceMax: 'priceMax',
  websiteUrl: 'websiteUrl',
  'initialSlot.startsAt': 'eventDate',
  'initialSlot.capacity': 'capacity',
  'accessibility.pmr': 'pmr',
  'accessibility.stroller': 'stroller',
};

function errorsFromApi(error: ApiError): FormErrors {
  const next: FormErrors = { global: getApiErrorMessage(error, 'Enregistrement impossible') };

  for (const detail of error.details) {
    const field = API_FIELD_TO_FORM_FIELD[detail.field];
    if (field) next[field] = detail.message;
  }
  return next;
}

const EMPTY: ActivityFormState = {
  name: '', category: 'autre', description: '', priceMin: '', priceMax: '',
  websiteUrl: '', eventDate: '', eventTime: '', capacity: '20', pmr: false, stroller: false,
};

function fromActivity(a: ActivityDetail): ActivityFormState {
  return {
    name: a.name,
    category: a.category,
    description: a.description,
    priceMin: String(a.priceMin),
    priceMax: String(a.priceMax),
    websiteUrl: a.websiteUrl ?? '',
    eventDate: '',
    eventTime: '',
    capacity: '20',
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

    if (!activityId) {
      const startsAt = combineLocalDateAndTime(values.eventDate, values.eventTime);
      const capacity = Number(values.capacity);
      if (!values.eventDate) next.eventDate = 'Choisis la date de l’événement';
      if (!values.eventTime) next.eventTime = 'Choisis une heure';
      if (startsAt && new Date(startsAt).getTime() <= Date.now()) {
        next.eventDate = 'Le créneau doit être dans le futur';
      }
      if (!startsAt && values.eventDate && values.eventTime) {
        next.eventDate = 'Date ou heure invalide';
      }
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) {
        next.capacity = 'Entre 1 et 10 000 places';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [activityId, values]);

  const submit = useCallback(async (): Promise<ActivityDetail | null> => {
    if (!validate()) return null;
    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, global: undefined }));
    const startsAt = !activityId
      ? combineLocalDateAndTime(values.eventDate, values.eventTime)
      : null;
    const payload = {
      name: values.name.trim(),
      category: values.category,
      description: values.description.trim(),
      priceMin: Number(values.priceMin),
      priceMax: Number(values.priceMax),
      accessibility: { pmr: values.pmr, stroller: values.stroller },
      websiteUrl: values.websiteUrl.trim() || null,
      ...(!activityId && startsAt
        ? { initialSlot: { startsAt, capacity: Number(values.capacity) } }
        : {}),
    };
    try {
      return activityId
        ? await api.patch<ActivityDetail>(`/activities/${activityId}`, payload)
        : await api.post<ActivityDetail>('/activities', payload);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        ...(err instanceof ApiError
          ? errorsFromApi(err)
          : { global: 'Serveur injoignable. Vérifie ta connexion puis réessaie.' }),
      }));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [activityId, values, validate]);

  return { values, errors, isSubmitting, isEditing: !!activityId, setField, submit };
}
