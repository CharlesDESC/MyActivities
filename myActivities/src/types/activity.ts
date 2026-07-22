import type { IconName } from '@/components/ui/icon';

export type ActivityCategory =
  | 'sport'
  | 'culture'
  | 'gastronomie'
  | 'nature'
  | 'bien_etre'
  | 'art'
  | 'musique'
  | 'autre';

export type ActivityStatus = 'pending' | 'published' | 'rejected' | 'archived';

/** Statistiques d'une activité pour le tableau de bord organisateur. */
export type OrganizerStat = {
  activityId: string;
  activityName: string;
  views: number;
  planningAdds: number;
  avgRating: number | null;
  reviewCount: number;
};

/** Corps de création/édition d'une activité (aligné sur le schéma serveur). */
export type ActivityFormInput = {
  name: string;
  category: ActivityCategory;
  description: string;
  priceMin: number;
  priceMax: number;
  accessibility?: { pmr: boolean; stroller: boolean };
  websiteUrl?: string | null;
};

export type ActivitySummary = {
  id: string;
  name: string;
  category: ActivityCategory;
  distance: number;
  avgRating: number;
  reviewCount: number;
  priceMin: number;
  priceMax: number;
  address: string;
  coverImage?: string | null;
  latitude?: number;
  longitude?: number;
};

export type ActivityDetail = {
  id: string;
  name: string;
  category: ActivityCategory;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  establishmentId?: string | null;
  avgRating: number | null;
  reviewCount: number;
  priceMin: number;
  priceMax: number;
  coverImageUrl: string | null;
  openingHours: Record<string, string> | null;
  accessibilityPmr: boolean;
  accessibilityStroller: boolean;
  websiteUrl: string | null;
  photos: string[];
  organizer: { id: string; pseudo: string };
  status?: ActivityStatus;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const ACTIVITY_STATUS_CONFIG: Record<ActivityStatus, { label: string; color: string }> = {
  pending:   { label: 'En attente',  color: '#EAB308' },
  published: { label: 'Publiée',     color: '#22C55E' },
  rejected:  { label: 'Rejetée',     color: '#EF4444' },
  archived:  { label: 'Archivée',    color: '#6B7280' },
};

export type ActivitySlot = {
  id: string;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  booked: number;
  remaining: number;
};

export const CATEGORY_CONFIG: Record<
  ActivityCategory,
  { label: string; icon: IconName; color: string }
> = {
  sport:       { label: 'Sport',        icon: 'directions-run',   color: '#3B82F6' },
  culture:     { label: 'Culture',      icon: 'theater-comedy',   color: '#8B5CF6' },
  gastronomie: { label: 'Gastronomie',  icon: 'restaurant',       color: '#F97316' },
  nature:      { label: 'Nature',       icon: 'park',             color: '#22C55E' },
  bien_etre:   { label: 'Bien-être',    icon: 'self-improvement', color: '#EC4899' },
  art:         { label: 'Art',          icon: 'palette',          color: '#EAB308' },
  musique:     { label: 'Musique',      icon: 'music-note',       color: '#EF4444' },
  autre:       { label: 'Autre',        icon: 'category',         color: '#6B7280' },
};
