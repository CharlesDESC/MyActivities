import { z } from 'zod';
import { PaginationQuerySchema } from './pagination';

export const PlanningQuerySchema = PaginationQuerySchema.extend({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const AddToPlanningSchema = z
  .object({
    activityId: z.string().uuid(),
    // Réservation d'un créneau à capacité limitée (recommandé)…
    slotId: z.string().uuid().optional(),
    // …ou date libre (activités sans créneaux, ex. accès libre)
    scheduledAt: z.string().datetime().refine(
      (v) => new Date(v) > new Date(),
      { message: 'La date ne peut pas être dans le passé' },
    ).optional(),
    reminderOffset: z.number().int().min(0).nullable().optional(),
  })
  .refine((d) => (d.slotId !== undefined) !== (d.scheduledAt !== undefined), {
    message: 'Fournir soit slotId, soit scheduledAt (pas les deux)',
    path: ['slotId'],
  });

// ─── Inferred types ────────────────────────────────────────────────────────────
export type AddToPlanningInput = z.infer<typeof AddToPlanningSchema>;
export type PlanningQueryInput = z.infer<typeof PlanningQuerySchema>;
