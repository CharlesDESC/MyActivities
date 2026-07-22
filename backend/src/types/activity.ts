export type ActivityStatus = 'pending' | 'published' | 'rejected' | 'archived';

export const ACTIVITY_CATEGORIES = [
  'sport', 'culture', 'gastronomie', 'nature',
  'bien_etre', 'art', 'musique', 'autre',
] as const;
export type ActivityCategory = typeof ACTIVITY_CATEGORIES[number];

export type SortActivities = 'distance' | 'rating' | 'price_asc' | 'price_desc';

export interface ActivityRow {
  id: string;
  organizer_id: string;
  establishment_id: string | null;
  name: string;
  category: ActivityCategory;
  description: string;
  address: string;
  cover_image_url: string | null;
  avg_rating: number | null;
  review_count: number;
  price_min: number;
  price_max: number;
  opening_hours: Record<string, string> | null;
  accessibility_pmr: boolean;
  accessibility_stroller: boolean;
  website_url: string | null;
  status: ActivityStatus;
  admin_note: string | null;
  views: number;
  created_at: Date;
  updated_at: Date;
}

/** Résultat de GET /activities (liste géolocalisée) — schéma Swagger `ActivitySummary` */
export interface ActivityListItem {
  id: string;
  name: string;
  category: ActivityCategory;
  address: string;
  coverImage: string | null;
  avgRating: number | null;
  reviewCount: number;
  priceMin: number;
  priceMax: number;
  latitude: number;
  longitude: number;
  distance: number;
}

/** Résultat de GET /activities/:id (détail complet) — schéma Swagger `ActivityDetail` */
export interface ActivityDetail extends Omit<ActivityListItem, 'distance'> {
  description: string;
  establishmentId: string | null;
  openingHours: Record<string, string> | null;
  accessibility: { pmr: boolean; stroller: boolean };
  websiteUrl: string | null;
  status: ActivityStatus;
  adminNote: string | null;
  organizer: { id: string; pseudo: string };
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** Statistiques organisateur — schéma Swagger `OrganizerStats` */
export interface OrganizerStats {
  activityId: string;
  activityName: string;
  views: number;
  planningAdds: string; // COUNT(*) retourne du texte en pg
  avgRating: number | null;
  reviewCount: number;
}
