import type { GameExecution } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Gamepad2 } from 'lucide-react';

interface RecentActivityListProps {
  executions: GameExecution[];
  loading?: boolean;
}

const SUPPORTED_GAMES = ['Pixel Blade', 'Loot Hero', 'Flick'];

function formatRelativeTime(dateString: string): string {
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
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
            <Skeleton className="h-10 w-10 rounded-full bg-gray-800" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40 bg-gray-800" />
              <Skeleton className="h-3 w-24 bg-gray-800" />
            </div>
            <Skeleton className="h-6 w-16 bg-gray-800" />
          </div>
        ))}
      </div>
    );
  }

  const grouped: Record<string, { count: number; last_executed_at: string }> = {};
  for (const e of executions) {
    const name = e.game_name ?? `Place ${e.place_id}`;
    if (!SUPPORTED_GAMES.includes(name)) continue;
    if (!grouped[name]) {
      grouped[name] = { count: 0, last_executed_at: e.last_executed_at };
    }
    grouped[name].count += e.count;
    if (new Date(e.last_executed_at) > new Date(grouped[name].last_executed_at)) {
      grouped[name].last_executed_at = e.last_executed_at;
    }
  }

  const games = SUPPORTED_GAMES.map(name => ({
    name,
    count: grouped[name]?.count ?? 0,
    last_executed_at: grouped[name]?.last_executed_at ?? null,
  }));

  return (
    <div className="space-y-2">
      {games.map((game) => (
        <div
          key={game.name}
          className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-blue-600/10">
            <Gamepad2 className="w-5 h-5 text-indigo-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-white">{game.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {game.count > 0
                ? `${game.count.toLocaleString()} executions · ${formatRelativeTime(game.last_executed_at!)}`
                : 'No executions yet'}
            </p>
          </div>

          <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
            game.count > 0
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-gray-800 text-gray-500 border border-gray-700'
          }`}>
            {game.count > 0 ? 'Active' : 'Pending'}
          </span>
        </div>
      ))}
    </div>
  );
}
