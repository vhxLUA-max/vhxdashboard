import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Zap, Crown, Image, Palette, Trophy, Lock, Check, Rocket, History, BadgeCheck, Scroll } from 'lucide-react';

interface LeaderboardEntry { username: string; total_executions: number; }
interface ProScript { id: string; title: string; description: string; game_name: string; loader_url: string; early_access: boolean; }
interface ExecHistory { id: string; game_name: string; executed_at: string; country: string; city: string; }

interface ProTabProps {
  isPro: boolean;
  isLoggedIn: boolean;
  userExecutions?: number;
}

const FEATURES = [
  { icon: Rocket,      color: '#f97316', bg: 'rgba(249,115,22,0.1)',   title: 'Early Access',            desc: 'Get new scripts before public release. First to try everything.',       pro: true  },
  { icon: Lock,        color: '#a855f7', bg: 'rgba(168,85,247,0.1)',   title: 'Exclusive Scripts',       desc: 'Pro-only scripts not available to free users.',                         pro: true  },
  { icon: History,     color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   title: 'Execution History',       desc: 'Full detailed log of every session — game, time, location, device.',   pro: true  },
  { icon: BadgeCheck,  color: '#10b981', bg: 'rgba(16,185,129,0.1)',   title: 'Custom Profile Badge',    desc: 'Set a custom badge on your profile with your own text and color.',       pro: true  },
  { icon: Image,       color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',    title: 'Animated Avatar (GIF)',   desc: 'Upload a GIF as your profile picture. Stand out from everyone.',        pro: true  },
  { icon: Palette,     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   title: 'Custom Profile Banner',   desc: 'Upload a banner image to personalize your profile.',                    pro: false },
  { icon: Crown,       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   title: 'Pro Badge',               desc: '✦ PRO gold badge on your profile and next to your name.',              pro: false },
  { icon: Trophy,      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   title: 'Leaderboard',             desc: 'Appear on the execution leaderboard and compete for the top spot.',     pro: false },
];

const WAYS = [
  { icon: '💳', title: 'Subscribe',        desc: 'Monthly plan — full Pro access instantly.',             badge: 'Soon' },
  { icon: '⚡', title: 'One-Time Purchase', desc: 'Pay once via GCash, keep Pro forever.',                badge: 'Soon' },
  { icon: '🏆', title: 'Earn It',           desc: 'Hit 10,000 total executions and Pro is auto-granted.', badge: 'Free' },
  { icon: '🎁', title: 'Admin Grant',       desc: 'Founders and admins can grant Pro to anyone.',         badge: null   },
];

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function ProTab({ isPro, isLoggedIn, userExecutions = 0 }: ProTabProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [proScripts,  setProScripts]  = useState<ProScript[]>([]);
  const [history,     setHistory]     = useState<ExecHistory[]>([]);
  const [activeSection, setActiveSection] = useState<'overview' | 'scripts' | 'history'>('overview');

  useEffect(() => {
    // Leaderboard
    supabase.from('unique_users').select('username,execution_count').order('execution_count', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, number> = {};
        for (const r of data) {
          if (!r.username) continue;
          map[r.username] = (map[r.username] ?? 0) + (r.execution_count ?? 0);
        }
        setLeaderboard(Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,10).map(([username, total_executions]) => ({ username, total_executions })));
      });

    // Pro scripts
    supabase.from('pro_scripts').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setProScripts((data ?? []) as ProScript[]));

    // Execution history (pro only)
    if (isPro && isLoggedIn) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase.from('execution_history').select('*').eq('user_id', user.id)
          .order('executed_at', { ascending: false }).limit(50)
          .then(({ data }) => setHistory((data ?? []) as ExecHistory[]));
      });
    }
  }, [isPro, isLoggedIn]);

  const progress = Math.min(100, (userExecutions / 10000) * 100);
  const s  = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)'  };
  const s2 = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border p-6 text-center relative overflow-hidden" style={s}>
        <div className="absolute inset-0 opacity-5" style={{ background: 'radial-gradient(ellipse at center, #f59e0b 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6" style={{ color: '#f59e0b' }} />
            <h2 className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              vhxLUA Pro
            </h2>
            <Sparkles className="w-6 h-6" style={{ color: '#f59e0b' }} />
          </div>
          {isPro ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#000' }}>
              <Check className="w-4 h-4" /> You have Pro
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Unlock the full vhxLUA experience</p>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex gap-1 p-1 rounded-xl border" style={s2}>
        {(['overview', 'scripts', 'history'] as const).map(sec => (
          <button key={sec} onClick={() => setActiveSection(sec)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all"
            style={activeSection === sec ? { backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' } : { color: 'var(--color-muted)' }}>
            {sec === 'overview' && <Sparkles className="w-3.5 h-3.5" />}
            {sec === 'scripts'  && <Lock      className="w-3.5 h-3.5" />}
            {sec === 'history'  && <History   className="w-3.5 h-3.5" />}
            {sec}
            {sec === 'history' && !isPro && <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#000' }}>PRO</span>}
            {sec === 'scripts'  && proScripts.filter(s => s.early_access).length > 0 && <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400">{proScripts.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeSection === 'overview' && (<>
        {/* Features grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map(f => (
            <div key={f.title} className="flex items-start gap-3 p-4 rounded-xl border" style={s2}>
              <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: f.bg }}>
                <f.icon className="w-4 h-4" style={{ color: f.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{f.title}</p>
                  {f.pro && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#000' }}>✦ PRO</span>}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{f.desc}</p>
              </div>
              {isPro ? <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--color-muted)' }} />}
            </div>
          ))}
        </div>

        {/* Progress */}
        {!isPro && (
          <div className="rounded-xl border p-4 space-y-2" style={s}>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--color-muted)' }}>Progress to free Pro</span>
              <span style={{ color: 'var(--color-text)' }}>{userExecutions.toLocaleString()} / 10,000</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#f59e0b,#f97316)' }} />
            </div>
            <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Hit 10,000 executions to unlock Pro for free</p>
          </div>
        )}

        {/* Ways to get Pro */}
        <div className="rounded-xl border p-4 space-y-3" style={s}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>How to get Pro</h3>
          <div className="grid grid-cols-2 gap-2">
            {WAYS.map(w => (
              <div key={w.title} className="p-3 rounded-lg border" style={s2}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{w.icon}</span>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{w.title}</p>
                  {w.badge && (
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={w.badge === 'Free' ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' } : { background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                      {w.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-xl border p-4 space-y-3" style={s}>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Trophy className="w-4 h-4" style={{ color: '#f59e0b' }} /> Top Executors
          </h3>
          <div className="space-y-1.5">
            {leaderboard.map((e, i) => (
              <div key={e.username} className="flex items-center gap-3 p-2.5 rounded-lg" style={s2}>
                <span className="text-xs font-bold w-5 text-center" style={{ color: i < 3 ? '#f59e0b' : 'var(--color-muted)' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                </span>
                <p className="flex-1 text-xs font-medium" style={{ color: 'var(--color-text)' }}>{e.username}</p>
                <span className="text-xs font-mono" style={{ color: 'var(--color-accent)' }}>{e.total_executions.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {/* ── Pro Scripts ── */}
      {activeSection === 'scripts' && (
        <div className="space-y-3">
          {proScripts.length === 0 ? (
            <div className="rounded-xl border p-8 text-center" style={s}>
              <Scroll className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>No exclusive scripts yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Check back soon — Pro scripts drop here first</p>
            </div>
          ) : proScripts.map(script => (
            <div key={script.id} className="rounded-xl border p-4" style={s2}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{script.title}</p>
                    {script.early_access && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">⚡ EARLY ACCESS</span>
                    )}
                    {!script.early_access && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#000' }}>✦ PRO</span>
                    )}
                  </div>
                  {script.game_name && <p className="text-xs mb-1" style={{ color: 'var(--color-accent)' }}>{script.game_name}</p>}
                  {script.description && <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{script.description}</p>}
                </div>
                {isPro ? (
                  <button onClick={() => { navigator.clipboard.writeText(`loadstring(game:HttpGet("${script.loader_url}"))()`); }}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#000' }}>
                    Copy
                  </button>
                ) : (
                  <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                    <Lock className="w-3 h-3" /> Pro only
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Execution History ── */}
      {activeSection === 'history' && (
        !isPro ? (
          <div className="rounded-xl border p-8 text-center" style={s}>
            <Lock className="w-8 h-8 mx-auto mb-3" style={{ color: '#f59e0b' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Pro Feature</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Upgrade to Pro to see your full execution history</p>
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border p-8 text-center" style={s}>
            <History className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>No history yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Your execution sessions will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs px-1" style={{ color: 'var(--color-muted)' }}>{history.length} sessions logged</p>
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border" style={s2}>
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{h.game_name || '—'}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
                    {h.city && h.country ? `${h.city}, ${h.country}` : h.country || '—'}
                  </p>
                </div>
                <p className="text-[10px] shrink-0" style={{ color: 'var(--color-muted)' }}>{timeAgo(h.executed_at)}</p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
