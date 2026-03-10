import { useState, useCallback, useEffect } from 'react';
import { useSupabaseDashboard } from '@/hooks/useSupabaseDashboard';
import { supabase } from '@/lib/supabase';
import { logout } from '@/lib/auth';
import type { AuthState } from '@/lib/auth';
import type { DateRange } from '@/types';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { RecentActivityList } from '@/components/RecentActivityList';
import { QuickStatsPanel } from '@/components/QuickStatsPanel';
import { UserSearch } from '@/components/UserSearch';
import { WebhookTab } from '@/components/WebhookTab';
import { LoginModal } from '@/components/LoginModal';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { LockedTab } from '@/components/LockedTab';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { isConfigured } from '@/lib/supabase';
import { Activity, Users, Clock, RefreshCw, BarChart3, Gamepad2, Search, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from('game_executions').select('count').gte('last_executed_at', since);
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

type SidebarTab = 'stats' | 'search' | 'webhook';

function App() {
  const [dateRange, setDateRange]   = useState<DateRange>('24h');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('stats');
  const [showLogin, setShowLogin]             = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ isLoggedIn: false, username: null, email: null });
  const [authReady, setAuthReady] = useState(false);
  const { data, loading, error, refresh } = useSupabaseDashboard(dateRange);
  const handleRefresh = useCallback(() => refresh(), [refresh]);
  const connected = isConfigured();
  const liveCount = useLiveCounter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuth({ isLoggedIn: false, username: null, email: null });
      } else {
        setAuth({
          isLoggedIn: true,
          username: session.user.user_metadata?.username ?? null,
          email: session.user.email ?? null,
        });
      }
      setAuthReady(true);
    });
    if (new URLSearchParams(window.location.search).get('reset') === 'true') {
      setShowChangePassword(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (username: string) => {
    setAuth({ isLoggedIn: true, username, email: null });
    setShowLogin(false);
  };

  const handleLogout = async () => {
    await logout();
    setAuth({ isLoggedIn: false, username: null, email: null });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header
        isConnected={connected}
        isLoggedIn={auth.isLoggedIn}
        username={auth.username}
        onLogin={() => setShowLogin(true)}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePassword(true)}
      />

      {showLogin && (
        <LoginModal
          onSuccess={handleLoginSuccess}
          onClose={() => setShowLogin(false)}
        />
      )}

      {showChangePassword && auth.username && (
        <ChangePasswordModal
          username={auth.username}
          onClose={() => setShowChangePassword(false)}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-white">Dashboard Overview</h2>
            <p className="text-sm text-gray-500 mt-1">Monitor your execution metrics and performance</p>
          </div>
          <div className="flex items-center gap-3">
            {liveCount !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">{liveCount.toLocaleString()} live</span>
              </div>
            )}
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
                <MetricCard title="Total Executions" value={data?.totalExecutions.toLocaleString() ?? '-'} subtitle={`In last ${dateRange}`} icon={Activity} loading={loading} />
                <MetricCard title="Unique Users" value={data?.uniqueUsers.toLocaleString() ?? '-'} subtitle="Active users" icon={Users} loading={loading} />
                <MetricCard title="Active Scripts" value="3" subtitle="Deployed scripts" icon={Gamepad2} loading={loading} />
                <MetricCard title="Last Execution" value={data?.lastExecutedAt ? timeAgo(data.lastExecutedAt) : '-'} subtitle="Most recent activity" icon={Clock} loading={loading} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-indigo-400" />
                    Supported Games
                  </h3>
                </div>
                {!loading && data && data.recentExecutions.length === 0 ? (
                  <EmptyState />
                ) : (
                  <RecentActivityList executions={data?.recentExecutions ?? []} loading={loading} />
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
                {([
                  { id: 'stats',   label: 'Stats',   icon: BarChart3 },
                  { id: 'search',  label: 'Search',  icon: Search    },
                  { id: 'webhook', label: 'Webhook', icon: Webhook   },
                ] as { id: SidebarTab; label: string; icon: React.ElementType }[]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSidebarTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-all ${
                      sidebarTab === tab.id ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {sidebarTab === 'stats' && (
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    Quick Stats
                  </h3>
                  <QuickStatsPanel data={data} loading={loading} />
                </div>
              )}

              {sidebarTab === 'search' && (
                !authReady ? null :
                auth.isLoggedIn
                  ? <UserSearch />
                  : <LockedTab label="User Search" onLogin={() => setShowLogin(true)} />
              )}

              {sidebarTab === 'webhook' && (
                !authReady ? null :
                auth.isLoggedIn
                  ? <WebhookTab />
                  : <LockedTab label="Webhook" onLogin={() => setShowLogin(true)} />
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-gray-500 text-center">Execution Analytics Dashboard</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
