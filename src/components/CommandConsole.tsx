import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type LogLevel    = 'info' | 'warn' | 'error' | 'success';
type LogCategory = 'auth' | 'db' | 'network' | 'bot' | 'system' | 'security' | 'command';

interface LogEntry {
  id:        string;
  timestamp: string;
  level:     LogLevel;
  category:  LogCategory;
  message:   string;
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  info:    '#4ade80',
  success: '#00ffaa',
  warn:    '#fbbf24',
  error:   '#ff4444',
};

const LEVEL_LABEL: Record<LogLevel, string> = {
  info:    'INFO ',
  success: 'OK   ',
  warn:    'WARN ',
  error:   'ERROR',
};

const CAT_COLOR: Record<LogCategory, string> = {
  auth:     '#818cf8',
  db:       '#38bdf8',
  network:  '#34d399',
  bot:      '#c084fc',
  system:   '#94a3b8',
  security: '#fb7185',
  command:  '#fbbf24',
};

const ALL_CATS: LogCategory[] = ['auth', 'db', 'network', 'bot', 'system', 'security', 'command'];
const ALL_LEVELS: LogLevel[]  = ['info', 'success', 'warn', 'error'];

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}.${d.getMilliseconds().toString().padStart(3,'0')}`;
};

const BOT_URL  = import.meta.env.VITE_BOT_URL  ?? '';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY ?? '';

export function CommandConsole() {
  const [logs,         setLogs]         = useState<LogEntry[]>([]);
  const [connected,    setConnected]    = useState(false);
  const [paused,       setPaused]       = useState(false);
  const [input,        setInput]        = useState('');
  const [cmdHistory,   setCmdHistory]   = useState<string[]>([]);
  const [historyIdx,   setHistoryIdx]   = useState(-1);
  const [catFilter,    setCatFilter]    = useState<Set<LogCategory>>(new Set(ALL_CATS));
  const [levelFilter,  setLevelFilter]  = useState<Set<LogLevel>>(new Set(ALL_LEVELS));
  const [search,       setSearch]       = useState('');
  const socketRef      = useRef<Socket | null>(null);
  const bottomRef      = useRef<HTMLDivElement>(null);
  const pausedRef      = useRef(false);
  const inputRef       = useRef<HTMLInputElement>(null);

  pausedRef.current = paused;

  const push = useCallback((entry: LogEntry) => {
    if (pausedRef.current) return;
    setLogs(prev => {
      const next = [...prev, entry];
      return next.length > 500 ? next.slice(next.length - 500) : next;
    });
  }, []);

  useEffect(() => {
    if (!BOT_URL) return;

    const socket = io(BOT_URL, {
      auth: { adminKey: ADMIN_KEY },
      transports: ['websocket'],
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('log_buffer', (buf: LogEntry[]) => {
      setLogs(buf.slice(-500));
    });

    socket.on('system_log', (entry: LogEntry) => {
      push(entry);
    });

    return () => { socket.disconnect(); };
  }, [push]);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, paused]);

  const sendCommand = useCallback(() => {
    const cmd = input.trim();
    if (!cmd || !socketRef.current) return;
    socketRef.current.emit('command', cmd);
    setCmdHistory(h => [cmd, ...h.slice(0, 49)]);
    setHistoryIdx(-1);
    setInput('');
  }, [input]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { sendCommand(); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(idx);
      setInput(cmdHistory[idx] ?? '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setInput(idx === -1 ? '' : cmdHistory[idx]);
    }
  };

  const toggleCat = (c: LogCategory) => setCatFilter(s => {
    const n = new Set(s);
    n.has(c) ? n.delete(c) : n.add(c);
    return n;
  });

  const toggleLevel = (l: LogLevel) => setLevelFilter(s => {
    const n = new Set(s);
    n.has(l) ? n.delete(l) : n.add(l);
    return n;
  });

  const filtered = logs.filter(e =>
    catFilter.has(e.category) &&
    levelFilter.has(e.level) &&
    (!search || e.message.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 600,
      background: '#020205', border: '1px solid #1a1a2e', borderRadius: 12,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      overflow: 'hidden', position: 'relative',
    }}>

      {/* Scanline overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        borderBottom: '1px solid #1a1a2e', background: '#05050f', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
        </div>
        <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em' }}>
          vhxLUA // COMMAND CENTER
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: connected ? '#4ade80' : '#ef4444',
            boxShadow: connected ? '0 0 8px #4ade8088' : 'none',
            animation: connected ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{ color: connected ? '#4ade80' : '#ef4444', fontSize: 10, letterSpacing: '0.1em' }}>
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
          <span style={{ color: '#334155', fontSize: 10 }}>|</span>
          <span style={{ color: '#475569', fontSize: 10 }}>{filtered.length} LINES</span>
          <button onClick={() => { setLogs([]); }} style={{
            background: 'none', border: '1px solid #1e293b', color: '#475569',
            padding: '2px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '0.1em',
          }}>CLR</button>
          <button onClick={() => setPaused(p => !p)} style={{
            background: paused ? 'rgba(251,191,36,0.1)' : 'none',
            border: `1px solid ${paused ? '#fbbf24' : '#1e293b'}`,
            color: paused ? '#fbbf24' : '#475569',
            padding: '2px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '0.1em',
          }}>{paused ? '▶ RUN' : '⏸ HOLD'}</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 6, padding: '6px 16px', borderBottom: '1px solid #0f0f1a',
        background: '#03030a', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ color: '#1e293b', fontSize: 9, letterSpacing: '0.1em', marginRight: 4 }}>LEVEL</span>
        {ALL_LEVELS.map(l => (
          <button key={l} onClick={() => toggleLevel(l)} style={{
            background: levelFilter.has(l) ? `${LEVEL_COLOR[l]}15` : 'transparent',
            border: `1px solid ${levelFilter.has(l) ? LEVEL_COLOR[l] + '60' : '#1e293b'}`,
            color: levelFilter.has(l) ? LEVEL_COLOR[l] : '#334155',
            padding: '1px 7px', borderRadius: 3, fontSize: 9, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>{l}</button>
        ))}
        <span style={{ color: '#1e293b', fontSize: 9, letterSpacing: '0.1em', marginLeft: 8, marginRight: 4 }}>CAT</span>
        {ALL_CATS.map(c => (
          <button key={c} onClick={() => toggleCat(c)} style={{
            background: catFilter.has(c) ? `${CAT_COLOR[c]}15` : 'transparent',
            border: `1px solid ${catFilter.has(c) ? CAT_COLOR[c] + '60' : '#1e293b'}`,
            color: catFilter.has(c) ? CAT_COLOR[c] : '#334155',
            padding: '1px 7px', borderRadius: 3, fontSize: 9, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '0.08em',
          }}>{c}</button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search..."
          style={{
            marginLeft: 'auto', background: '#0a0a14', border: '1px solid #1e293b',
            color: '#94a3b8', padding: '2px 8px', borderRadius: 4, fontSize: 10,
            fontFamily: 'inherit', outline: 'none', width: 140,
          }}
        />
      </div>

      {/* Log output */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          flex: 1, overflowY: 'auto', padding: '8px 0',
          background: '#020205', cursor: 'text',
          scrollbarWidth: 'thin', scrollbarColor: '#1e293b #020205',
        }}>
        {!connected && (
          <div style={{ padding: '24px 16px', color: '#334155', fontSize: 11, textAlign: 'center' }}>
            ⚠ Not connected. Set VITE_BOT_URL and VITE_ADMIN_KEY in dashboard env vars.
          </div>
        )}
        {filtered.length === 0 && connected && (
          <div style={{ padding: '24px 16px', color: '#1e293b', fontSize: 11, textAlign: 'center' }}>
            — AWAITING EVENTS —
          </div>
        )}
        {filtered.map((e) => (
          <div key={e.id} style={{
            display: 'flex', gap: 10, padding: '1.5px 16px', lineHeight: 1.6,
            transition: 'background 0.1s',
          }}
            onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.background = '#0a0a14'; }}
            onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <span style={{ color: '#1e3a5f', fontSize: 10, flexShrink: 0, userSelect: 'none' }}>
              {fmt(e.timestamp)}
            </span>
            <span style={{
              color: LEVEL_COLOR[e.level], fontSize: 10, flexShrink: 0, fontWeight: 700,
              textShadow: e.level === 'error' ? '0 0 8px #ff444466' : e.level === 'success' ? '0 0 8px #00ffaa44' : 'none',
            }}>
              {LEVEL_LABEL[e.level]}
            </span>
            <span style={{
              color: CAT_COLOR[e.category], fontSize: 10, flexShrink: 0, opacity: 0.7,
              minWidth: 56,
            }}>
              [{e.category}]
            </span>
            <span style={{ color: LEVEL_COLOR[e.level], fontSize: 11, opacity: e.level === 'info' ? 0.85 : 1, wordBreak: 'break-word' }}>
              {e.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Command input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
        borderTop: '1px solid #0f0f1a', background: '#03030a', flexShrink: 0,
      }}>
        <span style={{ color: '#4ade80', fontSize: 12, fontWeight: 700, userSelect: 'none' }}>
          vhx@admin:~$
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="type /help for available commands..."
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#e2e8f0', fontSize: 11, fontFamily: 'inherit', caretColor: '#4ade80',
          }}
        />
        <button onClick={sendCommand} disabled={!connected || !input.trim()} style={{
          background: 'none', border: '1px solid #1e3a5f', color: '#4ade80',
          padding: '3px 12px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
          fontFamily: 'inherit', opacity: connected && input.trim() ? 1 : 0.3,
        }}>EXEC</button>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #020205; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
      `}</style>
    </div>
  );
}
