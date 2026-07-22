export type Establishment = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  mapboxId: string;
  phone: string | null;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EstablishmentPrefill = {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export type AddressSuggestion = {
  mapboxId: string;
  address: string;
  latitude: number;
  longitude: number;
};
