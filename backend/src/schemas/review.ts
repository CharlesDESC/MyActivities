import { z } from 'zod';
import { PaginationQuerySchema } from './pagination';

export const ReviewQuerySchema = PaginationQuerySchema.extend({
  sort: z.enum(['date_desc', 'date_asc', 'rating_desc', 'rating_asc']).default('date_desc'),
});

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export const UpdateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

// ─── Inferred types ────────────────────────────────────────────────────────────
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type UpdateReviewInput = z.infer<typeof UpdateReviewSchema>;
export type ReviewQueryInput = z.infer<typeof ReviewQuerySchema>;
