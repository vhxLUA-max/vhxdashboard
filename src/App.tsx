import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useSupabaseDashboard } from '@/hooks/useSupabaseDashboard';
import { supabase } from '@/lib/supabase';
import type { DateRange } from '@/types';
import { Header } from '@/components/Header';
import { MetricCard } from '@/components/MetricCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { isConfigured } from '@/lib/supabase';
import { LiveRecentActivity } from '@/components/LiveRecentActivity';
import { LiveCharts } from '@/components/LiveCharts';
import { ExecutionHeatmap } from '@/components/ExecutionHeatmap';
import { RatingsPanel } from '@/components/RatingsPanel';
import { ExecutionRateBadge } from '@/components/ExecutionRateBadge';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { Activity, Users, Clock, RefreshCw, BarChart3, Gamepad2, Search, Webhook, Key, ShieldCheck, Megaphone, Code, Loader2, Palette, Shield, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginModal } from '@/components/LoginModal';
import { logout } from '@/lib/auth';
import { initTheme } from '@/components/ThemeManager';
import { toast } from 'sonner';

initTheme();

const AccountManager = lazy(() => import('@/components/AccountManager').then(m => ({ default: m.AccountManager })));
const UserSearch     = lazy(() => import('@/components/UserSearch').then(m => ({ default: m.UserSearch })));
const WebhookTab     = lazy(() => import('@/components/WebhookTab').then(m => ({ default: m.WebhookTab })));
const MyTokenPanel   = lazy(() => import('@/components/MyTokenPanel').then(m => ({ default: m.MyTokenPanel })));
const ScriptsTab     = lazy(() => import('@/components/ScriptsTab').then(m => ({ default: m.ScriptsTab })));
const ThemeManager   = lazy(() => import('@/components/ThemeManager').then(m => ({ default: m.ThemeManager })));
const StatusTab      = lazy(() => import('@/components/StatusTab').then(m => ({ default: m.StatusTab })));
const ChangelogTab   = lazy(() => import('@/components/ChangelogTab').then(m => ({ default: m.ChangelogTab })));
const AdminPanel     = lazy(() => import('@/components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const FeedbackTab    = lazy(() => import('@/components/FeedbackTab').then(m => ({ default: m.FeedbackTab })));

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) {
    const m = Math.floor(diff / 60), s = Math.floor(diff % 60);
    return m > 0 ? `${m}m ${s}s ago` : `${s}s ago`;
  }
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function useLiveTimeAgo(iso: string | null | undefined): string {
  const [display, setDisplay] = useState(() => iso ? timeAgo(iso) : '-');
  useEffect(() => {
    if (!iso) { setDisplay('-'); return; }
    setDisplay(timeAgo(iso));
    const t = setInterval(() => setDisplay(timeAgo(iso)), 1000);
    return () => clearInterval(t);
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
    const ch = supabase.channel('live-total')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return count;
}

function useLive24h() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('game_executions').select('daily_count,daily_reset_at');
      if (!data) return;
      const today = new Date().toISOString().slice(0, 10);
      setCount(data.reduce((s: number, e: { daily_count?: number; daily_reset_at?: string }) =>
        s + (e.daily_reset_at?.slice(0, 10) === today ? (e.daily_count ?? 0) : 0), 0));
    };
    fetch();
    const poll = setInterval(fetch, 15000);
    const ch = supabase.channel('live-24h')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetch)
      .subscribe();
    return () => { clearInterval(poll); supabase.removeChannel(ch); };
  }, []);
  return count;
}

function useLiveUniqueUsers() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const fetch = async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data } = await supabase.from('unique_users').select('roblox_user_id').gte('last_seen', since);
      if (data) setCount(new Set(data.map((u: { roblox_user_id: number }) => u.roblox_user_id)).size);
    };
    fetch();
    const poll = setInterval(fetch, 30000);
    const ch = supabase.channel('live-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, fetch)
      .subscribe();
    return () => { clearInterval(poll); supabase.removeChannel(ch); };
  }, []);
  return count;
}

function useLiveNewUsers() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const fetch = async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data } = await supabase.from('unique_users').select('roblox_user_id').gte('first_seen', today.toISOString());
      if (data) setCount(new Set(data.map((u: { roblox_user_id: number }) => u.roblox_user_id)).size);
    };
    fetch();
    const poll = setInterval(fetch, 60000);
    const ch = supabase.channel('live-new-users')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'unique_users' }, fetch)
      .subscribe();
    return () => { clearInterval(poll); supabase.removeChannel(ch); };
  }, []);
  return count;
}

function useLiveLastExecution() {
  const [iso, setIso] = useState<string | null>(null);
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('game_executions').select('last_executed_at').order('last_executed_at', { ascending: false }).limit(1);
      if (data?.[0]) setIso(data[0].last_executed_at);
    };
    fetch();
    const ch = supabase.channel('live-last-exec')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return useLiveTimeAgo(iso);
}

function useLiveAllExecutions() {
  const [execs, setExecs] = useState<import('@/types').GameExecution[]>([]);
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('game_executions').select('place_id,count,last_executed_at,game_name').order('last_executed_at', { ascending: false });
      if (data) setExecs(data);
    };
    fetch();
    const ch = supabase.channel('live-all-execs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return execs;
}

const ADMIN_USERNAMES = ['vhxlua-max', 'vhxlua'];

async function checkIsAdmin(userId: string, username: string | null): Promise<boolean> {
  try {
    const { data } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (data) return true;
  } catch { /* fall through */ }
  return ADMIN_USERNAMES.includes(username?.toLowerCase() ?? '');
}

type SidebarTab = 'stats' | 'search' | 'webhook' | 'token' | 'scripts' | 'themes' | 'feedback' | 'status' | 'changelog' | 'admin';

const TABS = [
  { id: 'stats',     label: 'Stats',     icon: BarChart3     },
  { id: 'search',    label: 'Search',    icon: Search        },
  { id: 'webhook',   label: 'Webhook',   icon: Webhook       },
  { id: 'token',     label: 'Token',     icon: Key           },
  { id: 'scripts',   label: 'Scripts',   icon: Code          },
  { id: 'themes',    label: 'Themes',    icon: Palette       },
  { id: 'feedback',  label: 'Feedback',  icon: MessageSquare },
  { id: 'status',    label: 'Status',    icon: ShieldCheck   },
  { id: 'changelog', label: 'Changelog', icon: Megaphone     },
  { id: 'admin',     label: 'Admin',     icon: Shield        },
] as const;

const TabFallback = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-muted)' }} />
  </div>
);

function App() {
  const [dateRange, setDateRange]         = useState<DateRange>('24h');
  const [activeTab, setActiveTab]         = useState<SidebarTab>(() => (localStorage.getItem('vhx_tab') as SidebarTab) ?? 'stats');

  const switchTab = useCallback((tab: SidebarTab) => {
    setActiveTab(tab);
    localStorage.setItem('vhx_tab', tab);
  }, []);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null);
  const [isAdmin, setIsAdmin]             = useState(false);
  const [showLogin, setShowLogin]         = useState(false);
  const [showAccount, setShowAccount]     = useState(false);
  const { loading, error, refresh }       = useSupabaseDashboard(dateRange);
  const handleRefresh                     = useCallback(() => refresh(), [refresh]);
  const connected                         = isConfigured();
  const liveAllExecs                      = useLiveAllExecutions();
  const liveCount                         = useLiveCounter();
  const live24h                           = useLive24h();
  const liveUsers                         = useLiveUniqueUsers();
  const liveNewUsers                      = useLiveNewUsers();
  const lastExecution                     = useLiveLastExecution();
  const visibleTabs                       = TABS.filter(t => t.id !== 'admin' || isAdmin);

  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    let startX = 0;
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) < 60) return;
      const idx = visibleTabs.findIndex(t => t.id === activeTab);
      if (diff > 0 && idx < visibleTabs.length - 1) switchTab(visibleTabs[idx + 1].id);
      else if (diff < 0 && idx > 0) switchTab(visibleTabs[idx - 1].id);
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { window.removeEventListener('touchstart', onTouchStart); window.removeEventListener('touchend', onTouchEnd); };
  }, [activeTab, visibleTabs, switchTab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?') { setShowShortcuts(v => !v); return; }
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < visibleTabs.length) switchTab(visibleTabs[idx].id as SidebarTab);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visibleTabs, switchTab]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const u = session.user?.user_metadata?.username ?? null;
      setAdminUsername(u);
      setAvatarUrl(session.user?.user_metadata?.avatar_url ?? null);
      checkIsAdmin(session.user.id, u).then(setIsAdmin);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user?.user_metadata?.username ?? null;
      setAdminUsername(u);
      setAvatarUrl(session?.user?.user_metadata?.avatar_url ?? null);
      if (session?.user) checkIsAdmin(session.user.id, u).then(setIsAdmin);
      else setIsAdmin(false);
    });
    if (new URLSearchParams(window.location.search).get('reset') === 'true')
      window.history.replaceState({}, '', window.location.pathname);
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
      <Header
        isConnected={connected}
        username={adminUsername}
        avatarUrl={avatarUrl}
        onLoginClick={() => setShowLogin(true)}
        onLogout={async () => { await logout(); setAdminUsername(null); setAvatarUrl(null); setIsAdmin(false); toast.success('Signed out'); }}
        onAccountClick={() => setShowAccount(true)}
      />

      {showLogin && <LoginModal onSuccess={() => { setShowLogin(false); toast.success('Signed in'); }} onClose={() => setShowLogin(false)} />}

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
              onClick={() => switchTab(tab.id)}
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
          <button
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
            className="mt-auto flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-[9px] font-mono text-gray-600 hover:text-gray-400 transition-colors"
          >
            <span className="px-1.5 py-0.5 rounded border border-gray-700 text-[10px]">?</span>
            keys
          </button>
        </aside>

        {showShortcuts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative rounded-2xl border shadow-2xl p-6 w-full max-w-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }} onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-semibold mb-4 flex items-center justify-between" style={{ color: 'var(--color-text)' }}>
                Keyboard Shortcuts
                <button onClick={() => setShowShortcuts(false)} style={{ color: 'var(--color-muted)' }}>✕</button>
              </h3>
              <div className="space-y-2">
                {visibleTabs.map((tab, i) => (
                  <div key={tab.id} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{tab.label}</span>
                    <kbd className="px-2 py-0.5 rounded border text-[10px] font-mono" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface2)' }}>{i + 1}</kbd>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Toggle this panel</span>
                  <kbd className="px-2 py-0.5 rounded border text-[10px] font-mono" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface2)' }}>?</kbd>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
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

            <div className="lg:hidden flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{visibleTabs.find(t => t.id === activeTab)?.label}</span>
              <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>swipe to navigate</span>
            </div>
            <div className="lg:hidden grid grid-cols-5 gap-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 mb-6">
              {visibleTabs.map(tab => (
                <button key={tab.id} onClick={() => switchTab(tab.id)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-lg text-[10px] font-medium transition-all ${
                    activeTab === tab.id
                      ? tab.id === 'admin'
                        ? 'bg-white dark:bg-gray-800 text-rose-400 shadow-sm'
                        : 'bg-white dark:bg-gray-800 text-indigo-500 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}>
                  <tab.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="leading-none text-center">{tab.label}</span>
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
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      <MetricCard title="Total Executions" value={(dateRange === '24h' ? live24h : liveCount)?.toLocaleString() ?? '-'} subtitle={dateRange === '24h' ? 'Today' : `In last ${dateRange}`} icon={Activity} loading={false} />
                      <MetricCard title="Unique Users"     value={liveUsers?.toLocaleString() ?? '-'}    subtitle="Active in last 24h" icon={Users} loading={false} />
                      <MetricCard title="New Users Today"  value={liveNewUsers?.toLocaleString() ?? '-'} subtitle="First seen today"   icon={Users} loading={false} />
                      <MetricCard title="Last Execution"   value={lastExecution}                         subtitle="Most recent activity" icon={Clock} loading={false} />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <Gamepad2 className="w-5 h-5 text-indigo-400" /> Supported Games
                      </h3>
                      {liveAllExecs.length === 0 && !loading ? <EmptyState /> : <LiveRecentActivity />}
                    </div>

                    <LiveCharts dateRange={dateRange} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                        <ExecutionHeatmap executions={liveAllExecs} loading={false} />
                      </div>
                      <RatingsPanel />
                    </div>
                  </div>
                )}

                <Suspense fallback={<TabFallback />}>
                  <div key={activeTab}>
                    {activeTab === 'search'    && <UserSearch />}
                    {activeTab === 'webhook'   && <WebhookTab />}
                    {activeTab === 'token'     && <MyTokenPanel />}
                    {activeTab === 'scripts'   && <ScriptsTab />}
                    {activeTab === 'themes'    && <ThemeManager />}
                    {activeTab === 'feedback'  && <FeedbackTab />}
                    {activeTab === 'status'    && <StatusTab />}
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
