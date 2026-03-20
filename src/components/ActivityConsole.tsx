import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Terminal, Gamepad2, Users, Ban, Key } from 'lucide-react';

type Entry = {
  time: string;
  type: 'execution' | 'new_user' | 'ban' | 'token';
  msg: string;
};

const TYPE_STYLE: Record<Entry['type'], { color: string; icon: React.ElementType }> = {
  execution: { color: '#6366f1', icon: Gamepad2 },
  new_user:  { color: '#10b981', icon: Users    },
  ban:       { color: '#ef4444', icon: Ban      },
  token:     { color: '#f59e0b', icon: Key      },
};

export function ActivityConsole() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const add = (e: Entry) => {
      setEntries(prev => [...prev.slice(-199), e]);
    };

    const execCh = supabase.channel('console-execs')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_executions' }, (payload) => {
        const n = payload.new as any;
        add({ time: new Date().toISOString(), type: 'execution', msg: `Script executed — ${n.game_name ?? `Place ${n.place_id}`} (total: ${n.count?.toLocaleString()})` });
      })
      .subscribe();

    const userCh = supabase.channel('console-users')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'unique_users' }, (payload) => {
        const n = payload.new as any;
        add({ time: new Date().toISOString(), type: 'new_user', msg: `New user — @${n.username} in ${n.game_name ?? `Place ${n.place_id}`}` });
      })
      .subscribe();

    const banCh = supabase.channel('console-bans')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'banned_users' }, (payload) => {
        const n = payload.new as any;
        add({ time: new Date().toISOString(), type: 'ban', msg: `User banned — @${n.username} (${n.reason ?? 'no reason'})` });
      })
      .subscribe();

    const tokenCh = supabase.channel('console-tokens')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_tokens' }, (payload) => {
        const n = payload.new as any;
        add({ time: new Date().toISOString(), type: 'token', msg: `Token generated — @${n.roblox_username}` });
      })
      .subscribe();

    add({ time: new Date().toISOString(), type: 'execution', msg: 'Console connected — listening for live events...' });

    return () => {
      supabase.removeChannel(execCh);
      supabase.removeChannel(userCh);
      supabase.removeChannel(banCh);
      supabase.removeChannel(tokenCh);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const fmt = (iso: string) => new Date(iso).toLocaleTimeString();

  return (
    <div className="rounded-xl border space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <div className="flex items-center gap-2 px-4 pt-4">
        <Terminal className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Live Console</h3>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="mx-4 mb-4 rounded-lg bg-black/80 border h-72 overflow-y-auto p-3 font-mono text-[11px] space-y-1" style={{ borderColor: 'var(--color-border)' }}>
        {entries.length === 0 && (
          <p className="text-gray-600">Waiting for events...</p>
        )}
        {entries.map((e, i) => {
          const s = TYPE_STYLE[e.type];
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-gray-600 shrink-0">{fmt(e.time)}</span>
              <Icon className="w-3 h-3 shrink-0 mt-0.5" style={{ color: s.color }} />
              <span style={{ color: s.color }}>{e.msg}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
