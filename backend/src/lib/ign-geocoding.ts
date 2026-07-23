import { AppError } from '../middleware/errorHandler';
import { AddressSuggestion } from '../types';

const BASE_URL = 'https://data.geopf.fr/geocodage/search';

type IgnFeature = {
  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };
  properties?: {
    id?: string;
    banId?: string;
    label?: string;
  };
};

type IgnResponse = {
  features?: IgnFeature[];
};

function normalizeFeature(feature: IgnFeature): AddressSuggestion | null {
  const [longitude, latitude] = feature.geometry?.coordinates ?? [];
  const addressId = feature.properties?.banId ?? feature.properties?.id;
  const address = feature.properties?.label;

  if (
    feature.geometry?.type !== 'Point'
    || !addressId
    || !address
    || !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
  ) {
    return null;
  }

  return { addressId, address, latitude: latitude!, longitude: longitude! };
}

async function geocode(query: string, limit: number): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    index: 'address',
    limit: String(limit),
  });

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new AppError(
      502,
      "Le service public de recherche d'adresse est temporairement indisponible.",
      'GEOPLATFORM_UNAVAILABLE',
    );
  }

  if (!response.ok) {
    throw new AppError(
      502,
      "Le service public a refusé la recherche d'adresse.",
      'GEOPLATFORM_ERROR',
    );
  }

  try {
    const body = await response.json() as IgnResponse;
    return (body.features ?? [])
      .map(normalizeFeature)
      .filter((item): item is AddressSuggestion => item !== null);
  } catch {
    throw new AppError(
      502,
      'Le service public a renvoyé une réponse invalide.',
      'GEOPLATFORM_INVALID_RESPONSE',
    );
  }
}

/** Suggestions d'adresses françaises fournies par la Géoplateforme de l'IGN. */
export function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  return geocode(query, 5);
}

/**
 * Vérifie côté serveur que l'adresse sélectionnée existe toujours et récupère
 * ses coordonnées depuis l'IGN avant toute écriture en base.
 */
export async function resolveAddress(addressId: string, address: string): Promise<AddressSuggestion> {
  const results = await geocode(address, 10);
  const selected = results.find((result) => result.addressId === addressId);

  if (!selected) {
    throw new AppError(
      422,
      "L'adresse sélectionnée est introuvable. Relancez la recherche.",
      'ADDRESS_NOT_FOUND',
    );
  }
  return selected;
}
