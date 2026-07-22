import { pool } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { verifyPassword } from '../lib/password';
import { UserRow, SafeUser, UserSummary } from '../types';
import { UpdateUserInput } from '../schemas/user';

const SAFE_USER_COLUMNS = `id, email, pseudo, role, status, siret,
  avatar_url AS "avatarUrl", email_verified AS "emailVerified", created_at AS "createdAt"`;

/**
 * Recherche d'utilisateurs par pseudo (pour ajouter des amis).
 * Exclut l'utilisateur courant et les comptes non actifs.
 */
export async function searchUsers(query: string, excludeId: string): Promise<UserSummary[]> {
  const { rows } = await pool.query<UserSummary>(
    `SELECT id, pseudo, avatar_url AS "avatarUrl"
       FROM users
      WHERE status = 'active' AND deleted_at IS NULL
        AND id <> $2
        AND pseudo ILIKE '%' || $1 || '%'
      ORDER BY pseudo LIMIT 20`,
    [query, excludeId],
  );
  return rows;
}

export async function getMe(userId: string): Promise<SafeUser> {
  const { rows } = await pool.query<SafeUser>(
    `SELECT ${SAFE_USER_COLUMNS}
     FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  if (rows.length === 0) throw new AppError(404, 'Utilisateur introuvable.', 'NOT_FOUND');
  return rows[0];
}

export async function updateMe(userId: string, data: UpdateUserInput): Promise<SafeUser> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (data.pseudo !== undefined) { fields.push(`pseudo = $${i++}`); values.push(data.pseudo); }
  if (data.avatarUrl !== undefined) { fields.push(`avatar_url = $${i++}`); values.push(data.avatarUrl); }

  if (fields.length === 0) throw new AppError(400, 'Aucun champ à mettre à jour.', 'NO_FIELDS');

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  let rows: SafeUser[];
  try {
    const result = await pool.query<SafeUser>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} AND deleted_at IS NULL
       RETURNING ${SAFE_USER_COLUMNS}`,
      values,
    );
    rows = result.rows;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      throw new AppError(409, 'Ce pseudo est déjà utilisé.', 'PSEUDO_ALREADY_EXISTS');
    }
    throw err;
  }
  if (rows.length === 0) throw new AppError(404, 'Utilisateur introuvable.', 'NOT_FOUND');
  return rows[0];
}

export async function deleteMe(userId: string, password: string): Promise<void> {
  const { rows } = await pool.query<Pick<UserRow, 'password_hash'>>(
    'SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId],
  );
  if (rows.length === 0) throw new AppError(404, 'Utilisateur introuvable.', 'NOT_FOUND');

  const valid = await verifyPassword(password, rows[0].password_hash);
  if (!valid) throw new AppError(401, 'Mot de passe incorrect.', 'INVALID_PASSWORD');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE users SET
         email = 'deleted_' || id || '@deleted.local',
         pseudo = 'Utilisateur supprimé',
         password_hash = '',
         avatar_url = NULL,
         status = 'deleted',
         deleted_at = NOW(),
         updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );
    await client.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
