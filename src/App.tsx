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
import { Activity, Users, Clock, RefreshCw, BarChart3, Gamepad2, Search, Webhook, Key, ShieldCheck, Megaphone, Code, Loader2, Palette, Shield, MessageSquare, FileText, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginModal } from '@/components/LoginModal';
import { logout } from '@/lib/auth';
import { initTheme } from '@/components/ThemeManager';
import { toast } from 'sonner';

initTheme();

const ProTab         = lazy(() => import('@/components/ProTab').then(m => ({ default: m.ProTab })));
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
const PrivacyPolicy  = lazy(() => import('@/components/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
import { SiteSearch } from '@/components/SiteSearch';
import { ProfileView } from '@/components/ProfileView';

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
      const { data } = await supabase
        .from('game_executions')
        .select('last_executed_at')
        .order('last_executed_at', { ascending: false })
        .limit(1);
      const val = data?.[0]?.last_executed_at ?? null;
      if (val) setIso(val);
    };
    fetch();
    const poll = setInterval(fetch, 5000);
    const ch = supabase.channel('live-last-exec')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_executions' }, fetch)
      .subscribe();
    return () => { clearInterval(poll); supabase.removeChannel(ch); };
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

const ADMIN_USERNAMES = ['vhxlua-max'];

async function checkIsAdmin(userId: string, username: string | null): Promise<boolean> {
  try {
    const { data } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (data) return true;
  } catch { /* fall through */ }
  return ADMIN_USERNAMES.includes(username?.toLowerCase() ?? '');
}

type SidebarTab = 'stats' | 'search' | 'webhook' | 'token' | 'scripts' | 'themes' | 'feedback' | 'status' | 'changelog' | 'admin' | 'socials' | 'privacy' | 'pro';

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
  { id: 'privacy',   label: 'Privacy',   icon: FileText      },
  { id: 'pro',       label: 'Pro',        icon: Crown         },
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
  const [isPro, setIsPro]                 = useState(false);
  const [userExecs, setUserExecs]         = useState(0);
  const [showLogin, setShowLogin]         = useState(false);
  const [showAccount, setShowAccount]     = useState(false);
  const [showProfile, setShowProfile]     = useState(false);
  const { loading, error, refresh }       = useSupabaseDashboard(dateRange);
  const handleRefresh                     = useCallback(() => refresh(), [refresh]);
  const connected                         = isConfigured();
  const liveAllExecs                      = useLiveAllExecutions();
  const liveCount                         = useLiveCounter();
  const live24h                           = useLive24h();
  const liveUsers                         = useLiveUniqueUsers();
  const liveNewUsers                      = useLiveNewUsers();
  const lastExecution                     = useLiveLastExecution();
  const visibleTabs = TABS.filter(t => {
    if (t.id === 'admin') return isAdmin;
    return true;
  });

  const [showDrawer, setShowDrawer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?') { setShowShortcuts(v => !v); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch(true); return; }
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < visibleTabs.length) switchTab(visibleTabs[idx].id as SidebarTab);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visibleTabs, switchTab]);

  useEffect(() => {
    const resolveUsername = async (user: import('@supabase/supabase-js').User): Promise<string | null> => {
      let u = user.user_metadata?.username as string | null ?? null;
      if (u) return u;
      const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
      const email = user.email ?? null;
      if (fullName) {
        u = (fullName as string).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
      } else if (email) {
        u = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
      }
      if (u) {
        await supabase.auth.updateUser({ data: { username: u } });
      }
      return u;
    };

    const resolveAvatar = (user: import('@supabase/supabase-js').User): string | null =>
      user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const u = await resolveUsername(session.user);
      setAdminUsername(u);
      setAvatarUrl(resolveAvatar(session.user));
      setIsLoggedIn(true);
      checkIsAdmin(session.user.id, u).then(setIsAdmin);
      // Pro check
      supabase.from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle().then(({ data }) => {
        setIsPro(data?.role === 'pro' || data?.role === 'founder' || data?.role === 'admin');
      });
      // Execution count for auto-grant
      supabase.from('unique_users').select('execution_count').eq('roblox_user_id', session.user.id).then(({ data }) => {
        const total = (data ?? []).reduce((s: number, r: { execution_count: number }) => s + (r.execution_count ?? 0), 0);
        setUserExecs(total);
        if (total >= 10000) {
          supabase.from('user_roles').upsert({ user_id: session.user.id, username: u ?? '', role: 'pro' });
          setIsPro(true);
        }
      });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!session?.user) {
        setAdminUsername(null); setAvatarUrl(null);
        setIsLoggedIn(false); setIsAdmin(false); return;
      }
      const u = await resolveUsername(session.user);
      setAdminUsername(u);
      setAvatarUrl(resolveAvatar(session.user));
      setIsLoggedIn(true);
      checkIsAdmin(session.user.id, u).then(setIsAdmin);
      supabase.from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle().then(({ data }) => {
        setIsPro(data?.role === 'pro' || data?.role === 'founder' || data?.role === 'admin');
      });
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

      {/* ── Mobile header — Rscripts style ───────────────────────────── */}
      <header className="lg:hidden flex items-center justify-between px-5 h-14 sticky top-0 z-30"
        style={{ backgroundColor: 'var(--color-bg, #09090b)' }}>
        {/* Left: logo + name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}>V</div>
          <span className="text-base font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>vhx hub</span>
        </div>
        {/* Right: action icons */}
        <div className="flex items-center gap-1">
          {liveCount !== null && (
            <span className="mr-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              {liveCount.toLocaleString()}
            </span>
          )}
          <button onClick={() => setShowSearch(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--color-muted)' }}>
            <Search className="w-5 h-5" />
          </button>
          {isLoggedIn ? (
            <button onClick={() => setShowProfile(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full overflow-hidden shrink-0"
              style={{ color: 'var(--color-muted)' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
                    {adminUsername?.[0]?.toUpperCase() ?? 'U'}
                  </div>
              }
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{ color: 'var(--color-muted)' }}>
              <Users className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setShowDrawer(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--color-muted)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {showLogin && <LoginModal onSuccess={() => { setShowLogin(false); toast.success('Signed in'); }} onClose={() => setShowLogin(false)} />}

      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
            <ProfileView
              username={adminUsername}
              avatarUrl={avatarUrl}
              isAdmin={isAdmin}
              isLoggedIn={isLoggedIn}
              onEditProfile={() => { setShowProfile(false); setShowAccount(true); }}
            />
          </div>
        </div>
      )}

      {showAccount && (
        <Suspense fallback={null}>
          <AccountManager
            onClose={() => setShowAccount(false)}
            onUsernameChange={u => setAdminUsername(u)}
            onAvatarChange={url => setAvatarUrl(url)}
            isPro={isPro}
          />
        </Suspense>
      )}

      <AnnouncementBanner />
      <LiveToastFeed />
      {showSearch && <SiteSearch onClose={() => setShowSearch(false)} onNavigate={id => { switchTab(id as any); }} isAdmin={isAdmin} />}

      {/* ── Mobile bottom nav — 4 fixed tabs + Menu ────────────────────── */}
      {(() => {
        const BOTTOM_TABS = visibleTabs.filter(t => ['stats','scripts','search','token'].includes(t.id));
        return (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
            style={{
              backgroundColor: 'var(--color-bg, #09090b)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}>
            <div className="flex items-stretch h-[60px]">
              {BOTTOM_TABS.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => switchTab(tab.id)}
                    className="flex flex-col items-center justify-center flex-1 gap-1 transition-all duration-150 active:opacity-60"
                    style={{ color: active ? 'var(--color-accent)' : 'rgba(160,160,175,0.7)' }}>
                    <tab.icon className="w-6 h-6 shrink-0" />
                    <span className="text-[10px] leading-none" style={{ fontWeight: active ? 600 : 400 }}>{tab.label}</span>
                  </button>
                );
              })}
              {/* Menu button — opens drawer */}
              <button onClick={() => setShowDrawer(true)}
                className="flex flex-col items-center justify-center flex-1 gap-1 transition-all duration-150 active:opacity-60"
                style={{ color: showDrawer ? 'var(--color-accent)' : 'rgba(160,160,175,0.7)' }}>
                <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-[10px] leading-none">Menu</span>
              </button>
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
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile drawer (hamburger menu) ────────────────────────────── */}
        {showDrawer && (
          <div className="lg:hidden fixed inset-0 z-50" onClick={() => setShowDrawer(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70" />
            {/* Sheet slides up from bottom */}
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden flex flex-col max-h-[88vh]"
              style={{ backgroundColor: '#111113' }}
              onClick={e => e.stopPropagation()}>

              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
              </div>

              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 py-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white"
                    style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}>V</div>
                  <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>vhx hub</span>
                </div>
                <button onClick={() => setShowDrawer(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-lg"
                  style={{ color: 'var(--color-muted)', backgroundColor: 'rgba(255,255,255,0.06)' }}>✕</button>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1 px-4 pb-6">

                {isLoggedIn && (
                  <div className="mb-4">
                    <ProfileView
                      username={adminUsername}
                      avatarUrl={avatarUrl}
                      isAdmin={isAdmin}
                      isPro={isPro}
                      isLoggedIn={isLoggedIn}
                      onEditProfile={() => { setShowDrawer(false); setShowAccount(true); }}
                      compact
                    />
                  </div>
                )}

                {/* Not logged in CTA */}
                {!isLoggedIn && (
                  <div className="rounded-xl p-4 mb-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Welcome to vhx hub</p>
                    <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>Sign in to unlock all features</p>
                    <button onClick={() => { setShowDrawer(false); setShowLogin(true); }}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ backgroundColor: 'var(--color-accent)' }}>
                      Log in / Sign up
                    </button>
                  </div>
                )}

                {/* NAVIGATE section */}
                <p className="text-[10px] font-semibold tracking-widest mb-2 px-1" style={{ color: 'var(--color-muted)' }}>NAVIGATE</p>
                <div className="rounded-xl overflow-hidden mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  {visibleTabs.map((tab, i) => (
                    <button key={tab.id} onClick={() => { switchTab(tab.id); setShowDrawer(false); }}
                      className="w-full flex items-center gap-4 px-4 py-4 transition-colors text-left"
                      style={{
                        backgroundColor: activeTab === tab.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                        color: activeTab === tab.id
                          ? tab.id === 'admin' ? '#f87171' : 'var(--color-accent)'
                          : 'var(--color-text)',
                        borderBottom: i < visibleTabs.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}>
                      <tab.icon className="w-5 h-5 shrink-0" style={{ color: activeTab === tab.id ? (tab.id === 'admin' ? '#f87171' : 'var(--color-accent)') : 'var(--color-muted)' }} />
                      <span className="text-sm font-medium">{tab.label}</span>
                      {activeTab === tab.id && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tab.id === 'admin' ? '#f87171' : 'var(--color-accent)' }} />}
                    </button>
                  ))}
                </div>

                {/* COMMUNITY section */}
                <p className="text-[10px] font-semibold tracking-widest mb-2 px-1" style={{ color: 'var(--color-muted)' }}>COMMUNITY</p>
                <div className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  {[
                    {
                      label: 'Discord Server', url: 'https://discord.gg/usEnYvqnaJ',
                      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>,
                      color: '#5865F2',
                    },
                    {
                      label: 'YouTube', url: 'https://youtube.com/@vhxlua?si=0j9rYLl0qPf3gu1Y',
                      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
                      color: '#FF0000',
                    },
                    {
                      label: 'TikTok', url: 'https://www.tiktok.com/@vhxlua_?lang=en',
                      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>,
                      color: '#ff0050',
                    },
                    {
                      label: 'Rscripts', url: 'https://rscripts.net/@vhxLUA_',
                      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
                      color: '#a78bfa',
                    },
                    {
                      label: 'GitHub', url: 'https://github.com/vhxLUA-max',
                      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>,
                      color: '#e6edf3',
                    },
                  ].map((item, i, arr) => (
                    <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center gap-4 px-4 py-4 transition-colors"
                      style={{ color: 'var(--color-text)', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', textDecoration: 'none' }}>
                      <span className="w-5 h-5 flex items-center justify-center shrink-0" style={{ color: item.color }}>{item.icon}</span>
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                      <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted)' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  ))}
                </div>

                {/* Log out */}
                {isLoggedIn && (
                  <button onClick={async () => { await logout(); setAdminUsername(null); setAvatarUrl(null); setIsAdmin(false); setIsLoggedIn(false); setShowDrawer(false); toast.success('Signed out'); }}
                    className="flex items-center gap-3 px-1 py-2 transition-colors"
                    style={{ color: '#ef4444' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-sm font-semibold">Log Out</span>
                  </button>
                )}
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
                    {activeTab === 'privacy'   && <PrivacyPolicy />}
                    {activeTab === 'pro'       && <Suspense fallback={<TabFallback />}><ProTab isPro={isPro} isLoggedIn={isLoggedIn} userExecutions={userExecs} /></Suspense>}
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
