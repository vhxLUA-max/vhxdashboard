import { useState, useCallback, useEffect } from 'react';
import { useSupabaseDashboard } from '@/hooks/useSupabaseDashboard';
import { supabase } from '@/lib/supabase';
import type { DateRange } from '@/types';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { RecentActivityList } from '@/components/RecentActivityList';
import { UserSearch } from '@/components/UserSearch';
import { WebhookTab } from '@/components/WebhookTab';
import { MyTokenPanel } from '@/components/MyTokenPanel';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { isConfigured } from '@/lib/supabase';
import { ExecutionsChart } from '@/components/ExecutionsChart';
import { GameBreakdownChart } from '@/components/GameBreakdownChart';
import { TopUsersLeaderboard } from '@/components/TopUsersLeaderboard';
import { ExecutionRateBadge } from '@/components/ExecutionRateBadge';
import { StatusTab } from '@/components/StatusTab';
import { ChangelogTab } from '@/components/ChangelogTab';
import { Activity, Users, Clock, RefreshCw, BarChart3, Gamepad2, Search, Webhook, Key, ShieldCheck, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginModal } from '@/components/LoginModal';
import { logout } from '@/lib/auth';

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function useLiveCounter() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const fetchCount = async () => {
      const { data } = await supabase.from('game_executions').select('count');
      if (data) setCount(data.reduce((s: number, e: { count: number }) => s + e.count, 0));
    };
    fetchCount();
    const channel = supabase
      .channel('live-executions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetchCount)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  return count;
}

type SidebarTab = 'stats' | 'search' | 'webhook' | 'token' | 'status' | 'changelog';

const TABS = [
  { id: 'stats',     label: 'Stats',     icon: BarChart3   },
  { id: 'search',    label: 'Search',    icon: Search      },
  { id: 'webhook',   label: 'Webhook',   icon: Webhook     },
  { id: 'token',     label: 'Token',     icon: Key         },
  { id: 'status',    label: 'Status',    icon: ShieldCheck },
  { id: 'changelog', label: 'Changelog', icon: Megaphone   },
] as { id: SidebarTab; label: string; icon: React.ElementType }[];

function App() {
  const [dateRange, setDateRange]     = useState<DateRange>('24h');
  const [activeTab, setActiveTab]     = useState<SidebarTab>('stats');
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [showLogin, setShowLogin]     = useState(false);
  const { data, loading, error, refresh } = useSupabaseDashboard(dateRange);
  const handleRefresh = useCallback(() => refresh(), [refresh]);
  const connected = isConfigured();
  const liveCount = useLiveCounter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAdminUsername(session?.user?.user_metadata?.username ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAdminUsername(session?.user?.user_metadata?.username ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
      <Header isConnected={connected} username={adminUsername} onLoginClick={() => setShowLogin(true)} onLogout={async () => { await logout(); setAdminUsername(null); }} />
      {showLogin && <LoginModal onSuccess={() => setShowLogin(false)} onClose={() => setShowLogin(false)} />}

      <div className="flex flex-1">
        {/* Left nav sidebar */}
        <aside className="hidden lg:flex flex-col gap-1 w-20 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-2 py-6 sticky top-16 h-[calc(100vh-4rem)]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-[10px] font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-indigo-500 dark:text-indigo-400 shadow-sm border border-gray-200 dark:border-gray-700'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800/60'
              }`}
            >
              <tab.icon className="w-5 h-5 flex-shrink-0" />
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 min-w-0">
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard Overview</h2>
                <p className="text-sm text-gray-500 mt-1">Monitor your execution metrics and performance</p>
              </div>
              <div className="flex items-center gap-3">
                {liveCount !== null && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">{liveCount.toLocaleString()} live</span>
                  </div>
                )}
                <ExecutionRateBadge />
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Mobile tab bar */}
            <div className="flex lg:hidden gap-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {error && !loading && (
              <div className="mb-8">
                <ErrorState message={error.message} onRetry={handleRefresh} />
              </div>
            )}

            {!error && (
              <ErrorBoundary fallback={
                <div className="bg-gray-100 dark:bg-gray-900 rounded-xl border border-rose-500/20 p-6 text-center">
                  <p className="text-sm text-rose-400">This panel crashed. Try switching tabs.</p>
                </div>
              }>
                {activeTab === 'stats' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <MetricCard title="Total Executions" value={data?.totalExecutions.toLocaleString() ?? '-'} subtitle={`In last ${dateRange}`} icon={Activity} loading={loading} />
                      <MetricCard title="Unique Users" value={data?.uniqueUsers.toLocaleString() ?? '-'} subtitle={`Active in last ${dateRange}`} icon={Users} loading={loading} />
                      <MetricCard title="Active Scripts" value="3" subtitle="Deployed scripts" icon={Gamepad2} loading={loading} />
                      <MetricCard title="Last Execution" value={data?.lastExecutedAt ? timeAgo(data.lastExecutedAt) : '-'} subtitle="Most recent activity" icon={Clock} loading={loading} />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <Gamepad2 className="w-5 h-5 text-indigo-400" />
                        Supported Games
                      </h3>
                      {!loading && data && data.recentExecutions.length === 0
                        ? <EmptyState />
                        : <RecentActivityList executions={data?.recentExecutions ?? []} loading={loading} />
                      }
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                      <ExecutionsChart executions={data?.allExecutions ?? []} dateRange={dateRange} loading={loading} />
                      <GameBreakdownChart executions={data?.recentExecutions ?? []} loading={loading} />
                    </div>

                    <TopUsersLeaderboard adminUsername={adminUsername} />
                  </div>
                )}

                {activeTab === 'search'    && <UserSearch />}
                {activeTab === 'webhook'   && <WebhookTab />}
                {activeTab === 'token'     && <MyTokenPanel />}
                {activeTab === 'status'    && <StatusTab executions={data?.recentExecutions ?? []} />}
                {activeTab === 'changelog' && <ChangelogTab />}
              </ErrorBoundary>
            )}
          </main>
        </div>
      </div>

      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-sm text-gray-400 text-center">Execution Analytics Dashboard</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
