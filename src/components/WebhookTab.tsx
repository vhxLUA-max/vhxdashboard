import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { UniqueUser, GameExecution } from '@/types';
import { Webhook, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type PlaceEntry = {
  place_id: number;
  game_name: string | null;
  user_execution_count: number;
  first_seen: string;
  last_seen: string;
};

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
    return `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxUserId}&width=150&height=150&format=png`;
  } catch {
    return null;
  }
}

export function WebhookTab() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async () => {
    if (!webhookUrl.trim() || !username.trim()) return;
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

    const users = rows as UniqueUser[];
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
      embeds: [
        {
          title: `${displayName}'s Execution Report`,
          color: 0x6366f1,
          thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
          fields: [
            {
              name: '👤 Roblox ID',
              value: `\`${robloxUserId}\``,
              inline: true,
            },
            {
              name: '⚡ Total Executions',
              value: `**${totalExecs.toLocaleString()}**`,
              inline: true,
            },
            {
              name: '🎮 Games Played',
              value: `**${places.length}**`,
              inline: true,
            },
            {
              name: '🏆 Most Played',
              value: `${topGame.game_name ?? `Place ${topGame.place_id}`} · **${topGame.user_execution_count.toLocaleString()}** execs`,
              inline: false,
            },
            {
              name: '🕒 Time Using',
              value: formatDuration(earliest, latest),
              inline: true,
            },
            {
              name: '📅 First Seen',
              value: new Date(earliest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              inline: true,
            },
            {
              name: '🔄 Last Seen',
              value: timeAgo(latest),
              inline: true,
            },
            {
              name: '─────────────────────',
              value: '**Game Breakdown**',
              inline: false,
            },
            ...gameFields,
          ],
          footer: {
            text: 'vhx Analytics Dashboard',
          },
          timestamp: new Date().toISOString(),
        },
      ],
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
      <p className="text-sm text-gray-500 mb-5">Send a user's execution report to a Discord channel.</p>

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
          <label className="text-xs text-gray-400 mb-1.5 block">Webhook URL</label>
          <Input
            value={webhookUrl}
            onChange={e => { setWebhookUrl(e.target.value); setStatus('idle'); }}
            placeholder="https://discord.com/api/webhooks/..."
            className="bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500"
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={status === 'loading' || !webhookUrl.trim() || !username.trim()}
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

      <div className="mt-5 pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-600 mb-2">Embed preview includes:</p>
        <ul className="space-y-1">
          {['Avatar headshot', 'Total executions', 'Games played', 'Most played game', 'Time using · First & last seen', 'Per-game breakdown'].map(item => (
            <li key={item} className="text-xs text-gray-500 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-indigo-500 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
