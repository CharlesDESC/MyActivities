import { useState, useCallback } from 'react';

import { useAuth } from '@/context/auth';
import { getApiErrorMessage } from '@/lib/api';

type Fields = { pseudo: string; password: string };
type Errors = Partial<Fields & { global: string }>;

export function useLoginForm() {
  const { login } = useAuth();
  const [values, setValues] = useState<Fields>({ pseudo: '', password: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback(<K extends keyof Fields>(field: K, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, global: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: Errors = {};
    if (!values.pseudo || values.pseudo.length < 3) {
      next.pseudo = 'Au moins 3 caractères';
    }
    if (!values.password) next.password = 'Le mot de passe est requis';
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [values]);

  const submit = useCallback(async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await login(values.pseudo, values.password);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Une erreur est survenue');
      setErrors({ global: msg });
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, login]);

  return { values, errors, isSubmitting, setField, submit };
}
