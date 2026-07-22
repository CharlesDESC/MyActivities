// ─── Lignes brutes (usage interne uniquement) ──────────────────────────────────

/** Type d'une conversation (aligné sur l'enum `conversation_type`). */
export type ConversationType = 'direct' | 'group';

/** Rôle d'un participant dans une conversation. */
export type ParticipantRole = 'admin' | 'member';

/** Ligne brute de la table conversations */
export interface ConversationRow {
  id: string;
  type: ConversationType;
  title: string | null;
  created_by: string | null;
  created_at: Date;
  last_message_at: Date;
}

/** Ligne brute de la table messages */
export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: Date | null;
  created_at: Date;
}

// ─── Types exposés par l'API (camelCase) ────────────────────────────────────────

/** Participant d'une conversation — schéma Swagger `ConversationParticipant` */
export interface ConversationParticipant {
  id: string;
  pseudo: string;
  avatarUrl: string | null;
  role: ParticipantRole;
}

/** Message exposé par l'API — schéma Swagger `Message` */
export interface Message {
  id: string;
  conversationId: string;
  content: string;
  createdAt: Date;
  readAt: Date | null;
  sender: { id: string; pseudo: string; avatarUrl: string | null };
}

/**
 * Conversation exposée par l'API — schéma Swagger `Conversation`.
 * `direct` : `otherParticipant` renseigné, `title` nul.
 * `group`  : `title` + liste complète des `participants`, `otherParticipant` nul.
 */
export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  otherParticipant: { id: string; pseudo: string; avatarUrl: string | null } | null;
  participants: ConversationParticipant[];
  lastMessage: { content: string; createdAt: Date; senderId: string } | null;
  unreadCount: number;
  updatedAt: Date;
}

/** Accusé de lecture renvoyé par `markConversationRead` */
export interface ReadReceipt {
  conversationId: string;
  updated: number;
  readerId: string;
  /** Autres participants à notifier (tous sauf le lecteur). */
  recipientIds: string[];
}
