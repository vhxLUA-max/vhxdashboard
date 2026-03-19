import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';

const MEDAL = ['🥇', '🥈', '🥉'];

type AggUser = { roblox_user_id: number; username: string; total: number };

export function TopUsersLeaderboard() {
  const [users, setUsers]     = useState<AggUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('unique_users')
      .select('roblox_user_id,username,execution_count');

    if (!data) { setLoading(false); return; }

    const agg: Record<number, AggUser> = {};
    for (const row of data) {
      const id = row.roblox_user_id;
      if (!id) continue;
      if (!agg[id]) agg[id] = { roblox_user_id: id, username: row.username, total: 0 };
      agg[id].total += row.execution_count ?? 0;
    }
    setUsers(Object.values(agg).sort((a, b) => b.total - a.total).slice(0, 10));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return (
    <div className="rounded-xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
        <Trophy className="w-5 h-5 text-amber-400" />
        Top Users
      </h3>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <Skeleton className="h-4 w-4" style={{ backgroundColor: 'var(--color-border)' }} />
              <Skeleton className="h-4 flex-1" style={{ backgroundColor: 'var(--color-border)' }} />
              <Skeleton className="h-4 w-12" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-center text-sm py-4" style={{ color: 'var(--color-muted)' }}>No users yet</p>
      ) : (
        <div className="space-y-2">
          {users.map((u, i) => (
            <div key={u.roblox_user_id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)' }}>
              <span className="text-sm w-5 text-center">{MEDAL[i] ?? <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{i + 1}</span>}</span>
              <span className="flex-1 text-sm truncate" style={{ color: 'var(--color-text)' }}>{u.username ?? `User ${u.roblox_user_id}`}</span>
              <span className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>{u.total.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
