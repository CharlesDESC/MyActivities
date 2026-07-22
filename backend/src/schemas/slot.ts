import { z } from 'zod';

export const SlotsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const CreateSlotsSchema = z.object({
  slots: z
    .array(
      z.object({
        startsAt: z.string().datetime().refine(
          (v) => new Date(v) > new Date(),
          { message: 'Le créneau ne peut pas être dans le passé' },
        ),
        endsAt: z.string().datetime().nullable().optional(),
        capacity: z.number().int().min(1).max(10000),
      }),
    )
    .min(1)
    .max(100),
});

export type SlotsQueryInput = z.infer<typeof SlotsQuerySchema>;
export type CreateSlotsInput = z.infer<typeof CreateSlotsSchema>;
