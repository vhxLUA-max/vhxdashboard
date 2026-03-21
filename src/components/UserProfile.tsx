import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Shield, Ban, Gamepad2, Clock, Key, Fingerprint, Monitor, AlertTriangle, Calendar, Users, Star, ExternalLink, Copy, Check } from 'lucide-react';

interface UserRow {
  roblox_user_id: number; username: string; game_name: string;
  place_id: number; execution_count: number;
  first_seen: string; last_seen: string;
  token: string; fingerprint: string; hwid: string; ip_address?: string;
}
interface BanRow { id: string; reason: string; created_at: string; unban_at: string | null; }
interface RobloxInfo {
  displayName: string; description: string; created: string;
  isBanned: boolean; friendCount: number; followerCount: number;
  followingCount: number; avatarUrl: string | null;
}

const PLACE_NAMES: Record<number, string> = {
  18172550962:'Pixel Blade', 18172553902:'Pixel Blade', 133884972346775:'Pixel Blade',
  138013005633222:'Loot Hero', 77439980360504:'Loot Hero',
  119987266683883:'Survive Lava', 136801880565837:'Flick', 123974602339071:'UNC Tester',
};
const gName = (r: UserRow) => r.game_name || PLACE_NAMES[r.place_id] || `Place ${r.place_id}`;
const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  if (d < 86400*30) return `${Math.floor(d/86400)}d ago`;
  if (d < 86400*365) return `${Math.floor(d/(86400*30))}mo ago`;
  return `${Math.floor(d/(86400*365))}y ago`;
};
const fmt = (iso: string) => new Date(iso).toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' });
const accountAge = (created: string) => {
  const years = (Date.now() - new Date(created).getTime()) / (86400*365*1000);
  if (years >= 1) return `${years.toFixed(1)}y old`;
  return `${Math.floor(years*12)}mo old`;
};

async function robloxProxy(path: string): Promise<unknown> {
  try {
    const res = await fetch('/api/roblox', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path }) });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

interface Props { userId: number; username: string; onBack: () => void; isAdmin: boolean; }

export function UserProfile({ userId, username, onBack, isAdmin }: Props) {
  const [rows,    setRows]    = useState<UserRow[]>([]);
  const [ban,     setBan]     = useState<BanRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [rblx,    setRblx]    = useState<RobloxInfo | null>(null);
  const [banReason, setBanReason] = useState('');
  const [copied,  setCopied]  = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: userRows }, { data: banRow }] = await Promise.all([
        supabase.from('unique_users').select('*').eq('roblox_user_id', userId).order('last_seen', { ascending: false }),
        supabase.from('banned_users').select('*').eq('roblox_user_id', userId).maybeSingle(),
      ]);
      if (userRows) setRows(userRows);
      if (banRow)   setBan(banRow);

      const [userInfo, avatar, friends, followers, following] = await Promise.all([
        robloxProxy(`/v1/users/${userId}`) as Promise<{ displayName?: string; description?: string; created?: string; isBanned?: boolean } | null>,
        robloxProxy(`/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`) as Promise<{ data?: { imageUrl?: string }[] } | null>,
        robloxProxy(`/v1/users/${userId}/friends/count`) as Promise<{ count?: number } | null>,
        robloxProxy(`/v1/users/${userId}/followers/count`) as Promise<{ count?: number } | null>,
        robloxProxy(`/v1/users/${userId}/followings/count`) as Promise<{ count?: number } | null>,
      ]);

      setRblx({
        displayName:    userInfo?.displayName ?? username,
        description:    userInfo?.description ?? '',
        created:        userInfo?.created ?? '',
        isBanned:       userInfo?.isBanned ?? false,
        friendCount:    friends?.count ?? 0,
        followerCount:  followers?.count ?? 0,
        followingCount: following?.count ?? 0,
        avatarUrl:      (avatar as { data?: { imageUrl?: string }[] })?.data?.[0]?.imageUrl ?? null,
      });

      setLoading(false);
    })();
  }, [userId, username]);

  const gameAgg: Record<string, { count: number; first: string; last: string }> = {};
  for (const r of rows) {
    const name = gName(r);
    if (!gameAgg[name]) gameAgg[name] = { count: 0, first: r.first_seen, last: r.last_seen };
    gameAgg[name].count += r.execution_count ?? 0;
    if (r.last_seen > gameAgg[name].last) gameAgg[name].last = r.last_seen;
    if (r.first_seen < gameAgg[name].first) gameAgg[name].first = r.first_seen;
  }
  const games = Object.entries(gameAgg).sort((a, b) => b[1].count - a[1].count);

  const totalExecs = games.reduce((s, [, g]) => s + g.count, 0);
  const firstSeen  = rows.length ? rows.reduce((a,b) => new Date(a.first_seen)<new Date(b.first_seen)?a:b).first_seen : null;
  const lastSeen   = rows.length ? rows.reduce((a,b) => new Date(a.last_seen)>new Date(b.last_seen)?a:b).last_seen : null;
  const token = rows[0]?.token ?? null;
  const fp    = rows[0]?.fingerprint ?? null;
  const hwid  = rows[0]?.hwid ?? null;
  const ip    = rows[0]?.ip_address ?? null;

  const doBan = async () => {
    if (!banReason.trim()) return toast.error('Enter a reason');
    const { error } = await supabase.from('banned_users').insert({ roblox_user_id: userId, username, reason: banReason });
    if (error) return toast.error(error.message);
    toast.success(`@${username} banned`);
    setBan({ id: '', reason: banReason, created_at: new Date().toISOString(), unban_at: null });
  };
  const doUnban = async () => {
    await supabase.from('banned_users').delete().eq('roblox_user_id', userId);
    toast.success(`@${username} unbanned`); setBan(null);
  };
  const doHWIDBan = async () => {
    if (!hwid) return toast.error('No HWID found');
    if (!banReason.trim()) return toast.error('Enter a reason');
    await supabase.from('hwid_bans').insert({ hwid, roblox_user_id: userId, username, reason: banReason });
    toast.success('HWID banned');
  };
  const doFPBan = async () => {
    if (!fp) return toast.error('No fingerprint found');
    if (!banReason.trim()) return toast.error('Enter a reason');
    await supabase.from('fingerprint_bans').insert({ fingerprint: fp, roblox_user_id: userId, username, reason: banReason });
    toast.success('Device banned');
  };
  const doIPBan = async () => {
    if (!ip) return toast.error('No IP address found for this user');
    if (!banReason.trim()) return toast.error('Enter a reason');
    await supabase.from('ip_bans').insert({ ip_address: ip, roblox_user_id: userId, username, reason: banReason });
    toast.success('IP banned');
  };

  const copyVal = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied!');
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  const s  = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' };
  const s2 = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' };

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft className="w-4 h-4" /> Back to users
      </button>

      {/* Header card */}
      <div className="rounded-xl border p-5" style={s}>
        <div className="flex items-start gap-4">
          {rblx?.avatarUrl
            ? <img src={rblx.avatarUrl} alt={username} className="w-20 h-20 rounded-full border-2 shrink-0 object-cover" style={{ borderColor: 'var(--color-accent)' }} />
            : <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shrink-0" style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-accent)' }}>
                {username[0]?.toUpperCase()}
              </div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                {rblx?.displayName ?? username}
              </h2>
              {rblx?.displayName && rblx.displayName !== username && (
                <span className="text-sm" style={{ color: 'var(--color-muted)' }}>@{username}</span>
              )}
              {ban && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">BANNED</span>}
              {rblx?.isBanned && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">ROBLOX BANNED</span>}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>ID: {userId}</span>
              {rblx?.created && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                  <Calendar className="w-3 h-3" /> Account {accountAge(rblx.created)} · joined {fmt(rblx.created)}
                </span>
              )}
              <a href={`https://www.roblox.com/users/${userId}/profile`} target="_blank" rel="noreferrer"
                className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'var(--color-accent)' }}>
                <ExternalLink className="w-3 h-3" /> View Profile
              </a>
            </div>
            {rblx?.description && (
              <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--color-muted)' }}>{rblx.description}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{totalExecs.toLocaleString()}</div>
            <div className="text-xs" style={{ color: 'var(--color-muted)' }}>total executions</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Games Played',  value: games.length,                              icon: Gamepad2, color: '#818cf8' },
          { label:'Total Execs',   value: totalExecs.toLocaleString(),               icon: Star,     color: '#34d399' },
          { label:'First Seen',    value: firstSeen ? timeAgo(firstSeen) : '—',      icon: Calendar, color: '#fbbf24' },
          { label:'Last Seen',     value: lastSeen  ? timeAgo(lastSeen)  : '—',      icon: Clock,    color: '#f87171' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border p-4" style={s}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
              <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{stat.label}</span>
            </div>
            <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Roblox social stats */}
      {rblx && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Friends',   value: rblx.friendCount },
            { label: 'Followers', value: rblx.followerCount },
            { label: 'Following', value: rblx.followingCount },
          ].map(s => (
            <div key={s.label} className="rounded-xl border p-3 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              <Users className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--color-muted)' }} />
              <div className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{s.value.toLocaleString()}</div>
              <div className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Game breakdown — aggregated, no duplicates */}
      <div className="rounded-xl border p-5" style={s}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Gamepad2 className="w-4 h-4" style={{ color: 'var(--color-accent)' }} /> Game Breakdown
        </h3>
        <div className="space-y-3">
          {games.map(([name, g]) => {
            const pct = totalExecs > 0 ? (g.count / totalExecs) * 100 : 0;
            return (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium" style={{ color: 'var(--color-text)' }}>{name}</span>
                  <div className="flex items-center gap-3">
                    <span style={{ color: 'var(--color-muted)' }}>last {timeAgo(g.last)}</span>
                    <span className="font-bold" style={{ color: 'var(--color-accent)' }}>{g.count.toLocaleString()} execs</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-surface2)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: 'var(--color-accent)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security info */}
      {isAdmin && (
        <div className="rounded-xl border p-5 space-y-3" style={s}>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Shield className="w-4 h-4 text-rose-400" /> Security Info
          </h3>
          {[
            { label: 'Token',       value: token, icon: Key,         key: 'token' },
            { label: 'Fingerprint', value: fp,    icon: Fingerprint, key: 'fp'    },
            { label: 'HWID',        value: hwid,  icon: Monitor,     key: 'hwid'  },
            { label: 'IP Address',  value: ip,    icon: Shield,      key: 'ip'    },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg" style={s2}>
              <item.icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
              <span className="text-xs shrink-0 w-24" style={{ color: 'var(--color-muted)' }}>{item.label}</span>
              <code className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--color-text)' }}>{item.value ?? '—'}</code>
              {item.value && (
                <button onClick={() => copyVal(item.value!, item.key)} className="shrink-0 p-1 rounded" style={{ color: 'var(--color-muted)' }}>
                  {copied === item.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ban status */}
      {ban && (
        <div className="rounded-xl border border-red-500/20 p-4 bg-red-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">Currently Banned</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Reason: {ban.reason}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Since: {fmt(ban.created_at)}</p>
          {ban.unban_at && <p className="text-xs mt-1 text-amber-400">Auto-unban: {fmt(ban.unban_at)}</p>}
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div className="rounded-xl border p-5 space-y-3" style={s}>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Ban className="w-4 h-4 text-rose-400" /> Admin Actions
          </h3>
          <input
            value={banReason} onChange={e => setBanReason(e.target.value)}
            placeholder="Reason (required for all ban actions)..."
            className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
            style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          />
          <div className="flex gap-2 flex-wrap">
            {!ban
              ? <button onClick={doBan} className="px-4 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">Ban User</button>
              : <button onClick={doUnban} className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">Unban User</button>
            }
            <button onClick={doFPBan} className="px-4 py-2 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors">
              <Fingerprint className="w-3 h-3 inline mr-1" />Device Ban
            </button>
            <button onClick={doHWIDBan} className="px-4 py-2 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors">
              <Monitor className="w-3 h-3 inline mr-1" />HWID Ban
            </button>
            <button onClick={doIPBan} className="px-4 py-2 rounded-lg text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors">
              <Shield className="w-3 h-3 inline mr-1" />IP Ban
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
