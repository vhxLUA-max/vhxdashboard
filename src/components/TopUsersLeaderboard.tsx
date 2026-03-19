import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';

const MEDAL       = ['🥇', '🥈', '🥉'];
const ADMIN_NAME  = (import.meta.env.VITE_ADMIN_USERNAME ?? 'vhxLUA-max').toLowerCase();

type AggUser = { roblox_user_id: number; username: string; total: number };

export function TopUsersLeaderboard({ adminUsername }: { adminUsername: string | null }) {
  const [users, setUsers]   = useState<AggUser[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = adminUsername?.toLowerCase() === ADMIN_NAME;

  const fetch = useCallback(async () => {
    const [{ data: userRows }] = await Promise.all([
      supabase.from('unique_users').select('roblox_user_id,username,execution_count'),
      supabase.from('game_executions').select('place_id,count'),
    ]);
    if (!userRows) { setLoading(false); return; }

    const agg: Record<number, AggUser> = {};
    for (const row of userRows) {
      const id = row.roblox_user_id;
      if (!agg[id]) agg[id] = { roblox_user_id: id, username: row.username, total: 0 };
      agg[id].total += row.execution_count ?? 0;
    }
    setUsers(Object.values(agg).sort((a, b) => b.total - a.total).slice(0, 10));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    fetch();
    const ch = supabase.channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin, fetch]);

  if (!isAdmin) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-400" />
        Top Users
      </h3>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg">
              <Skeleton className="h-4 w-4 bg-gray-800" />
              <Skeleton className="h-4 flex-1 bg-gray-800" />
              <Skeleton className="h-4 w-12 bg-gray-800" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-4">No users yet</p>
      ) : (
        <div className="space-y-2">
          {users.map((u, i) => (
            <div key={u.roblox_user_id} className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg border border-gray-800">
              <span className="text-sm w-5 text-center">{MEDAL[i] ?? <span className="text-gray-500 text-xs">{i + 1}</span>}</span>
              <span className="flex-1 text-sm text-white truncate">{u.username ?? `User ${u.roblox_user_id}`}</span>
              <span className="text-xs text-indigo-400 font-medium">{u.total.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
