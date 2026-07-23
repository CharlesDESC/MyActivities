export type Establishment = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  addressId: string;
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
  addressId: string;
  address: string;
  latitude: number;
  longitude: number;
};
