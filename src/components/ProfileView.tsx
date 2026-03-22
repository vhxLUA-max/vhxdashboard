import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Pencil } from 'lucide-react';

interface UserSocials {
  discord?: string;
  youtube?: string;
  tiktok?: string;
  twitter?: string;
  github?: string;
  twitch?: string;
}

interface ProfileViewProps {
  username: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isPro?: boolean;
  customBadge?: string | null;
  customBadgeColor?: string | null;
  isLoggedIn: boolean;
  onEditProfile: () => void;
  compact?: boolean;
}

const SOCIAL_BADGES: { key: keyof UserSocials; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { key: 'discord', label: 'Discord', color: '#5865F2', bg: 'rgba(88,101,242,0.18)', icon: <svg viewBox="0 0 127.14 96.36" fill="currentColor" className="w-3 h-3"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg> },
  { key: 'youtube', label: 'YouTube', color: '#FF0000', bg: 'rgba(255,0,0,0.15)', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  { key: 'tiktok', label: 'TikTok', color: '#ff0050', bg: 'rgba(255,0,80,0.15)', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg> },
  { key: 'twitter', label: 'X', color: '#e7e9ea', bg: 'rgba(231,233,234,0.1)', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.776-8.896-8.208-10.604h7.242l4.26 5.633zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { key: 'github', label: 'GitHub', color: '#e6edf3', bg: 'rgba(230,237,243,0.1)', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg> },
  { key: 'twitch', label: 'Twitch', color: '#9147ff', bg: 'rgba(145,71,255,0.15)', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg> },
];

const VerifiedIcon = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#3b82f6"/>
    <path d="M7.5 12.5l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function usePresence(userId: string | null) {
  const [isOnline, setIsOnline] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) { setIsOnline(false); return; }

    const channel = supabase.channel(`presence:${userId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setIsOnline(Object.keys(state).length > 0);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
          setIsOnline(true);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return isOnline;
}

export function ProfileView({ username, avatarUrl, isAdmin, isPro = false, isLoggedIn, onEditProfile, compact = false, customBadge, customBadgeColor = '#3b82f6' }: ProfileViewProps) {
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bio, setBio] = useState<string>('');
  // All badge/social data loaded eagerly from user_metadata — works offline
  const [socials, setSocials] = useState<UserSocials>({});
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Presence only used for the dot — badges never depend on it
  const isOnline = usePresence(userId);

  useEffect(() => {
    if (!isLoggedIn) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      // Everything loaded from user_metadata — cached locally, no network needed
      setBannerUrl(user.user_metadata?.banner_url ?? null);
      setBio(user.user_metadata?.bio ?? '');
      setSocials(user.user_metadata?.socials ?? {});
      setJoinedAt(user.created_at ?? null);
    });
  }, [isLoggedIn]);

  const uname = (username ?? '').toLowerCase();
  const isFounder = uname === 'vhxlua-max';
  const isVerified = isAdmin || isFounder;

  const joinedFmt = joinedAt
    ? new Date(joinedAt).toLocaleDateString([], { month: 'short', year: 'numeric' })
    : null;

  const activeSocials = SOCIAL_BADGES.filter(s => socials[s.key]);

  if (!isLoggedIn) return null;

  if (compact) {
    return (
      <div className="overflow-hidden rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {bannerUrl && (
          <div className="w-full h-14 overflow-hidden">
            <img src={bannerUrl} alt="banner" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative shrink-0">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" style={{ border: '2px solid rgba(59,130,246,0.4)' }} />
                : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                    {username?.[0]?.toUpperCase() ?? 'U'}
                  </div>
              }
              {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2" style={{ borderColor: '#111113' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold truncate" style={{ color: '#f1f5f9', letterSpacing: '-0.01em' }}>{username ?? 'User'}</span>
                {isVerified && <VerifiedIcon />}
                {isFounder && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>⚡ FOUNDER</span>}
                {isPro && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#000' }}>✦ PRO</span>}
                {activeSocials.slice(0, 3).map(s => (
                  <a key={s.key} href={socials[s.key]} target="_blank" rel="noopener noreferrer"
                    className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: s.bg, color: s.color }}>
                    {s.icon}
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {isAdmin && !isFounder && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', letterSpacing: '0.05em' }}>ADMIN</span>}
                {customBadge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{ color: customBadgeColor ?? '#3b82f6', borderColor: (customBadgeColor ?? '#3b82f6') + '50', backgroundColor: (customBadgeColor ?? '#3b82f6') + '15' }}>{customBadge.toUpperCase()}</span>}
                {isOnline
                  ? <span className="text-[10px] flex items-center gap-1" style={{ color: '#10b981' }}><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Online</span>
                  : <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.4)' }}>Offline</span>
                }
              </div>
            </div>
          </div>
          <button onClick={onEditProfile}
            className="w-full py-2 rounded-lg text-[13px] font-medium flex items-center justify-center gap-1.5 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', letterSpacing: '-0.01em' }}>
            <Pencil className="w-3 h-3" /> Edit Profile
          </button>
          {bio && (
            <p className="text-[11px] mt-2 leading-relaxed line-clamp-2" style={{ color: 'rgba(148,163,184,0.7)' }}>{bio}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {bannerUrl && (
        <div className="relative w-full overflow-hidden" style={{ height: 140 }}>
          <img src={bannerUrl} alt="banner" className="w-full h-full object-cover" />
        </div>
      )}

      <div className={`flex items-end justify-between px-4 ${bannerUrl ? '-mt-10' : 'mt-4'}`}>
        <div className="relative">
          {avatarUrl
            ? <img src={avatarUrl} alt={username ?? ''} className="rounded-full object-cover border-4" style={{ width: 80, height: 80, borderColor: '#09090b' }} />
            : <div className="rounded-full flex items-center justify-center text-2xl font-bold text-white border-4" style={{ width: 80, height: 80, borderColor: '#09090b', background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                {username?.[0]?.toUpperCase() ?? '?'}
              </div>
          }
          {isOnline && <span className="absolute bottom-2 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2" style={{ borderColor: '#09090b' }} />}
        </div>
        <button onClick={onEditProfile}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', letterSpacing: '-0.01em', marginBottom: bannerUrl ? 4 : 0 }}>
          <Pencil className="w-3.5 h-3.5" /> Edit Profile
        </button>
      </div>

      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h2 className="text-xl font-bold" style={{ color: '#f1f5f9', letterSpacing: '-0.02em' }}>{username ?? 'User'}</h2>
          {isVerified && <VerifiedIcon />}
          {isFounder && <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', letterSpacing: '0.06em' }}>⚡ FOUNDER</span>}
          {isPro && <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#000', letterSpacing: '0.03em' }}>✦ PRO</span>}
          {activeSocials.map(s => (
            <a key={s.key} href={socials[s.key]} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center w-6 h-6 rounded-full transition-opacity hover:opacity-80"
              style={{ backgroundColor: s.bg, color: s.color }} title={s.label}>
              {s.icon}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {joinedFmt && (
            <span className="text-[13px] flex items-center gap-1" style={{ color: '#64748b' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Joined {joinedFmt}
            </span>
          )}
          {isOnline
            ? <span className="text-[13px] flex items-center gap-1.5" style={{ color: '#10b981' }}><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Online now</span>
            : <span className="text-[13px] flex items-center gap-1.5" style={{ color: '#64748b' }}><span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />Offline</span>
          }
          {isAdmin && !isFounder && <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', letterSpacing: '0.04em' }}>ADMIN</span>}
          {customBadge && <span className="text-[10px] font-bold px-2 py-0.5 rounded border" style={{ color: customBadgeColor ?? '#3b82f6', borderColor: (customBadgeColor ?? '#3b82f6') + '50', backgroundColor: (customBadgeColor ?? '#3b82f6') + '15' }}>{customBadge.toUpperCase()}</span>}
        </div>

        {bio && <p className="text-[13px] mt-2.5 leading-relaxed" style={{ color: '#94a3b8' }}>{bio}</p>}
      </div>
    </div>
  );
}
