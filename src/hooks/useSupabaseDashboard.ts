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

async function resolveGameNames(executions: GameExecution[]): Promise<GameExecution[]> {
  const missing = executions.filter(e => !e.game_name);
  if (missing.length === 0) return executions;

  try {
    const res = await fetch(
      `https://games.roblox.com/v1/games/multiget-place-details?${missing.map(e => `placeIds=${e.place_id}`).join('&')}`
    );
    if (!res.ok) throw new Error();

    const data: { placeId: number; name: string }[] = await res.json();
    const nameMap: Record<number, string> = {};
    for (const item of data) nameMap[item.placeId] = item.name;

    await Promise.allSettled(
      missing
        .filter(e => nameMap[e.place_id])
        .map(e =>
          supabase
            .from('game_executions')
            .update({ game_name: nameMap[e.place_id] })
            .eq('place_id', e.place_id)
        )
    );

    return executions.map(e => ({ ...e, game_name: nameMap[e.place_id] ?? e.game_name ?? null }));
  } catch {
    return executions;
  }
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

      const resolvedExecutions = await resolveGameNames(executions);

      const distinctUsers = new Set(users.map(u => u.roblox_user_id ?? u.user_id)).size;

      setData({
        totalExecutions: resolvedExecutions.reduce((s, e) => s + e.count, 0),
        uniqueUsers: distinctUsers,
        activePlaces: resolvedExecutions.length,
        lastExecutedAt: resolvedExecutions[0]?.last_executed_at ?? null,
        recentExecutions: resolvedExecutions.slice(0, 10),
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
