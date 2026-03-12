import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DashboardData, DateRange, UseSupabaseDashboardReturn, GameExecution, UniqueUser } from '@/types';

function getStartDate(dateRange: DateRange): string {
  const rangeMap: Record<DateRange, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d':  7  * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() - rangeMap[dateRange]).toISOString();
}

export function useSupabaseDashboard(dateRange: DateRange): UseSupabaseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const since = getStartDate(dateRange);

      const [
        { data: allExecData, error: execError },
        { data: userData,    error: userError },
      ] = await Promise.all([
        supabase
          .from('game_executions')
          .select('*')
          .order('last_executed_at', { ascending: false }),
        supabase
          .from('unique_users')
          .select('roblox_user_id, user_id')
          .gte('last_seen', since),
      ]);

      if (execError) throw new Error(execError.message);
      if (userError) throw new Error(userError.message);

      const allExecutions: GameExecution[] = allExecData ?? [];
      const activeUsers: Pick<UniqueUser, 'roblox_user_id' | 'user_id'>[] = userData ?? [];

      // All-time total — count is cumulative per game row
      const totalExecutions = allExecutions.reduce((s, e) => s + e.count, 0);

      // Unique users active in the selected date range
      const distinctUsers = new Set(activeUsers.map(u => u.roblox_user_id ?? u.user_id)).size;

      // Games that had any execution within the selected range
      const activeGames = new Set(
        allExecutions
          .filter(e => e.last_executed_at >= since)
          .map(e => e.place_id)
      ).size;

      const lastExecutedAt = allExecutions[0]?.last_executed_at ?? null;

      setData({
        totalExecutions,
        uniqueUsers: distinctUsers,
        activeGames: activeGames || allExecutions.length,
        lastExecutedAt,
        recentExecutions: allExecutions,
        recentUsers: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
