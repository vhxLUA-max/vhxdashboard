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
import { LiveToastFeed } from '@/components/LiveToastFeed';
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
import { AdminPanel } from '@/components/AdminPanel';
const FeedbackTab    = lazy(() => import('@/components/FeedbackTab').then(m => ({ default: m.FeedbackTab })));
const SocialsTab     = lazy(() => import('@/components/SocialsTab').then(m => ({ default: m.SocialsTab })));

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

type SidebarTab = 'stats' | 'search' | 'webhook' | 'token' | 'scripts' | 'themes' | 'feedback' | 'status' | 'changelog' | 'admin' | 'socials';

const TABS = [
  { id: 'stats',     label: 'Stats',     icon: BarChart3     },
  { id: 'scripts',   label: 'Scripts',   icon: Code          },
  { id: 'search',    label: 'Search',    icon: Search        },
  { id: 'token',     label: 'Token',     icon: Key           },
  { id: 'changelog', label: 'Updates',   icon: Megaphone     },
  { id: 'socials',   label: 'Socials',   icon: Users         },
  { id: 'webhook',   label: 'Webhook',   icon: Webhook       },
  { id: 'themes',    label: 'Themes',    icon: Palette       },
  { id: 'feedback',  label: 'Feedback',  icon: MessageSquare },
  { id: 'status',    label: 'Status',    icon: ShieldCheck   },
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
  const [isLoggedIn, setIsLoggedIn]       = useState(false);
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
  // All tabs visible to everyone — gated tabs show a sign-in note inside the tab
  const visibleTabs = TABS.filter(t => {
    if (t.id === 'admin') return isAdmin;
    return true;
  });

  const [showShortcuts, setShowShortcuts] = useState(false);

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
      setIsLoggedIn(true);
      checkIsAdmin(session.user.id, u).then(setIsAdmin);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user?.user_metadata?.username ?? null;
      setAdminUsername(u);
      setAvatarUrl(session?.user?.user_metadata?.avatar_url ?? null);
      setIsLoggedIn(!!session?.user);
      if (session?.user) checkIsAdmin(session.user.id, u).then(setIsAdmin);
      else setIsAdmin(false);
    });
    if (new URLSearchParams(window.location.search).get('reset') === 'true')
      window.history.replaceState({}, '', window.location.pathname);
    const tabParam = new URLSearchParams(window.location.search).get('tab') as SidebarTab | null;
    if (tabParam && TABS.find(t => t.id === tabParam)) {
      switchTab(tabParam);
      window.history.replaceState({}, '', window.location.pathname);
    }
    return () => subscription.unsubscribe();
  }, []);

  const activeLabel = visibleTabs.find(t => t.id === activeTab)?.label ?? '';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg, #09090b)', color: 'var(--color-text)' }}>

      {/* ── Desktop header (hidden on mobile) ────────────────────────── */}
      <div className="hidden lg:block">
        <Header
          isConnected={connected}
          username={adminUsername}
          avatarUrl={avatarUrl}
          onLoginClick={() => setShowLogin(true)}
          onLogout={async () => { await logout(); setAdminUsername(null); setAvatarUrl(null); setIsAdmin(false); toast.success('Signed out'); }}
          onAccountClick={() => setShowAccount(true)}
        />
      </div>

      {/* ── Mobile header ─────────────────────────────────────────────── */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>V</div>
          <div>
            <p className="text-sm font-bold leading-none" style={{ color: 'var(--color-text)' }}>vhxLUA</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-muted)' }}>{activeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {liveCount !== null && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold"
              style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {liveCount.toLocaleString()}
            </div>
          )}
          {isLoggedIn ? (
            <button onClick={() => setShowAccount(true)}
              className="w-8 h-8 rounded-full overflow-hidden border-2 shrink-0"
              style={{ borderColor: 'var(--color-accent)' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
                    {adminUsername?.[0]?.toUpperCase() ?? 'U'}
                  </div>
              }
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}>
              Sign in
            </button>
          )}
        </div>
      </header>

      {showLogin && <LoginModal onSuccess={() => { setShowLogin(false); toast.success('Signed in'); }} onClose={() => setShowLogin(false)} />}

      {showAccount && (
        <Suspense fallback={null}>
          <AccountManager
            onClose={() => setShowAccount(false)}
            onUsernameChange={u => setAdminUsername(u)}
            onAvatarChange={url => setAvatarUrl(url)}
          />
        </Suspense>
      )}

      <AnnouncementBanner />
      <LiveToastFeed />

      {/* ── Mobile bottom nav ─────────────────────────────────────────── */}
      {(() => {
        const PAGE_SIZE = 5;
        const activeIdx = visibleTabs.findIndex(t => t.id === activeTab);
        const pageStart = Math.max(0, Math.min(
          Math.floor(activeIdx / PAGE_SIZE) * PAGE_SIZE,
          visibleTabs.length - PAGE_SIZE
        ));
        const pageTabs = visibleTabs.slice(pageStart, pageStart + PAGE_SIZE);
        const hasPrev = pageStart > 0;
        const hasNext = pageStart + PAGE_SIZE < visibleTabs.length;
        return (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-surface) 90%, transparent)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid var(--color-border)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}>
            <div className="flex items-stretch h-[58px]">
              <button
                onClick={() => hasPrev ? switchTab(visibleTabs[pageStart - 1].id) : undefined}
                className="flex items-center justify-center w-9 shrink-0 text-lg transition-all duration-150"
                style={{ color: hasPrev ? 'var(--color-muted)' : 'transparent', opacity: hasPrev ? 1 : 0 }}>‹</button>
              {pageTabs.map(tab => {
                const active = activeTab === tab.id;
                const isAdmin = tab.id === 'admin';
                const color = active ? (isAdmin ? '#f87171' : 'var(--color-accent)') : 'var(--color-muted)';
                return (
                  <button key={tab.id} onClick={() => switchTab(tab.id)}
                    className="relative flex flex-col items-center justify-center flex-1 gap-[3px] transition-all duration-200 active:scale-90"
                    style={{ color }}>
                    {active && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full transition-all duration-300"
                        style={{ backgroundColor: isAdmin ? '#f87171' : 'var(--color-accent)' }} />
                    )}
                    <tab.icon className="w-[22px] h-[22px] shrink-0 transition-all duration-200"
                      style={{ transform: active ? 'translateY(-1px) scale(1.1)' : 'none' }} />
                    <span className="text-[10px] font-medium leading-none"
                      style={{ fontWeight: active ? 600 : 400 }}>{tab.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => hasNext ? switchTab(visibleTabs[pageStart + PAGE_SIZE].id) : undefined}
                className="flex items-center justify-center w-9 shrink-0 text-lg transition-all duration-150"
                style={{ color: hasNext ? 'var(--color-muted)' : 'transparent', opacity: hasNext ? 1 : 0 }}>›</button>
            </div>
          </nav>
        );
      })()}

      {/* ── Main layout ───────────────────────────────────────────────── */}
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col gap-1 w-20 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-2 py-6 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          {visibleTabs.map((tab, i) => (
            <button key={tab.id} onClick={() => switchTab(tab.id)} title={`${tab.label} (${i + 1})`}
              className={`relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-[10px] font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? tab.id === 'admin' ? 'bg-rose-500/10 text-rose-400 shadow-sm border border-rose-500/30'
                    : 'bg-white dark:bg-gray-800 text-indigo-500 dark:text-indigo-400 shadow-sm border border-gray-200 dark:border-gray-700'
                  : tab.id === 'admin' ? 'text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/5'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800/60'
              }`}>
              <tab.icon className="w-5 h-5 flex-shrink-0" />
              {tab.label}
              <span className="absolute top-1.5 right-1.5 text-[8px] text-gray-600 font-mono">{i + 1}</span>
            </button>
          ))}
          <button onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)"
            className="mt-auto flex flex-col items-center gap-1 px-2 py-2 rounded-xl text-[9px] font-mono text-gray-600 hover:text-gray-400 transition-colors">
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
                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Toggle shortcuts</span>
                  <kbd className="px-2 py-0.5 rounded border text-[10px] font-mono" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface2)' }}>?</kbd>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 lg:py-6 pb-24 lg:pb-8">

            {/* Desktop stats header */}
            {activeTab === 'stats' && (
              <div className="hidden lg:flex items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Dashboard</h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Execution metrics and performance</p>
                </div>
                <div className="flex items-center gap-3">
                  {liveCount !== null && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-medium text-emerald-400">{liveCount.toLocaleString()} total</span>
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

            {/* Mobile stats controls */}
            {activeTab === 'stats' && (
              <div className="lg:hidden flex items-center justify-between gap-2 mb-4">
                <DateRangeFilter value={dateRange} onChange={setDateRange} />
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 shrink-0">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            )}

            {error && !loading && (
              <div className="mb-6"><ErrorState message={error.message} onRetry={handleRefresh} /></div>
            )}

            {!error && (
              <ErrorBoundary fallback={
                <div className="rounded-xl border border-rose-500/20 p-6 text-center">
                  <p className="text-sm text-rose-400">This panel crashed. Try switching tabs.</p>
                </div>
              }>
                {activeTab === 'stats' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <MetricCard title="Executions" value={(dateRange === '24h' ? live24h : liveCount)?.toLocaleString() ?? '-'} subtitle={dateRange === '24h' ? 'Today' : `Last ${dateRange}`} icon={Activity} loading={false} />
                      <MetricCard title="Users"      value={liveUsers?.toLocaleString() ?? '-'}    subtitle="Active 24h"    icon={Users}   loading={false} />
                      <MetricCard title="New Today"  value={liveNewUsers?.toLocaleString() ?? '-'} subtitle="First seen"    icon={Users}   loading={false} />
                      <MetricCard title="Last Exec"  value={lastExecution}                         subtitle="Most recent"   icon={Clock}   loading={false} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: 'var(--color-text)' }}>
                        <Gamepad2 className="w-4 h-4 text-indigo-400" /> Games
                      </h3>
                      {liveAllExecs.length === 0 && !loading ? <EmptyState /> : <LiveRecentActivity />}
                    </div>
                    <LiveCharts dateRange={dateRange} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                        <ExecutionHeatmap executions={liveAllExecs} loading={false} />
                      </div>
                      <RatingsPanel />
                    </div>
                  </div>
                )}

                <Suspense fallback={<TabFallback />}>
                  <div>
                    {activeTab === 'search'    && (isLoggedIn
                      ? <UserSearch isAdmin={isAdmin} />
                      : <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Sign in to search users</p>
                          <button onClick={() => setShowLogin(true)} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>Sign In</button>
                        </div>
                    )}
                    {activeTab === 'webhook'   && (isLoggedIn
                      ? <WebhookTab />
                      : <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Sign in for webhook settings</p>
                          <button onClick={() => setShowLogin(true)} className="px-5 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-accent)' }}>Sign In</button>
                        </div>
                    )}
                    {activeTab === 'token'     && <MyTokenPanel />}
                    {activeTab === 'scripts'   && <ScriptsTab />}
                    {activeTab === 'themes'    && <ThemeManager />}
                    {activeTab === 'feedback'  && <FeedbackTab />}
                    {activeTab === 'status'    && <StatusTab />}
                    {activeTab === 'changelog' && <ChangelogTab />}
                    {activeTab === 'socials'   && <SocialsTab />}
                  </div>
                </Suspense>
                <div style={{ display: activeTab === 'admin' ? 'block' : 'none' }}>
                  <AdminPanel />
                </div>
              </ErrorBoundary>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
