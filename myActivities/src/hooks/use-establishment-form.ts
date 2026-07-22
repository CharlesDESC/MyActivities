import { useCallback, useEffect, useState } from 'react';

import { api, getApiErrorMessage } from '@/lib/api';
import type {
  AddressSuggestion,
  Establishment,
  EstablishmentPrefill,
} from '@/types/establishment';

export type EstablishmentFormState = {
  name: string;
  addressQuery: string;
  phone: string;
  websiteUrl: string;
};

type FormErrors = Partial<Record<keyof EstablishmentFormState | 'address' | 'global', string>>;

const EMPTY: EstablishmentFormState = { name: '', addressQuery: '', phone: '', websiteUrl: '' };

export function useEstablishmentForm(initial: Establishment | null) {
  const [values, setValues] = useState<EstablishmentFormState>(EMPTY);
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initial) {
      setValues({
        name: initial.name,
        addressQuery: initial.address,
        phone: initial.phone ?? '',
        websiteUrl: initial.websiteUrl ?? '',
      });
      setSelectedAddress({
        mapboxId: initial.mapboxId,
        address: initial.address,
        latitude: initial.latitude,
        longitude: initial.longitude,
      });
      return;
    }

    api.get<EstablishmentPrefill>('/establishments/prefill')
      .then((prefill) => {
        setValues((previous) => ({
          ...previous,
          name: prefill.name,
          addressQuery: prefill.address,
        }));
      })
      .catch(() => { /* Le préremplissage SIRET reste optionnel. */ });
  }, [initial]);

  const setField = useCallback(<K extends keyof EstablishmentFormState>(
    field: K,
    value: EstablishmentFormState[K],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined, global: undefined }));
    if (field === 'addressQuery') {
      setSelectedAddress(null);
      setSuggestions([]);
      setErrors((previous) => ({ ...previous, address: undefined }));
    }
  }, []);

  const searchAddress = useCallback(async () => {
    const query = values.addressQuery.trim();
    if (query.length < 3) {
      setErrors((previous) => ({ ...previous, address: 'Saisissez au moins 3 caractères' }));
      return;
    }
    setIsSearching(true);
    setErrors((previous) => ({ ...previous, address: undefined, global: undefined }));
    try {
      const response = await api.get<{ data: AddressSuggestion[] }>(
        `/establishments/address-search?q=${encodeURIComponent(query)}`,
      );
      setSuggestions(response.data);
      if (response.data.length === 0) {
        setErrors((previous) => ({ ...previous, address: 'Aucune adresse trouvée' }));
      }
    } catch (err) {
      setErrors((previous) => ({
        ...previous,
        global: getApiErrorMessage(err, "Impossible de rechercher l'adresse"),
      }));
    } finally {
      setIsSearching(false);
    }
  }, [values.addressQuery]);

  const selectAddress = useCallback((suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion);
    setValues((previous) => ({ ...previous, addressQuery: suggestion.address }));
    setSuggestions([]);
    setErrors((previous) => ({ ...previous, address: undefined, global: undefined }));
  }, []);

  const submit = useCallback(async (): Promise<Establishment | null> => {
    const next: FormErrors = {};
    if (values.name.trim().length < 2) next.name = 'Au moins 2 caractères';
    if (!selectedAddress) next.address = 'Sélectionnez une adresse proposée par Mapbox';
    if (values.websiteUrl.trim() && !/^https?:\/\//i.test(values.websiteUrl.trim())) {
      next.websiteUrl = 'Adresse web invalide';
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !selectedAddress) return null;

    setIsSubmitting(true);
    try {
      const payload: {
        name: string;
        mapboxId?: string;
        phone: string | null;
        websiteUrl: string | null;
      } = {
        name: values.name.trim(),
        phone: values.phone.trim() || null,
        websiteUrl: values.websiteUrl.trim() || null,
      };
      if (!initial || selectedAddress.mapboxId !== initial.mapboxId) {
        payload.mapboxId = selectedAddress.mapboxId;
      }
      return initial
        ? await api.patch<Establishment>(`/establishments/${initial.id}`, payload)
        : await api.post<Establishment>('/establishments', payload);
    } catch (err) {
      setErrors((previous) => ({
        ...previous,
        global: getApiErrorMessage(err, "Impossible d'enregistrer l'établissement"),
      }));
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [initial, selectedAddress, values]);

  return {
    values,
    selectedAddress,
    suggestions,
    errors,
    isSearching,
    isSubmitting,
    isEditing: !!initial,
    setField,
    searchAddress,
    selectAddress,
    submit,
  };
}
