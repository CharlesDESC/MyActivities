import { z } from 'zod';

const establishmentFields = z.object({
  name: z.string().min(2).max(100),
  // L'identifiant et le libellé sont revérifiés côté serveur auprès de l'IGN.
  addressId: z.string().min(1).max(255),
  address: z.string().trim().min(3).max(500),
  phone: z.string().max(30).nullable().optional(),
  websiteUrl: z.string().url().nullable().optional(),
});

export const CreateEstablishmentSchema = establishmentFields;

export const UpdateEstablishmentSchema = establishmentFields.partial()
  .superRefine((data, context) => {
    if ((data.addressId === undefined) !== (data.address === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "L'identifiant et le libellé de l'adresse doivent être fournis ensemble",
        path: ['address'],
      });
    }
  })
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
