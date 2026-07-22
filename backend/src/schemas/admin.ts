import { z } from 'zod';
import { PaginationQuerySchema } from './pagination';

export const ListUsersQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
  role: z.enum(['member', 'organizer', 'admin']).optional(),
  search: z.string().optional(),
});

export const PromoteRoleSchema = z.object({
  role: z.enum(['member', 'organizer', 'admin']),
});

export const SuspendUserSchema = z.object({
  reason: z.string().max(500),
  suspendUntil: z.string().datetime(),
});

export const DeleteUserAdminSchema = z.object({
  reason: z.string().max(500),
});

export const RejectActivitySchema = z.object({
  reason: z.string().max(500),
});

// ─── Inferred types ────────────────────────────────────────────────────────────
export type SuspendUserInput = z.infer<typeof SuspendUserSchema>;
export type DeleteUserAdminInput = z.infer<typeof DeleteUserAdminSchema>;
export type RejectActivityInput = z.infer<typeof RejectActivitySchema>;
export type ListUsersQueryInput = z.infer<typeof ListUsersQuerySchema>;
export type PromoteRoleInput = z.infer<typeof PromoteRoleSchema>;
