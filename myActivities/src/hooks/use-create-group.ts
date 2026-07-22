import { useCallback, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import type { Conversation } from '@/types/message';

/** Crée une conversation de groupe (titre + membres amis choisis). */
export function useCreateGroup() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (title: string, memberIds: string[]): Promise<Conversation> => {
    setIsCreating(true);
    setError(null);
    try {
      return await api.post<Conversation>('/messages/groups', { title: title.trim(), memberIds });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Création impossible');
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { create, isCreating, error };
}
