import type { DashboardData } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Users, MapPin, Clock } from 'lucide-react';

interface QuickStatsPanelProps {
  data: DashboardData | null;
  loading?: boolean;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function QuickStatsPanel({ data, loading = false }: QuickStatsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3 bg-gray-950 rounded-lg border border-gray-800">
            <Skeleton className="h-4 w-24 bg-gray-800 mb-2" />
            <Skeleton className="h-6 w-16 bg-gray-800" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">No data available</div>
    );
  }

  const stats = [
    {
      label: 'Total Executions',
      value: data.totalExecutions.toLocaleString(),
      icon: Activity,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      dot: 'bg-indigo-400',
    },
    {
      label: 'Unique Users',
      value: data.uniqueUsers.toLocaleString(),
      icon: Users,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      dot: 'bg-emerald-400',
    },
    {
      label: 'Active Places',
      value: data.activePlaces.toLocaleString(),
      icon: MapPin,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      dot: 'bg-blue-400',
    },
    {
      label: 'Last Execution',
      value: data.lastExecutedAt ? timeAgo(data.lastExecutedAt) : '—',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      dot: 'bg-amber-400',
    },
  ];

  return (
    <div className="space-y-3">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg border border-gray-800">
          <div className={`p-2 rounded-lg ${stat.bg}`}>
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-base font-semibold text-white">{stat.value}</p>
          </div>
        </div>
      ))}

      {data.recentUsers.length > 0 && (
        <div className="pt-3 mt-1 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">Recent Users</p>
          <div className="space-y-2">
            {data.recentUsers.map((u) => (
              <div key={u.user_id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                    <Users className="w-3 h-3 text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-300">{u.username ?? `user${u.user_id}`}</span>
                </div>
                <span className="text-xs text-gray-600">{timeAgo(u.last_seen)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
