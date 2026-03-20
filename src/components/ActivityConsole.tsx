import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Terminal, Gamepad2, Users, Ban, Key, Trash2, Megaphone, ScrollText, Shield, RefreshCw, Trophy, AlertTriangle } from 'lucide-react';

type EntryType = 'execution' | 'new_user' | 'ban' | 'unban' | 'token' | 'fpban' | 'fpunban' | 'changelog' | 'announcement' | 'milestone' | 'suspicious' | 'system';

type Entry = { time: string; type: EntryType; msg: string };

const TYPE_CONFIG: Record<EntryType, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  execution:    { color: '#818cf8', bg: 'rgba(99,102,241,0.08)',   label: 'EXEC',    icon: Gamepad2     },
  new_user:     { color: '#34d399', bg: 'rgba(16,185,129,0.08)',   label: 'USER',    icon: Users        },
  ban:          { color: '#f87171', bg: 'rgba(239,68,68,0.08)',    label: 'BAN',     icon: Ban          },
  unban:        { color: '#34d399', bg: 'rgba(16,185,129,0.08)',   label: 'UNBAN',   icon: RefreshCw    },
  token:        { color: '#fbbf24', bg: 'rgba(245,158,11,0.08)',   label: 'TOKEN',   icon: Key          },
  fpban:        { color: '#fb7185', bg: 'rgba(251,113,133,0.08)',  label: 'FPBAN',   icon: Shield       },
  fpunban:      { color: '#a3e635', bg: 'rgba(163,230,53,0.08)',   label: 'FPUNBAN', icon: Shield       },
  changelog:    { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',   label: 'CHANGE',  icon: ScrollText   },
  announcement: { color: '#c084fc', bg: 'rgba(192,132,252,0.08)', label: 'ANNOUNCE',icon: Megaphone    },
  milestone:    { color: '#ffd700', bg: 'rgba(255,215,0,0.08)',    label: 'MILESTONE',icon: Trophy      },
  suspicious:   { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',   label: 'ALERT',   icon: AlertTriangle},
  system:       { color: '#6b7280', bg: 'rgba(107,114,128,0.08)',  label: 'SYS',     icon: Terminal     },
};

const MILESTONES = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000];

export function ActivityConsole() {
  const [entries, setEntries]   = useState<Entry[]>([]);
  const [paused, setPaused]     = useState(false);
  const [filter, setFilter]     = useState<EntryType | 'all'>('all');
  const bottomRef               = useRef<HTMLDivElement>(null);
  const pausedRef               = useRef(false);
  const lastCountRef            = useRef(0);
  const hitMilestonesRef        = useRef(new Set<number>());

  pausedRef.current = paused;

  useEffect(() => {
    const add = (e: Entry) => {
      if (pausedRef.current) return;
      setEntries(prev => [...prev.slice(-499), e]);
    };

    const checkMilestone = (count: number) => {
      for (const m of MILESTONES) {
        if (count >= m && !hitMilestonesRef.current.has(m)) {
          hitMilestonesRef.current.add(m);
          add({ time: new Date().toISOString(), type: 'milestone', msg: `🎉 ${m.toLocaleString()} total executions reached!` });
        }
      }
    };

    const execCh = supabase.channel('console-execs')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_executions' }, ({ new: n }: any) => {
        add({ time: new Date().toISOString(), type: 'execution', msg: `${n.game_name ?? `Place ${n.place_id}`} — ${n.count?.toLocaleString()} total execs` });
        if (n.count > 200 && n.count > 0) {
          const rate = n.count - lastCountRef.current;
          if (rate > 100) add({ time: new Date().toISOString(), type: 'suspicious', msg: `High execution spike — ${rate} execs in last cycle on ${n.game_name ?? `Place ${n.place_id}`}` });
        }
        lastCountRef.current = n.count;
      }).subscribe((status) => {
        add({ time: new Date().toISOString(), type: 'system', msg: status === 'SUBSCRIBED' ? 'Realtime connected — all events live' : `Channel status: ${status}` });
      });

    const userCh = supabase.channel('console-users')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'unique_users' }, ({ new: n }: any) => {
        add({ time: new Date().toISOString(), type: 'new_user', msg: `@${n.username} — new user in ${n.game_name ?? `Place ${n.place_id}`}` });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'unique_users' }, ({ new: n, old: o }: any) => {
        if (n.execution_count && o.execution_count && n.execution_count > o.execution_count + 50)
          add({ time: new Date().toISOString(), type: 'suspicious', msg: `@${n.username} — unusual exec spike: ${n.execution_count?.toLocaleString()} total in ${n.game_name ?? `Place ${n.place_id}`}` });
      })
      .subscribe();

    const banCh = supabase.channel('console-bans')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'banned_users' }, ({ new: n }: any) => {
        add({ time: new Date().toISOString(), type: 'ban', msg: `@${n.username} banned — ${n.reason ?? 'no reason'}` });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'banned_users' }, ({ old: n }: any) => {
        add({ time: new Date().toISOString(), type: 'unban', msg: `@${n.username ?? 'user'} unbanned` });
      })
      .subscribe();

    const fpCh = supabase.channel('console-fp')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fingerprint_bans' }, ({ new: n }: any) => {
        add({ time: new Date().toISOString(), type: 'fpban', msg: `@${n.username} device banned — ${n.reason ?? 'no reason'} (${n.fingerprint})` });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'fingerprint_bans' }, ({ old: n }: any) => {
        add({ time: new Date().toISOString(), type: 'fpunban', msg: `@${n.username ?? 'user'} device ban removed` });
      })
      .subscribe();

    const tokenCh = supabase.channel('console-tokens')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_tokens' }, ({ new: n }: any) => {
        add({ time: new Date().toISOString(), type: 'token', msg: `@${n.roblox_username} generated token \`${n.token}\`` });
      })
      .subscribe();

    const changelogCh = supabase.channel('console-changelog')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'changelog' }, ({ new: n }: any) => {
        add({ time: new Date().toISOString(), type: 'changelog', msg: `[${n.type?.toUpperCase()}] ${n.game} — ${n.title}` });
      })
      .subscribe();

    const announceCh = supabase.channel('console-announce')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, ({ new: n }: any) => {
        add({ time: new Date().toISOString(), type: 'announcement', msg: `New announcement [${n.type}] — ${n.message}` });
      })
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await supabase.from('game_executions').select('count,game_name,place_id,last_executed_at').order('last_executed_at', { ascending: false }).limit(1);
      const row = data?.[0];
      if (row && row.count !== lastCountRef.current) {
        if (lastCountRef.current > 0) {
          add({ time: new Date().toISOString(), type: 'execution', msg: `${row.game_name ?? `Place ${row.place_id}`} — ${row.count?.toLocaleString()} total execs` });
          checkMilestone(row.count);
        }
        lastCountRef.current = row.count;
      }
    }, 15000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(execCh);
      supabase.removeChannel(userCh);
      supabase.removeChannel(banCh);
      supabase.removeChannel(fpCh);
      supabase.removeChannel(tokenCh);
      supabase.removeChannel(changelogCh);
      supabase.removeChannel(announceCh);
    };
  }, []);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, paused]);

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);

  const FILTER_TYPES: (EntryType | 'all')[] = ['all', 'execution', 'new_user', 'ban', 'unban', 'fpban', 'token', 'changelog', 'announcement', 'milestone', 'suspicious'];

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
        <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Live Console</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{filtered.length} events</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setPaused(p => !p)}
            className="text-[10px] px-2.5 py-1 rounded-md font-medium border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: paused ? '#f59e0b' : 'var(--color-muted)', backgroundColor: paused ? 'rgba(245,158,11,0.1)' : 'transparent' }}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button onClick={() => setEntries([])} className="p-1.5 rounded-md border transition-colors" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }} title="Clear">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b scrollbar-hide" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)', WebkitOverflowScrolling: 'touch' as any }}>
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
              {f === 'all' ? 'ALL' : (c?.label ?? f.toUpperCase())}
            </button>
          );
        })}
      </div>

      <div className="h-96 overflow-y-auto font-mono text-xs" style={{ backgroundColor: '#0a0a0f' }}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: '#374151' }}>Waiting for events...</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {filtered.map((e, i) => {
              const c = TYPE_CONFIG[e.type];
              const Icon = c.icon;
              const isLast = i === filtered.length - 1;
              return (
                <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-white/5"
                  style={{ backgroundColor: isLast ? c.bg : 'transparent' }}>
                  <span className="shrink-0 tabular-nums" style={{ color: '#4b5563' }}>{fmt(e.time)}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                    style={{ color: c.color, backgroundColor: c.bg, minWidth: 48, textAlign: 'center' }}>
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
