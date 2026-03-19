import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useSupabaseDashboard } from '@/hooks/useSupabaseDashboard';
import { supabase } from '@/lib/supabase';
import type { DateRange } from '@/types';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { RecentActivityList } from '@/components/RecentActivityList';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { isConfigured } from '@/lib/supabase';
import { ExecutionsChart } from '@/components/ExecutionsChart';
import { GameBreakdownChart } from '@/components/GameBreakdownChart';
import { ExecutionHeatmap } from '@/components/ExecutionHeatmap';
import { RatingsPanel } from '@/components/RatingsPanel';
import { TopUsersLeaderboard } from '@/components/TopUsersLeaderboard';
import { ExecutionRateBadge } from '@/components/ExecutionRateBadge';
import { Activity, Users, Clock, RefreshCw, BarChart3, Gamepad2, Search, Webhook, Key, ShieldCheck, Megaphone, Code, Loader2, Palette, Shield, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginModal } from '@/components/LoginModal';
import { logout } from '@/lib/auth';
import { toast } from 'sonner';
import { initTheme } from '@/components/ThemeManager';
const AccountManager = lazy(() => import('@/components/AccountManager').then(m => ({ default: m.AccountManager })));

initTheme();

const UserSearch          = lazy(() => import('@/components/UserSearch').then(m => ({ default: m.UserSearch })));
const WebhookTab       = lazy(() => import('@/components/WebhookTab').then(m => ({ default: m.WebhookTab })));
const MyTokenPanel     = lazy(() => import('@/components/MyTokenPanel').then(m => ({ default: m.MyTokenPanel })));
const ScriptsTab       = lazy(() => import('@/components/ScriptsTab').then(m => ({ default: m.ScriptsTab })));
const ThemeManager     = lazy(() => import('@/components/ThemeManager').then(m => ({ default: m.ThemeManager })));
const StatusTab        = lazy(() => import('@/components/StatusTab').then(m => ({ default: m.StatusTab })));
const ChangelogTab     = lazy(() => import('@/components/ChangelogTab').then(m => ({ default: m.ChangelogTab })));
const AdminPanel       = lazy(() => import('@/components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const FeedbackTab      = lazy(() => import('@/components/FeedbackTab').then(m => ({ default: m.FeedbackTab })));
import { AnnouncementBanner } from '@/components/AnnouncementBanner';

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function useLiveTimeAgo(iso: string | null | undefined): string {
  const [display, setDisplay] = useState(() => iso ? timeAgo(iso) : '-');
  useEffect(() => {
    if (!iso) { setDisplay('-'); return; }
    setDisplay(timeAgo(iso));
    const interval = setInterval(() => setDisplay(timeAgo(iso)), 1000);
    return () => clearInterval(interval);
  }, [iso]);
  return display;
}

function useLiveCounter() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('game_executions').select('count');
      if (data) setCount(data.reduce((s: number, e: { count: number }) => s + (e.count ?? 0), 0));
    };
    fetch();
    const ch = supabase.channel('live-executions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return count;
}

type SidebarTab = 'stats' | 'search' | 'webhook' | 'token' | 'scripts' | 'themes' | 'feedback' | 'status' | 'changelog' | 'admin';

const TABS = [
  { id: 'stats',     label: 'Stats',     icon: BarChart3    },
  { id: 'search',    label: 'Search',    icon: Search       },
  { id: 'webhook',   label: 'Webhook',   icon: Webhook      },
  { id: 'token',     label: 'Token',     icon: Key          },
  { id: 'scripts',   label: 'Scripts',   icon: Code         },
  { id: 'themes',    label: 'Themes',    icon: Palette      },
  { id: 'feedback',  label: 'Feedback',  icon: MessageSquare},
  { id: 'status',    label: 'Status',    icon: ShieldCheck  },
  { id: 'changelog', label: 'Changelog', icon: Megaphone    },
  { id: 'admin',     label: 'Admin',     icon: Shield       },
] as const;

const TabFallback = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-muted)' }} />
  </div>
);

function App() {
  const [dateRange, setDateRange]         = useState<DateRange>('24h');
  const [activeTab, setActiveTab]         = useState<SidebarTab>('stats');
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null);
  const [isAdmin, setIsAdmin]             = useState(false);
  const [showLogin, setShowLogin]         = useState(false);
  const [showAccount, setShowAccount]     = useState(false);
  const { data, loading, error, refresh } = useSupabaseDashboard(dateRange);
  const handleRefresh = useCallback(() => refresh(), [refresh]);
  const visibleTabs = TABS.filter(t => t.id !== 'admin' || isAdmin);
  const connected     = isConfigured();
  const liveCount     = useLiveCounter();
  const lastExecution = useLiveTimeAgo(data?.lastExecutedAt);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < visibleTabs.length) setActiveTab(visibleTabs[idx].id);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const u = session.user?.user_metadata?.username ?? null;
        const av = session.user?.user_metadata?.avatar_url ?? null;
        setAdminUsername(u);
        setAvatarUrl(av);
        if (session.user) {
          supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle()
            .then(({ data }) => setIsAdmin(!!data));
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user?.user_metadata?.username ?? null;
      const av = session?.user?.user_metadata?.avatar_url ?? null;
      setAdminUsername(u);
      setAvatarUrl(av);
      if (session?.user) {
        supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle()
          .then(({ data }) => setIsAdmin(!!data));
      } else {
        setIsAdmin(false);
      }
      if (session?.expires_at) {
        const msLeft = session.expires_at * 1000 - Date.now();
        const warnAt = msLeft - 5 * 60 * 1000;
        if (warnAt > 0) setTimeout(() => toast.warning('Your session expires in 5 minutes.', { duration: 10000 }), warnAt);
      }
    });

    if (new URLSearchParams(window.location.search).get('reset') === 'true') {

      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
      <Header
        isConnected={connected}
        username={adminUsername}
        avatarUrl={avatarUrl}
        onLoginClick={() => setShowLogin(true)}
        onLogout={async () => { await logout(); setAdminUsername(null); setAvatarUrl(null); setIsAdmin(false); }}
        onAccountClick={() => setShowAccount(true)}
      />

      {showLogin && (
        <LoginModal onSuccess={() => setShowLogin(false)} onClose={() => setShowLogin(false)} />
      )}

      {showAccount && adminUsername && (
        <Suspense fallback={null}>
          <AccountManager
            onClose={() => setShowAccount(false)}
            onUsernameChange={u => setAdminUsername(u)}
            onAvatarChange={url => setAvatarUrl(url)}
          />
        </Suspense>
      )}

      <AnnouncementBanner />

      <div className="flex flex-1">
        <aside className="hidden lg:flex flex-col gap-1 w-20 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-2 py-6 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          {visibleTabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={`${tab.label} (${i + 1})`}
              className={`relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-[10px] font-medium transition-all ${
                activeTab === tab.id
                  ? tab.id === 'admin'
                    ? 'bg-rose-500/10 text-rose-400 shadow-sm border border-rose-500/30'
                    : 'bg-white dark:bg-gray-800 text-indigo-500 dark:text-indigo-400 shadow-sm border border-gray-200 dark:border-gray-700'
                  : tab.id === 'admin'
                  ? 'text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/5'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800/60'
              }`}
            >
              <tab.icon className="w-5 h-5 flex-shrink-0" />
              {tab.label}
              <span className="absolute top-1.5 right-1.5 text-[8px] text-gray-600 font-mono">{i + 1}</span>
            </button>
          ))}
        </aside>

        <div className="flex-1 min-w-0">
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <AnnouncementBanner />

            {activeTab === 'stats' && (
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
                  <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}
                    className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex lg:hidden gap-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
              {visibleTabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {error && !loading && (
              <div className="mb-8"><ErrorState message={error.message} onRetry={handleRefresh} /></div>
            )}

            {!error && (
              <ErrorBoundary fallback={
                <div className="bg-gray-100 dark:bg-gray-900 rounded-xl border border-rose-500/20 p-6 text-center">
                  <p className="text-sm text-rose-400">This panel crashed. Try switching tabs.</p>
                </div>
              }>
                {activeTab === 'stats' && (
                  <div key="stats" className="tab-animate space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <MetricCard title="Total Executions" value={data?.totalExecutions.toLocaleString() ?? '-'} subtitle={`In last ${dateRange}`} icon={Activity} loading={loading} />
                      <MetricCard title="Unique Users"     value={data?.uniqueUsers.toLocaleString() ?? '-'}     subtitle={`Active in last ${dateRange}`} icon={Users} loading={loading} />
                      <MetricCard title="New Users Today"  value={data?.newUsersToday.toLocaleString() ?? '-'}   subtitle="First seen today" icon={Users} loading={loading} />
                      <MetricCard title="Last Execution"   value={lastExecution} subtitle="Most recent activity" icon={Clock} loading={loading} />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <Gamepad2 className="w-5 h-5 text-indigo-400" /> Supported Games
                      </h3>
                      {!loading && data?.recentExecutions.length === 0
                        ? <EmptyState />
                        : <RecentActivityList executions={data?.recentExecutions ?? []} loading={loading} />
                      }
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                      <ExecutionsChart executions={data?.allExecutions ?? []} dateRange={dateRange} loading={loading} />
                      <GameBreakdownChart executions={data?.recentExecutions ?? []} loading={loading} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                        <ExecutionHeatmap executions={data?.allExecutions ?? []} loading={loading} />
                      </div>
                      <RatingsPanel />
                    </div>

                    <TopUsersLeaderboard adminUsername={adminUsername} />
                  </div>
                )}

                <Suspense fallback={<TabFallback />}>
                  <div key={activeTab} className="tab-animate">
                    {activeTab === 'search'    && <UserSearch />}
                    {activeTab === 'webhook'   && <WebhookTab />}
                    {activeTab === 'token'     && <MyTokenPanel />}
                    {activeTab === 'scripts'   && <ScriptsTab />}
                    {activeTab === 'themes'    && <ThemeManager />}
                    {activeTab === 'feedback'  && <FeedbackTab />}
                    {activeTab === 'status'    && <StatusTab executions={data?.recentExecutions ?? []} />}
                    {activeTab === 'changelog' && <ChangelogTab />}
                    {activeTab === 'admin'     && <AdminPanel />}
                  </div>
                </Suspense>
              </ErrorBoundary>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
