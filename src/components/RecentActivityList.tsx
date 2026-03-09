import type { Execution } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Zap } from 'lucide-react';

interface RecentActivityListProps {
  executions: Execution[];
  loading?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
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
          key={execution.id}
          className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
        >
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            execution.status === 'success' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
          }`}>
            <User className={`w-5 h-5 ${
              execution.status === 'success' ? 'text-emerald-400' : 'text-rose-400'
            }`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white truncate">
                {execution.username || execution.user_id}
              </span>
              <span className="text-gray-500 text-sm">·</span>
              <span className="text-gray-400 text-sm">
                {formatRelativeTime(execution.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Zap className="w-3 h-3" />
                {formatDuration(execution.duration_ms)}
              </span>
              {execution.metadata?.source && (
                <span className="text-xs text-gray-600">
                  via {execution.metadata.source}
                </span>
              )}
            </div>
          </div>

          <Badge
            variant="outline"
            className={`capitalize ${
              execution.status === 'success'
                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                : 'border-rose-500/30 text-rose-400 bg-rose-500/10'
            }`}
          >
            {execution.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}
