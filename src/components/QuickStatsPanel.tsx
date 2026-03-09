import type { DashboardData } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Activity, TrendingUp } from 'lucide-react';

interface QuickStatsPanelProps {
  data: DashboardData | null;
  loading?: boolean;
}

export function QuickStatsPanel({ data, loading = false }: QuickStatsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
          <Skeleton className="h-4 w-24 bg-gray-800 mb-3" />
          <Skeleton className="h-8 w-16 bg-gray-800" />
        </div>
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
          <Skeleton className="h-4 w-24 bg-gray-800 mb-3" />
          <Skeleton className="h-8 w-16 bg-gray-800" />
        </div>
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
          <Skeleton className="h-4 w-24 bg-gray-800 mb-3" />
          <Skeleton className="h-8 w-16 bg-gray-800" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 bg-gray-900 rounded-lg border border-gray-800">
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  const stats = [
    {
      label: 'Success Rate',
      value: `${data.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Successful',
      value: data.successful.toLocaleString(),
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Failed',
      value: data.failed.toLocaleString(),
      icon: XCircle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
    {
      label: 'Total Executions',
      value: data.totalExecutions.toLocaleString(),
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="space-y-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-800"
        >
          <div className={`p-2 rounded-lg ${stat.bgColor}`}>
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-lg font-semibold text-white">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
