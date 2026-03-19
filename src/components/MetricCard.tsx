import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

export const MetricCard = memo(function MetricCard({ title, value, subtitle, icon: Icon, trend = 'neutral', loading = false }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div className="space-y-3 w-full">
            <Skeleton className="h-4 w-24 bg-gray-800" />
            <Skeleton className="h-8 w-20 bg-gray-800" />
            <Skeleton className="h-3 w-32 bg-gray-800" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg bg-gray-800" />
        </div>
      </div>
    );
  }

  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-rose-400',
    neutral: 'text-gray-400',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className={`text-xs ${trendColors[trend]}`}>{subtitle}</p>
          )}
        </div>
        <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Icon className="w-5 h-5 text-gray-300" />
        </div>
      </div>
    </div>
  );
}
);
