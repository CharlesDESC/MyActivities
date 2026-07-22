import { pool } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { UserRole, ReviewRow, Review, PaginatedResult } from '../types';

/** Colonnes d'un avis avec auteur, alias camelCase — schéma Swagger `Review` */
const REVIEW_SELECT = `
  SELECT r.id, r.rating, r.created_at AS "createdAt", r.updated_at AS "updatedAt",
         json_build_object('id', u.id, 'pseudo', u.pseudo, 'avatarUrl', u.avatar_url) AS author
  FROM reviews r JOIN users u ON u.id = r.user_id
`;

async function recalcRating(activityId: string): Promise<void> {
  await pool.query(
    `UPDATE activities SET
       avg_rating   = (SELECT AVG(rating) FROM reviews WHERE activity_id = $1),
       review_count = (SELECT COUNT(*)    FROM reviews WHERE activity_id = $1),
       updated_at   = NOW()
     WHERE id = $1`,
    [activityId],
  );
}

async function fetchReview(reviewId: string): Promise<Review> {
  const { rows } = await pool.query<Review>(
    `${REVIEW_SELECT} WHERE r.id = $1`,
    [reviewId],
  );
  if (rows.length === 0) throw new AppError(404, 'Avis introuvable.', 'NOT_FOUND');
  return rows[0];
}

export interface ReviewListResult extends PaginatedResult<Review> {
  avgRating: number | null;
  reviewCount: number;
}

export async function listReviews(
  activityId: string,
  page: number,
  limit: number,
  sort: string,
): Promise<ReviewListResult> {
  const sortMap: Record<string, string> = {
    date_desc: 'r.created_at DESC',
    date_asc: 'r.created_at ASC',
    rating_desc: 'r.rating DESC',
    rating_asc: 'r.rating ASC',
  };
  const order = sortMap[sort] ?? 'r.created_at DESC';
  const offset = (page - 1) * limit;

  const activityCheck = await pool.query<{ avg_rating: number | null; review_count: number }>(
    `SELECT avg_rating, review_count FROM activities WHERE id = $1 AND status = 'published'`,
    [activityId],
  );
  if (activityCheck.rowCount === 0) throw new AppError(404, 'Activité introuvable.', 'NOT_FOUND');

  const [data, count] = await Promise.all([
    pool.query<Review>(
      `${REVIEW_SELECT}
       WHERE r.activity_id = $1
       ORDER BY ${order} LIMIT $2 OFFSET $3`,
      [activityId, limit, offset],
    ),
    pool.query<{ count: string }>('SELECT COUNT(*) FROM reviews WHERE activity_id = $1', [activityId]),
  ]);

  const total = parseInt(count.rows[0].count, 10);
  return {
    avgRating: activityCheck.rows[0].avg_rating,
    reviewCount: activityCheck.rows[0].review_count,
    data: data.rows,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function createReview(
  userId: string,
  activityId: string,
  rating: number,
): Promise<Review> {
  const activity = await pool.query<{ id: string }>(
    `SELECT id FROM activities WHERE id = $1 AND status = 'published'`,
    [activityId],
  );
  if (activity.rowCount === 0) throw new AppError(404, 'Activité introuvable.', 'NOT_FOUND');

  // BF-029 : l'avis est réservé aux utilisateurs ayant planifié l'activité
  const planned = await pool.query(
    'SELECT 1 FROM planning_entries WHERE user_id = $1 AND activity_id = $2 LIMIT 1',
    [userId, activityId],
  );
  if (planned.rowCount === 0) {
    throw new AppError(403, 'Vous devez avoir ajouté cette activité à votre planning pour la noter.', 'PLANNING_REQUIRED');
  }

  let reviewId: string;
  try {
    const result = await pool.query<Pick<ReviewRow, 'id'>>(
      `INSERT INTO reviews (user_id, activity_id, rating) VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, activityId, rating],
    );
    reviewId = result.rows[0].id;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      throw new AppError(409, 'Vous avez déjà noté cette activité.', 'REVIEW_ALREADY_EXISTS');
    }
    throw err;
  }

  await recalcRating(activityId);
  return fetchReview(reviewId);
}

export async function updateReview(
  userId: string,
  reviewId: string,
  activityId: string,
  rating: number,
): Promise<Review> {
  const existing = await pool.query<Pick<ReviewRow, 'user_id' | 'activity_id'>>(
    'SELECT user_id, activity_id FROM reviews WHERE id = $1 AND activity_id = $2',
    [reviewId, activityId],
  );
  if (existing.rowCount === 0) throw new AppError(404, 'Avis introuvable.', 'NOT_FOUND');
  if (existing.rows[0].user_id !== userId) throw new AppError(403, 'Accès refusé.', 'FORBIDDEN');

  await pool.query(
    'UPDATE reviews SET rating = $1, updated_at = NOW() WHERE id = $2',
    [rating, reviewId],
  );

  await recalcRating(activityId);
  return fetchReview(reviewId);
}

export async function deleteReview(
  userId: string,
  reviewId: string,
  activityId: string,
  role: UserRole,
): Promise<void> {
  const existing = await pool.query<Pick<ReviewRow, 'user_id' | 'activity_id'>>(
    'SELECT user_id, activity_id FROM reviews WHERE id = $1 AND activity_id = $2',
    [reviewId, activityId],
  );
  if (existing.rowCount === 0) throw new AppError(404, 'Avis introuvable.', 'NOT_FOUND');
  if (role !== 'admin' && existing.rows[0].user_id !== userId) {
    throw new AppError(403, 'Accès refusé.', 'FORBIDDEN');
  }

  await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
  await recalcRating(activityId);
}
