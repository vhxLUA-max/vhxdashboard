import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { UniqueUser, GameExecution } from '@/types';
import { Webhook, Send, CheckCircle2, AlertCircle, Loader2, Save, Copy, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'vhx_webhook_url';

type PlaceEntry = {
  place_id: number;
  game_name: string | null;
  user_execution_count: number;
  first_seen: string;
  last_seen: string;
};

type UserRow = UniqueUser & { token?: string };

function formatDuration(first: string, last: string): string {
  const diff = new Date(last).getTime() - new Date(first).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return 'Just started';
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function fetchAvatarUrl(robloxUserId: number): Promise<string | null> {
  try {
    const res = await fetch(`https://users.roblox.com/v1/users/${robloxUserId}`);
    if (!res.ok) return null;
    return `https://tr.rbxcdn.com/avatar-thumbnail/150/150/AvatarHeadshot/Png?userId=${robloxUserId}`;
  } catch {
    return null;
  }
}

export function WebhookTab() {
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setSaved(false); }, [webhookUrl]);

  const handleSaveUrl = () => {
    localStorage.setItem(STORAGE_KEY, webhookUrl);
    setSaved(true);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!webhookUrl.trim() || !username.trim() || !token.trim()) return;
    if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      setErrorMsg('Please enter a valid Discord webhook URL.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    const { data: rows } = await supabase
      .from('unique_users')
      .select('*')
      .ilike('username', username.trim())
      .limit(50);

    if (!rows || rows.length === 0) {
      setErrorMsg(`No user found with username "${username}".`);
      setStatus('error');
      return;
    }

    const users = rows as UserRow[];

    const tokenMatch = users.some(u => u.token?.toUpperCase() === token.trim().toUpperCase());
    if (!tokenMatch) {
      setErrorMsg('Invalid token. Run the script in-game to get your token.');
      setStatus('error');
      return;
    }

    const robloxUserId = users[0].roblox_user_id ?? users[0].user_id;
    const displayName = users[0].username;

    const placeIds = [...new Set(users.map(u => u.place_id))];
    const { data: executions } = await supabase
      .from('game_executions')
      .select('place_id, count, game_name')
      .in('place_id', placeIds);

    const execMap: Record<number, { count: number; game_name: string | null }> = {};
    for (const e of (executions ?? []) as GameExecution[]) {
      execMap[e.place_id] = { count: e.count, game_name: e.game_name };
    }

    const places: PlaceEntry[] = users.map(u => ({
      place_id: u.place_id,
      game_name: execMap[u.place_id]?.game_name ?? null,
      user_execution_count: u.execution_count ?? 0,
      first_seen: u.first_seen,
      last_seen: u.last_seen,
    }));

    const totalExecs = places.reduce((s, p) => s + p.user_execution_count, 0);
    const earliest = places.reduce((a, b) => new Date(a.first_seen) < new Date(b.first_seen) ? a : b).first_seen;
    const latest = places.reduce((a, b) => new Date(a.last_seen) > new Date(b.last_seen) ? a : b).last_seen;
    const topGame = places.reduce((a, b) => a.user_execution_count > b.user_execution_count ? a : b);

    const avatarUrl = await fetchAvatarUrl(robloxUserId);

    const gameFields = places
      .sort((a, b) => b.user_execution_count - a.user_execution_count)
      .map(p => ({
        name: p.game_name ?? `Place ${p.place_id}`,
        value: `**${p.user_execution_count.toLocaleString()}** execs · ${formatDuration(p.first_seen, p.last_seen)} · last ${timeAgo(p.last_seen)}`,
        inline: false,
      }));

    const embed = {
      username: 'vhx Analytics',
      avatar_url: 'https://i.imgur.com/4M34hi2.png',
      embeds: [{
        title: `${displayName}'s Execution Report`,
        color: 0x6366f1,
        thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
        fields: [
          { name: '👤 Roblox ID',        value: `\`${robloxUserId}\``,                  inline: true  },
          { name: '⚡ Total Executions',  value: `**${totalExecs.toLocaleString()}**`,    inline: true  },
          { name: '🎮 Games Played',      value: `**${places.length}**`,                 inline: true  },
          { name: '🏆 Most Played',       value: `${topGame.game_name ?? `Place ${topGame.place_id}`} · **${topGame.user_execution_count.toLocaleString()}** execs`, inline: false },
          { name: '🕒 Time Using',        value: formatDuration(earliest, latest),        inline: true  },
          { name: '📅 First Seen',        value: new Date(earliest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), inline: true },
          { name: '🔄 Last Seen',         value: timeAgo(latest),                        inline: true  },
          { name: '─────────────────────', value: '**Game Breakdown**',                  inline: false },
          ...gameFields,
        ],
        footer: { text: 'vhx Analytics Dashboard' },
        timestamp: new Date().toISOString(),
      }],
    };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embed),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Discord returned ${res.status}: ${body}`);
      }
      setStatus('success');
      setTimeout(() => setStatus('idle'), 4000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send webhook.');
      setStatus('error');
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Webhook className="w-5 h-5 text-indigo-400" />
        Discord Webhook
      </h3>
      <p className="text-sm text-gray-500 mb-5">Send your execution report to Discord.</p>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Username</label>
          <Input
            value={username}
            onChange={e => { setUsername(e.target.value); setStatus('idle'); }}
            placeholder="Roblox username..."
            className="bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Token <span className="text-gray-600">(from console when script runs)</span></label>
          <Input
            value={token}
            onChange={e => { setToken(e.target.value.toUpperCase()); setStatus('idle'); }}
            placeholder="e.g. A3X9K"
            maxLength={5}
            className="bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500 font-mono tracking-widest"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Webhook URL</label>
          <div className="flex gap-2">
            <Input
              value={webhookUrl}
              onChange={e => { setWebhookUrl(e.target.value); setStatus('idle'); }}
              placeholder="https://discord.com/api/webhooks/..."
              className="bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500"
            />
            <Button
              onClick={handleCopyUrl}
              disabled={!webhookUrl.trim()}
              variant="outline"
              size="icon"
              className="flex-shrink-0 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
              title="Copy webhook URL"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              onClick={handleSaveUrl}
              disabled={!webhookUrl.trim()}
              variant="outline"
              size="icon"
              className={`flex-shrink-0 border-gray-700 transition-colors ${saved ? 'border-emerald-500/50 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              title="Save webhook URL"
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
          {saved && <p className="text-[11px] text-emerald-400 mt-1">Saved for next visit</p>}
        </div>

        <Button
          onClick={handleSend}
          disabled={status === 'loading' || !webhookUrl.trim() || !username.trim() || token.length !== 5}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0"
        >
          {status === 'loading' ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
          ) : (
            <><Send className="w-4 h-4 mr-2" /> Send Report</>
          )}
        </Button>

        {status === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-400">Report sent successfully!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <p className="text-sm text-rose-400">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
