import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Zap, Crown, Star, Image, Palette, Trophy, Lock, Check, ChevronRight } from 'lucide-react';

interface LeaderboardEntry {
  username: string;
  avatar_url: string | null;
  total_executions: number;
  is_pro: boolean;
}

interface ProTabProps {
  isPro: boolean;
  isLoggedIn: boolean;
  userExecutions?: number;
}

const PRO_FEATURES = [
  {
    icon: Image,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
    title: 'Animated Avatar',
    desc: 'Upload GIFs as your profile picture. Stand out from everyone else.',
    free: false,
  },
  {
    icon: Palette,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    title: 'Custom Profile Banner',
    desc: 'Upload a banner image to personalize your profile page.',
    free: false,
  },
  {
    icon: Crown,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    title: 'Pro Badge',
    desc: 'Gold Pro badge displayed on your profile and next to your name.',
    free: false,
  },
  {
    icon: Trophy,
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.1)',
    title: 'Leaderboard Access',
    desc: 'Appear on the execution leaderboard and compete with other users.',
    free: false,
  },
  {
    icon: Zap,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.1)',
    title: 'Early Access',
    desc: 'Get new scripts and features before they drop to the public.',
    free: false,
  },
  {
    icon: Star,
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.1)',
    title: 'Priority Support',
    desc: 'Jump the queue in Discord. Get help from the team directly.',
    free: false,
  },
];

const PRO_WAYS = [
  { icon: '💳', title: 'Subscribe', desc: 'Monthly or yearly plan — full Pro access instantly.', badge: 'Most Popular' },
  { icon: '⚡', title: 'One-Time Purchase', desc: 'Pay once, keep Pro forever. No recurring charges.', badge: null },
  { icon: '🏆', title: 'Earn It', desc: 'Hit 10,000 total executions and Pro is automatically granted.', badge: 'Free' },
  { icon: '🎁', title: 'Admin Grant', desc: 'Founders and admins can grant Pro to outstanding community members.', badge: null },
];

export function ProTab({ isPro, isLoggedIn, userExecutions = 0 }: ProTabProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLb, setLoadingLb] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingLb(true);
      const { data } = await supabase
        .from('unique_users')
        .select('username, execution_count')
        .order('execution_count', { ascending: false })
        .limit(10);

      if (data) {
        // Group by username and sum executions
        const map: Record<string, number> = {};
        for (const row of data) {
          if (!row.username) continue;
          map[row.username] = (map[row.username] ?? 0) + (row.execution_count ?? 0);
        }
        const entries = Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([username, total_executions]) => ({
            username,
            avatar_url: null,
            total_executions,
            is_pro: false,
          }));
        setLeaderboard(entries);
      }
      setLoadingLb(false);
    })();
  }, []);

  const threshold = 10000;
  const progressPct = Math.min(100, (userExecutions / threshold) * 100);
  const s = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden border p-6" style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(16,185,129,0.05) 100%)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>
                <Crown className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-bold tracking-widest" style={{ color: '#f59e0b', letterSpacing: '0.1em' }}>PRO</span>
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
              {isPro ? 'You\'re a Pro member' : 'Upgrade to Pro'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {isPro
                ? 'You have access to all Pro features. Thanks for supporting vhxLUA!'
                : 'Unlock exclusive features, badges, and community perks.'}
            </p>
          </div>
          {isPro && (
            <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#000' }}>
              <Crown className="w-3 h-3" /> PRO
            </div>
          )}
        </div>

        {/* Execution progress toward free Pro */}
        {!isPro && isLoggedIn && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-muted)' }}>
                Earn Pro for free — {userExecutions.toLocaleString()} / {threshold.toLocaleString()} executions
              </span>
              <span className="text-[11px] font-bold" style={{ color: '#f59e0b' }}>{progressPct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#f59e0b,#f97316)' }} />
            </div>
          </div>
        )}
      </div>

      {/* Features grid */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>What you get</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRO_FEATURES.map(f => (
            <div key={f.title} className="rounded-xl border p-4 flex items-start gap-3" style={s}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: f.bg }}>
                <f.icon className="w-4 h-4" style={{ color: f.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>{f.title}</span>
                  {isPro
                    ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    : <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-muted)' }} />
                  }
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to get Pro */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>How to get Pro</h2>
        <div className="space-y-2">
          {PRO_WAYS.map(w => (
            <div key={w.title} className="rounded-xl border p-4 flex items-center gap-4" style={s}>
              <span className="text-2xl shrink-0">{w.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text)' }}>{w.title}</span>
                  {w.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{
                      backgroundColor: w.badge === 'Free' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
                      color: w.badge === 'Free' ? '#10b981' : '#3b82f6',
                      border: `1px solid ${w.badge === 'Free' ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.25)'}`,
                    }}>{w.badge}</span>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{w.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      {!isPro && (
        <div className="rounded-xl border p-5 text-center space-y-3" style={{ borderColor: 'rgba(59,130,246,0.25)', backgroundColor: 'rgba(59,130,246,0.04)' }}>
          <Sparkles className="w-8 h-8 mx-auto" style={{ color: '#3b82f6' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Ready to go Pro?</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Join Discord and open a ticket — or keep executing scripts to earn it free.</p>
          </div>
          <a href="https://discord.gg/usEnYvqnaJ" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff' }}>
            <svg viewBox="0 0 127.14 96.36" fill="currentColor" className="w-4 h-4"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg>
            Join Discord to get Pro
          </a>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Trophy className="w-4 h-4" style={{ color: '#f59e0b' }} /> Execution Leaderboard
        </h2>
        <div className="rounded-xl border overflow-hidden" style={s}>
          {loadingLb ? (
            <div className="py-8 text-center text-xs" style={{ color: 'var(--color-muted)' }}>Loading...</div>
          ) : leaderboard.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: 'var(--color-muted)' }}>No data yet</div>
          ) : leaderboard.map((entry, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            return (
              <div key={entry.username} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                <span className="w-6 text-center text-xs font-bold shrink-0" style={{ color: medal ? undefined : 'var(--color-muted)' }}>
                  {medal ?? `#${i + 1}`}
                </span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)', color: '#fff' }}>
                  {entry.username[0]?.toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {entry.username}
                </span>
                <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-muted)' }}>
                  {entry.total_executions.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
