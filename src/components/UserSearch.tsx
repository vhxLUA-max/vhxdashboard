import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { UniqueUser, GameExecution } from '@/types';
import { Search, Users, Clock, Calendar, Gamepad2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

type PlaceEntry = {
  place_id: number;
  game_name: string | null;
  first_seen: string;
  last_seen: string;
  execution_count: number | null;
};

type UserResult = {
  roblox_user_id: number;
  username: string;
  places: PlaceEntry[];
  earliest_seen: string;
  latest_seen: string;
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

export function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (value: string) => {
    if (!value.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    const { data: rows } = await supabase
      .from('unique_users')
      .select('*')
      .ilike('username', `%${value.trim()}%`)
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
        };
      }
      if (new Date(row.first_seen) < new Date(grouped[uid].earliest_seen)) {
        grouped[uid].earliest_seen = row.first_seen;
      }
      if (new Date(row.last_seen) > new Date(grouped[uid].latest_seen)) {
        grouped[uid].latest_seen = row.last_seen;
      }
      grouped[uid].places.push({
        place_id: row.place_id,
        game_name: execMap[row.place_id]?.game_name ?? null,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
        execution_count: execMap[row.place_id]?.count ?? null,
      });
    }

    setResults(Object.values(grouped));
    setLoading(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    search(val);
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-purple-400" />
        User Lookup
      </h3>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          value={query}
          onChange={handleChange}
          placeholder="Search username..."
          className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-purple-500 focus:ring-purple-500/20"
        />
      </div>

      {loading && (
        <div className="text-center py-6 text-gray-500 text-sm">Searching...</div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">No users found for "{query}"</div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          {results.map((user) => (
            <div key={user.roblox_user_id} className="p-4 bg-gray-950 rounded-lg border border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <span className="font-semibold text-white">{user.username}</span>
                  <span className="text-xs text-gray-500 ml-2">ID {user.roblox_user_id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Calendar className="w-3 h-3 text-gray-600" />
                  <span>First seen {timeAgo(user.earliest_seen)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="w-3 h-3 text-gray-600" />
                  <span>Last seen {timeAgo(user.latest_seen)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 col-span-2">
                  <Clock className="w-3 h-3 text-gray-600" />
                  <span>Total time using: {formatDuration(user.earliest_seen, user.latest_seen)}</span>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-3 space-y-2">
                <p className="text-xs text-gray-500 mb-1">
                  {user.places.length} place{user.places.length !== 1 ? 's' : ''}
                </p>
                {user.places.map((place) => (
                  <div key={place.place_id} className="flex items-center justify-between bg-gray-900 rounded-md px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-white">
                          {place.game_name ?? `Place ${place.place_id}`}
                        </p>
                        <p className="text-[10px] text-gray-600">
                          {formatDuration(place.first_seen, place.last_seen)} · last {timeAgo(place.last_seen)}
                        </p>
                      </div>
                    </div>
                    {place.execution_count !== null && (
                      <span className="text-xs font-semibold text-indigo-400 flex-shrink-0">
                        {place.execution_count.toLocaleString()} execs
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
