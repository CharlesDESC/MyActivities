export type UserSummary = {
  id: string;
  pseudo: string;
  avatarUrl: string | null;
};

export type Friend = UserSummary & {
  friendsSince: string | null;
};

/** Demande d'ami en attente. `direction` : reçue (`incoming`) ou envoyée (`outgoing`). */
export type FriendRequest = {
  id: string;
  direction: 'incoming' | 'outgoing';
  user: UserSummary;
  createdAt: string;
};
