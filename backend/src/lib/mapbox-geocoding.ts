import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { AddressSuggestion } from '../types';

const BASE_URL = 'https://api.mapbox.com/search/geocode/v6/forward';

type MapboxFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    mapbox_id?: string;
    full_address?: string;
    name_preferred?: string;
    name?: string;
    place_formatted?: string;
    coordinates?: { longitude?: number; latitude?: number };
  };
};

type MapboxResponse = { features?: MapboxFeature[] };

function normalizeFeature(feature: MapboxFeature): AddressSuggestion | null {
  const properties = feature.properties;
  const longitude = properties?.coordinates?.longitude ?? feature.geometry?.coordinates?.[0];
  const latitude = properties?.coordinates?.latitude ?? feature.geometry?.coordinates?.[1];
  const mapboxId = properties?.mapbox_id;
  const primary = properties?.name_preferred ?? properties?.name ?? '';
  const address = properties?.full_address
    ?? [primary, properties?.place_formatted].filter(Boolean).join(', ');

  if (!mapboxId || !address || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { mapboxId, address, latitude: latitude!, longitude: longitude! };
}

async function geocode(params: URLSearchParams): Promise<AddressSuggestion[]> {
  if (!config.mapbox.accessToken) {
    throw new AppError(503, "Le service de recherche d'adresse n'est pas configuré.", 'MAPBOX_NOT_CONFIGURED');
  }

  params.set('access_token', config.mapbox.accessToken);
  params.set('country', 'fr');
  params.set('language', 'fr');
  params.set('types', 'address');

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new AppError(502, 'Mapbox est temporairement indisponible.', 'MAPBOX_UNAVAILABLE');
  }

  if (!response.ok) {
    throw new AppError(502, "Mapbox a refusé la recherche d'adresse.", 'MAPBOX_ERROR');
  }

  const body = await response.json() as MapboxResponse;
  return (body.features ?? []).map(normalizeFeature).filter((item): item is AddressSuggestion => item !== null);
}

/** Suggestions temporaires : elles sont affichées mais jamais enregistrées. */
export function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  return geocode(new URLSearchParams({
    q: query,
    autocomplete: 'true',
    permanent: 'false',
    limit: '5',
  }));
}

/** Résolution permanente avant toute écriture en base. */
export async function resolvePermanentAddress(mapboxId: string): Promise<AddressSuggestion> {
  const results = await geocode(new URLSearchParams({
    q: mapboxId,
    autocomplete: 'false',
    permanent: 'true',
    limit: '1',
  }));
  if (!results[0]) {
    throw new AppError(422, 'Adresse Mapbox introuvable.', 'ADDRESS_NOT_FOUND');
  }
  return results[0];
}
