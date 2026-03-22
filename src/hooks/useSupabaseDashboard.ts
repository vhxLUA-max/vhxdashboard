import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchSheetsSummary } from '@/lib/sheets';
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
        { data: all, error: e1 },
        sheetsSummary,
      ] = await Promise.all([
        supabase.from('game_executions').select('place_id,total_count:count,daily_count,daily_reset_at,last_executed_at,game_name').order('last_executed_at', { ascending: false }),
        fetchSheetsSummary(),
      ]);

      if (e1) throw new Error(e1.message);

      const allExecs: any[] = all ?? [];

      const totalExecutions = sheetsSummary?.total_executions ??
        (dateRange === '24h'
          ? allExecs.reduce((s: number, e: any) => s + (e.daily_reset_at?.slice(0, 10) === today ? (e.daily_count ?? 0) : 0), 0)
          : allExecs.reduce((s: number, e: any) => s + (e.total_count ?? e.count ?? 0), 0));

      const filteredExecs = allExecs.filter((e: any) => e.last_executed_at && e.last_executed_at >= since);

      setData({
        totalExecutions,
        uniqueUsers:      sheetsSummary?.unique_users ?? 0,
        activeGames:      filteredExecs.length,
        lastExecutedAt:   allExecs[0]?.last_executed_at ?? null,
        recentExecutions: filteredExecs,
        allExecutions:    allExecs,
        recentUsers:      [],
        newUsersToday:    0,
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
