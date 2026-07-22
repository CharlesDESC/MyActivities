import { useState, useCallback } from 'react';

import { api, ApiError } from '@/lib/api';

type Fields = { password: string; confirmPassword: string };
type Errors = Partial<Fields & { global: string }>;

export type ResetPasswordFormState = {
  values: Fields;
  errors: Errors;
  isSubmitting: boolean;
  done: boolean;
  setField: <K extends keyof Fields>(field: K, value: string) => void;
  submit: (token: string) => Promise<void>;
};

export function useResetPasswordForm(): ResetPasswordFormState {
  const [values, setValues] = useState<Fields>({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const setField = useCallback(<K extends keyof Fields>(field: K, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, global: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: Errors = {};
    if (!values.password) {
      next.password = 'Le mot de passe est requis';
    } else if (values.password.length < 8) {
      next.password = 'Au moins 8 caractères';
    } else if (!/[A-Z]/.test(values.password) || !/[0-9]/.test(values.password)) {
      next.password = 'Doit contenir une majuscule et un chiffre';
    }
    if (values.confirmPassword !== values.password) {
      next.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [values]);

  const submit = useCallback(
    async (token: string) => {
      if (!validate()) return;
      setIsSubmitting(true);
      try {
        await api.post(
          '/auth/reset-password',
          { token, password: values.password },
          { skipAuth: true }
        );
        setDone(true);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Une erreur est survenue';
        setErrors({ global: msg });
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate]
  );

  return { values, errors, isSubmitting, done, setField, submit };
}
