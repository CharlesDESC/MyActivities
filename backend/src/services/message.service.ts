import { pool } from '../db/pool';
import { AppError } from '../middleware/errorHandler';
import { Message, Conversation, ConversationParticipant, ReadReceipt, PaginatedResult, UserRole } from '../types';
import { areFriends } from './friend.service';

/** Message + expéditeur, alias camelCase — schéma Swagger `Message` */
const MESSAGE_SELECT = `
  SELECT m.id, m.conversation_id AS "conversationId", m.content,
         m.created_at AS "createdAt", m.read_at AS "readAt",
         json_build_object('id', u.id, 'pseudo', u.pseudo, 'avatarUrl', u.avatar_url) AS sender
  FROM messages m JOIN users u ON u.id = m.sender_id
`;

/** Résultat d'un envoi : le message + les destinataires du fan-out temps réel. */
export interface SendResult {
  message: Message;
  recipientIds: string[];
}

async function fetchMessage(messageId: string): Promise<Message> {
  const { rows } = await pool.query<Message>(`${MESSAGE_SELECT} WHERE m.id = $1`, [messageId]);
  if (rows.length === 0) throw new AppError(404, 'Message introuvable.', 'NOT_FOUND');
  return rows[0];
}

/** Ids de tous les participants d'une conversation (fan-out temps réel). */
async function getParticipantIds(conversationId: string): Promise<string[]> {
  const { rows } = await pool.query<{ user_id: string }>(
    'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
    [conversationId],
  );
  return rows.map((r) => r.user_id);
}

/**
 * Vérifie que l'utilisateur participe à la conversation ; renvoie la liste
 * complète des participants (404 si conversation inconnue, 403 si non-membre).
 */
async function assertParticipant(userId: string, conversationId: string): Promise<string[]> {
  const ids = await getParticipantIds(conversationId);
  if (ids.length === 0) throw new AppError(404, 'Conversation introuvable.', 'NOT_FOUND');
  if (!ids.includes(userId)) throw new AppError(403, 'Accès refusé.', 'FORBIDDEN');
  return ids;
}

/** Vérifie que l'utilisateur est admin d'un groupe. */
async function assertGroupAdmin(userId: string, conversationId: string): Promise<void> {
  const { rows } = await pool.query<{ type: string; role: string | null }>(
    `SELECT c.type,
            (SELECT role FROM conversation_participants
              WHERE conversation_id = c.id AND user_id = $2) AS role
       FROM conversations c WHERE c.id = $1`,
    [conversationId, userId],
  );
  if (rows.length === 0) throw new AppError(404, 'Conversation introuvable.', 'NOT_FOUND');
  if (rows[0].type !== 'group') throw new AppError(422, 'Ce n’est pas un groupe.', 'NOT_A_GROUP');
  if (rows[0].role !== 'admin') throw new AppError(403, 'Réservé à l’administrateur du groupe.', 'FORBIDDEN');
}

// ─── Conversations (lecture) ────────────────────────────────────────────────────

interface ConversationQueryRow {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  updatedAt: Date;
  lastMessageContent: string | null;
  lastMessageAt: Date | null;
  lastMessageSenderId: string | null;
  unreadCount: number;
  participants: ConversationParticipant[] | null;
  otherParticipant: { id: string; pseudo: string; avatarUrl: string | null } | null;
}

/** Corps de requête partagé entre liste et lecture unitaire d'une conversation. */
const CONVERSATION_SELECT = `
  SELECT c.id, c.type, c.title,
         c.last_message_at AS "updatedAt",
         lm.content    AS "lastMessageContent",
         lm.created_at AS "lastMessageAt",
         lm.sender_id  AS "lastMessageSenderId",
         (SELECT COUNT(*) FROM messages m
            WHERE m.conversation_id = c.id
              AND m.sender_id <> $1
              AND (me.last_read_at IS NULL OR m.created_at > me.last_read_at))::int AS "unreadCount",
         (SELECT json_agg(json_build_object(
                   'id', pu.id, 'pseudo', pu.pseudo, 'avatarUrl', pu.avatar_url, 'role', cp.role)
                   ORDER BY pu.pseudo)
            FROM conversation_participants cp
            JOIN users pu ON pu.id = cp.user_id
            WHERE cp.conversation_id = c.id) AS participants,
         (SELECT json_build_object('id', ou.id, 'pseudo', ou.pseudo, 'avatarUrl', ou.avatar_url)
            FROM conversation_participants ocp
            JOIN users ou ON ou.id = ocp.user_id
            WHERE ocp.conversation_id = c.id AND ocp.user_id <> $1
            LIMIT 1) AS "otherParticipant"
  FROM conversations c
  JOIN conversation_participants me ON me.conversation_id = c.id AND me.user_id = $1
  LEFT JOIN LATERAL (
    SELECT content, created_at, sender_id
    FROM messages WHERE conversation_id = c.id
    ORDER BY created_at DESC LIMIT 1
  ) lm ON true
`;

function mapConversation(r: ConversationQueryRow): Conversation {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    // `otherParticipant` n'a de sens que pour un direct (un seul « autre »).
    otherParticipant: r.type === 'direct' ? r.otherParticipant : null,
    participants: r.participants ?? [],
    lastMessage: r.lastMessageContent
      ? { content: r.lastMessageContent, createdAt: r.lastMessageAt as Date, senderId: r.lastMessageSenderId as string }
      : null,
    unreadCount: r.unreadCount,
    updatedAt: r.updatedAt,
  };
}

export async function listConversations(
  userId: string,
  page: number,
  limit: number,
): Promise<PaginatedResult<Conversation>> {
  const offset = (page - 1) * limit;

  const [data, count] = await Promise.all([
    pool.query<ConversationQueryRow>(
      `${CONVERSATION_SELECT}
       ORDER BY c.last_message_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM conversation_participants WHERE user_id = $1',
      [userId],
    ),
  ]);

  const total = parseInt(count.rows[0].count, 10);
  return {
    data: data.rows.map(mapConversation),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/** Lecture unitaire d'une conversation du point de vue de l'utilisateur. */
export async function getConversation(userId: string, conversationId: string): Promise<Conversation> {
  const { rows } = await pool.query<ConversationQueryRow>(
    `${CONVERSATION_SELECT} WHERE c.id = $2`,
    [userId, conversationId],
  );
  if (rows.length === 0) throw new AppError(404, 'Conversation introuvable.', 'NOT_FOUND');
  return mapConversation(rows[0]);
}

export async function getMessages(
  userId: string,
  conversationId: string,
  page: number,
  limit: number,
): Promise<PaginatedResult<Message>> {
  await assertParticipant(userId, conversationId);

  const offset = (page - 1) * limit;
  const [data, count] = await Promise.all([
    pool.query<Message>(
      `${MESSAGE_SELECT} WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset],
    ),
    pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM messages WHERE conversation_id = $1',
      [conversationId],
    ),
  ]);

  const total = parseInt(count.rows[0].count, 10);
  return {
    data: data.rows,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ─── Conversations directes (get-or-create) ─────────────────────────────────────

/** Retrouve la conversation directe partagée par deux utilisateurs, ou `null`. */
async function findDirectConversation(a: string, b: string): Promise<string | null> {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT c.id FROM conversations c
       JOIN conversation_participants pa ON pa.conversation_id = c.id AND pa.user_id = $1
       JOIN conversation_participants pb ON pb.conversation_id = c.id AND pb.user_id = $2
      WHERE c.type = 'direct' LIMIT 1`,
    [a, b],
  );
  return rows[0]?.id ?? null;
}

/** Crée une conversation directe entre deux utilisateurs (transaction). */
async function createDirectConversation(a: string, b: string): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const convo = await client.query<{ id: string }>(
      `INSERT INTO conversations (type) VALUES ('direct') RETURNING id`,
    );
    const id = convo.rows[0].id;
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
      [id, a, b],
    );
    await client.query('COMMIT');
    return id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Envoi d'un message direct (get-or-create de la conversation).
 * Règle d'accès : un membre peut démarrer une conversation avec un organisateur
 * sans relation d'amitié. Dans les autres cas, une conversation existante ou
 * une relation d'amitié est requise.
 */
export async function sendMessage(
  senderId: string,
  senderRole: UserRole,
  recipientId: string,
  content: string,
): Promise<SendResult> {
  if (senderId === recipientId) {
    throw new AppError(422, 'Impossible de s’envoyer un message à soi-même.', 'INVALID_RECIPIENT');
  }

  const recipient = await pool.query<{ id: string; role: string }>(
    `SELECT id, role FROM users WHERE id = $1 AND status = 'active' AND deleted_at IS NULL`,
    [recipientId],
  );
  if (recipient.rowCount === 0) throw new AppError(404, 'Destinataire introuvable.', 'NOT_FOUND');

  const canContactOrganizer = senderRole === 'member' && recipient.rows[0].role === 'organizer';
  let conversationId = await findDirectConversation(senderId, recipientId);

  // Une conversation déjà ouverte reste bidirectionnelle : l'organisateur doit
  // pouvoir répondre au membre qui l'a contacté.
  if (!canContactOrganizer && conversationId === null && !(await areFriends(senderId, recipientId))) {
    throw new AppError(403, 'Vous devez être amis pour envoyer un message.', 'NOT_FRIENDS');
  }

  if (conversationId === null) {
    conversationId = await createDirectConversation(senderId, recipientId);
  }

  const message = await insertMessage(conversationId, senderId, content);
  return { message, recipientIds: [senderId, recipientId] };
}

/** Envoi vers une conversation existante (direct ou groupe) : membre requis. */
export async function sendToConversation(
  senderId: string,
  conversationId: string,
  content: string,
): Promise<SendResult> {
  const recipientIds = await assertParticipant(senderId, conversationId);
  const message = await insertMessage(conversationId, senderId, content);
  return { message, recipientIds };
}

/** Insère un message et met à jour l'horodatage de dernière activité. */
async function insertMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO messages (conversation_id, sender_id, content)
     VALUES ($1, $2, $3) RETURNING id`,
    [conversationId, senderId, content],
  );
  await pool.query('UPDATE conversations SET last_message_at = now() WHERE id = $1', [conversationId]);
  return fetchMessage(inserted.rows[0].id);
}

export async function markConversationRead(
  userId: string,
  conversationId: string,
): Promise<ReadReceipt> {
  const participantIds = await assertParticipant(userId, conversationId);

  await pool.query(
    'UPDATE conversation_participants SET last_read_at = now() WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId],
  );
  // Accusé de lecture (surtout pertinent pour un direct) : marque les messages reçus.
  const res = await pool.query(
    `UPDATE messages SET read_at = now()
     WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
    [conversationId, userId],
  );

  return {
    conversationId,
    updated: res.rowCount ?? 0,
    readerId: userId,
    recipientIds: participantIds.filter((id) => id !== userId),
  };
}

/**
 * Supprime une conversation pour *tous* ses participants. N'importe quel membre
 * de la conversation (y compris un organisateur contacté par un membre) peut la
 * déclencher : la suppression est définitive et efface les messages via
 * `ON DELETE CASCADE`. Renvoie les participants à prévenir en temps réel.
 */
export async function deleteConversation(
  userId: string,
  conversationId: string,
): Promise<{ participantIds: string[] }> {
  const participantIds = await assertParticipant(userId, conversationId);
  await pool.query('DELETE FROM conversations WHERE id = $1', [conversationId]);
  return { participantIds };
}

// ─── Groupes ────────────────────────────────────────────────────────────────────

/**
 * Crée un groupe. Tous les membres invités doivent être amis du créateur ;
 * le créateur devient administrateur.
 */
export async function createGroup(
  creatorId: string,
  title: string,
  memberIds: string[],
): Promise<Conversation> {
  const unique = [...new Set(memberIds)].filter((id) => id !== creatorId);
  if (unique.length === 0) {
    throw new AppError(422, 'Un groupe requiert au moins un autre membre.', 'GROUP_NEEDS_MEMBERS');
  }

  // Tous les membres invités doivent être amis (acceptés) du créateur.
  const friends = await pool.query<{ friendId: string }>(
    `SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS "friendId"
       FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = $1 AND addressee_id = ANY($2))
          OR (addressee_id = $1 AND requester_id = ANY($2)))`,
    [creatorId, unique],
  );
  const friendSet = new Set(friends.rows.map((r) => r.friendId));
  if (!unique.every((id) => friendSet.has(id))) {
    throw new AppError(422, 'Vous ne pouvez ajouter que vos amis.', 'NOT_ALL_FRIENDS');
  }

  const client = await pool.connect();
  let conversationId: string;
  try {
    await client.query('BEGIN');
    const convo = await client.query<{ id: string }>(
      `INSERT INTO conversations (type, title, created_by) VALUES ('group', $1, $2) RETURNING id`,
      [title, creatorId],
    );
    conversationId = convo.rows[0].id;
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [conversationId, creatorId],
    );
    await client.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, role)
       SELECT $1, unnest($2::uuid[]), 'member'`,
      [conversationId, unique],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getConversation(creatorId, conversationId);
}

/** Ajoute un membre à un groupe (admin requis ; le nouveau doit être ami de l'admin). */
export async function addMember(
  actorId: string,
  conversationId: string,
  userId: string,
): Promise<{ addedUserId: string; participantIds: string[] }> {
  await assertGroupAdmin(actorId, conversationId);
  if (userId === actorId) throw new AppError(422, 'Vous êtes déjà membre.', 'ALREADY_MEMBER');
  if (!(await areFriends(actorId, userId))) {
    throw new AppError(422, 'Vous ne pouvez ajouter que vos amis.', 'NOT_FRIENDS');
  }

  const res = await pool.query(
    `INSERT INTO conversation_participants (conversation_id, user_id, role)
     VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
    [conversationId, userId],
  );
  if (res.rowCount === 0) throw new AppError(409, 'Cet utilisateur est déjà membre.', 'ALREADY_MEMBER');

  const participantIds = await getParticipantIds(conversationId);
  return { addedUserId: userId, participantIds };
}

/** Retire un membre d'un groupe (admin requis, ne peut pas se retirer soi-même ici). */
export async function removeMember(
  actorId: string,
  conversationId: string,
  userId: string,
): Promise<{ removedUserId: string; participantIds: string[] }> {
  await assertGroupAdmin(actorId, conversationId);
  if (userId === actorId) throw new AppError(422, 'Utilisez « quitter le groupe » pour partir.', 'CANNOT_REMOVE_SELF');

  const res = await pool.query(
    'DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId],
  );
  if (res.rowCount === 0) throw new AppError(404, 'Membre introuvable.', 'NOT_FOUND');

  const participantIds = await getParticipantIds(conversationId);
  return { removedUserId: userId, participantIds };
}

/** Quitte un groupe. Si le dernier admin part, un membre restant est promu. */
export async function leaveGroup(
  userId: string,
  conversationId: string,
): Promise<{ participantIds: string[] }> {
  const { rows } = await pool.query<{ type: string }>(
    'SELECT type FROM conversations WHERE id = $1',
    [conversationId],
  );
  if (rows.length === 0) throw new AppError(404, 'Conversation introuvable.', 'NOT_FOUND');
  if (rows[0].type !== 'group') throw new AppError(422, 'Ce n’est pas un groupe.', 'NOT_A_GROUP');

  const res = await pool.query(
    'DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2 RETURNING role',
    [conversationId, userId],
  );
  if (res.rowCount === 0) throw new AppError(403, 'Vous n’êtes pas membre.', 'FORBIDDEN');

  // Promotion : si plus aucun admin ne reste, le plus ancien membre le devient.
  await pool.query(
    `UPDATE conversation_participants SET role = 'admin'
      WHERE conversation_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM conversation_participants
           WHERE conversation_id = $1 AND role = 'admin')
        AND user_id = (
          SELECT user_id FROM conversation_participants
           WHERE conversation_id = $1 ORDER BY joined_at LIMIT 1)`,
    [conversationId],
  );

  const participantIds = await getParticipantIds(conversationId);
  return { participantIds };
}

/** Renomme un groupe (admin requis). Renvoie la conversation mise à jour + destinataires. */
export async function renameGroup(
  actorId: string,
  conversationId: string,
  title: string,
): Promise<{ conversation: Conversation; participantIds: string[] }> {
  await assertGroupAdmin(actorId, conversationId);
  await pool.query('UPDATE conversations SET title = $2 WHERE id = $1', [conversationId, title]);
  const [conversation, participantIds] = await Promise.all([
    getConversation(actorId, conversationId),
    getParticipantIds(conversationId),
  ]);
  return { conversation, participantIds };
}
