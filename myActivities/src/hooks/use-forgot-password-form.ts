import { useState, useCallback } from 'react';

import { api } from '@/lib/api';

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
    try {
      await api.post('/auth/forgot-password', { email: values.email }, { skipAuth: true });
    } catch {
      // Anti-énumération OWASP : on affiche toujours le succès, même si l'email n'existe pas
    } finally {
      setSent(true);
      setIsSubmitting(false);
    }
  }, [values, validate]);

  return { values, errors, isSubmitting, sent, setField, submit };
}
