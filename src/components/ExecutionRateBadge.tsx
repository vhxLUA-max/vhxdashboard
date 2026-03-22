import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity } from 'lucide-react';

export function ExecutionRateBadge() {
  const [total, setTotal]   = useState<number | null>(null);
  const [delta, setDelta]   = useState<number>(0);
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('game_executions').select('total_count:count');
      if (!data) return;
      const sum = data.reduce((s: number, e: any) => s + (e.total_count ?? 0), 0);
      if (prevRef.current !== null) setDelta(sum - prevRef.current);
      prevRef.current = sum;
      setTotal(sum);
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    const ch = supabase.channel('exec-rate')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetch)
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(ch); };
  }, []);

  if (total === null) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
      style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)', color: '#10b981' }}>
      <Activity className="w-3 h-3" />
      {total.toLocaleString()}
      {delta > 0 && <span className="text-[10px] opacity-70">+{delta}</span>}
    </div>
  );
}
