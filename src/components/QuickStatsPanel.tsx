import type { DashboardData } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Users, Gamepad2, Clock } from 'lucide-react';

interface QuickStatsPanelProps {
  data: DashboardData | null;
  loading?: boolean;
  liveTotal?: number | null;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function QuickStatsPanel({ data, loading = false, liveTotal }: QuickStatsPanelProps) {
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
    return <div className="text-center py-8 text-gray-500 text-sm">No data available</div>;
  }

  const totalDisplay = liveTotal != null ? liveTotal.toLocaleString() : data.totalExecutions.toLocaleString();

  const stats = [
    { label: 'Total Executions', value: totalDisplay,                                                                icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Unique Users',     value: data.uniqueUsers.toLocaleString(),                                           icon: Users,    color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Active Scripts',   value: '3',                                                                         icon: Gamepad2, color: 'text-blue-400',    bg: 'bg-blue-500/10'   },
    { label: 'Last Execution',   value: data.lastExecutedAt ? timeAgo(data.lastExecutedAt) : '—',                    icon: Clock,    color: 'text-amber-400',   bg: 'bg-amber-500/10'  },
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
    </div>
  );
}
