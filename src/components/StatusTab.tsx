import type { GameExecution } from '@/types';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface Props { executions: GameExecution[]; }

const SUPPORTED_GAMES = ['Pixel Blade', 'Loot Hero', 'Flick'];

function getStatus(last: string | null): { label: string; color: string; bg: string; icon: React.ElementType } {
  if (!last) return { label: 'No Data', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: Clock };
  const diff = (Date.now() - new Date(last).getTime()) / 1000;
  if (diff < 3600) return { label: 'Operational', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle };
  if (diff < 86400) return { label: 'Degraded', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: AlertCircle };
  return { label: 'Down', color: 'text-rose-400', bg: 'bg-rose-500/10', icon: AlertCircle };
}

function uptimePct(last: string | null) {
  if (!last) return '—';
  const diff = (Date.now() - new Date(last).getTime()) / 1000;
  if (diff < 3600) return '99.9%';
  if (diff < 86400) return '95.0%';
  return '< 90%';
}

export function StatusTab({ executions }: Props) {
  const grouped: Record<string, string | null> = {};
  for (const e of executions) {
    const name = e.game_name ?? `Place ${e.place_id}`;
    if (!SUPPORTED_GAMES.includes(name)) continue;
    if (!grouped[name] || new Date(e.last_executed_at) > new Date(grouped[name]!)) {
      grouped[name] = e.last_executed_at;
    }
  }

  const allOk = SUPPORTED_GAMES.every(n => {
    const s = getStatus(grouped[n] ?? null);
    return s.label === 'Operational';
  });

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${allOk ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
        <span className={`w-2 h-2 rounded-full animate-pulse ${allOk ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        <span className={`text-sm font-medium ${allOk ? 'text-emerald-400' : 'text-amber-400'}`}>
          {allOk ? 'All systems operational' : 'Some systems degraded'}
        </span>
      </div>

      <div className="space-y-2">
        {SUPPORTED_GAMES.map(name => {
          const s = getStatus(grouped[name] ?? null);
          const Icon = s.icon;
          return (
            <div key={name} className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg border border-gray-800">
              <div className={`p-1.5 rounded-lg ${s.bg}`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{name}</p>
                <p className="text-xs text-gray-500">Uptime {uptimePct(grouped[name] ?? null)}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
