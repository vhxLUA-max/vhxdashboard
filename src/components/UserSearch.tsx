import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { UniqueUser, GameExecution } from '@/types';
import { Users, Clock, Calendar, Gamepad2, ArrowLeft, ExternalLink, Shield, Activity, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';

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

async function fetchRobloxProfile(userId: number): Promise<RobloxProfile | null> {
  try {
    const userRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    if (!userRes.ok) return null;
    const userData = await userRes.json();
    return {
      displayName: userData.displayName ?? userData.name,
      description: userData.description ?? '',
      created: userData.created ?? '',
      isBanned: userData.isBanned ?? false,
      avatarUrl: `https://tr.rbxcdn.com/avatar-thumbnail/150/150/AvatarHeadshot/Png?userId=${userId}`,
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
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-950">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>

      <div className="p-5">
        {profileLoading ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-16 h-16 rounded-full bg-gray-800 animate-pulse" />
            <div className="h-4 w-28 bg-gray-800 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-800 rounded animate-pulse" />
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

            <p className="font-bold text-white text-base">{profile?.displayName ?? user.username}</p>
            {profile?.displayName && profile.displayName !== user.username && (
              <p className="text-xs text-gray-500">@{user.username}</p>
            )}
            <p className="text-[11px] text-gray-600 mt-0.5">ID: {user.roblox_user_id}</p>

            {profile?.isBanned && (
              <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-medium">
                <Shield className="w-2.5 h-2.5" /> Banned
              </span>
            )}

            {profile?.created && (
              <p className="text-[11px] text-gray-600 mt-2">
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
          <div className="bg-gray-950 rounded-lg p-3 text-center border border-gray-800">
            <p className="text-lg font-bold text-indigo-400">{user.total_executions.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Total Executions</p>
          </div>
          <div className="bg-gray-950 rounded-lg p-3 text-center border border-gray-800">
            <p className="text-lg font-bold text-purple-400">{user.places.length}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Games Played</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <div className="flex items-center gap-1.5 text-gray-400 bg-gray-950 rounded-lg px-3 py-2 border border-gray-800">
            <Calendar className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-600">First seen</p>
              <p className="text-white text-[11px]">{timeAgo(user.earliest_seen)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400 bg-gray-950 rounded-lg px-3 py-2 border border-gray-800">
            <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-600">Last seen</p>
              <p className="text-white text-[11px]">{timeAgo(user.latest_seen)}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            Game History
          </p>
          <div className="space-y-2">
            {user.places.map((place) => (
              <div key={place.place_id} className="flex items-center justify-between bg-gray-950 rounded-lg px-3 py-2 border border-gray-800">
                <div className="flex items-center gap-2 min-w-0">
                  <Gamepad2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {place.game_name ?? `Place ${place.place_id}`}
                    </p>
                    <p className="text-[10px] text-gray-600">
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

export function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);

  const search = useCallback(async (value: string) => {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setSelectedUser(null);
      return;
    }

    setLoading(true);
    setSearched(true);
    setSelectedUser(null);

    const { data: rows } = await supabase
      .from('unique_users')
      .select('*')
      .eq('token', trimmed)
      .limit(50);

    if (!rows || rows.length === 0) {
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
    search(val);
  };

  if (selectedUser) {
    return <UserProfilePanel user={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-purple-400" />
        User Lookup
      </h3>

      <div className="relative mb-4">
        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          value={query}
          onChange={handleChange}
          placeholder="Search by token (e.g. A3X9K)..."
          maxLength={8}
          className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-purple-500 focus:ring-purple-500/20 font-mono tracking-widest uppercase"
        />
      </div>

      {loading && <div className="text-center py-6 text-gray-500 text-sm">Searching...</div>}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">No user found for token "{query}"</div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <button
              key={user.roblox_user_id}
              onClick={() => setSelectedUser(user)}
              className="w-full text-left p-3 bg-gray-950 rounded-lg border border-gray-800 hover:border-purple-500/40 hover:bg-gray-900 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm group-hover:text-purple-300 transition-colors">{user.username}</p>
                    <p className="text-[10px] text-gray-600">ID {user.roblox_user_id} · {user.places.length} game{user.places.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-indigo-400">{user.total_executions.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-600">execs</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
