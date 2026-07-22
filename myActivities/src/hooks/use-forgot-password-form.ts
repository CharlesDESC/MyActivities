import { useState, useCallback } from 'react';

import { api, ApiError, getApiErrorMessage } from '@/lib/api';

type Fields = { email: string };
type Errors = Partial<Fields & { global: string }>;

export type ForgotPasswordFormState = {
  values: Fields;
  errors: Errors;
  isSubmitting: boolean;
  sent: boolean;
  setField: <K extends keyof Fields>(field: K, value: string) => void;
  submit: () => Promise<void>;
};

export function useForgotPasswordForm(): ForgotPasswordFormState {
  const [values, setValues] = useState<Fields>({ email: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const setField = useCallback(<K extends keyof Fields>(field: K, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, global: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: Errors = {};
    if (!values.email) {
      next.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      next.email = 'Email invalide';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [values]);

  const submit = useCallback(async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setErrors((previous) => ({ ...previous, global: undefined }));
    try {
      await api.post('/auth/forgot-password', { email: values.email }, { skipAuth: true });
      setSent(true);
    } catch (err) {
      // Un éventuel 4xx reste volontairement indistinguable pour ne pas révéler
      // l'existence d'un compte. Les pannes réseau/serveur sont en revanche affichées.
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        setSent(true);
      } else {
        setErrors({ global: getApiErrorMessage(err, "Impossible d'envoyer le lien") });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate]);

  return { values, errors, isSubmitting, sent, setField, submit };
}
