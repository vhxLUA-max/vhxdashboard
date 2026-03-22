import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { GameExecution } from '@/types';
import { RecentActivityList } from './RecentActivityList';

export function LiveRecentActivity() {
  const [executions, setExecutions] = useState<GameExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('game_executions')
        .select('place_id,count,daily_count,last_executed_at,game_name')
        .order('last_executed_at', { ascending: false });
      setExecutions((data ?? []).map((e: any) => ({ ...e, count: e.daily_count ?? e.count ?? 0 })));
      setLoading(false);
    };
    fetch();
    const ch = supabase.channel('live-recent')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return <RecentActivityList executions={executions} loading={loading} />;
}
