import { pool } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { lookupSiret } from '../lib/siret';
import { resolveAddress } from '../lib/ign-geocoding';
import { Establishment, EstablishmentPrefill, UserRole } from '../types';
import { CreateEstablishmentInput, UpdateEstablishmentInput } from '../schemas/establishment';

/** Colonnes de l'établissement, alias camelCase — conformes au schéma Swagger `Establishment`. */
const SELECT_FIELDS = `
  e.id, e.name, e.address,
  ST_Y(e.location::geometry) AS latitude,
  ST_X(e.location::geometry) AS longitude,
  e.address_id AS "addressId",
  e.phone,
  e.website_url AS "websiteUrl",
  e.organizer_id AS "organizerId",
  e.created_at AS "createdAt",
  e.updated_at AS "updatedAt"
`;

type EstablishmentWithOwner = Establishment & { organizerId: string };

async function fetchEstablishment(id: string): Promise<EstablishmentWithOwner> {
  const { rows } = await pool.query<EstablishmentWithOwner>(
    `SELECT ${SELECT_FIELDS} FROM establishments e WHERE e.id = $1`,
    [id],
  );
  if (rows.length === 0) throw new AppError(404, 'Établissement introuvable.', 'NOT_FOUND');
  return rows[0];
}

function assertOwner(row: { organizerId: string }, userId: string, role: UserRole): void {
  if (role !== 'admin' && row.organizerId !== userId) {
    throw new AppError(403, 'Accès refusé.', 'FORBIDDEN');
  }
}

/** Établissements de l'organisateur connecté, du plus récent au plus ancien. */
export async function listOrganizerEstablishments(organizerId: string): Promise<Establishment[]> {
  const { rows } = await pool.query<EstablishmentWithOwner>(
    `SELECT ${SELECT_FIELDS} FROM establishments e
     WHERE e.organizer_id = $1
     ORDER BY e.created_at DESC`,
    [organizerId],
  );
  return rows.map(({ organizerId: _ignored, ...est }) => est);
}

export async function getEstablishment(id: string, userId: string, role: UserRole): Promise<Establishment> {
  const row = await fetchEstablishment(id);
  assertOwner(row, userId, role);
  const { organizerId: _ignored, ...est } = row;
  return est;
}

/**
 * Résout un établissement appartenant à l'organisateur et renvoie ce qu'une
 * activité en copie (adresse + position). Utilisé à la création/màj d'activité.
 */
export async function resolveOwnedEstablishment(
  id: string,
  organizerId: string,
): Promise<{ address: string; latitude: number; longitude: number }> {
  const row = await fetchEstablishment(id);
  if (row.organizerId !== organizerId) {
    throw new AppError(403, 'Cet établissement ne vous appartient pas.', 'FORBIDDEN');
  }
  return { address: row.address, latitude: row.latitude, longitude: row.longitude };
}

/** Établissement unique du compte, utilisé automatiquement pour une activité. */
export async function resolveOrganizerEstablishment(
  organizerId: string,
): Promise<{ id: string; address: string; latitude: number; longitude: number }> {
  const { rows } = await pool.query<EstablishmentWithOwner>(
    `SELECT ${SELECT_FIELDS} FROM establishments e WHERE e.organizer_id = $1`,
    [organizerId],
  );
  const row = rows[0];
  if (!row) {
    throw new AppError(
      409,
      'Créez votre fiche établissement avant de proposer une activité.',
      'ESTABLISHMENT_REQUIRED',
    );
  }
  return { id: row.id, address: row.address, latitude: row.latitude, longitude: row.longitude };
}

export async function createEstablishment(
  organizerId: string,
  data: CreateEstablishmentInput,
): Promise<Establishment> {
  const existing = await pool.query<{ id: string }>(
    'SELECT id FROM establishments WHERE organizer_id = $1',
    [organizerId],
  );
  if (existing.rows.length > 0) {
    throw new AppError(409, 'Ce compte possède déjà un établissement.', 'ESTABLISHMENT_EXISTS');
  }

  const place = await resolveAddress(data.addressId, data.address);
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO establishments (organizer_id, name, address, location, address_id, phone, website_url)
     VALUES ($1, $2, $3, ST_MakePoint($4, $5)::geography, $6, $7, $8)
     RETURNING id`,
    [
      organizerId, data.name, place.address,
      place.longitude, place.latitude,
      place.addressId, data.phone ?? null, data.websiteUrl ?? null,
    ],
  );
  return getEstablishment(rows[0].id, organizerId, 'organizer');
}

export async function updateEstablishment(
  id: string,
  userId: string,
  role: UserRole,
  data: UpdateEstablishmentInput,
): Promise<Establishment> {
  const existing = await fetchEstablishment(id);
  assertOwner(existing, userId, role);

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
  if (data.addressId !== undefined && data.address !== undefined) {
    const place = await resolveAddress(data.addressId, data.address);
    fields.push(`address = $${idx++}`);
    values.push(place.address);
    fields.push(`location = ST_MakePoint($${idx++}, $${idx++})::geography`);
    values.push(place.longitude, place.latitude);
    fields.push(`address_id = $${idx++}`);
    values.push(place.addressId);
  }
  if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(data.phone); }
  if (data.websiteUrl !== undefined) { fields.push(`website_url = $${idx++}`); values.push(data.websiteUrl); }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(`UPDATE establishments SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  return getEstablishment(id, userId, role);
}

export async function deleteEstablishment(id: string, userId: string, role: UserRole): Promise<void> {
  const existing = await fetchEstablishment(id);
  assertOwner(existing, userId, role);
  await pool.query('DELETE FROM establishments WHERE id = $1', [id]);
}

/**
 * Pré-remplit une fiche à partir du SIRET de l'organisateur connecté
 * (API open data recherche-entreprises). Purement indicatif.
 */
export async function prefillFromSiret(organizerId: string): Promise<EstablishmentPrefill> {
  const { rows } = await pool.query<{ siret: string | null }>(
    'SELECT siret FROM users WHERE id = $1',
    [organizerId],
  );
  const siret = rows[0]?.siret;
  if (!siret) {
    throw new AppError(404, 'Aucun SIRET associé à ce compte.', 'NO_SIRET');
  }

  const prefill = await lookupSiret(siret);
  if (!prefill) {
    throw new AppError(404, 'Aucun établissement trouvé pour ce SIRET.', 'SIRET_NOT_FOUND');
  }
  return prefill;
}
