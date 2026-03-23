import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

type GameStatus = {
  game_name: string;
  maintenance: boolean;
  maintenance_msg: string | null;
  end_timestamp: string | null;
  updated_at: string;
};

function getRemainingSeconds(endTs: string | null): number {
  if (!endTs) return -1;
  return Math.max(0, Math.floor((Date.parse(endTs) - Date.now()) / 1000));
}

function Countdown({ endTs }: { endTs: string | null }) {
  const [secs, setSecs] = useState(() => getRemainingSeconds(endTs));
  useEffect(() => {
    if (!endTs) return;
    const id = setInterval(() => setSecs(getRemainingSeconds(endTs)), 1000);
    return () => clearInterval(id);
  }, [endTs]);
  if (!endTs || secs < 0) return null;
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return <span className="font-mono text-xs">{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>;
}

const GAME_ORDER = ['Pixel Blade', 'Loot Hero', 'Survive Lava', 'Flick', 'UNC Tester'];

export function StatusPage() {
  const [statuses, setStatuses] = useState<GameStatus[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const load = async () => {
    const { data } = await supabase.from('game_status').select('game_name,maintenance,maintenance_msg,end_timestamp,updated_at');
    if (data) {
      setStatuses(data);
      setLastUpdated(new Date());
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('status-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_status' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const allUp = statuses.every(s => !s.maintenance);
  const anyDown = statuses.some(s => s.maintenance);

  const ordered = GAME_ORDER
    .map(name => statuses.find(s => s.game_name === name))
    .filter(Boolean) as GameStatus[];

  // Add any extra games not in the list
  for (const s of statuses) {
    if (!GAME_ORDER.includes(s.game_name)) ordered.push(s);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Overall status banner */}
      <div className="rounded-2xl p-5 flex items-center gap-4"
        style={{
          backgroundColor: allUp ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${allUp ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
        }}>
        {allUp
          ? <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
          : <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
        }
        <div>
          <p className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
            {allUp ? 'All systems operational' : 'Some scripts under maintenance'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Per-game status */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wide" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', backgroundColor: 'var(--color-surface)' }}>
          Scripts
        </div>
        {loading ? (
          <div className="flex justify-center py-8" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-accent)' }} />
          </div>
        ) : ordered.map((s, i) => (
          <div key={s.game_name}
            className="flex items-center gap-4 px-4 py-3.5"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderTop: i > 0 ? '1px solid var(--color-border)' : undefined,
            }}>
            {/* Status dot */}
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${!s.maintenance ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ boxShadow: !s.maintenance ? '0 0 6px #10b981' : '0 0 6px #f59e0b' }} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{s.game_name}</p>
              {s.maintenance && s.maintenance_msg && (
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-muted)' }}>{s.maintenance_msg}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {s.maintenance && s.end_timestamp && (
                <div className="flex items-center gap-1 text-amber-400">
                  <Clock className="w-3 h-3" />
                  <Countdown endTs={s.end_timestamp} />
                </div>
              )}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: !s.maintenance ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                  color: !s.maintenance ? '#10b981' : '#f59e0b',
                }}>
                {!s.maintenance ? 'Operational' : 'Maintenance'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px]" style={{ color: 'var(--color-muted)' }}>
        Updates automatically in real-time
      </p>
    </div>
  );
}
