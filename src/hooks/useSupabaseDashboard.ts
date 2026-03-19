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

      const [
        { data: filtered, error: e1 },
        { data: all,       error: e2 },
        { data: active,    error: e3 },
        { data: newUsers,  error: e4 },
      ] = await Promise.all([
        supabase.from('game_executions').select('place_id,count,daily_count,last_executed_at,game_name').gte('last_executed_at', since).order('last_executed_at', { ascending: false }),
        supabase.from('game_executions').select('place_id,count,daily_count,last_executed_at,game_name').order('last_executed_at', { ascending: false }),
        supabase.from('unique_users').select('roblox_user_id,user_id').gte('last_seen', since),
        supabase.from('unique_users').select('roblox_user_id').gte('first_seen', since24),
      ]);

      if (e1) throw new Error(e1.message);
      if (e2) throw new Error(e2.message);
      if (e3) throw new Error(e3.message);
      if (e4) throw new Error(e4.message);

      const filteredExecs: GameExecution[] = filtered ?? [];
      const allExecs: GameExecution[]      = all ?? [];
      const activeUsers: Pick<UniqueUser, 'roblox_user_id' | 'user_id'>[] = active ?? [];

      const today = new Date().toISOString().slice(0, 10);
      const totalExecutions = dateRange === '24h'
        ? (allExecs as (GameExecution & { daily_count?: number; daily_reset_at?: string })[])
            .reduce((s, e) => s + ((e as { daily_reset_at?: string }).daily_reset_at?.slice(0, 10) === today ? ((e as { daily_count?: number }).daily_count ?? 0) : 0), 0)
        : filteredExecs.reduce((s, e) => s + e.count, 0);

      setData({
        totalExecutions,
        uniqueUsers:      new Set(activeUsers.map(u => u.roblox_user_id ?? u.user_id)).size,
        activeGames:      3,
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
