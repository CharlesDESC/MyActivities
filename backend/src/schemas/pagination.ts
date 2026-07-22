import { z } from 'zod';

/** Query params de pagination communs — paramètres Swagger `page` / `limit` */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQueryInput = z.infer<typeof PaginationQuerySchema>;
