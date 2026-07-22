import { z } from 'zod';

/** Corps d'envoi d'une demande d'ami (`POST /v1/friends/requests`) */
export const SendFriendRequestSchema = z.object({
  addresseeId: z.string().uuid(),
});

/** Query de recherche d'utilisateurs (`GET /v1/users/search?q=`) */
export const UserSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(60),
});

// ─── Inferred types ────────────────────────────────────────────────────────────
export type SendFriendRequestInput = z.infer<typeof SendFriendRequestSchema>;
export type UserSearchQueryInput = z.infer<typeof UserSearchQuerySchema>;
