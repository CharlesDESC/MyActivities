import type { ActivityCategory } from './activity';

export type PlanningActivity = {
  id: string;
  name: string;
  category: ActivityCategory;
  address: string;
  coverImageUrl: string | null;
  avgRating: number | null;
  reviewCount: number;
  priceMin: number;
  priceMax: number;
  latitude: number;
  longitude: number;
};

export type PlanningEntry = {
  id: string;
  scheduledAt: string;
  reminderOffsetMinutes: number | null;
  createdAt: string;
  activity: PlanningActivity;
};
