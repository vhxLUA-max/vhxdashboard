import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Terminal, Gamepad2, Users, Ban, Key, Trash2,
  Megaphone, ScrollText, Shield, RefreshCw, Trophy, AlertTriangle,
} from 'lucide-react';

type EntryType =
  | 'execution' | 'new_user' | 'ban' | 'unban'
  | 'token' | 'fpban' | 'fpunban' | 'changelog'
  | 'announcement' | 'milestone' | 'suspicious' | 'system';

interface Entry {
  id: string;
  time: string;
  type: EntryType;
  msg: string;
}

const CFG: Record<EntryType, { color: string; bg: string; label: string; Icon: React.ElementType }> = {
  execution:    { color: '#818cf8', bg: 'rgba(99,102,241,0.10)',   label: 'EXEC',     Icon: Gamepad2      },
  new_user:     { color: '#34d399', bg: 'rgba(16,185,129,0.10)',   label: 'USER',     Icon: Users         },
  ban:          { color: '#f87171', bg: 'rgba(239,68,68,0.10)',    label: 'BAN',      Icon: Ban           },
  unban:        { color: '#34d399', bg: 'rgba(16,185,129,0.10)',   label: 'UNBAN',    Icon: RefreshCw     },
  token:        { color: '#fbbf24', bg: 'rgba(245,158,11,0.10)',   label: 'TOKEN',    Icon: Key           },
  fpban:        { color: '#fb7185', bg: 'rgba(251,113,133,0.10)', label: 'FPBAN',    Icon: Shield        },
  fpunban:      { color: '#a3e635', bg: 'rgba(163,230,53,0.10)',  label: 'FPUNBAN',  Icon: Shield        },
  changelog:    { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)',  label: 'CHANGE',   Icon: ScrollText    },
  announcement: { color: '#c084fc', bg: 'rgba(192,132,252,0.10)', label: 'ANNOUNCE', Icon: Megaphone     },
  milestone:    { color: '#ffd700', bg: 'rgba(255,215,0,0.10)',   label: 'MILESTONE',Icon: Trophy        },
  suspicious:   { color: '#fb923c', bg: 'rgba(251,146,60,0.10)',  label: 'ALERT',    Icon: AlertTriangle },
  system:       { color: '#6b7280', bg: 'rgba(107,114,128,0.10)', label: 'SYS',      Icon: Terminal      },
};

const FILTERS: (EntryType | 'all')[] = [
  'all', 'execution', 'new_user', 'ban', 'unban',
  'fpban', 'token', 'changelog', 'announcement', 'milestone', 'suspicious', 'system',
];

const toEntry = (r: any): Entry => ({
  id:   r.id,
  time: r.created_at,
  type: (r.type as EntryType) in CFG ? (r.type as EntryType) : 'system',
  msg:  r.msg ?? '',
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const PLACE_NAMES: Record<number, string> = {
  18172550962: 'Pixel Blade', 18172553902: 'Pixel Blade',
  133884972346775: 'Pixel Blade', 138013005633222: 'Loot Hero',
  77439980360504: 'Loot Hero', 119987266683883: 'Survive Lava',
  136801880565837: 'Flick', 123974602339071: 'UNC Tester',
};

const resolveGame = (r: any) => r.game_name || PLACE_NAMES[r.place_id] || `Place ${r.place_id}`;

const writeLog = (type: string, msg: string) =>
  supabase.from('console_logs').insert({ level: 'INFO', type, msg }).then(() => {}).catch(() => {});

export function ActivityConsole() {
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [filter,  setFilter]    = useState<EntryType | 'all'>('all');
  const [paused,  setPaused]    = useState(false);
  const [loading, setLoading]   = useState(true);
  const pausedRef               = useRef(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const seenRef                 = useRef(new Set<string>());

  pausedRef.current = paused;

  const push = useCallback((e: Entry) => {
    if (pausedRef.current || seenRef.current.has(e.id)) return;
    seenRef.current.add(e.id);
    setEntries(prev => [...prev.slice(-499), e]);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from('console_logs')
        .select('id, created_at, type, msg')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!mounted) return;

      if (error) {
        push({ id: crypto.randomUUID(), time: new Date().toISOString(), type: 'system', msg: `Failed to load history: ${error.message}` });
      } else if (data) {
        const mapped = data.map(toEntry).reverse();
        mapped.forEach(e => seenRef.current.add(e.id));
        setEntries(mapped);
      }
      setLoading(false);
    })();

    const ch = supabase.channel('console-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'console_logs' },
        ({ new: n }: any) => push(toEntry(n)))
      .subscribe((status) => {
        if (!mounted) return;
        if (status === 'SUBSCRIBED')
          push({ id: crypto.randomUUID(), time: new Date().toISOString(), type: 'system', msg: 'Realtime connected' });
        if (status === 'CHANNEL_ERROR')
          push({ id: crypto.randomUUID(), time: new Date().toISOString(), type: 'system', msg: 'Realtime error — run ALTER PUBLICATION supabase_realtime ADD TABLE console_logs in Supabase SQL' });
      });

    const watchCh = supabase.channel('console-watchers')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'unique_users' }, ({ new: n }: any) => {
        writeLog('execution', `@${n.username} executed ${resolveGame(n)} (${n.execution_count?.toLocaleString()} total)`);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'unique_users' }, ({ new: n }: any) => {
        writeLog('new_user', `@${n.username} joined via ${resolveGame(n)}`);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'banned_users' }, ({ new: n }: any) => {
        writeLog('ban', `@${n.username} banned — ${n.reason ?? 'no reason'}`);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'banned_users' }, ({ old: n }: any) => {
        writeLog('unban', `@${n.username ?? 'user'} unbanned`);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fingerprint_bans' }, ({ new: n }: any) => {
        writeLog('fpban', `@${n.username} device banned — ${n.reason ?? 'no reason'}`);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'fingerprint_bans' }, ({ old: n }: any) => {
        writeLog('fpunban', `@${n.username ?? 'user'} device ban removed`);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_tokens' }, ({ new: n }: any) => {
        writeLog('token', `@${n.roblox_username} generated token ${n.token}`);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'changelog' }, ({ new: n }: any) => {
        writeLog('changelog', `[${n.type?.toUpperCase()}] ${n.game} — ${n.title}`);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, ({ new: n }: any) => {
        writeLog('announcement', `New announcement [${n.type}] — ${n.message}`);
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
      supabase.removeChannel(watchCh);
    };
  }, [push]);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, paused]);

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);

  return (
    <div className="rounded-xl border overflow-hidden flex flex-col" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
        <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Live Console</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-[10px] font-bold text-emerald-400">{filtered.length} events</span>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            onClick={() => setPaused(p => !p)}
            className="text-[10px] px-2.5 py-1 rounded-md font-medium border transition-colors"
            style={{
              borderColor: 'var(--color-border)',
              color: paused ? '#f59e0b' : 'var(--color-muted)',
              backgroundColor: paused ? 'rgba(245,158,11,0.1)' : 'transparent',
            }}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            onClick={() => { setEntries([]); seenRef.current.clear(); }}
            className="p-1.5 rounded-md border transition-colors hover:text-rose-400"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
            title="Clear console">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="flex gap-1 px-3 py-2 border-b shrink-0"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface2)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as React.CSSProperties}>
        {FILTERS.map(f => {
          const c   = f === 'all' ? null : CFG[f as EntryType];
          const active = filter === f;
          const count  = f === 'all' ? entries.length : entries.filter(e => e.type === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="shrink-0 flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded transition-all"
              style={{
                color:           active ? (c?.color ?? '#e5e7eb') : 'var(--color-muted)',
                backgroundColor: active ? (c?.bg ?? 'rgba(255,255,255,0.08)') : 'transparent',
                border:          `1px solid ${active ? (c?.color ?? '#e5e7eb') + '50' : 'transparent'}`,
              }}>
              {f === 'all' ? 'ALL' : c?.label}
              <span className="opacity-60 font-normal">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Log output */}
      <div className="h-[440px] overflow-y-auto font-mono text-xs" style={{ backgroundColor: '#08080d' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            <span style={{ color: '#374151' }}>Loading logs...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Terminal className="w-6 h-6" style={{ color: '#1f2937' }} />
            <span style={{ color: '#374151' }}>{filter === 'all' ? 'No events yet' : `No ${filter} events`}</span>
          </div>
        ) : (
          <div className="p-2 space-y-px">
            {filtered.map((e, i) => {
              const c    = CFG[e.type] ?? CFG.system;
              const Icon = c.Icon;
              const isLatest = i === filtered.length - 1;
              return (
                <div
                  key={e.id}
                  className="group flex items-start gap-3 px-3 py-2 rounded-md transition-colors hover:bg-white/[0.04]"
                  style={{ backgroundColor: isLatest ? c.bg : 'transparent' }}>
                  <span className="shrink-0 tabular-nums mt-px" style={{ color: '#374151', fontSize: 10 }}>
                    {fmt(e.time)}
                  </span>
                  <span
                    className="text-[9px] font-bold rounded shrink-0 tabular-nums mt-px"
                    style={{
                      color:           c.color,
                      backgroundColor: c.bg,
                      padding:         '1px 5px',
                      minWidth:        54,
                      textAlign:       'center',
                      display:         'inline-block',
                    }}>
                    {c.label}
                  </span>
                  <Icon className="w-3 h-3 shrink-0 mt-px" style={{ color: c.color }} />
                  <span className="min-w-0 break-words leading-relaxed" style={{ color: c.color }}>
                    {e.msg}
                  </span>
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
