// ─── Système d'amis ──────────────────────────────────────────────────────────

/** Statut d'une relation d'amitié (aligné sur l'enum `friendship_status`). */
export type FriendshipStatus = 'pending' | 'accepted';

/** Résumé public d'un utilisateur exposé dans les listes amis/demandes. */
export interface UserSummary {
  id: string;
  pseudo: string;
  avatarUrl: string | null;
}

/** Ami accepté — schéma Swagger `Friend`. */
export interface Friend extends UserSummary {
  friendsSince: Date;
}

/**
 * Demande d'ami en attente — schéma Swagger `FriendRequest`.
 * `direction` indique si l'utilisateur courant a reçu ou envoyé la demande.
 */
export interface FriendRequest {
  id: string;
  direction: 'incoming' | 'outgoing';
  user: UserSummary;
  createdAt: Date;
}
