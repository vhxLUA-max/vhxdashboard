import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Gamepad2, Clock, Loader2 } from 'lucide-react';

type HistoryRow = {
  id: string;
  game_name: string | null;
  executed_at: string;
};

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `${Math.floor(s)}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ExecutionHistory({ robloxUserId }: { robloxUserId: number }) {
  const [rows, setRows]     = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('execution_history')
      .select('id,game_name,executed_at')
      .eq('roblox_user_id', robloxUserId)
      .order('executed_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, [robloxUserId]);

  if (loading) return (
    <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-muted)' }} /></div>
  );

  if (rows.length === 0) return (
    <div className="text-center py-8 text-sm" style={{ color: 'var(--color-muted)' }}>No execution history yet</div>
  );

  // Group by date
  const groups: Record<string, HistoryRow[]> = {};
  for (const r of rows) {
    const key = formatDate(r.executed_at);
    (groups[key] = groups[key] || []).push(r);
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([date, items]) => (
        <div key={date}>
          <p className="text-[11px] font-semibold mb-2 px-1" style={{ color: 'var(--color-muted)' }}>{date}</p>
          <div className="space-y-1">
            {items.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: 'var(--color-surface2)' }}>
                <Gamepad2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
                <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {r.game_name || 'Unknown game'}
                </span>
                <span className="text-[11px] shrink-0" style={{ color: 'var(--color-muted)' }}>
                  {formatTime(r.executed_at)}
                </span>
                <span className="text-[10px] w-16 text-right shrink-0" style={{ color: 'var(--color-muted)' }}>
                  {timeAgo(r.executed_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
