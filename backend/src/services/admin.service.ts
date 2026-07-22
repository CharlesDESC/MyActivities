import { pool } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { AdminUser, ActivityDetail, PaginatedResult, UserRole } from '../types';
import { fetchActivityDetail } from './activity.service';

/** Colonnes d'un user vu par l'admin, alias camelCase — schéma Swagger `AdminUser` */
const ADMIN_USER_SELECT = `
  SELECT id, email, pseudo, role, status, siret,
         avatar_url AS "avatarUrl", email_verified AS "emailVerified",
         suspended_until AS "suspendedUntil", created_at AS "createdAt",
         (SELECT COUNT(*) FROM reviews WHERE user_id = users.id) AS "reviewCount",
         (SELECT COUNT(*) FROM planning_entries WHERE user_id = users.id) AS "planningCount"
  FROM users
`;

async function auditLog(
  adminId: string,
  action: string,
  targetType: 'user' | 'activity',
  targetId: string,
  reason?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await pool.query(
    `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, reason, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [adminId, action, targetType, targetId, reason ?? null, metadata ? JSON.stringify(metadata) : null],
  );
}

async function fetchAdminUser(userId: string): Promise<AdminUser> {
  const { rows } = await pool.query<AdminUser>(
    `${ADMIN_USER_SELECT} WHERE id = $1`,
    [userId],
  );
  if (rows.length === 0) throw new AppError(404, 'Utilisateur introuvable.', 'NOT_FOUND');
  return rows[0];
}

export interface ListUsersParams {
  status?: 'active' | 'suspended' | 'deleted';
  role?: 'member' | 'organizer' | 'admin';
  search?: string;
  page: number;
  limit: number;
}

export async function listUsers(
  params: ListUsersParams,
): Promise<PaginatedResult<AdminUser>> {
  const { status, role, search, page, limit } = params;
  const offset = (page - 1) * limit;
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;

  if (status) { conditions.push(`status = $${idx++}`); values.push(status); }
  if (role)   { conditions.push(`role = $${idx++}`); values.push(role); }
  if (search) {
    conditions.push(`(pseudo ILIKE $${idx} OR email ILIKE $${idx})`);
    values.push(`%${search}%`); idx++;
  }

  const where = conditions.join(' AND ');

  const [data, count] = await Promise.all([
    pool.query<AdminUser>(
      `${ADMIN_USER_SELECT} WHERE ${where}
       ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    pool.query<{ count: string }>(`SELECT COUNT(*) FROM users WHERE ${where}`, values),
  ]);

  const total = parseInt(count.rows[0].count, 10);
  return { data: data.rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function suspendUser(
  adminId: string,
  userId: string,
  reason: string,
  suspendUntil: string,
): Promise<AdminUser> {
  const { rowCount } = await pool.query(
    `UPDATE users SET status = 'suspended', suspended_until = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL`,
    [suspendUntil, userId],
  );
  if (rowCount === 0) throw new AppError(404, 'Utilisateur introuvable.', 'NOT_FOUND');
  await auditLog(adminId, 'SUSPEND_USER', 'user', userId, reason, { suspendUntil });
  return fetchAdminUser(userId);
}

export async function deleteUserAdmin(
  adminId: string,
  userId: string,
  reason: string,
): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE users SET
       email = 'deleted_' || id || '@deleted.local',
       pseudo = 'Utilisateur supprimé',
       password_hash = '',
       avatar_url = NULL,
       status = 'deleted',
       deleted_at = NOW(),
       updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  if (rowCount === 0) throw new AppError(404, 'Utilisateur introuvable.', 'NOT_FOUND');
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  );
  await auditLog(adminId, 'DELETE_USER', 'user', userId, reason);
}

export async function promoteUser(
  adminId: string,
  userId: string,
  role: UserRole,
): Promise<AdminUser> {
  const { rowCount } = await pool.query(
    `UPDATE users SET role = $1, updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL`,
    [role, userId],
  );
  if (rowCount === 0) throw new AppError(404, 'Utilisateur introuvable.', 'NOT_FOUND');
  await auditLog(adminId, 'PROMOTE_USER', 'user', userId, undefined, { role });
  return fetchAdminUser(userId);
}

export async function listPendingActivities(
  page: number,
  limit: number,
): Promise<PaginatedResult<ActivityDetail>> {
  const offset = (page - 1) * limit;
  const [data, count] = await Promise.all([
    pool.query<ActivityDetail>(
      `SELECT
         a.id, a.name, a.category, a.description, a.address,
         a.cover_image_url AS "coverImage",
         a.avg_rating AS "avgRating", a.review_count AS "reviewCount",
         a.price_min AS "priceMin", a.price_max AS "priceMax",
         a.opening_hours AS "openingHours",
         json_build_object('pmr', a.accessibility_pmr, 'stroller', a.accessibility_stroller) AS accessibility,
         a.website_url AS "websiteUrl", a.status, a.admin_note AS "adminNote",
         a.created_at AS "createdAt", a.updated_at AS "updatedAt",
         ST_Y(a.location::geometry) AS latitude, ST_X(a.location::geometry) AS longitude,
         json_build_object('id', u.id, 'pseudo', u.pseudo) AS organizer,
         COALESCE(json_agg(ap.url ORDER BY ap.position) FILTER (WHERE ap.id IS NOT NULL), '[]') AS photos
       FROM activities a
       JOIN users u ON u.id = a.organizer_id
       LEFT JOIN activity_photos ap ON ap.activity_id = a.id
       WHERE a.status = 'pending'
       GROUP BY a.id, u.id
       ORDER BY a.created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    ),
    pool.query<{ count: string }>(`SELECT COUNT(*) FROM activities WHERE status = 'pending'`),
  ]);

  const total = parseInt(count.rows[0].count, 10);
  return { data: data.rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function approveActivity(
  adminId: string,
  activityId: string,
): Promise<ActivityDetail> {
  const { rowCount } = await pool.query(
    `UPDATE activities SET status = 'published', updated_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [activityId],
  );
  if (rowCount === 0) throw new AppError(404, 'Activité introuvable ou non en attente.', 'NOT_FOUND');
  await auditLog(adminId, 'APPROVE_ACTIVITY', 'activity', activityId);
  return fetchActivityDetail(activityId);
}

export async function rejectActivity(
  adminId: string,
  activityId: string,
  reason: string,
): Promise<ActivityDetail> {
  const { rowCount } = await pool.query(
    `UPDATE activities SET status = 'rejected', admin_note = $1, updated_at = NOW()
     WHERE id = $2 AND status = 'pending'`,
    [reason, activityId],
  );
  if (rowCount === 0) throw new AppError(404, 'Activité introuvable ou non en attente.', 'NOT_FOUND');
  await auditLog(adminId, 'REJECT_ACTIVITY', 'activity', activityId, reason);
  return fetchActivityDetail(activityId);
}
