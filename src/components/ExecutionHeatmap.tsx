import { useMemo } from 'react';
import type { GameExecution } from '@/types';

interface Props {
  executions: GameExecution[];
  loading?: boolean;
}

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ExecutionHeatmap({ executions, loading = false }: Props) {
  const grid = useMemo(() => {
    const counts: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const e of executions) {
      const d = new Date(e.last_executed_at);
      counts[d.getDay()][d.getHours()] += e.count;
    }
    return counts;
  }, [executions]);

  const max = useMemo(() => Math.max(1, ...grid.flat()), [grid]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-40 bg-gray-800 rounded animate-pulse" />
        <div className="h-32 bg-gray-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-400 mb-3">Activity Heatmap</h4>
      <div className="overflow-x-auto">
        <div className="min-w-[360px]">
          <div className="flex gap-0.5 mb-1 pl-8">
            {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
              <div key={h} className="flex-1 text-[9px] text-gray-600 text-center">
                {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
              </div>
            ))}
          </div>
          {DAYS.map((day, di) => (
            <div key={day} className="flex items-center gap-0.5 mb-0.5">
              <span className="text-[9px] text-gray-600 w-7 shrink-0">{day}</span>
              {HOURS.map(hi => {
                const val = grid[di][hi];
                const intensity = val / max;
                const bg = intensity === 0
                  ? 'bg-gray-800'
                  : intensity < 0.25 ? 'bg-indigo-900'
                  : intensity < 0.5  ? 'bg-indigo-700'
                  : intensity < 0.75 ? 'bg-indigo-500'
                  : 'bg-indigo-400';
                return (
                  <div
                    key={hi}
                    title={`${day} ${hi}:00 — ${val.toLocaleString()} execs`}
                    className={`flex-1 aspect-square rounded-[2px] ${bg} transition-colors cursor-default`}
                  />
                );
              })}
            </div>
          ))}
          <div className="flex items-center gap-1.5 mt-2 justify-end">
            <span className="text-[9px] text-gray-600">Less</span>
            {['bg-gray-800', 'bg-indigo-900', 'bg-indigo-700', 'bg-indigo-500', 'bg-indigo-400'].map(c => (
              <div key={c} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />
            ))}
            <span className="text-[9px] text-gray-600">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
