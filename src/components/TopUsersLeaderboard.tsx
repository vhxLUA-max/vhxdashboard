import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Ban } from 'lucide-react';

const MEDAL = ['🥇', '🥈', '🥉'];

type AggUser = { roblox_user_id: number; username: string; total: number; banned: boolean };

export function TopUsersLeaderboard() {
  const [users, setUsers]     = useState<AggUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: rows }, { data: bans }] = await Promise.all([
      supabase.from('unique_users').select('roblox_user_id,username,execution_count'),
      supabase.from('banned_users').select('roblox_user_id'),
    ]);

    if (!rows) { setLoading(false); return; }

    const bannedSet = new Set((bans ?? []).map((b: { roblox_user_id: number }) => b.roblox_user_id));

    const agg: Record<number, AggUser> = {};
    for (const row of rows) {
      const id = row.roblox_user_id;
      if (!id) continue;
      if (!agg[id]) agg[id] = { roblox_user_id: id, username: row.username, total: 0, banned: bannedSet.has(id) };
      agg[id].total += row.execution_count ?? 0;
    }

    setUsers(Object.values(agg).sort((a, b) => b.total - a.total).slice(0, 10));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 15000);
    const ch = supabase.channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banned_users' }, load)
      .subscribe();
    return () => { clearInterval(poll); supabase.removeChannel(ch); };
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
            <div key={u.roblox_user_id}
              className="flex items-center gap-3 p-3 rounded-lg border transition-all"
              style={{
                backgroundColor: u.banned ? 'rgba(239,68,68,0.05)' : 'var(--color-surface2)',
                borderColor: u.banned ? 'rgba(239,68,68,0.25)' : 'var(--color-border)',
              }}>
              <span className="text-sm w-5 text-center shrink-0">
                {MEDAL[i] ?? <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{i + 1}</span>}
              </span>
              <span className="flex-1 text-sm truncate" style={{ color: u.banned ? '#f87171' : 'var(--color-text)', textDecoration: u.banned ? 'line-through' : 'none' }}>
                {u.username ?? `User ${u.roblox_user_id}`}
              </span>
              {u.banned && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Ban className="w-2.5 h-2.5" /> banned
                </span>
              )}
              <span className="text-xs font-medium shrink-0" style={{ color: u.banned ? '#f87171' : 'var(--color-accent)' }}>
                {u.total.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
