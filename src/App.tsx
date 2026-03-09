import { useState, useCallback } from 'react';
import { useSupabaseDashboard } from '@/hooks/useSupabaseDashboard';
import type { DateRange } from '@/types';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { RecentActivityList } from '@/components/RecentActivityList';
import { QuickStatsPanel } from '@/components/QuickStatsPanel';
import { RealtimeBanner } from '@/components/RealtimeBanner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { isFetcherConfigured } from '@/lib/supabase';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  BarChart3,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function App() {
  const [dateRange, setDateRange] = useState<DateRange>('24h');
  
  const { data, loading, error, realtimeExecutions, refresh } = useSupabaseDashboard(dateRange);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleDismissRealtime = useCallback(() => {
    // Realtime queue is cleared in the hook when data refreshes
  }, []);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const isConnected = isFetcherConfigured();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header isConnected={isConnected} />
      
      <RealtimeBanner 
        executions={realtimeExecutions} 
        onRefresh={handleRefresh}
        onDismiss={handleDismissRealtime}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-white">Dashboard Overview</h2>
            <p className="text-sm text-gray-500 mt-1">
              Monitor your execution metrics and performance
            </p>
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

        {/* Error State */}
        {error && !loading && (
          <div className="mb-8">
            <ErrorState message={error.message} onRetry={handleRefresh} />
          </div>
        )}

        {/* Main Content */}
        {!error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Metrics & Activity */}
            <div className="lg:col-span-2 space-y-8">
              {/* Metric Cards */}
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
                  title="Success Rate"
                  value={data ? `${data.successRate.toFixed(1)}%` : '-'}
                  subtitle={`${data?.successful.toLocaleString() ?? '-'} successful`}
                  icon={TrendingUp}
                  trend={data && data.successRate > 90 ? 'up' : 'neutral'}
                  loading={loading}
                />
                <MetricCard
                  title="Average Duration"
                  value={data ? formatDuration(data.avgDuration) : '-'}
                  subtitle="Per execution"
                  icon={Clock}
                  loading={loading}
                />
              </div>

              {/* Recent Activity */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Recent Activity
                  </h3>
                  <span className="text-sm text-gray-500">
                    Last 10 executions
                  </span>
                </div>
                
                {!loading && data && data.recentExecutions.length === 0 ? (
                  <EmptyState />
                ) : (
                  <RecentActivityList 
                    executions={data?.recentExecutions ?? []} 
                    loading={loading} 
                  />
                )}
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats Panel */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Quick Stats
                </h3>
                <QuickStatsPanel data={data} loading={loading} />
              </div>

              {/* Info Panel */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Database Configuration
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">DB 1 (Fetcher)</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isConnected 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {isConnected ? 'Connected' : 'Demo'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">DB 2 (Dashboard)</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-400">
                      Configurable
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Realtime</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                      Active
                    </span>
                  </div>
                </div>
                
                {!isConnected && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-400">
                      <strong>Demo Mode:</strong> Configure environment variables to connect to your Supabase databases.
                    </p>
                  </div>
                )}
              </div>

              {/* Environment Variables Help */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Environment Variables
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2 bg-gray-950 rounded border border-gray-800">
                    <span className="text-purple-400">REACT_APP_SUPABASE_URL_FETCHER</span>
                  </div>
                  <div className="p-2 bg-gray-950 rounded border border-gray-800">
                    <span className="text-purple-400">REACT_APP_SUPABASE_ANON_KEY_FETCHER</span>
                  </div>
                  <div className="p-2 bg-gray-950 rounded border border-gray-800">
                    <span className="text-blue-400">REACT_APP_SUPABASE_URL_DASHBOARD</span>
                  </div>
                  <div className="p-2 bg-gray-950 rounded border border-gray-800">
                    <span className="text-blue-400">REACT_APP_SUPABASE_ANON_KEY_DASHBOARD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Execution Analytics Dashboard
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>React 18</span>
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
