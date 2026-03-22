import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { DashboardData, DateRange, UseSupabaseDashboardReturn } from '@/types';

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
      const since = new Date(Date.now() - RANGE_MS[dateRange]).toISOString();
      const today = new Date().toISOString().slice(0, 10);

      const [
        { data: all,      error: e1 },
        { data: users },
        { data: newToday },
      ] = await Promise.all([
        supabase.from('game_executions').select('place_id,total_count:count,daily_count,daily_reset_at,last_executed_at,game_name').order('last_executed_at', { ascending: false }),
        supabase.from('unique_users').select('roblox_user_id').gte('last_seen', since),
        supabase.from('unique_users').select('roblox_user_id').gte('first_seen', new Date().toISOString().slice(0,10) + 'T00:00:00.000Z'),
      ]);

      if (e1) throw new Error(e1.message);

      const allExecs: any[] = all ?? [];

      // Total executions — sum unique_users.execution_count for accuracy
      const { data: execSum } = await supabase.from('unique_users').select('execution_count');
      const totalExecutions = dateRange === '24h'
        ? allExecs.reduce((s: number, e: any) => s + (e.daily_reset_at?.slice(0, 10) === today ? (e.daily_count ?? 0) : 0), 0)
        : (execSum ?? []).reduce((s: number, u: any) => s + (u.execution_count ?? 0), 0);

      const filteredExecs = allExecs.filter((e: any) => e.last_executed_at && e.last_executed_at >= since);

      setData({
        totalExecutions,
        uniqueUsers:    new Set((users ?? []).map((u: any) => u.roblox_user_id)).size,
        activeGames:    filteredExecs.length,
        lastExecutedAt: allExecs[0]?.last_executed_at ?? null,
        recentExecutions: filteredExecs,
        allExecutions:    allExecs,
        recentUsers:      [],
        newUsersToday:  new Set((newToday ?? []).map((u: any) => u.roblox_user_id)).size,
      });
    } catch (err) {
      const e = err as Error;
      // Ignore AbortError and lock errors — these are browser-level race conditions, not real failures
      if (e.name !== 'AbortError' && !e.message?.includes('Lock broken') && !e.message?.includes('steal')) {
        setError(e instanceof Error ? e : new Error('Unknown error'));
      }
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
