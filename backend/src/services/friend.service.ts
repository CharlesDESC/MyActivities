import { pool } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { Friend, FriendRequest, UserSummary } from '../types';

/**
 * Envoie une demande d'ami. Refuse l'auto-demande, un destinataire inexistant
 * ou une relation déjà existante (en attente ou acceptée).
 * Renvoie la demande créée (du point de vue de l'émetteur → `outgoing`).
 */
export async function sendRequest(
  requesterId: string,
  addresseeId: string,
): Promise<FriendRequest> {
  if (requesterId === addresseeId) {
    throw new AppError(422, 'Impossible de s’ajouter soi-même.', 'CANNOT_FRIEND_SELF');
  }

  const addressee = await pool.query<{ id: string; pseudo: string; avatarUrl: string | null }>(
    `SELECT id, pseudo, avatar_url AS "avatarUrl"
       FROM users WHERE id = $1 AND status = 'active' AND deleted_at IS NULL`,
    [addresseeId],
  );
  if (addressee.rowCount === 0) throw new AppError(404, 'Utilisateur introuvable.', 'NOT_FOUND');

  const existing = await pool.query<{ status: string }>(
    `SELECT status FROM friendships
      WHERE (requester_id = $1 AND addressee_id = $2)
         OR (requester_id = $2 AND addressee_id = $1)`,
    [requesterId, addresseeId],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    const status = existing.rows[0].status;
    if (status === 'accepted') throw new AppError(409, 'Vous êtes déjà amis.', 'ALREADY_FRIENDS');
    throw new AppError(409, 'Une demande est déjà en attente.', 'REQUEST_PENDING');
  }

  const inserted = await pool.query<{ id: string; createdAt: Date }>(
    `INSERT INTO friendships (requester_id, addressee_id)
     VALUES ($1, $2) RETURNING id, created_at AS "createdAt"`,
    [requesterId, addresseeId],
  );

  return {
    id: inserted.rows[0].id,
    direction: 'outgoing',
    user: addressee.rows[0],
    createdAt: inserted.rows[0].createdAt,
  };
}

/**
 * Répond à une demande reçue. Seul le destinataire (`addressee`) peut répondre.
 * `accept=true` → relation acceptée ; sinon la demande est supprimée.
 * Renvoie l'id du demandeur (pour la notification temps réel).
 */
export async function respondRequest(
  userId: string,
  requestId: string,
  accept: boolean,
): Promise<{ accepted: boolean; requesterId: string }> {
  const request = await pool.query<{ requester_id: string; status: string }>(
    'SELECT requester_id, status FROM friendships WHERE id = $1 AND addressee_id = $2',
    [requestId, userId],
  );
  if (request.rowCount === 0) throw new AppError(404, 'Demande introuvable.', 'NOT_FOUND');
  if (request.rows[0].status !== 'pending') {
    throw new AppError(409, 'Cette demande a déjà été traitée.', 'REQUEST_RESOLVED');
  }

  if (accept) {
    await pool.query(
      `UPDATE friendships SET status = 'accepted', responded_at = now() WHERE id = $1`,
      [requestId],
    );
  } else {
    await pool.query('DELETE FROM friendships WHERE id = $1', [requestId]);
  }

  return { accepted: accept, requesterId: request.rows[0].requester_id };
}

/** Supprime une relation d'amitié (ou une demande) entre deux utilisateurs. */
export async function removeFriend(userId: string, otherId: string): Promise<void> {
  const res = await pool.query(
    `DELETE FROM friendships
      WHERE (requester_id = $1 AND addressee_id = $2)
         OR (requester_id = $2 AND addressee_id = $1)`,
    [userId, otherId],
  );
  if (res.rowCount === 0) throw new AppError(404, 'Relation introuvable.', 'NOT_FOUND');
}

/** Liste les amis acceptés de l'utilisateur, triés par pseudo. */
export async function listFriends(userId: string): Promise<Friend[]> {
  const { rows } = await pool.query<Friend>(
    `SELECT u.id, u.pseudo, u.avatar_url AS "avatarUrl",
            f.responded_at AS "friendsSince"
       FROM friendships f
       JOIN users u
         ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
      WHERE (f.requester_id = $1 OR f.addressee_id = $1)
        AND f.status = 'accepted'
        AND u.deleted_at IS NULL
      ORDER BY u.pseudo`,
    [userId],
  );
  return rows;
}

/** Liste les demandes en attente (reçues et envoyées), avec leur direction. */
export async function listPendingRequests(userId: string): Promise<FriendRequest[]> {
  const { rows } = await pool.query<FriendRequest>(
    `SELECT f.id,
            CASE WHEN f.addressee_id = $1 THEN 'incoming' ELSE 'outgoing' END AS direction,
            json_build_object('id', u.id, 'pseudo', u.pseudo, 'avatarUrl', u.avatar_url) AS user,
            f.created_at AS "createdAt"
       FROM friendships f
       JOIN users u
         ON u.id = CASE WHEN f.addressee_id = $1 THEN f.requester_id ELSE f.addressee_id END
      WHERE (f.addressee_id = $1 OR f.requester_id = $1)
        AND f.status = 'pending'
        AND u.deleted_at IS NULL
      ORDER BY f.created_at DESC`,
    [userId],
  );
  return rows;
}

/** Indique si deux utilisateurs sont amis (relation acceptée). */
export async function areFriends(a: string, b: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1))
      LIMIT 1`,
    [a, b],
  );
  return (rowCount ?? 0) > 0;
}

export type { Friend, FriendRequest, UserSummary };
