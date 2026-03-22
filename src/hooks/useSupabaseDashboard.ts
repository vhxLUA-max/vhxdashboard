import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { DashboardData, DateRange, UseSupabaseDashboardReturn, GameExecution, UniqueUser } from '@/types';

const RANGE_MS: Record<DateRange, number> = {
  '24h': 86400000,
  '7d':  604800000,
  '30d': 2592000000,
  '90d': 7776000000,
};

export function useSupabaseDashboard(dateRange: DateRange): UseSupabaseDashboardReturn {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<Error | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const since   = new Date(Date.now() - RANGE_MS[dateRange]).toISOString();
      const since24 = new Date(Date.now() - 86400000).toISOString();
      const today   = new Date().toISOString().slice(0, 10);

      const [
        { data: all,      error: e1 },
        { data: active,   error: e2 },
        { data: newUsers, error: e3 },
      ] = await Promise.all([
        supabase.from('game_executions').select('place_id,count,daily_count,daily_reset_at,last_executed_at,game_name').order('last_executed_at', { ascending: false }),
        supabase.from('unique_users').select('roblox_user_id,user_id').gte('last_seen', since),
        supabase.from('unique_users').select('roblox_user_id').gte('first_seen', since24),
      ]);

      if (e1) throw new Error(e1.message);
      if (e2) throw new Error(e2.message);
      if (e3) throw new Error(e3.message);

      const allExecs: (GameExecution & { daily_count?: number; daily_reset_at?: string })[] = all ?? [];
      const activeUsers: Pick<UniqueUser, 'roblox_user_id' | 'user_id'>[] = active ?? [];

      // Always use game_executions.count as the source of truth
      // For 24h: sum daily_count where daily_reset_at is today
      // For all other ranges: sum total count across all games
      const totalExecutions = dateRange === '24h'
        ? allExecs.reduce((s, e) => s + (e.daily_reset_at?.slice(0, 10) === today ? (e.daily_count ?? 0) : 0), 0)
        : allExecs.reduce((s, e) => s + (e.count ?? 0), 0);

      // For date-filtered views (7d/30d/90d): only include rows active in range
      const filteredExecs = dateRange === '24h'
        ? allExecs.filter(e => e.last_executed_at && e.last_executed_at >= since)
        : allExecs.filter(e => e.last_executed_at && e.last_executed_at >= since);

      setData({
        totalExecutions,
        uniqueUsers:      new Set(activeUsers.map(u => u.roblox_user_id ?? u.user_id)).size,
        activeGames:      allExecs.filter(e => e.last_executed_at && e.last_executed_at >= since).length,
        lastExecutedAt:   allExecs[0]?.last_executed_at ?? null,
        recentExecutions: filteredExecs,
        allExecutions:    allExecs,
        recentUsers:      [],
        newUsersToday:    new Set((newUsers ?? []).map((u: { roblox_user_id: number }) => u.roblox_user_id)).size,
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError')
        setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' },    fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
