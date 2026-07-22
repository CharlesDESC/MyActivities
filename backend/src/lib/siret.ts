import { EstablishmentPrefill } from '../types';

// API officielle open data (gratuite, sans clé) : recherche-entreprises.
// https://recherche-entreprises.api.gouv.fr — sert à pré-remplir la première
// fiche établissement d'un organisateur à partir de son SIRET. Données publiques,
// indicatives : l'organisateur confirme/corrige côté app.
const BASE_URL = 'https://recherche-entreprises.api.gouv.fr/search';

type EtablissementLike = {
  adresse?: string | null;
  geo_adresse?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

type SearchResult = {
  nom_complet?: string | null;
  nom_raison_sociale?: string | null;
  siege?: EtablissementLike | null;
  matching_etablissements?: EtablissementLike[] | null;
};

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Recherche un établissement par SIRET. Retourne `null` si aucune correspondance
 * ou si l'API est indisponible (le pré-remplissage est optionnel, jamais bloquant).
 */
export async function lookupSiret(siret: string): Promise<EstablishmentPrefill | null> {
  const url = `${BASE_URL}?q=${encodeURIComponent(siret)}&per_page=1`;

  let body: { results?: SearchResult[] };
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    body = await res.json() as { results?: SearchResult[] };
  } catch {
    return null;
  }

  const result = body.results?.[0];
  if (!result) return null;

  // L'établissement précis (matching_etablissements) prime sur le siège social.
  const etab = result.matching_etablissements?.[0] ?? result.siege ?? {};
  const name = result.nom_complet ?? result.nom_raison_sociale ?? '';
  const address = etab.geo_adresse ?? etab.adresse ?? '';

  return {
    name,
    address,
    latitude: toNumber(etab.latitude),
    longitude: toNumber(etab.longitude),
  };
}
