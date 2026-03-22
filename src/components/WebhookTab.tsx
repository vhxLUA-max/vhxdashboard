import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { GameExecution, UniqueUser } from '@/types';
import { Webhook, Send, Loader2, Save, Copy, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STORAGE_KEY_URL   = 'vhx_webhook_url';
const STORAGE_KEY_TOKEN = 'vhx_webhook_token';
const RATE_LIMIT_MS     = 30000;

type PlaceEntry = { place_id: number; game_name: string | null; user_execution_count: number; first_seen: string; last_seen: string; };
type UserRow = UniqueUser & { token?: string };

function formatDuration(first: string, last: string): string {
  const diff = new Date(last).getTime() - new Date(first).getTime();
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  if (days > 0)  return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0)  return `${mins}m`;
  return 'Just started';
}

async function getRobloxAvatarUrl(robloxUserId: number): Promise<string | null> {
  try {
    // Route through our proxy to avoid CORS
    const res = await fetch('/api/roblox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: `/v1/users/avatar-headshot?userIds=${robloxUserId}&size=420x420&format=Png&isCircular=false`,
        domain: 'https://thumbnails.roblox.com',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.imageUrl ?? null;
  } catch { return null; }
}

export function WebhookTab() {
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem(STORAGE_KEY_URL)   ?? '');
  const [token, setToken]           = useState(() => localStorage.getItem(STORAGE_KEY_TOKEN)  ?? '');
  const [loading, setLoading]       = useState(false);
  const [copiedUrl, setCopiedUrl]   = useState(false);
  const lastSentRef                 = useRef<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_URL);
    if (saved) setWebhookUrl(saved);
  }, []);

  const handleSaveUrl = () => {
    localStorage.setItem(STORAGE_KEY_URL, webhookUrl);
    toast.success('Webhook URL saved');
  };

  const handleSaveToken = () => {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    toast.success('Token saved');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast.success('Webhook URL copied');
  };

  const handleSend = async () => {
    if (!webhookUrl.trim() || token.length < 4) return;

    if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      toast.error('Invalid Discord webhook URL');
      return;
    }

    const now = Date.now();
    if (now - lastSentRef.current < RATE_LIMIT_MS) {
      const wait = Math.ceil((RATE_LIMIT_MS - (now - lastSentRef.current)) / 1000);
      toast.warning(`Please wait ${wait}s before sending again`);
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Sending report...');

    try {
      const { data: tokenRow } = await supabase
        .from('user_tokens')
        .select('roblox_user_id, roblox_username')
        .eq('token', token.trim().toUpperCase())
        .maybeSingle();

      if (!tokenRow) {
        toast.error('Token not found. Verify your Roblox account in the Token tab first.', { id: toastId });
        return;
      }

      const { data: rows } = await supabase
        .from('unique_users')
        .select('*')
        .eq('roblox_user_id', tokenRow.roblox_user_id)
        .limit(50);

      if (!rows || rows.length === 0) {
        toast.error('No execution data found. Run a script in-game first.', { id: toastId });
        return;
      }

      const users        = rows as UserRow[];
      const robloxUserId = tokenRow.roblox_user_id;
      const displayName  = tokenRow.roblox_username;
      const placeIds     = [...new Set(users.map(u => u.place_id))];

      const { data: executions } = await supabase
        .from('game_executions').select('place_id,total_count:count,game_name').in('place_id', placeIds);

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
      const earliest   = places.reduce((a, b) => new Date(a.first_seen) < new Date(b.first_seen) ? a : b).first_seen;
      const latest     = places.reduce((a, b) => new Date(a.last_seen)  > new Date(b.last_seen)  ? a : b).last_seen;
      const topGame    = places.reduce((a, b) => a.user_execution_count > b.user_execution_count ? a : b);
      const avatarUrl  = await getRobloxAvatarUrl(robloxUserId);

      const profileUrl   = `https://www.roblox.com/users/${robloxUserId}/profile`;
      const firstSeenTs  = `<t:${Math.floor(new Date(earliest).getTime() / 1000)}:D>`;
      const lastSeenTs   = `<t:${Math.floor(new Date(latest).getTime() / 1000)}:R>`;

      // Build a visual bar for top game dominance
      const barFill = Math.round((topGame.user_execution_count / totalExecs) * 10);
      const bar = '█'.repeat(barFill) + '░'.repeat(10 - barFill) + ` ${Math.round((topGame.user_execution_count / totalExecs) * 100)}%`;

      const gameFields = places
        .sort((a, b) => b.user_execution_count - a.user_execution_count)
        .slice(0, 6)
        .map(p => {
          const pct = totalExecs > 0 ? Math.round((p.user_execution_count / totalExecs) * 100) : 0;
          const lastTs = `<t:${Math.floor(new Date(p.last_seen).getTime() / 1000)}:R>`;
          return {
            name: `${p.game_name ?? `Place ${p.place_id}`}`,
            value: [
              `\`${p.user_execution_count.toLocaleString().padStart(5)} execs\` · ${pct}% of total`,
              `${formatDuration(p.first_seen, p.last_seen)} active · last ${lastTs}`,
            ].join('\n'),
            inline: false,
          };
        });

      const embed = {
        username: displayName,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        embeds: [{
          author: {
            name: `${displayName}  ·  vhxLUA`,
            url: profileUrl,
          },
          title: 'Execution Report',
          url: profileUrl,
          description: [
            `### [${displayName}](${profileUrl})`,
            `\`${robloxUserId}\` · active since ${firstSeenTs}`,
          ].join('\n'),
          color: 0x6366f1,
          ...(avatarUrl ? { thumbnail: { url: avatarUrl } } : {}),
          fields: [
            {
              name: '\u200b',
              value: [
                `> **${totalExecs.toLocaleString()}** executions  ·  **${places.length}** game${places.length !== 1 ? 's' : ''}`,
                `> Last seen ${lastSeenTs}`,
              ].join('\n'),
              inline: false,
            },
            {
              name: 'Top Game',
              value: `**${topGame.game_name ?? `Place ${topGame.place_id}`}**  ·  ${topGame.user_execution_count.toLocaleString()} execs\n\`${bar}\``,
              inline: false,
            },
            { name: '\u200b', value: '─── **Game Breakdown** ───', inline: false },
            ...gameFields,
          ],
          footer: { text: 'vhxLUA Hub' },
          timestamp: new Date().toISOString(),
        }],
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embed),
      });

      if (!res.ok) throw new Error(`Discord returned ${res.status}`);

      lastSentRef.current = Date.now();
      toast.success('Report sent to Discord!', { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send webhook', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
        <Webhook className="w-5 h-5 text-indigo-400" />
        Discord Webhook
      </h3>
      <p className="text-sm text-gray-500 mb-5">Send your execution report to Discord.</p>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">
            Token <span className="text-gray-600">(from Settings → Copy My Token in-game)</span>
          </label>
          <div className="flex gap-2">
            <Input
              value={token}
              onChange={e => setToken(e.target.value.toUpperCase())}
              placeholder="e.g. VOID3847"
              maxLength={10}
              className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-500 font-mono tracking-widest"
            />
            <Button onClick={handleSaveToken} disabled={token.length < 4} variant="outline" size="icon"
              className="shrink-0 border-gray-200 dark:border-gray-700 text-gray-500 hover:text-white hover:bg-gray-800" title="Save token">
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Webhook URL</label>
          <div className="flex gap-2">
            <Input
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-500"
            />
            <Button onClick={handleCopyUrl} disabled={!webhookUrl.trim()} variant="outline" size="icon"
              className="shrink-0 border-gray-200 dark:border-gray-700 text-gray-500 hover:text-white hover:bg-gray-800" title="Copy URL">
              {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button onClick={handleSaveUrl} disabled={!webhookUrl.trim()} variant="outline" size="icon"
              className="shrink-0 border-gray-200 dark:border-gray-700 text-gray-500 hover:text-white hover:bg-gray-800" title="Save URL">
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={handleSend}
          disabled={loading || !webhookUrl.trim() || token.length < 4}
          className="w-full bg-indigo-600 hover:bg-blue-600 text-white border-0"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
            : <><Send className="w-4 h-4 mr-2" /> Send Report</>
          }
        </Button>
      </div>
    </div>
  );
}
