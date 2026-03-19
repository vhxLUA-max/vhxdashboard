import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap } from 'lucide-react';

export function ExecutionRateBadge() {
  const [rate, setRate] = useState<number>(0);
  const prevCount = useRef<number | null>(null);
  const prevTime = useRef<number>(Date.now());

  useEffect(() => {
    const getTotal = async () => {
      const { data } = await supabase.from('game_executions').select('count');
      return data ? data.reduce((s: number, e: { count: number }) => s + e.count, 0) : 0;
    };

    getTotal().then(total => { prevCount.current = total; });

    const ch = supabase.channel('exec-rate')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, async () => {
        const now = Date.now();
        const total = await getTotal();
        if (prevCount.current !== null) {
          const delta = total - prevCount.current;
          const elapsed = (now - prevTime.current) / 60000;
          if (elapsed > 0) setRate(Math.round(delta / elapsed));
        }
        prevCount.current = total;
        prevTime.current = now;
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg">
      <Zap className="w-3.5 h-3.5 text-violet-400" />
      <span className="text-xs font-medium text-violet-400">{rate}/min</span>
    </div>
  );
}
