import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';
import type { UserSummary } from '@/types/friend';

const DEBOUNCE_MS = 300;

/**
 * Recherche d'utilisateurs par pseudo, avec anti-rebond (debounce) : la requête
 * ne part que 300 ms après la dernière frappe.
 */
export function useUserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get<{ data: UserSummary[] }>(`/users/search?q=${encodeURIComponent(trimmed)}`);
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(query), DEBOUNCE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, run]);

  return { query, setQuery, results, isSearching };
}
