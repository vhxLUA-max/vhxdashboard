import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type LogLevel = 'info' | 'warn' | 'error' | 'success';
type LogCategory = 'execution' | 'user' | 'ban' | 'token' | 'changelog' | 'announcement' | 'system';

interface LogEntry {
  id: string;
  time: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
}

const PLACE_NAMES: Record<number, string> = {
  18172550962: 'Pixel Blade', 18172553902: 'Pixel Blade',
  133884972346775: 'Pixel Blade', 138013005633222: 'Loot Hero',
  77439980360504: 'Loot Hero', 119987266683883: 'Survive Lava',
  136801880565837: 'Flick', 123974602339071: 'UNC Tester',
};
const game = (r: any) => r.game_name || PLACE_NAMES[r.place_id] || `Place ${r.place_id}`;

const LEVEL_COLOR: Record<LogLevel, string> = {
  info:    '#4ade80',
  success: '#00ffcc',
  warn:    '#fbbf24',
  error:   '#ff4444',
};
const LEVEL_LABEL: Record<LogLevel, string> = {
  info:    'INFO ',
  success: 'OK   ',
  warn:    'WARN ',
  error:   'ERR  ',
};
const CAT_COLOR: Record<LogCategory, string> = {
  execution:    '#818cf8',
  user:         '#34d399',
  ban:          '#f87171',
  token:        '#fbbf24',
  changelog:    '#38bdf8',
  announcement: '#c084fc',
  system:       '#64748b',
};

const ALL_CATS: LogCategory[]  = ['execution', 'user', 'ban', 'token', 'changelog', 'announcement', 'system'];
const ALL_LEVELS: LogLevel[]   = ['info', 'success', 'warn', 'error'];

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
};

const uid = () => crypto.randomUUID();

export function CommandConsole() {
  const [logs,        setLogs]        = useState<LogEntry[]>([]);
  const [paused,      setPaused]      = useState(false);
  const [catFilter,   setCatFilter]   = useState<Set<LogCategory>>(new Set(ALL_CATS));
  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(new Set(ALL_LEVELS));
  const [search,      setSearch]      = useState('');
  const [connected,   setConnected]   = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const pausedRef  = useRef(false);
  pausedRef.current = paused;

  const push = useCallback((entry: LogEntry) => {
    if (pausedRef.current) return;
    setLogs(prev => {
      const next = [...prev, entry];
      return next.length > 500 ? next.slice(-500) : next;
    });
  }, []);

  useEffect(() => {
    // Load recent executions on mount
    (async () => {
      const { data } = await supabase
        .from('unique_users')
        .select('username, game_name, place_id, execution_count, last_seen')
        .order('last_seen', { ascending: false })
        .limit(30);
      data?.reverse().forEach(r => push({
        id: uid(), time: r.last_seen, level: 'info', category: 'execution',
        message: `@${r.username} executed ${game(r)} (${r.execution_count?.toLocaleString()} total)`,
      }));

      const { data: bans } = await supabase
        .from('banned_users').select('username, reason, created_at').order('created_at', { ascending: false }).limit(5);
      bans?.reverse().forEach(b => push({
        id: uid(), time: b.created_at, level: 'warn', category: 'ban',
        message: `@${b.username} banned — ${b.reason ?? 'no reason'}`,
      }));

      push({ id: uid(), time: new Date().toISOString(), level: 'success', category: 'system', message: 'Console connected — watching all tables live' });
    })();

    const ch = supabase.channel('cmd-console')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'unique_users' }, ({ new: n }: any) => {
        push({ id: uid(), time: new Date().toISOString(), level: 'info', category: 'execution', message: `@${n.username} executed ${game(n)} (${n.execution_count?.toLocaleString()} total)` });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'unique_users' }, ({ new: n }: any) => {
        push({ id: uid(), time: new Date().toISOString(), level: 'success', category: 'user', message: `@${n.username} — new user via ${game(n)}` });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'banned_users' }, ({ new: n }: any) => {
        push({ id: uid(), time: new Date().toISOString(), level: 'warn', category: 'ban', message: `@${n.username} banned — ${n.reason ?? 'no reason'}` });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'banned_users' }, ({ old: n }: any) => {
        push({ id: uid(), time: new Date().toISOString(), level: 'info', category: 'ban', message: `@${n.username ?? 'user'} unbanned` });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fingerprint_bans' }, ({ new: n }: any) => {
        push({ id: uid(), time: new Date().toISOString(), level: 'error', category: 'ban', message: `@${n.username} device banned — ${n.reason ?? 'no reason'}` });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'fingerprint_bans' }, ({ old: n }: any) => {
        push({ id: uid(), time: new Date().toISOString(), level: 'info', category: 'ban', message: `@${n.username ?? 'user'} device ban removed` });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_tokens' }, ({ new: n }: any) => {
        push({ id: uid(), time: new Date().toISOString(), level: 'info', category: 'token', message: `@${n.roblox_username} generated token ${n.token}` });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'changelog' }, ({ new: n }: any) => {
        push({ id: uid(), time: new Date().toISOString(), level: 'info', category: 'changelog', message: `[${n.type?.toUpperCase()}] ${n.game} — ${n.title}` });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, ({ new: n }: any) => {
        push({ id: uid(), time: new Date().toISOString(), level: 'info', category: 'announcement', message: `Announcement [${n.type}]: ${n.message}` });
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR')
          push({ id: uid(), time: new Date().toISOString(), level: 'error', category: 'system', message: 'Realtime error — enable replication on tables in Supabase' });
      });

    return () => { supabase.removeChannel(ch); };
  }, [push]);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, paused]);

  const toggleCat   = (c: LogCategory) => setCatFilter(s => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const toggleLevel = (l: LogLevel)    => setLevelFilter(s => { const n = new Set(s); n.has(l) ? n.delete(l) : n.add(l); return n; });

  const filtered = logs.filter(e =>
    catFilter.has(e.category) &&
    levelFilter.has(e.level) &&
    (!search || e.message.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: 580,
      background: '#020205', border: '1px solid #0f172a', borderRadius: 12,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace', overflow: 'hidden', position: 'relative',
    }}>
      {/* Scanline */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #0f172a', background: '#04040e', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
        </div>
        <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em' }}>vhxLUA // LIVE CONSOLE</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#4ade80' : '#ef4444', boxShadow: connected ? '0 0 8px #4ade8088' : 'none' }} />
          <span style={{ color: connected ? '#4ade80' : '#ef4444', fontSize: 10 }}>{connected ? 'LIVE' : 'OFFLINE'}</span>
          <span style={{ color: '#1e293b', fontSize: 10 }}>|</span>
          <span style={{ color: '#334155', fontSize: 10 }}>{filtered.length} events</span>
          <button onClick={() => setLogs([])} style={{ background: 'none', border: '1px solid #1e293b', color: '#475569', padding: '1px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer', fontFamily: 'inherit' }}>CLR</button>
          <button onClick={() => setPaused(p => !p)} style={{ background: paused ? 'rgba(251,191,36,0.1)' : 'none', border: `1px solid ${paused ? '#fbbf24' : '#1e293b'}`, color: paused ? '#fbbf24' : '#475569', padding: '1px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer', fontFamily: 'inherit' }}>
            {paused ? '▶' : '⏸'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 16px', borderBottom: '1px solid #0a0a14', background: '#03030a', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
        {ALL_LEVELS.map(l => (
          <button key={l} onClick={() => toggleLevel(l)} style={{
            background: levelFilter.has(l) ? `${LEVEL_COLOR[l]}15` : 'transparent',
            border: `1px solid ${levelFilter.has(l) ? LEVEL_COLOR[l] + '55' : '#1e293b'}`,
            color: levelFilter.has(l) ? LEVEL_COLOR[l] : '#334155',
            padding: '1px 7px', borderRadius: 3, fontSize: 9, cursor: 'pointer', fontFamily: 'inherit',
          }}>{l}</button>
        ))}
        <span style={{ color: '#1e293b', margin: '0 4px' }}>|</span>
        {ALL_CATS.map(c => (
          <button key={c} onClick={() => toggleCat(c)} style={{
            background: catFilter.has(c) ? `${CAT_COLOR[c]}15` : 'transparent',
            border: `1px solid ${catFilter.has(c) ? CAT_COLOR[c] + '55' : '#1e293b'}`,
            color: catFilter.has(c) ? CAT_COLOR[c] : '#334155',
            padding: '1px 7px', borderRadius: 3, fontSize: 9, cursor: 'pointer', fontFamily: 'inherit',
          }}>{c}</button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="search..." style={{
          marginLeft: 'auto', background: '#080810', border: '1px solid #1e293b', color: '#94a3b8',
          padding: '2px 8px', borderRadius: 4, fontSize: 10, fontFamily: 'inherit', outline: 'none', width: 130,
        }} />
      </div>

      {/* Logs */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0', background: '#020205', scrollbarWidth: 'thin', scrollbarColor: '#1e293b #020205' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, color: '#1e293b', fontSize: 11, textAlign: 'center' }}>— AWAITING EVENTS —</div>
        ) : filtered.map(e => (
          <div key={e.id} style={{ display: 'flex', gap: 10, padding: '2px 16px', lineHeight: 1.7 }}
            onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = '#080810'; }}
            onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <span style={{ color: '#1e3a5f', fontSize: 10, flexShrink: 0 }}>{fmt(e.time)}</span>
            <span style={{ color: LEVEL_COLOR[e.level], fontSize: 10, fontWeight: 700, flexShrink: 0, textShadow: e.level === 'error' ? '0 0 6px #ff444466' : 'none' }}>
              {LEVEL_LABEL[e.level]}
            </span>
            <span style={{ color: CAT_COLOR[e.category], fontSize: 10, flexShrink: 0, minWidth: 72, opacity: 0.7 }}>[{e.category}]</span>
            <span style={{ color: LEVEL_COLOR[e.level], fontSize: 11, opacity: e.level === 'info' ? 0.85 : 1, wordBreak: 'break-word' }}>{e.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
