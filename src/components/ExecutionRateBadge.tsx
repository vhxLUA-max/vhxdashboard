import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Zap } from 'lucide-react';

export function ExecutionRateBadge() {
  const [rate, setRate] = useState<number | null>(null);
  const history         = useRef<{ count: number; time: number }[]>([]);
  const WINDOW_MS       = 5 * 60 * 1000;

  const getTotal = async () => {
    const { data } = await supabase.from('game_executions').select('count');
    return data?.reduce((s: number, e: { count: number }) => s + (e.count ?? 0), 0) ?? 0;
  };

  const recalcRate = (currentCount: number) => {
    const now  = Date.now();
    const snap = { count: currentCount, time: now };
    history.current.push(snap);

    history.current = history.current.filter(h => now - h.time <= WINDOW_MS);
    if (history.current.length < 2) return;
    const oldest  = history.current[0];
    const elapsed = (now - oldest.time) / 60000;
    if (elapsed > 0) setRate(Math.round((currentCount - oldest.count) / elapsed));
  };

  useEffect(() => {

    getTotal().then(t => { history.current = [{ count: t, time: Date.now() }]; setRate(0); });


    const poll = setInterval(async () => {
      const t = await getTotal();
      recalcRate(t);
    }, 10000);


    const ch = supabase.channel('exec-rate')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, async () => {
        const t = await getTotal();
        recalcRate(t);
      })
      .subscribe();

    return () => { clearInterval(poll); supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--color-accent) 25%, transparent)' }}>
      <Zap className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
      <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
        {rate === null ? '...' : `${rate}/min`}
      </span>
    </div>
  );
}
