import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RecentActivityList } from './RecentActivityList';

export function LiveRecentActivity() {
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('game_execution_totals')
        .select('game_name,total_count,last_executed_at');
      setExecutions((data ?? []).map((e: any) => ({
        game_name:        e.game_name,
        count:            e.total_count ?? 0,
        last_executed_at: e.last_executed_at,
        place_id:         0,
      })));
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
