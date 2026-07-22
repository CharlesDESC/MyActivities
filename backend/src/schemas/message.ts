import { z } from 'zod';

/** Corps d'envoi d'un message direct (REST `POST /v1/messages` ou event `message:send`) */
export const SendMessageSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
});

/** Corps d'envoi vers une conversation existante (direct ou groupe) */
export const SendToConversationSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
});

/** Payload de l'event `message:read` (marquer une conversation comme lue) */
export const MarkReadSchema = z.object({
  conversationId: z.string().uuid(),
});

/** Création d'un groupe : un titre + au moins un membre (amis du créateur) */
export const CreateGroupSchema = z.object({
  title: z.string().trim().min(1).max(80),
  memberIds: z.array(z.string().uuid()).min(1).max(50),
});

/** Renommage d'un groupe */
export const RenameGroupSchema = z.object({
  title: z.string().trim().min(1).max(80),
});

/** Ajout d'un membre à un groupe */
export const AddMemberSchema = z.object({
  userId: z.string().uuid(),
});

// ─── Inferred types ────────────────────────────────────────────────────────────
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type SendToConversationInput = z.infer<typeof SendToConversationSchema>;
export type MarkReadInput = z.infer<typeof MarkReadSchema>;
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type RenameGroupInput = z.infer<typeof RenameGroupSchema>;
export type AddMemberInput = z.infer<typeof AddMemberSchema>;
