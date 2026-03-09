import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { DashboardData, DateRange, UseSupabaseDashboardReturn, GameExecution, UniqueUser } from '@/types';

function getStartDate(dateRange: DateRange): string {
  const rangeMap: Record<DateRange, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
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

      const [{ data: execData, error: execError }, { data: userData, error: userError }] =
        await Promise.all([
          supabase
            .from('game_executions')
            .select('*')
            .gte('last_executed_at', since)
            .order('last_executed_at', { ascending: false }),
          supabase
            .from('unique_users')
            .select('*')
            .gte('last_seen', since)
            .order('last_seen', { ascending: false }),
        ]);

      if (execError) throw new Error(execError.message);
      if (userError) throw new Error(userError.message);

      const executions: GameExecution[] = execData ?? [];
      const users: UniqueUser[] = userData ?? [];

      setData({
        totalExecutions: executions.reduce((s, e) => s + e.count, 0),
        uniqueUsers: users.length,
        activePlaces: executions.length,
        lastExecutedAt: executions[0]?.last_executed_at ?? null,
        recentExecutions: executions.slice(0, 10),
        recentUsers: users.slice(0, 5),
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

  return { data, loading, error, refresh: fetchData };
}
