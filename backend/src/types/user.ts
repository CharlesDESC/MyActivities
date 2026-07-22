export type UserRole = 'member' | 'organizer' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deleted';

/** Ligne brute de la table users (usage interne uniquement) */
export interface UserRow {
  id: string;
  email: string;
  pseudo: string;
  role: UserRole;
  status: UserStatus;
  siret: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  password_hash: string;
  suspended_until: string | null;
  deleted_at: string | null;
  created_at: Date;
  updated_at: Date;
}

/** User exposé par l'API (camelCase, sans champs sensibles) — schéma Swagger `User` */
export interface SafeUser {
  id: string;
  email: string;
  pseudo: string;
  role: UserRole;
  status: UserStatus;
  siret: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
}

/** User vu par l'admin — schéma Swagger `AdminUser` */
export interface AdminUser extends SafeUser {
  suspendedUntil: string | null;
  reviewCount: string;   // COUNT(*) retourne du texte en pg
  planningCount: string;
}
