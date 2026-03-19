import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Star, MessageSquare } from 'lucide-react';

type RatingStats = {
  average: number;
  total: number;
  distribution: Record<number, number>;
};

export function RatingsPanel() {
  const [stats, setStats] = useState<RatingStats | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('feedback')
        .select('rating')
        .not('rating', 'is', null);

      if (!data || data.length === 0) return;

      const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      for (const row of data) {
        dist[row.rating] = (dist[row.rating] ?? 0) + 1;
        sum += row.rating;
      }

      setStats({ average: sum / data.length, total: data.length, distribution: dist });
    };
    fetch();
  }, []);

  if (!stats) return null;

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
        <Star className="w-4 h-4 text-amber-400" />
        User Ratings
      </h3>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-4xl font-bold text-amber-400">{stats.average.toFixed(1)}</p>
          <div className="flex gap-0.5 mt-1 justify-center">
            {[1,2,3,4,5].map(n => (
              <Star key={n} className="w-3.5 h-3.5"
                fill={n <= Math.round(stats.average) ? '#f59e0b' : 'none'}
                style={{ color: n <= Math.round(stats.average) ? '#f59e0b' : 'var(--color-border)' }} />
            ))}
          </div>
          <p className="text-[10px] mt-1 flex items-center gap-1 justify-center" style={{ color: 'var(--color-muted)' }}>
            <MessageSquare className="w-3 h-3" /> {stats.total} ratings
          </p>
        </div>

        <div className="flex-1 space-y-1.5">
          {[5,4,3,2,1].map(n => {
            const count = stats.distribution[n] ?? 0;
            const pct   = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-2">
                <span className="text-[10px] w-2 text-right" style={{ color: 'var(--color-muted)' }}>{n}</span>
                <Star className="w-3 h-3 text-amber-400 shrink-0" fill="#f59e0b" />
                <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: 'var(--color-surface2)' }}>
                  <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] w-4 text-right" style={{ color: 'var(--color-muted)' }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
