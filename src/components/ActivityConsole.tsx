import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Terminal, Gamepad2, Users, Ban, Key, Trash2, Megaphone, ScrollText, Shield, RefreshCw, Trophy, AlertTriangle } from 'lucide-react';

type EntryType = 'execution' | 'new_user' | 'ban' | 'unban' | 'token' | 'fpban' | 'fpunban' | 'changelog' | 'announcement' | 'milestone' | 'suspicious' | 'system';

type Entry = { id?: string; time: string; type: EntryType; msg: string };

const TYPE_CONFIG: Record<EntryType, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  execution:    { color: '#818cf8', bg: 'rgba(99,102,241,0.08)',   label: 'EXEC',     icon: Gamepad2      },
  new_user:     { color: '#34d399', bg: 'rgba(16,185,129,0.08)',   label: 'USER',     icon: Users         },
  ban:          { color: '#f87171', bg: 'rgba(239,68,68,0.08)',    label: 'BAN',      icon: Ban           },
  unban:        { color: '#34d399', bg: 'rgba(16,185,129,0.08)',   label: 'UNBAN',    icon: RefreshCw     },
  token:        { color: '#fbbf24', bg: 'rgba(245,158,11,0.08)',   label: 'TOKEN',    icon: Key           },
  fpban:        { color: '#fb7185', bg: 'rgba(251,113,133,0.08)', label: 'FPBAN',    icon: Shield        },
  fpunban:      { color: '#a3e635', bg: 'rgba(163,230,53,0.08)',  label: 'FPUNBAN',  icon: Shield        },
  changelog:    { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  label: 'CHANGE',   icon: ScrollText    },
  announcement: { color: '#c084fc', bg: 'rgba(192,132,252,0.08)', label: 'ANNOUNCE', icon: Megaphone     },
  milestone:    { color: '#ffd700', bg: 'rgba(255,215,0,0.08)',   label: 'MILESTONE',icon: Trophy        },
  suspicious:   { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  label: 'ALERT',    icon: AlertTriangle },
  system:       { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: 'SYS',      icon: Terminal      },
};

const FILTER_TYPES: (EntryType | 'all')[] = ['all', 'execution', 'new_user', 'ban', 'unban', 'fpban', 'token', 'changelog', 'announcement', 'milestone', 'suspicious', 'system'];

export function ActivityConsole() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [paused, setPaused]   = useState(false);
  const [filter, setFilter]   = useState<EntryType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const bottomRef             = useRef<HTMLDivElement>(null);
  const pausedRef             = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('console_logs')
        .select('id, created_at, type, msg, level')
        .order('created_at', { ascending: false })
        .limit(200);
      if (data) {
        setEntries(data.map((r: any) => ({
          id: r.id,
          time: r.created_at,
          type: (r.type as EntryType) || 'system',
          msg: r.msg,
        })).reverse());
      }
      setLoading(false);
    };
    load();

    const ch = supabase.channel('console-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'console_logs' }, ({ new: n }: any) => {
        if (pausedRef.current) return;
        setEntries(prev => [...prev.slice(-499), {
          id: n.id,
          time: n.created_at,
          type: (n.type as EntryType) || 'system',
          msg: n.msg,
        }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, paused]);

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
        <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Live Console</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-bold text-emerald-400">{filtered.length} events</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setPaused(p => !p)}
            className="text-[10px] px-2.5 py-1 rounded-md font-medium border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: paused ? '#f59e0b' : 'var(--color-muted)', backgroundColor: paused ? 'rgba(245,158,11,0.1)' : 'transparent' }}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button onClick={() => setEntries([])} className="p-1.5 rounded-md border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }} title="Clear view">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto scrollbar-hide" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)', WebkitOverflowScrolling: 'touch' as any }}>
        {FILTER_TYPES.map(f => {
          const c = f === 'all' ? null : TYPE_CONFIG[f as EntryType];
          const active = filter === f;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className="text-[9px] font-bold px-2 py-0.5 rounded shrink-0 transition-all"
              style={{
                color: active ? (c?.color ?? '#fff') : 'var(--color-muted)',
                backgroundColor: active ? (c?.bg ?? 'rgba(255,255,255,0.08)') : 'transparent',
                border: `1px solid ${active ? (c?.color ?? '#fff') + '40' : 'transparent'}`,
              }}>
              {f === 'all' ? 'ALL' : c?.label}
            </button>
          );
        })}
      </div>

      <div className="h-96 overflow-y-auto font-mono text-xs" style={{ backgroundColor: '#0a0a0f' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: '#374151' }}>Loading logs...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: '#374151' }}>No events yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {filtered.map((e, i) => {
              const c = TYPE_CONFIG[e.type] ?? TYPE_CONFIG.system;
              const Icon = c.icon;
              return (
                <div key={e.id ?? i} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors"
                  style={{ backgroundColor: i === filtered.length - 1 ? c.bg : 'transparent' }}>
                  <span className="shrink-0 tabular-nums" style={{ color: '#4b5563' }}>{fmt(e.time)}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: c.color, backgroundColor: c.bg, minWidth: 52, textAlign: 'center' }}>
                    {c.label}
                  </span>
                  <Icon className="w-3 h-3 shrink-0" style={{ color: c.color }} />
                  <span className="truncate" style={{ color: c.color }}>{e.msg}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
