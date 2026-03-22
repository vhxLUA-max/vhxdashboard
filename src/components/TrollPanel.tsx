import { useState, useEffect } from 'react';
import { MessageCircle, Wifi, WifiOff, Loader2, Send, X } from 'lucide-react';
import { toast } from 'sonner';

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

  useEffect(() => { checkOnline(); }, [userId]);

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

  const sendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/roblox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: '/v1/messages',
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

  const presets = [
    '👀 I can see you',
    'nice executor lol',
    'vhxLUA says hi 😈',
    'we know your IP 💀',
    'your hwid is saved 😇',
  ];

  const s = { backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Troll @{username}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-muted)' }}><X className="w-4 h-4" /></button>
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
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                {checking ? 'Checking...' : online === true ? 'In-Game 🟢' : online === false ? 'Offline 🔴' : 'Unknown'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Roblox ID: {userId}</p>
            </div>
            <button onClick={checkOnline} className="ml-auto text-[10px] px-2 py-1 rounded-lg border hover:opacity-80"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
              Refresh
            </button>
          </div>

          {/* Presets */}
          <div>
            <p className="text-[10px] font-medium mb-2" style={{ color: 'var(--color-muted)' }}>QUICK MESSAGES</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map(p => (
                <button key={p} onClick={() => setMessage(p)}
                  className="text-[10px] px-2.5 py-1 rounded-full border hover:opacity-80"
                  style={{ ...s, border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Message input */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium" style={{ color: 'var(--color-muted)' }}>MESSAGE</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={200}
              rows={3}
              className="w-full text-xs px-3 py-2 rounded-xl border outline-none resize-none"
              style={{ ...s, border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
            <button onClick={sendMessage} disabled={sending || !message.trim()}
              className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send to Inbox
            </button>
            <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>💡 Sends a Roblox private message to their inbox using the API.</p>
          </div>

          {/* Sent log */}
          {sent.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium" style={{ color: 'var(--color-muted)' }}>SENT</p>
              {sent.map((m, i) => (
                <div key={i} className="text-[10px] px-2.5 py-1.5 rounded-lg"
                  style={{ backgroundColor: 'rgba(168,85,247,0.08)', color: 'var(--color-text)' }}>{m}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
