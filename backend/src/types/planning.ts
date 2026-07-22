import type { ActivityListItem } from './activity';

/** Ligne brute de la table planning_entries (usage interne uniquement) */
export interface PlanningEntryRow {
  id: string;
  user_id: string;
  activity_id: string;
  scheduled_at: string;
  reminder_offset_minutes: number | null;
  created_at: Date;
}

/** Entrée de planning exposée par l'API — schéma Swagger `PlanningEntry` */
export interface PlanningEntry {
  id: string;
  scheduledAt: string;
  reminderOffset: number | null;
  createdAt: Date;
  activity: Omit<ActivityListItem, 'distance'>;
}
