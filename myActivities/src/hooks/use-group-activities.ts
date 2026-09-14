import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api, getApiErrorMessage } from '@/lib/api';
import { getRealtimeClient } from '@/lib/socket';
import type { Conversation } from '@/types/message';

export type GroupActivity = {
  id: string; name: string; available: boolean;
  addedBy: string | null; addedByPseudo: string | null; createdAt: string;
};
export type ActivityChoice = { id: string; name: string; address: string };
type Page<T> = { data: T[]; hasMore: boolean };

export function useGroupActivities(conversationId: string) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [activities, setActivities] = useState<GroupActivity[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const page = useRef(1);
  const revision = useRef(0);
  const mutating = useRef(false);
  const base = `/messages/groups/${conversationId}`;

  const refresh = useCallback(async () => {
    const current = ++revision.current;
    setLoading(true);
    try {
      const details = await api.get<Conversation>(`/messages/conversations/${conversationId}/details`);
      const result = details.type === 'group'
        ? await api.get<Page<GroupActivity>>(`${base}/activities?limit=20&page=1`)
        : { data: [], hasMore: false };
      if (current !== revision.current) return;
      setConversation(details);
      setActivities(result.data);
      setHasMore(result.hasMore);
      page.current = 1;
      setError(null);
    } catch (err) {
      if (current !== revision.current) return;
      setConversation(null);
      setActivities([]);
      setHasMore(false);
      setError(getApiErrorMessage(err, 'Impossible de charger les activités du groupe.'));
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, [base, conversationId]);

  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { revision.current++; };
  }, [refresh]));

  useEffect(() => {
    const client = getRealtimeClient();
    return client.on('conversation:updated', (event) => {
      if (event.conversationId === conversationId) void refresh();
    });
  }, [conversationId, refresh]);

  async function loadMore() {
    if (loading || !hasMore) return;
    const current = ++revision.current;
    setLoading(true);
    try {
      const result = await api.get<Page<GroupActivity>>(`${base}/activities?limit=20&page=${page.current + 1}`);
      if (current !== revision.current) return;
      setActivities((previous) => [...previous, ...result.data.filter((a) => !previous.some((p) => p.id === a.id))]);
      setHasMore(result.hasMore);
      page.current++;
      setError(null);
    } catch (err) {
      if (current === revision.current) setError(getApiErrorMessage(err, 'Chargement impossible.'));
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }

  async function change(activityId: string, remove = false) {
    if (mutating.current) return false;
    mutating.current = true;
    setBusy(true);
    setError(null);
    try {
      const path = `${base}/activities/${activityId}`;
      if (remove) await api.delete(path);
      else await api.post(path, {});
      await refresh();
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Modification impossible.'));
      return false;
    } finally {
      mutating.current = false;
      setBusy(false);
    }
  }

  const search = useCallback((query: string, nextPage = 1) =>
    api.get<Page<ActivityChoice>>(`${base}/activity-search?search=${encodeURIComponent(query.trim())}&limit=20&page=${nextPage}`), [base]);

  return { conversation, activities, hasMore, loading, busy, error, refresh, loadMore, change, search };
}
