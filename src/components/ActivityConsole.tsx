import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Terminal, Gamepad2, Users, Ban, Key, Trash2 } from 'lucide-react';

type EntryType = 'execution' | 'new_user' | 'ban' | 'token';

type Entry = { time: string; type: EntryType; msg: string };

const TYPE_CONFIG: Record<EntryType, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  execution: { color: '#818cf8', bg: 'rgba(99,102,241,0.08)',  label: 'EXEC',  icon: Gamepad2 },
  new_user:  { color: '#34d399', bg: 'rgba(16,185,129,0.08)', label: 'USER',  icon: Users    },
  ban:       { color: '#f87171', bg: 'rgba(239,68,68,0.08)',  label: 'BAN',   icon: Ban      },
  token:     { color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', label: 'TOKEN', icon: Key      },
};

export function ActivityConsole() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [paused, setPaused]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  pausedRef.current = paused;

  useEffect(() => {
    const add = (e: Entry) => {
      if (pausedRef.current) return;
      setEntries(prev => [...prev.slice(-299), e]);
    };

    const execCh = supabase.channel('console-execs')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_executions' }, ({ new: n }: any) => {
        add({ time: new Date().toISOString(), type: 'execution', msg: `${n.game_name ?? `Place ${n.place_id}`} — total ${n.count?.toLocaleString()} execs` });
      }).subscribe((status) => {
        if (status === 'SUBSCRIBED') add({ time: new Date().toISOString(), type: 'execution', msg: 'Console connected — listening for live events' });
        if (status === 'CHANNEL_ERROR') add({ time: new Date().toISOString(), type: 'ban', msg: 'Realtime error — enable replication in Supabase for game_executions' });
      });

    const userCh = supabase.channel('console-users')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'unique_users' }, ({ new: n }: any) => {
        add({ time: new Date().toISOString(), type: 'new_user', msg: `@${n.username} joined via ${n.game_name ?? `Place ${n.place_id}`}` });
      }).subscribe();

    const banCh = supabase.channel('console-bans')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'banned_users' }, ({ new: n }: any) => {
        add({ time: new Date().toISOString(), type: 'ban', msg: `@${n.username} banned — ${n.reason ?? 'no reason'}` });
      }).subscribe();

    const tokenCh = supabase.channel('console-tokens')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_tokens' }, ({ new: n }: any) => {
        add({ time: new Date().toISOString(), type: 'token', msg: `@${n.roblox_username} generated a token` });
      }).subscribe();

    let lastExecCount = 0;
    const poll = setInterval(async () => {
      const { data } = await supabase.from('game_executions').select('count,game_name,place_id,last_executed_at').order('last_executed_at', { ascending: false }).limit(1);
      const row = data?.[0];
      if (row && row.count !== lastExecCount) {
        if (lastExecCount > 0) add({ time: new Date().toISOString(), type: 'execution', msg: `${row.game_name ?? `Place ${row.place_id}`} — total ${row.count?.toLocaleString()} execs` });
        lastExecCount = row.count;
      }
    }, 15000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(execCh);
      supabase.removeChannel(userCh);
      supabase.removeChannel(banCh);
      supabase.removeChannel(tokenCh);
    };
  }, []);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, paused]);

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
        <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Live Console</span>
        <div className="flex items-center gap-1.5 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setPaused(p => !p)}
            className="text-[10px] px-2.5 py-1 rounded-md font-medium border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: paused ? '#f59e0b' : 'var(--color-muted)', backgroundColor: paused ? 'rgba(245,158,11,0.1)' : 'transparent' }}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button onClick={() => setEntries([])}
            className="p-1.5 rounded-md border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
            title="Clear console">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="h-80 overflow-y-auto font-mono text-xs" style={{ backgroundColor: '#0a0a0f' }}>
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-xs">Waiting for events...</p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {entries.map((e, i) => {
              const c = TYPE_CONFIG[e.type];
              const Icon = c.icon;
              return (
                <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors hover:bg-white/5"
                  style={{ backgroundColor: i === entries.length - 1 ? c.bg : 'transparent' }}>
                  <span className="text-gray-600 shrink-0 tabular-nums">{fmt(e.time)}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 tabular-nums"
                    style={{ color: c.color, backgroundColor: c.bg, minWidth: 42, textAlign: 'center' }}>
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
