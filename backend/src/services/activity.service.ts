import { pool } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { getCachedActivities, setCachedActivities, invalidateActivitiesCache } from '../lib/redis';
import {
  ActivityListItem, ActivityDetail, ActivityRow, ActivityStatus,
  OrganizerStats, PaginatedResult, UserRole,
} from '../types';
import { ListActivitiesInput, CreateActivityInput, UpdateActivityInput } from '../schemas/activity';

const SORT_MAP: Record<string, string> = {
  distance: 'distance ASC',
  rating: 'a.avg_rating DESC NULLS LAST',
  price_asc: 'a.price_min ASC',
  price_desc: 'a.price_min DESC',
};

/** Colonnes du détail activité, alias camelCase — conformes au schéma Swagger `ActivityDetail` */
const ACTIVITY_DETAIL_SELECT = `
  SELECT
    a.id, a.name, a.category, a.description, a.address,
    a.cover_image_url AS "coverImage",
    a.avg_rating AS "avgRating", a.review_count AS "reviewCount",
    a.price_min AS "priceMin", a.price_max AS "priceMax",
    a.opening_hours AS "openingHours",
    json_build_object('pmr', a.accessibility_pmr, 'stroller', a.accessibility_stroller) AS accessibility,
    a.website_url AS "websiteUrl", a.status, a.admin_note AS "adminNote",
    a.created_at AS "createdAt", a.updated_at AS "updatedAt",
    ST_Y(a.location::geometry) AS latitude,
    ST_X(a.location::geometry) AS longitude,
    json_build_object('id', u.id, 'pseudo', u.pseudo) AS organizer,
    COALESCE(json_agg(ap.url ORDER BY ap.position) FILTER (WHERE ap.id IS NOT NULL), '[]') AS photos
  FROM activities a
  JOIN users u ON u.id = a.organizer_id
  LEFT JOIN activity_photos ap ON ap.activity_id = a.id
`;

const ACTIVITY_DETAIL_GROUP_BY = 'GROUP BY a.id, u.id';

/** Détail complet d'une activité, quel que soit son statut (usage interne / admin / organisateur). */
export async function fetchActivityDetail(id: string): Promise<ActivityDetail> {
  const { rows } = await pool.query<ActivityDetail>(
    `${ACTIVITY_DETAIL_SELECT} WHERE a.id = $1 ${ACTIVITY_DETAIL_GROUP_BY}`,
    [id],
  );
  if (rows.length === 0) throw new AppError(404, 'Activité introuvable.', 'NOT_FOUND');
  return rows[0];
}

export async function listActivities(
  params: ListActivitiesInput,
): Promise<PaginatedResult<ActivityListItem>> {
  const cached = await getCachedActivities<PaginatedResult<ActivityListItem>>(params as Record<string, unknown>);
  if (cached) return cached;

  const { lat, lng, radius, category, priceMin, priceMax, minRating, search, sort, page, limit } = params;
  const radiusM = radius * 1000;
  const offset = (page - 1) * limit;

  const conditions: string[] = [
    `a.status = 'published'`,
    `ST_DWithin(a.location, ST_MakePoint($1, $2)::geography, $3)`,
  ];
  const values: unknown[] = [lng, lat, radiusM];
  let idx = 4;

  if (category && category.length > 0) {
    conditions.push(`a.category = ANY($${idx++}::text[])`);
    values.push(category);
  }
  if (priceMin !== undefined) { conditions.push(`a.price_min >= $${idx++}`); values.push(priceMin); }
  if (priceMax !== undefined) { conditions.push(`a.price_max <= $${idx++}`); values.push(priceMax); }
  if (minRating !== undefined) { conditions.push(`a.avg_rating >= $${idx++}`); values.push(minRating); }
  if (search) {
    conditions.push(`a.search_tsv @@ plainto_tsquery('french', $${idx++})`);
    values.push(search);
  }

  const where = conditions.join(' AND ');
  const orderBy = SORT_MAP[sort] ?? 'distance ASC';

  const dataQuery = `
    SELECT
      a.id, a.name, a.category, a.address,
      a.cover_image_url AS "coverImage",
      a.avg_rating AS "avgRating", a.review_count AS "reviewCount",
      a.price_min AS "priceMin", a.price_max AS "priceMax",
      ST_Y(a.location::geometry) AS latitude,
      ST_X(a.location::geometry) AS longitude,
      ROUND((ST_Distance(a.location, ST_MakePoint($1, $2)::geography) / 1000)::numeric, 2) AS distance
    FROM activities a
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT $${idx++} OFFSET $${idx++}
  `;
  values.push(limit, offset);

  const countQuery = `SELECT COUNT(*) FROM activities a WHERE ${where}`;

  const [dataResult, countResult] = await Promise.all([
    pool.query<ActivityListItem>(dataQuery, values),
    pool.query<{ count: string }>(countQuery, values.slice(0, -2)),
  ]);

  const total = parseInt(countResult.rows[0].count, 10);
  const result: PaginatedResult<ActivityListItem> = {
    data: dataResult.rows,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
  await setCachedActivities(params as Record<string, unknown>, result);
  return result;
}

export async function getActivity(id: string): Promise<ActivityDetail> {
  const { rows } = await pool.query<ActivityDetail>(
    `${ACTIVITY_DETAIL_SELECT} WHERE a.id = $1 AND a.status = 'published' ${ACTIVITY_DETAIL_GROUP_BY}`,
    [id],
  );
  if (rows.length === 0) throw new AppError(404, 'Activité introuvable.', 'NOT_FOUND');

  await pool.query('UPDATE activities SET views = views + 1 WHERE id = $1', [id]);
  return rows[0];
}

export async function createActivity(
  organizerId: string,
  data: CreateActivityInput,
): Promise<ActivityDetail> {
  let activityId: string;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<Pick<ActivityRow, 'id'>>(
      `INSERT INTO activities
         (organizer_id, name, category, description, address, location,
          price_min, price_max, opening_hours, accessibility_pmr, accessibility_stroller, website_url)
       VALUES ($1, $2, $3, $4, $5, ST_MakePoint($6, $7)::geography, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        organizerId, data.name, data.category, data.description, data.address,
        data.longitude, data.latitude,
        data.priceMin, data.priceMax,
        data.openingHours ? JSON.stringify(data.openingHours) : null,
        data.accessibility?.pmr ?? false,
        data.accessibility?.stroller ?? false,
        data.websiteUrl ?? null,
      ],
    );

    activityId = rows[0].id;

    if (data.photos && data.photos.length > 0) {
      const photoValues = data.photos.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ');
      const photoParams = data.photos.flatMap((url, i) => [activityId, url, i]);
      await client.query(
        `INSERT INTO activity_photos (activity_id, url, position) VALUES ${photoValues}`,
        photoParams,
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await invalidateActivitiesCache();
  return fetchActivityDetail(activityId);
}

export async function updateActivity(
  id: string,
  userId: string,
  role: UserRole,
  data: UpdateActivityInput,
): Promise<ActivityDetail> {
  const existing = await pool.query<Pick<ActivityRow, 'organizer_id' | 'status'>>(
    'SELECT organizer_id, status FROM activities WHERE id = $1',
    [id],
  );
  if (existing.rowCount === 0) throw new AppError(404, 'Activité introuvable.', 'NOT_FOUND');
  if (role !== 'admin' && existing.rows[0].organizer_id !== userId) {
    throw new AppError(403, 'Accès refusé.', 'FORBIDDEN');
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
  if (data.category !== undefined) { fields.push(`category = $${idx++}`); values.push(data.category); }
  if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
  if (data.address !== undefined) { fields.push(`address = $${idx++}`); values.push(data.address); }
  if (data.latitude !== undefined && data.longitude !== undefined) {
    fields.push(`location = ST_MakePoint($${idx++}, $${idx++})::geography`);
    values.push(data.longitude, data.latitude);
  }
  if (data.priceMin !== undefined) { fields.push(`price_min = $${idx++}`); values.push(data.priceMin); }
  if (data.priceMax !== undefined) { fields.push(`price_max = $${idx++}`); values.push(data.priceMax); }
  if (data.openingHours !== undefined) { fields.push(`opening_hours = $${idx++}`); values.push(JSON.stringify(data.openingHours)); }
  if (data.accessibility !== undefined) {
    fields.push(`accessibility_pmr = $${idx++}`, `accessibility_stroller = $${idx++}`);
    values.push(data.accessibility.pmr, data.accessibility.stroller);
  }
  if (data.websiteUrl !== undefined) { fields.push(`website_url = $${idx++}`); values.push(data.websiteUrl); }

  const keyFields: (keyof UpdateActivityInput)[] = ['name', 'category', 'description', 'address', 'latitude', 'longitude'];
  const touchedKey = keyFields.some((k) => data[k] !== undefined);
  if (touchedKey && role !== 'admin') {
    fields.push(`status = 'pending'`);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(
    `UPDATE activities SET ${fields.join(', ')} WHERE id = $${idx}`,
    values,
  );
  await invalidateActivitiesCache();
  return fetchActivityDetail(id);
}

export async function deleteActivity(id: string, userId: string, role: UserRole): Promise<void> {
  const existing = await pool.query<Pick<ActivityRow, 'organizer_id'>>(
    'SELECT organizer_id FROM activities WHERE id = $1',
    [id],
  );
  if (existing.rowCount === 0) throw new AppError(404, 'Activité introuvable.', 'NOT_FOUND');
  if (role !== 'admin' && existing.rows[0].organizer_id !== userId) {
    throw new AppError(403, 'Accès refusé.', 'FORBIDDEN');
  }
  await pool.query('DELETE FROM activities WHERE id = $1', [id]);
  await invalidateActivitiesCache();
}

export async function listOrganizerActivities(
  organizerId: string,
  status: ActivityStatus | undefined,
  page: number,
  limit: number,
): Promise<PaginatedResult<ActivityDetail>> {
  const offset = (page - 1) * limit;
  const conditions = ['a.organizer_id = $1'];
  const values: unknown[] = [organizerId];
  let idx = 2;

  if (status) { conditions.push(`a.status = $${idx++}`); values.push(status); }

  const where = conditions.join(' AND ');
  const [data, count] = await Promise.all([
    pool.query<ActivityDetail>(
      `${ACTIVITY_DETAIL_SELECT} WHERE ${where} ${ACTIVITY_DETAIL_GROUP_BY}
       ORDER BY a.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    pool.query<{ count: string }>(`SELECT COUNT(*) FROM activities a WHERE ${where}`, values),
  ]);

  const total = parseInt(count.rows[0].count, 10);
  return { data: data.rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getOrganizerStats(organizerId: string): Promise<OrganizerStats[]> {
  const { rows } = await pool.query<OrganizerStats>(
    `SELECT
       a.id AS "activityId", a.name AS "activityName",
       a.views, a.avg_rating AS "avgRating", a.review_count AS "reviewCount",
       (SELECT COUNT(*) FROM planning_entries WHERE activity_id = a.id) AS "planningAdds"
     FROM activities a
     WHERE a.organizer_id = $1
     ORDER BY a.views DESC`,
    [organizerId],
  );
  return rows;
}
