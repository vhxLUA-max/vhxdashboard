import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/lib/supabase';
import type { UniqueUser, GameExecution } from '@/types';
import { Users, Clock, Calendar, Gamepad2, ArrowLeft, ExternalLink, Shield, Activity, Hash, Download, ArrowUpDown, Ban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

function QuickBanButton({ userId, username, isAdmin }: { userId: number; username: string; isAdmin: boolean }) {
  if (!isAdmin) return null;
  const [open,    setOpen]    = useState(false);
  const [reason,  setReason]  = useState('');
  const [loading, setLoading] = useState(false);

  const doBan = async () => {
    if (!reason.trim()) return toast.error('Enter a reason');
    setLoading(true);
    const { error } = await supabase.from('banned_users').insert({ roblox_user_id: userId, username, reason });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`@${username} banned`);
    setOpen(false);
    setReason('');
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-lg border transition-all hover:bg-red-500/10 hover:border-red-500/40"
        style={{ borderColor: 'var(--color-border)', color: open ? '#ef4444' : 'var(--color-muted)' }}
        title="Quick ban">
        <Ban className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border shadow-xl p-3 space-y-2"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-semibold text-red-400">Ban @{username}</p>
          <input
            autoFocus
            value={reason}
            onChange={e => setReason(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doBan()}
            placeholder="Reason..."
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border outline-none"
            style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          />
          <div className="flex gap-1.5">
            <button onClick={doBan} disabled={loading}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50">
              {loading ? '...' : 'Ban'}
            </button>
            <button onClick={() => { setOpen(false); setReason(''); }}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type PlaceEntry = {
  place_id: number;
  game_name: string | null;
  first_seen: string;
  last_seen: string;
  user_execution_count: number;
};

type UserResult = {
  roblox_user_id: number;
  username: string;
  places: PlaceEntry[];
  earliest_seen: string;
  latest_seen: string;
  total_executions: number;
};

type RobloxProfile = {
  displayName: string;
  description: string;
  created: string;
  isBanned: boolean;
  avatarUrl: string | null;
};

function formatDuration(first: string, last: string): string {
  const diff = new Date(last).getTime() - new Date(first).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
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

async function robloxProxy(path: string): Promise<unknown> {
  const res = await fetch('/api/roblox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchRobloxProfile(userId: number): Promise<RobloxProfile | null> {
  try {
    const [userData, thumbData] = await Promise.all([
      robloxProxy(`/v1/users/${userId}`) as Promise<{ displayName?: string; name?: string; description?: string; created?: string; isBanned?: boolean } | null>,
      robloxProxy(`/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`) as Promise<{ data?: { imageUrl?: string }[] } | null>,
    ]);
    if (!userData) return null;
    return {
      displayName: (userData as { displayName?: string; name?: string }).displayName ?? (userData as { name?: string }).name ?? '',
      description: (userData as { description?: string }).description ?? '',
      created: (userData as { created?: string }).created ?? '',
      isBanned: (userData as { isBanned?: boolean }).isBanned ?? false,
      avatarUrl: (thumbData as { data?: { imageUrl?: string }[] } | null)?.data?.[0]?.imageUrl ?? null,
    };
  } catch {
    return null;
  }
}

function UserProfilePanel({ user, onBack }: { user: UserResult; onBack: () => void }) {
  const [profile, setProfile] = useState<RobloxProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    fetchRobloxProfile(user.roblox_user_id).then((p) => {
      setProfile(p);
      setProfileLoading(false);
    });
  }, [user.roblox_user_id]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-950">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>

      <div className="p-5">
        {profileLoading ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        ) : (
          <div className="flex flex-col items-center text-center mb-5">
            <div className="relative mb-3">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={user.username} className="w-16 h-16 rounded-full border-2 border-purple-500/40 object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center">
                  <Users className="w-7 h-7 text-purple-400" />
                </div>
              )}
              {profile?.isBanned && (
                <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            <p className="font-bold text-gray-900 dark:text-white text-base">{profile?.displayName ?? user.username}</p>
            {profile?.displayName && profile.displayName !== user.username && (
              <p className="text-xs text-gray-500">@{user.username}</p>
            )}
            <p className="text-[11px] text-gray-400 mt-0.5">ID: {user.roblox_user_id}</p>

            {profile?.isBanned && (
              <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-medium">
                <Shield className="w-2.5 h-2.5" /> Banned
              </span>
            )}

            {profile?.created && (
              <p className="text-[11px] text-gray-400 mt-2">
                Roblox account since {new Date(profile.created).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
              </p>
            )}

            {profile?.description ? (
              <p className="text-[11px] text-gray-500 mt-2 line-clamp-2 px-2">{profile.description}</p>
            ) : null}

            <a
              href={`https://www.roblox.com/users/${user.roblox_user_id}/profile`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View on Roblox <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white dark:bg-gray-950 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
            <p className="text-lg font-bold text-indigo-400">{user.total_executions.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Total Executions</p>
          </div>
          <div className="bg-white dark:bg-gray-950 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800">
            <p className="text-lg font-bold text-purple-400">{user.places.length}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Games Played</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="flex items-center gap-1.5 text-gray-500 bg-white dark:bg-gray-950 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-800">
            <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">First seen</p>
              <p className="text-gray-900 dark:text-white text-[11px]">{timeAgo(user.earliest_seen)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 bg-white dark:bg-gray-950 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-800">
            <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">Last seen</p>
              <p className="text-gray-900 dark:text-white text-[11px]">{timeAgo(user.latest_seen)}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            Execution History
          </p>
          {user.places.length > 0 && (
            <div className="mb-3 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={user.places.map(p => ({ name: p.game_name?.split(' ')[0] ?? `P${p.place_id}`, execs: p.user_execution_count }))} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 9 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#f9fafb' }} itemStyle={{ color: '#818cf8' }} />
                  <Bar dataKey="execs" radius={[4, 4, 0, 0]}>
                    {user.places.map((_, i) => <Cell key={i} fill={i === 0 ? '#6366f1' : i === 1 ? '#10b981' : '#f59e0b'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="space-y-2">
            {user.places.sort((a, b) => b.user_execution_count - a.user_execution_count).map((place) => (
              <div key={place.place_id} className="flex items-center justify-between bg-white dark:bg-gray-950 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 min-w-0">
                  <Gamepad2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {place.game_name ?? `Place ${place.place_id}`}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {formatDuration(place.first_seen, place.last_seen)} · last {timeAgo(place.last_seen)}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-indigo-400 flex-shrink-0 ml-2">
                  {place.user_execution_count.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserSearch({ isAdmin = false }: { isAdmin?: boolean }) {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<UserResult[]>([]);
  const [loading, setLoading]       = useState(false);
  const [searched, setSearched]     = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [sortBy, setSortBy]         = useState<'executions' | 'recent'>('executions');
  const [filterGame, setFilterGame] = useState('');
  const [filterMinExecs, setFilterMinExecs] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedResults = useMemo(() => {
    let filtered = [...results];
    if (filterGame.trim()) filtered = filtered.filter(u => u.places.some(p => (p.game_name ?? '').toLowerCase().includes(filterGame.toLowerCase())));
    if (filterMinExecs.trim()) { const min = parseInt(filterMinExecs); if (!isNaN(min)) filtered = filtered.filter(u => u.total_executions >= min); }
    return filtered.sort((a, b) =>
      sortBy === 'executions'
        ? b.total_executions - a.total_executions
        : new Date(b.latest_seen).getTime() - new Date(a.latest_seen).getTime()
    );
  }, [results, sortBy, filterGame, filterMinExecs]);

  const exportCSV = async (allUsers = false) => {
    let exportData = results;
    if (allUsers) {
      const { data } = await supabase
        .from('unique_users')
        .select('roblox_user_id, username, game_name, place_id, execution_count, first_seen, last_seen, fingerprint, hwid')
        .order('execution_count', { ascending: false });
      if (!data?.length) return toast.error('No users found');
      const rows = [
        ['Username', 'Roblox ID', 'Game', 'Executions', 'First Seen', 'Last Seen', 'Fingerprint', 'HWID'],
        ...data.map((u: any) => [u.username, u.roblox_user_id, u.game_name ?? u.place_id, u.execution_count, u.first_seen, u.last_seen, u.fingerprint ?? '', u.hwid ?? '']),
      ];
      const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `vhx-all-users-${new Date().toISOString().slice(0,10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      return toast.success(`Exported ${data.length} users`);
    }
    if (!exportData.length) return;
    const rows = [
      ['Username', 'Roblox ID', 'Total Executions', 'Games', 'First Seen', 'Last Seen'],
      ...exportData.map(u => [u.username, u.roblox_user_id, u.total_executions, u.places.length, u.earliest_seen, u.latest_seen]),
    ];
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `vhx-users-${query}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportJSON = () => {
    const data = sortedResults.map(u => ({
      username: u.username, roblox_user_id: u.roblox_user_id,
      total_executions: u.total_executions, games: u.places.length,
      first_seen: u.earliest_seen, last_seen: u.latest_seen,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `vhx-users-${query || 'export'}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exported');
  };

  const search = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setSelectedUser(null);
      return;
    }

    setLoading(true);
    setSearched(true);
    setSelectedUser(null);

    const { data: tokenRow, error: tokenErr } = await supabase
      .from('user_tokens')
      .select('roblox_user_id')
      .eq('token', trimmed.toUpperCase())
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      setResults([]);
      setLoading(false);
      return;
    }

    const { data: rows, error: searchErr } = await supabase
      .from('unique_users')
      .select('user_id, roblox_user_id, place_id, username, first_seen, last_seen, execution_count')
      .eq('roblox_user_id', tokenRow.roblox_user_id)
      .limit(50);

    if (searchErr || !rows || rows.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    const placeIds = [...new Set((rows as UniqueUser[]).map(u => u.place_id))];
    const { data: executions } = await supabase
      .from('game_executions')
      .select('place_id, count, game_name')
      .in('place_id', placeIds);

    const execMap: Record<number, { count: number; game_name: string | null }> = {};
    for (const e of (executions ?? []) as GameExecution[]) {
      execMap[e.place_id] = { count: e.count, game_name: e.game_name };
    }

    const grouped: Record<number, UserResult> = {};
    for (const row of rows as UniqueUser[]) {
      const uid = row.roblox_user_id ?? row.user_id;
      if (!grouped[uid]) {
        grouped[uid] = {
          roblox_user_id: uid,
          username: row.username,
          places: [],
          earliest_seen: row.first_seen,
          latest_seen: row.last_seen,
          total_executions: 0,
        };
      }
      if (new Date(row.first_seen) < new Date(grouped[uid].earliest_seen)) grouped[uid].earliest_seen = row.first_seen;
      if (new Date(row.last_seen) > new Date(grouped[uid].latest_seen)) grouped[uid].latest_seen = row.last_seen;
      grouped[uid].total_executions += row.execution_count ?? 0;
      grouped[uid].places.push({
        place_id: row.place_id,
        game_name: execMap[row.place_id]?.game_name ?? null,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
        user_execution_count: row.execution_count ?? 0,
      });
    }

    setResults(Object.values(grouped));
    setLoading(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  useEffect(() => {
    if (!query.trim()) return;
    const channel = supabase
      .channel('usersearch-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, () => search(query))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [query, search]);

  if (selectedUser) {
    return <UserProfilePanel user={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-purple-400" />
        User Lookup
      </h3>

      <div className="relative mb-4">
        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          autoFocus
          value={query}
          onChange={handleChange}
          placeholder="Enter token (e.g. VOID3847)..."
          maxLength={10}
          className="pl-9 pr-8 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-purple-500 font-mono tracking-widest uppercase"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setSearched(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors">
            ✕
          </button>
        )}
      </div>

      {loading && <div className="text-center py-6 text-gray-400 text-sm">Searching...</div>}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-8 space-y-1">
          <p className="text-sm text-gray-400">No user found for token "{query}"</p>
          <p className="text-xs text-gray-600">Make sure the token is correct — get yours in the Token tab</p>
        </div>
      )}

      {!loading && !searched && !query && (
        <div className="text-center py-8 space-y-1">
          <p className="text-xs text-gray-500">Enter your token above to look up execution stats</p>
          <p className="text-xs text-gray-600">Don't have a token? Go to the <span className="text-indigo-400">Token</span> tab to verify your Roblox account</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              {(['executions', 'recent'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    sortBy === s ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}>
                  <ArrowUpDown className="w-3 h-3" />
                  {s === 'executions' ? 'Most Execs' : 'Most Recent'}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">
              <input value={filterGame} onChange={e => setFilterGame(e.target.value)} placeholder="Game..."
                className="px-2 py-1 rounded-lg text-[11px] border w-20 outline-none"
                style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              <input value={filterMinExecs} onChange={e => setFilterMinExecs(e.target.value)} placeholder="Min execs" type="number" min={0}
                className="px-2 py-1 rounded-lg text-[11px] border w-20 outline-none"
                style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              <button onClick={() => exportCSV(false)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-indigo-400 hover:border-indigo-500/40 transition-all">
                <Download className="w-3 h-3" /> CSV
              </button>
              <button onClick={() => exportJSON()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-violet-400 hover:border-violet-500/40 transition-all">
                <Download className="w-3 h-3" /> JSON
              </button>
              {isAdmin && (
                <button onClick={() => exportCSV(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-all">
                  <Download className="w-3 h-3" /> All Users
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {sortedResults.map((user) => (
            <div key={user.roblox_user_id} className="flex items-center gap-2">
              <button
                onClick={() => setSelectedUser(user)}
                className="flex-1 text-left p-3 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-purple-500/40 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-purple-500 dark:group-hover:text-purple-300 transition-colors">{user.username}</p>
                      <p className="text-[10px] text-gray-500">ID {user.roblox_user_id} · {user.places.length} game{user.places.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-indigo-400">{user.total_executions.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500">execs</p>
                  </div>
                </div>
              </button>
              <QuickBanButton userId={user.roblox_user_id} username={user.username} isAdmin={isAdmin} />
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
