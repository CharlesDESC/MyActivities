/** Ligne brute de la table establishments (usage interne uniquement) */
export interface EstablishmentRow {
  id: string;
  organizer_id: string;
  name: string;
  address: string;
  mapbox_id: string;
  phone: string | null;
  website_url: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Établissement exposé par l'API (camelCase, position aplatie en lat/lng) */
export interface Establishment {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  mapboxId: string;
  phone: string | null;
  websiteUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Données pré-remplies depuis le SIRET (API recherche-entreprises) — indicatives */
export interface EstablishmentPrefill {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

/** Adresse temporairement proposée par Mapbox avant confirmation. */
export interface AddressSuggestion {
  mapboxId: string;
  address: string;
  latitude: number;
  longitude: number;
}
