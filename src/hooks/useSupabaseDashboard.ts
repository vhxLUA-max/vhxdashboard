import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { DashboardData, DateRange, UseSupabaseDashboardReturn, GameExecution, UniqueUser } from '@/types';

const RANGE_MS: Record<DateRange, number> = {
  '24h': 86400000,
  '7d':  604800000,
  '30d': 2592000000,
  '90d': 7776000000,
};

function getStartDate(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

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
      const since   = getStartDate(RANGE_MS[dateRange]);
      const since24 = getStartDate(86400000);

      const [
        { data: filteredExecData, error: e1 },
        { data: allExecData,      error: e2 },
        { data: userData,         error: e3 },
        { data: recentUsers,      error: e4 },
        { data: newUsersData,     error: e5 },
      ] = await Promise.all([
        supabase.from('game_executions').select('place_id,count,last_executed_at,game_name').gte('last_executed_at', since).order('last_executed_at', { ascending: false }),
        supabase.from('game_executions').select('place_id,count,last_executed_at,game_name').order('last_executed_at', { ascending: false }),
        supabase.from('unique_users').select('roblox_user_id,user_id').gte('last_seen', since),
        supabase.from('unique_users').select('execution_count').gte('last_seen', since24),
        supabase.from('unique_users').select('roblox_user_id').gte('first_seen', since24),
      ]);

      if (e1) throw new Error(e1.message);
      if (e2) throw new Error(e2.message);
      if (e3) throw new Error(e3.message);
      if (e4) throw new Error(e4.message);
      if (e5) throw new Error(e5.message);

      const filtered: GameExecution[] = filteredExecData ?? [];
      const all: GameExecution[]      = allExecData ?? [];
      const active: Pick<UniqueUser, 'roblox_user_id' | 'user_id'>[] = userData ?? [];

      const last24h       = (recentUsers ?? []).reduce((s: number, u: { execution_count: number }) => s + (u.execution_count ?? 0), 0);
      const totalExec     = dateRange === '24h' ? last24h : filtered.reduce((s, e) => s + e.count, 0);
      const distinctUsers = new Set(active.map(u => u.roblox_user_id ?? u.user_id)).size;

      const newUsersToday = new Set((newUsersData ?? []).map((u: { roblox_user_id: number }) => u.roblox_user_id)).size;

      setData({
        totalExecutions:  totalExec,
        uniqueUsers:      distinctUsers,
        activeGames:      new Set(filtered.map(e => e.place_id)).size || all.length,
        lastExecutedAt:   all[0]?.last_executed_at ?? null,
        recentExecutions: filtered,
        allExecutions:    all,
        recentUsers:      [],
        newUsersToday,
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
