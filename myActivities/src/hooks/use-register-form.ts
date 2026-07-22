import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

import { api, getApiErrorMessage } from '@/lib/api';

// Le web est l'espace organisateur : le SIRET y est requis (14 chiffres).
const IS_WEB = Platform.OS === 'web';

type Fields = {
  email: string;
  pseudo: string;
  password: string;
  confirmPassword: string;
  siret: string;
};
type Errors = Partial<Fields & { global: string }>;

export type RegisterFormState = {
  values: Fields;
  errors: Errors;
  isSubmitting: boolean;
  registered: boolean;
  setField: <K extends keyof Fields>(field: K, value: string) => void;
  submit: () => Promise<void>;
};

export function useRegisterForm(): RegisterFormState {
  const [values, setValues] = useState<Fields>({
    email: '',
    pseudo: '',
    password: '',
    confirmPassword: '',
    siret: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

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
    if (!values.pseudo || values.pseudo.length < 3) {
      next.pseudo = 'Au moins 3 caractères';
    }
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
    if (IS_WEB) {
      if (!values.siret) {
        next.siret = 'Le SIRET est requis';
      } else if (!/^\d{14}$/.test(values.siret)) {
        next.siret = 'Le SIRET doit comporter 14 chiffres';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [values]);

  const submit = useCallback(async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await api.post(
        '/auth/register',
        {
          email: values.email,
          pseudo: values.pseudo,
          password: values.password,
          ...(values.siret ? { siret: values.siret } : {}),
        },
        { skipAuth: true }
      );
      setRegistered(true);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Une erreur est survenue');
      setErrors({ global: msg });
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate]);

  return { values, errors, isSubmitting, registered, setField, submit };
}
