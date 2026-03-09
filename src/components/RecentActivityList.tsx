import type { GameExecution } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Activity } from 'lucide-react';

interface RecentActivityListProps {
  executions: GameExecution[];
  loading?: boolean;
}

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
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
            <Skeleton className="h-10 w-10 rounded-full bg-gray-800" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 bg-gray-800" />
              <Skeleton className="h-3 w-24 bg-gray-800" />
            </div>
            <Skeleton className="h-6 w-16 bg-gray-800" />
          </div>
        ))}
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-800">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 mb-4">
          <Clock className="w-6 h-6 text-gray-500" />
        </div>
        <p className="text-gray-400 text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((execution) => (
        <div
          key={execution.place_id}
          className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500/10">
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white truncate">Place {execution.place_id}</span>
              <span className="text-gray-500 text-sm">·</span>
              <span className="text-gray-400 text-sm">{formatRelativeTime(execution.last_executed_at)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {execution.count.toLocaleString()} executions
            </p>
          </div>

          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Active
          </span>
        </div>
      ))}
    </div>
  );
}
