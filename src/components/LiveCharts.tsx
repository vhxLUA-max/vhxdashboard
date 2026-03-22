import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DateRange } from '@/types';
import { ExecutionsChart } from './ExecutionsChart';
import { GameBreakdownChart } from './GameBreakdownChart';

export function LiveCharts({ dateRange }: { dateRange: DateRange }) {
  const [all, setAll]       = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const since = new Date(Date.now() - ({ '24h': 86400000, '7d': 604800000, '30d': 2592000000, '90d': 7776000000 }[dateRange])).toISOString();
      const [{ data: allData }, { data: recentData }] = await Promise.all([
        supabase.from('game_executions').select('place_id,count,daily_count,last_executed_at,game_name').order('last_executed_at', { ascending: false }),
        supabase.from('game_executions').select('place_id,count,daily_count,last_executed_at,game_name').gte('last_executed_at', since).order('last_executed_at', { ascending: false }),
      ]);
      setAll((allData ?? []).map((e: any) => ({ ...e, count: e.count ?? e.daily_count ?? 0 })));
      setRecent((recentData ?? []).map((e: any) => ({ ...e, count: e.count ?? e.daily_count ?? 0 })));
      setLoading(false);
    };
    fetch();
    const ch = supabase.channel('live-charts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [dateRange]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 rounded-xl border p-6"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <ExecutionsChart executions={all} dateRange={dateRange} loading={loading} />
      <GameBreakdownChart executions={recent} loading={loading} />
    </div>
  );
}
