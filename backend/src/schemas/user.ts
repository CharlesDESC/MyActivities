import { z } from 'zod';

export const UpdateUserSchema = z.object({
  pseudo: z.string().min(3).max(30).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const DeleteAccountSchema = z.object({
  password: z.string().min(1),
});

// ─── Inferred types ────────────────────────────────────────────────────────────
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
