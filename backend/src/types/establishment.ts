/** Ligne brute de la table establishments (usage interne uniquement) */
export interface EstablishmentRow {
  id: string;
  organizer_id: string;
  name: string;
  address: string;
  address_id: string;
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
  addressId: string;
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

/** Adresse proposée par le service de géocodage de la Géoplateforme IGN. */
export interface AddressSuggestion {
  addressId: string;
  address: string;
  latitude: number;
  longitude: number;
}
