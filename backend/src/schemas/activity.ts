import { z } from 'zod';
import { ACTIVITY_CATEGORIES } from '../types';
import { PaginationQuerySchema } from './pagination';

export const categoryEnum = z.enum(ACTIVITY_CATEGORIES);

const accessibilitySchema = z.object({
  pmr: z.boolean().default(false),
  stroller: z.boolean().default(false),
});

export const ListActivitiesSchema = PaginationQuerySchema.extend({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.5).max(50).default(5),
  category: z
    .union([z.array(categoryEnum), categoryEnum.transform((v) => [v])])
    .optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  search: z.string().min(3).optional(),
  sort: z.enum(['distance', 'rating', 'price_asc', 'price_desc']).default('distance'),
});

export const OrganizerActivitiesQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(['pending', 'published', 'rejected', 'archived']).optional(),
});

const activityFields = z.object({
  name: z.string().min(3).max(100),
  category: categoryEnum,
  description: z.string().min(20).max(2000),
  address: z.string().min(1).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  priceMin: z.number().min(0),
  priceMax: z.number().min(0),
  openingHours: z.record(z.string()).optional(),
  accessibility: accessibilitySchema.optional(),
  websiteUrl: z.string().url().nullable().optional(),
  photos: z.array(z.string().url()).max(10).optional(),
});

export const CreateActivitySchema = activityFields.refine(
  (d) => d.priceMin <= d.priceMax,
  { message: 'priceMin doit être inférieur ou égal à priceMax', path: ['priceMin'] },
);

export const UpdateActivitySchema = activityFields.partial()
  .refine(
    (d) => Object.keys(d).length > 0,
    { message: 'Aucun champ à mettre à jour' },
  )
  .refine(
    (d) => (d.latitude === undefined) === (d.longitude === undefined),
    { message: 'latitude et longitude doivent être fournies ensemble', path: ['latitude'] },
  )
  .refine(
    (d) => d.priceMin === undefined || d.priceMax === undefined || d.priceMin <= d.priceMax,
    { message: 'priceMin doit être inférieur ou égal à priceMax', path: ['priceMin'] },
  );

// ─── Inferred types ────────────────────────────────────────────────────────────
export type ListActivitiesInput = z.infer<typeof ListActivitiesSchema>;
export type CreateActivityInput = z.infer<typeof CreateActivitySchema>;
export type UpdateActivityInput = z.infer<typeof UpdateActivitySchema>;
export type OrganizerActivitiesQueryInput = z.infer<typeof OrganizerActivitiesQuerySchema>;
