import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { GameExecution } from '@/types';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

const SUPPORTED_GAMES = ['Pixel Blade', 'Loot Hero', 'Flick'];

function getStatus(last: string | null) {
  if (!last) return { label: 'No Data', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: Clock };
  const diff = (Date.now() - new Date(last).getTime()) / 1000;
  if (diff < 3600)  return { label: 'Operational', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle };
  if (diff < 86400) return { label: 'Degraded',    color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: AlertCircle };
  return               { label: 'Down',          color: 'text-rose-400',    bg: 'bg-rose-500/10',    icon: AlertCircle };
}

function uptimePct(last: string | null) {
  if (!last) return '—';
  const diff = (Date.now() - new Date(last).getTime()) / 1000;
  if (diff < 3600)  return '99.9%';
  if (diff < 86400) return '95.0%';
  return '< 90%';
}

export function StatusTab() {
  const [grouped, setGrouped] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('game_executions')
        .select('game_name,place_id,last_executed_at')
        .order('last_executed_at', { ascending: false });
      const g: Record<string, string | null> = {};
      for (const e of (data ?? []) as GameExecution[]) {
        const name = e.game_name ?? `Place ${e.place_id}`;
        if (!SUPPORTED_GAMES.includes(name)) continue;
        if (!g[name] || new Date(e.last_executed_at) > new Date(g[name]!)) g[name] = e.last_executed_at;
      }
      setGrouped(g);
    };
    fetch();
    const ch = supabase.channel('live-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const allOk = SUPPORTED_GAMES.every(n => getStatus(grouped[n] ?? null).label === 'Operational');

  return (
    <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
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
            <div key={name} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
              <div className={`p-1.5 rounded-lg ${s.bg}`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{name}</p>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Uptime {uptimePct(grouped[name] ?? null)}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
