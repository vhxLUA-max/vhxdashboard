import { useState, useCallback } from 'react';
import { useSupabaseDashboard } from '@/hooks/useSupabaseDashboard';
import type { DateRange } from '@/types';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { RecentActivityList } from '@/components/RecentActivityList';
import { QuickStatsPanel } from '@/components/QuickStatsPanel';
import { UserSearch } from '@/components/UserSearch';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { isConfigured } from '@/lib/supabase';
import { Activity, Users, TrendingUp, Clock, RefreshCw, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function App() {
  const [dateRange, setDateRange] = useState<DateRange>('24h');
  const { data, loading, error, refresh } = useSupabaseDashboard(dateRange);

  const handleRefresh = useCallback(() => refresh(), [refresh]);
  const connected = isConfigured();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header isConnected={connected} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-white">Dashboard Overview</h2>
            <p className="text-sm text-gray-500 mt-1">Monitor your execution metrics and performance</p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {error && !loading && (
          <div className="mb-8">
            <ErrorState message={error.message} onRetry={handleRefresh} />
          </div>
        )}

        {!error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MetricCard
                  title="Total Executions"
                  value={data?.totalExecutions.toLocaleString() ?? '-'}
                  subtitle={`In last ${dateRange}`}
                  icon={Activity}
                  loading={loading}
                />
                <MetricCard
                  title="Unique Users"
                  value={data?.uniqueUsers.toLocaleString() ?? '-'}
                  subtitle="Active users"
                  icon={Users}
                  loading={loading}
                />
                <MetricCard
                  title="Active Places"
                  value={data?.activePlaces.toLocaleString() ?? '-'}
                  subtitle="Distinct place IDs"
                  icon={TrendingUp}
                  loading={loading}
                />
                <MetricCard
                  title="Last Execution"
                  value={data?.lastExecutedAt ? timeAgo(data.lastExecutedAt) : '-'}
                  subtitle="Most recent activity"
                  icon={Clock}
                  loading={loading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Recent Activity
                  </h3>
                  <span className="text-sm text-gray-500">Last 10 executions</span>
                </div>

                {!loading && data && data.recentExecutions.length === 0 ? (
                  <EmptyState />
                ) : (
                  <RecentActivityList executions={data?.recentExecutions ?? []} loading={loading} />
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Quick Stats
                </h3>
                <QuickStatsPanel data={data} loading={loading} />
              </div>

              <UserSearch />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">Execution Analytics Dashboard</p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>React</span>
              <span>·</span>
              <span>Tailwind CSS</span>
              <span>·</span>
              <span>Supabase</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
