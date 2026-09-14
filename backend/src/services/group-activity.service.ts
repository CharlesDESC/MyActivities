import type { PoolClient } from 'pg';
import { pool } from '../db/pool';
import { AppError } from '../middleware/errorHandler';

// Lock membership during writes so a concurrent removal cannot authorize a proposal.
async function member(userId: string, conversationId: string, client?: PoolClient) {
  const db = client ?? pool;
  const { rows } = await db.query<{ type: string; role: string }>(
    `SELECT c.type, cp.role FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $2
     WHERE c.id = $1 ${client ? 'FOR UPDATE OF c, cp' : ''}`,
    [conversationId, userId],
  );
  if (!rows.length) throw new AppError(403, 'Accès réservé aux membres du groupe.', 'FORBIDDEN');
  if (rows[0].type !== 'group') throw new AppError(422, 'Ce n’est pas un groupe.', 'NOT_A_GROUP');
  return rows[0].role;
}

export async function list(userId: string, conversationId: string, page: number, limit: number) {
  await member(userId, conversationId);
  const { rows } = await pool.query(
    `SELECT ca.activity_id AS id,
       CASE WHEN a.status = 'published' THEN a.name ELSE 'Activité indisponible' END AS name,
       a.status = 'published' AS available,
       ca.added_by AS "addedBy", u.pseudo AS "addedByPseudo", ca.created_at AS "createdAt"
     FROM conversation_activities ca JOIN activities a ON a.id = ca.activity_id
     LEFT JOIN users u ON u.id = ca.added_by
     WHERE ca.conversation_id = $1
     ORDER BY ca.created_at DESC, ca.activity_id LIMIT $2 OFFSET $3`,
    [conversationId, limit + 1, (page - 1) * limit],
  );
  return { data: rows.slice(0, limit), hasMore: rows.length > limit };
}

export async function search(userId: string, conversationId: string, query: string, page: number, limit: number) {
  await member(userId, conversationId);
  const { rows } = await pool.query(
    `SELECT a.id, a.name, a.address FROM activities a
     WHERE a.status = 'published' AND strpos(lower(a.name), lower($2)) > 0
       AND NOT EXISTS (SELECT 1 FROM conversation_activities ca
                       WHERE ca.conversation_id = $1 AND ca.activity_id = a.id)
     ORDER BY a.name, a.id LIMIT $3 OFFSET $4`,
    [conversationId, query, limit + 1, (page - 1) * limit],
  );
  return { data: rows.slice(0, limit), hasMore: rows.length > limit };
}

export async function change(userId: string, conversationId: string, activityId: string, remove: boolean) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const role = await member(userId, conversationId, client);
    if (remove) {
      const result = await client.query(
        `DELETE FROM conversation_activities WHERE conversation_id = $1 AND activity_id = $2
         AND (added_by = $3 OR $4 = 'admin') RETURNING activity_id`,
        [conversationId, activityId, userId, role],
      );
      if (!result.rowCount) throw new AppError(403, 'Seul l’auteur ou un administrateur du groupe peut retirer cette proposition.', 'FORBIDDEN');
    } else {
      const activity = await client.query(
        `SELECT id FROM activities WHERE id = $1 AND status = 'published' FOR SHARE`, [activityId],
      );
      if (!activity.rows.length) throw new AppError(404, 'Activité indisponible.', 'NOT_FOUND');
      const result = await client.query(
        `INSERT INTO conversation_activities (conversation_id, activity_id, added_by)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING activity_id`,
        [conversationId, activityId, userId],
      );
      if (!result.rowCount) throw new AppError(409, 'Cette activité est déjà proposée dans le groupe.', 'ALREADY_PROPOSED');
    }
    const { rows } = await client.query<{ user_id: string }>(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = $1', [conversationId],
    );
    await client.query('COMMIT');
    return rows.map((r) => r.user_id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
