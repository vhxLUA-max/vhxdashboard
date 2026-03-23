import { Skeleton } from '@/components/ui/skeleton';
import { Gamepad2, Zap } from 'lucide-react';

interface GameEntry {
  game_name: string | null;
  count: number;
  last_executed_at: string | null;
  place_id?: number;
}

interface RecentActivityListProps {
  executions: GameEntry[];
  loading?: boolean;
}

function timeAgo(dateString: string): string {
  const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export function RecentActivityList({ executions, loading = false }: RecentActivityListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
            <Skeleton className="h-10 w-10 rounded-full" style={{ backgroundColor: 'var(--color-surface)' }} />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" style={{ backgroundColor: 'var(--color-surface)' }} />
              <Skeleton className="h-3 w-24" style={{ backgroundColor: 'var(--color-surface)' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const sorted = [...executions]
    .filter(e => e.game_name && e.game_name !== 'Unknown')
    .sort((a, b) => b.count - a.count);

  if (sorted.length === 0) {
    return <p className="text-center py-6 text-sm" style={{ color: 'var(--color-muted)' }}>No executions yet</p>;
  }

  const max = sorted[0]?.count ?? 1;

  return (
    <div className="space-y-2">
      {sorted.map((game) => (
        <div key={game.game_name}
          className="flex items-center gap-4 p-4 rounded-xl border transition-colors"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
            <Gamepad2 className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{game.game_name}</p>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Zap className="w-3 h-3" style={{ color: 'var(--color-accent)' }} />
                <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
                  {game.count.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: 'var(--color-surface)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(game.count / max) * 100}%`, backgroundColor: 'var(--color-accent)' }} />
            </div>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              {game.last_executed_at ? `Last exec ${timeAgo(game.last_executed_at)}` : 'No executions yet'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
