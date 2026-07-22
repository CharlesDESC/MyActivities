import { pool } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { CreateSlotsInput } from '../schemas/slot';

export type SlotWithAvailability = {
  id: string;
  activityId: string;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  booked: number;
  remaining: number;
};

/** Créneaux à venir d'une activité, avec places restantes. */
export async function listSlots(
  activityId: string,
  from?: string,
  to?: string,
): Promise<SlotWithAvailability[]> {
  const conditions = ['s.activity_id = $1', `s.starts_at >= COALESCE($2::timestamptz, now())`];
  const values: unknown[] = [activityId, from ?? null];
  let idx = 3;
  if (to) {
    conditions.push(`s.starts_at <= $${idx++}`);
    values.push(to);
  }

  const { rows } = await pool.query<SlotWithAvailability>(
    `SELECT
       s.id, s.activity_id AS "activityId",
       s.starts_at AS "startsAt", s.ends_at AS "endsAt", s.capacity,
       COUNT(pe.id)::int AS booked,
       (s.capacity - COUNT(pe.id))::int AS remaining
     FROM activity_slots s
     LEFT JOIN planning_entries pe ON pe.slot_id = s.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY s.id
     ORDER BY s.starts_at ASC`,
    values,
  );
  return rows;
}

/** Création de créneaux par l'organisateur propriétaire (ou un admin). */
export async function createSlots(
  activityId: string,
  userId: string,
  role: string,
  slots: CreateSlotsInput['slots'],
): Promise<SlotWithAvailability[]> {
  const activity = await pool.query<{ organizer_id: string }>(
    'SELECT organizer_id FROM activities WHERE id = $1',
    [activityId],
  );
  if (activity.rowCount === 0) throw new AppError(404, 'Activité introuvable.', 'NOT_FOUND');
  if (activity.rows[0].organizer_id !== userId && role !== 'admin') {
    throw new AppError(403, 'Seul l\'organisateur de l\'activité peut gérer ses créneaux.', 'FORBIDDEN');
  }

  const created: SlotWithAvailability[] = [];
  for (const slot of slots) {
    const { rows } = await pool.query<SlotWithAvailability>(
      `INSERT INTO activity_slots (activity_id, starts_at, ends_at, capacity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (activity_id, starts_at) DO UPDATE SET capacity = EXCLUDED.capacity, ends_at = EXCLUDED.ends_at
       RETURNING id, activity_id AS "activityId", starts_at AS "startsAt",
                 ends_at AS "endsAt", capacity, 0 AS booked, capacity AS remaining`,
      [activityId, slot.startsAt, slot.endsAt ?? null, slot.capacity],
    );
    created.push(rows[0]);
  }
  return created;
}
