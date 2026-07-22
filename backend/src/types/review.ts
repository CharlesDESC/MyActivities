export type SortReviews = 'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc';

/** Ligne brute de la table reviews (usage interne uniquement) */
export interface ReviewRow {
  id: string;
  user_id: string;
  activity_id: string;
  rating: number;
  created_at: Date;
  updated_at: Date;
}

/** Avis exposé par l'API — schéma Swagger `Review` */
export interface Review {
  id: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date | null;
  author: { id: string; pseudo: string; avatarUrl: string | null };
}
