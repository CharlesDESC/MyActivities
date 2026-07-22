import { pool } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { PlanningEntryRow, PlanningEntry, PaginatedResult } from '../types';

/** Colonnes d'une entrée de planning, alias camelCase — schéma Swagger `PlanningEntry` */
const PLANNING_ENTRY_SELECT = `
  SELECT
    pe.id, pe.scheduled_at AS "scheduledAt",
    pe.reminder_offset_minutes AS "reminderOffset", pe.created_at AS "createdAt",
    json_build_object(
      'id', a.id, 'name', a.name, 'category', a.category, 'address', a.address,
      'coverImage', a.cover_image_url, 'avgRating', a.avg_rating,
      'reviewCount', a.review_count, 'priceMin', a.price_min, 'priceMax', a.price_max,
      'latitude', ST_Y(a.location::geometry), 'longitude', ST_X(a.location::geometry)
    ) AS activity
  FROM planning_entries pe
  JOIN activities a ON a.id = pe.activity_id
`;

export async function getPlanning(
  userId: string,
  page: number,
  limit: number,
  from?: string,
  to?: string,
): Promise<PaginatedResult<PlanningEntry>> {
  const offset = (page - 1) * limit;
  const conditions = ['pe.user_id = $1'];
  const values: unknown[] = [userId];
  let idx = 2;

  if (from) { conditions.push(`pe.scheduled_at >= $${idx++}`); values.push(from); }
  if (to)   { conditions.push(`pe.scheduled_at <= $${idx++}`); values.push(to); }

  const where = conditions.join(' AND ');

  const dataQuery = `
    ${PLANNING_ENTRY_SELECT}
    WHERE ${where}
    ORDER BY pe.scheduled_at ASC
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  values.push(limit, offset);

  const [data, count] = await Promise.all([
    pool.query<PlanningEntry>(dataQuery, values),
    pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM planning_entries pe WHERE ${where}`,
      values.slice(0, -2),
    ),
  ]);

  const total = parseInt(count.rows[0].count, 10);
  return {
    data: data.rows,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function addToPlanning(
  userId: string,
  activityId: string,
  scheduledAt?: string,
  reminderOffset?: number | null,
  slotId?: string,
): Promise<PlanningEntry> {
  const activity = await pool.query<{ id: string }>(
    `SELECT id FROM activities WHERE id = $1 AND status = 'published'`,
    [activityId],
  );
  if (activity.rowCount === 0) {
    throw new AppError(404, 'Activité introuvable ou non publiée.', 'NOT_FOUND');
  }

  const entryId = slotId
    ? await bookSlot(userId, activityId, slotId, reminderOffset)
    : await insertFreeEntry(userId, activityId, scheduledAt!, reminderOffset);

  const { rows } = await pool.query<PlanningEntry>(
    `${PLANNING_ENTRY_SELECT} WHERE pe.id = $1`,
    [entryId],
  );
  return rows[0];
}

/** Entrée à date libre (activités sans créneaux, ex. accès libre). */
async function insertFreeEntry(
  userId: string,
  activityId: string,
  scheduledAt: string,
  reminderOffset?: number | null,
): Promise<string> {
  const inserted = await pool.query<Pick<PlanningEntryRow, 'id'>>(
    `INSERT INTO planning_entries (user_id, activity_id, scheduled_at, reminder_offset_minutes)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [userId, activityId, scheduledAt, reminderOffset ?? null],
  );
  return inserted.rows[0].id;
}

/**
 * Réservation d'un créneau : transaction avec verrou sur le créneau pour que
 * deux réservations simultanées ne puissent pas dépasser la capacité.
 */
async function bookSlot(
  userId: string,
  activityId: string,
  slotId: string,
  reminderOffset?: number | null,
): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const slot = await client.query<{ starts_at: string; capacity: number; activity_id: string }>(
      'SELECT starts_at, capacity, activity_id FROM activity_slots WHERE id = $1 FOR UPDATE',
      [slotId],
    );
    if (slot.rowCount === 0) throw new AppError(404, 'Créneau introuvable.', 'SLOT_NOT_FOUND');
    if (slot.rows[0].activity_id !== activityId) {
      throw new AppError(400, 'Ce créneau n\'appartient pas à cette activité.', 'SLOT_MISMATCH');
    }
    if (new Date(slot.rows[0].starts_at) <= new Date()) {
      throw new AppError(400, 'Ce créneau est déjà passé.', 'SLOT_IN_PAST');
    }

    const booked = await client.query<{ count: string }>(
      'SELECT COUNT(*) FROM planning_entries WHERE slot_id = $1',
      [slotId],
    );
    if (parseInt(booked.rows[0].count, 10) >= slot.rows[0].capacity) {
      throw new AppError(409, 'Ce créneau est complet.', 'SLOT_FULL');
    }

    const inserted = await client.query<Pick<PlanningEntryRow, 'id'>>(
      `INSERT INTO planning_entries (user_id, activity_id, scheduled_at, reminder_offset_minutes, slot_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, activityId, slot.rows[0].starts_at, reminderOffset ?? null, slotId],
    );

    await client.query('COMMIT');
    return inserted.rows[0].id;
  } catch (err) {
    await client.query('ROLLBACK');
    // Index unique (user_id, slot_id) : déjà réservé par cet utilisateur
    if ((err as { code?: string }).code === '23505') {
      throw new AppError(409, 'Tu as déjà réservé ce créneau.', 'ALREADY_BOOKED');
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function removePlanning(userId: string, planningId: string): Promise<void> {
  const existing = await pool.query<Pick<PlanningEntryRow, 'user_id'>>(
    'SELECT user_id FROM planning_entries WHERE id = $1',
    [planningId],
  );
  if (existing.rowCount === 0) throw new AppError(404, 'Entrée introuvable.', 'NOT_FOUND');
  if (existing.rows[0].user_id !== userId) throw new AppError(403, 'Accès refusé.', 'FORBIDDEN');

  await pool.query('DELETE FROM planning_entries WHERE id = $1', [planningId]);
}
