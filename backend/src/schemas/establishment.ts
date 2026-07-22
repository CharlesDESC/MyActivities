import { z } from 'zod';

const establishmentFields = z.object({
  name: z.string().min(2).max(100),
  // L'adresse et les coordonnées sont résolues côté serveur avec `permanent=true`.
  mapboxId: z.string().min(1).max(255),
  phone: z.string().max(30).nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
});

export const CreateEstablishmentSchema = establishmentFields;

export const UpdateEstablishmentSchema = establishmentFields.partial()
  .refine(
    (d) => Object.keys(d).length > 0,
    { message: 'Aucun champ à mettre à jour' },
  );

export const AddressSearchQuerySchema = z.object({
  q: z.string().trim().min(3).max(256),
});

// ─── Inferred types ────────────────────────────────────────────────────────────
export type CreateEstablishmentInput = z.infer<typeof CreateEstablishmentSchema>;
export type UpdateEstablishmentInput = z.infer<typeof UpdateEstablishmentSchema>;
