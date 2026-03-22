import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { updatePassword, updateUserEmail } from '@/lib/auth';
import { X, User, Lock, Camera, Loader2, Check, Image as ImageIcon, FileText, Code2, Link2, AlertTriangle, Trash2, Copy, Moon, Sun } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AccountManagerProps {
  onClose: () => void;
  onUsernameChange: (username: string) => void;
  onAvatarChange: (url: string | null) => void;
  isPro?: boolean;
}

type Tab = 'account' | 'socials' | 'embed';

interface UserSocials {
  discord?: string;
  youtube?: string;
  tiktok?: string;
  twitter?: string;
  github?: string;
  twitch?: string;
}

const SOCIAL_FIELDS: { key: keyof UserSocials; label: string; placeholder: string; color: string; icon: React.ReactNode }[] = [
  {
    key: 'discord', label: 'Discord', placeholder: 'https://discord.gg/yourserver', color: '#5865F2',
    icon: <svg viewBox="0 0 127.14 96.36" fill="currentColor" className="w-4 h-4"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg>
  },
  {
    key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@you', color: '#FF0000',
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  },
  {
    key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@you', color: '#ff0050',
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>
  },
  {
    key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/you', color: '#e7e9ea',
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.776-8.896-8.208-10.604h7.242l4.26 5.633zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  },
  {
    key: 'github', label: 'GitHub', placeholder: 'https://github.com/you', color: '#e6edf3',
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
  },
  {
    key: 'twitch', label: 'Twitch', placeholder: 'https://twitch.tv/you', color: '#9147ff',
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
  },
];

export function AccountManager({ onClose, onUsernameChange, onAvatarChange, isPro = false }: AccountManagerProps) {
  const [tab, setTab] = useState<Tab>('account');
  const [username, setUsername]       = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [bannerUrl, setBannerUrl]     = useState<string | null>(null);
  const [bio, setBio]                 = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [emailInput, setEmailInput]   = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [uploading, setUploading]     = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingBio, setSavingBio]     = useState(false);
  const [customBadge, setCustomBadge]   = useState('');
  const [badgeColor, setBadgeColor]     = useState('#3b82f6');
  const [savingBadge, setSavingBadge]   = useState(false);
  const [socials, setSocials]         = useState<UserSocials>({});
  const [savingSocials, setSavingSocials] = useState(false);
  const [embedTheme, setEmbedTheme]   = useState<'dark' | 'light'>('dark');
  const [pwError, setPwError]         = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState('Free');
  // role loaded for subscription display
  const fileRef   = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const u = user.user_metadata?.username ?? '';
      setUsername(u); setNewUsername(u);
      setAvatarUrl(user.user_metadata?.avatar_url ?? null);
      setBannerUrl(user.user_metadata?.banner_url ?? null);
      setBio(user.user_metadata?.bio ?? '');
      // Load custom badge from user_roles
      supabase.from('user_roles').select('custom_badge,custom_badge_color').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data) {
          setCustomBadge(data.custom_badge ?? '');
          setBadgeColor(data.custom_badge_color ?? '#3b82f6');
        }
      });
      setSocials(user.user_metadata?.socials ?? {});
      setSubscriptionTier(user.user_metadata?.subscription_tier ?? 'Free');
      // Load actual role from DB for accurate subscription display
      supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        const role = data?.role ?? null;

        if (role === 'founder') setSubscriptionTier('Founder');
        else if (role === 'pro') setSubscriptionTier('Pro');
        else if (role === 'admin' || role === 'moderator') setSubscriptionTier('Staff');
        else setSubscriptionTier('Free');
      });
      const email = user.email ?? '';
      if (!email.endsWith('@vhx.local')) { setCurrentEmail(email); setEmailInput(email); }
    });
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { toast.error('Image must be under 4MB'); return; }
    if (file.type === 'image/gif' && !isPro) { toast.error('Animated avatars are a Pro feature — upgrade to use GIFs!'); return; }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      const ext  = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      setAvatarUrl(url);
      onAvatarChange(url);
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('Banner must be under 8MB'); return; }
    setUploadingBanner(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      const ext  = file.name.split('.').pop();
      const path = `banners/${user.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.auth.updateUser({ data: { banner_url: url } });
      setBannerUrl(url);
      toast.success('Banner updated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim().toLowerCase();
    if (!trimmed || trimmed === username) return;
    setSavingUsername(true);

    // Check 7-day cooldown via username_history
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: history } = await supabase
        .from('username_history')
        .select('changed_at')
        .eq('user_id', user.id)
        .order('changed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (history) {
        const daysSince = (Date.now() - new Date(history.changed_at).getTime()) / 86400000;
        if (daysSince < 7) {
          const daysLeft = Math.ceil(7 - daysSince);
          setSavingUsername(false);
          toast.error(`You can change your username again in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`);
          return;
        }
      }
    }

    const { error } = await supabase.auth.updateUser({ data: { username: trimmed } });
    if (error) { setSavingUsername(false); toast.error(error.message); return; }

    // Log to username_history
    if (user) {
      await supabase.from('username_history').insert({
        user_id: user.id,
        old_username: username ?? '',
        new_username: trimmed,
      });
    }

    setSavingUsername(false);
    setUsername(trimmed);
    onUsernameChange(trimmed);
    toast.success('Username updated!');
  };

  const handleSaveBio = async () => {
    setSavingBio(true);
    const { error } = await supabase.auth.updateUser({ data: { bio } });
    setSavingBio(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Bio updated!');
  };

  const handleSaveBadge = async () => {
    setSavingBadge(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingBadge(false); return; }
    const { error } = await supabase.from('user_roles').update({ custom_badge: customBadge.trim() || null, custom_badge_color: badgeColor }).eq('user_id', user.id);
    setSavingBadge(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Badge updated!');
  };

  const handleSaveSocials = async () => {
    setSavingSocials(true);
    const cleaned: UserSocials = {};
    for (const [k, v] of Object.entries(socials)) {
      if (v && v.trim()) (cleaned as Record<string, string>)[k] = v.trim();
    }
    const { error } = await supabase.auth.updateUser({ data: { socials: cleaned } });
    setSavingSocials(false);
    if (error) { toast.error(error.message); return; }
    setSocials(cleaned);
    toast.success('Socials saved!');
  };

  const handleSaveEmail = async () => {
    if (!emailInput.trim() || emailInput === currentEmail) return;
    setSavingEmail(true);
    const result = await updateUserEmail(emailInput);
    setSavingEmail(false);
    if (!result.success) { toast.error(result.error ?? 'Failed to update email'); return; }
    setCurrentEmail(emailInput);
    toast.success('Confirmation sent — check your new email inbox');
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPw) return;
    if (newPassword !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    setSavingPassword(true); setPwError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signInErr) { setSavingPassword(false); setPwError('Current password is incorrect'); return; }
    }
    const result = await updatePassword(newPassword);
    setSavingPassword(false);
    if (!result.success) { setPwError(result.error ?? 'Failed to update password'); return; }
    setCurrentPassword(''); setNewPassword(''); setConfirmPw('');
    toast.success('Password updated!');
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.');
    if (!confirmed) return;
    toast.error('Account deletion requires contacting support.');
  };

  const embedUrl = `https://vhxdashboard.vercel.app/api/embed/user/${username}?theme=${embedTheme}`;
  const embedCode = `<a href="https://vhxdashboard.vercel.app/user/${username}" target="_blank"><img alt="${username} on vhxLUA Hub" loading="lazy" width="360" height="132" src="${embedUrl}" /></a>`;

  const s = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'account', label: 'Account Settings', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'socials', label: 'Socials',           icon: <Link2 className="w-3.5 h-3.5" /> },
    { id: 'embed',   label: 'Embed',             icon: <Code2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden my-8" style={s} onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Account</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Manage your account settings and social connections</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="flex gap-1 px-5 pt-4">
          <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--color-surface2)' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={tab === t.id
                  ? { backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }
                  : { color: 'var(--color-muted)' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* ── ACCOUNT TAB ── */}
          {tab === 'account' && (
            <>
              <div className="rounded-xl border p-4 space-y-3" style={s}>
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <ImageIcon className="w-4 h-4" style={{ color: 'var(--color-accent)' }} /> Profile Banner
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Customize your profile with a banner image.</p>
                </div>
                <div
                  className="relative w-full h-28 rounded-xl overflow-hidden border-2 border-dashed cursor-pointer flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}
                  onClick={() => bannerRef.current?.click()}>
                  {bannerUrl
                    ? <img src={bannerUrl} alt="banner" className="w-full h-full object-cover" />
                    : (
                      <div className="text-center">
                        {uploadingBanner
                          ? <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1" style={{ color: 'var(--color-muted)' }} />
                          : <ImageIcon className="w-6 h-6 mx-auto mb-1" style={{ color: 'var(--color-muted)' }} />
                        }
                        <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>Click to upload banner</p>
                        <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>PNG, JPG, WebP up to 8MB</p>
                      </div>
                    )
                  }
                  {bannerUrl && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                {bannerUrl && (
                  <div className="flex gap-2">
                    <button onClick={() => bannerRef.current?.click()}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                      style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                      Change Banner
                    </button>
                    <button onClick={async () => {
                      await supabase.auth.updateUser({ data: { banner_url: null } });
                      setBannerUrl(null);
                      toast.success('Banner removed');
                    }}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                      style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                      Remove Banner
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border p-4 space-y-3" style={s}>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Profile Picture</h3>
                  <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>Upload a new profile picture.{!isPro && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#000' }}>✦ GIFs = Pro only</span>}</p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: 'var(--color-accent)' }}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-accent)' }}>{username[0]?.toUpperCase() ?? '?'}</div>
                    }
                  </div>
                  <div
                    className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}
                    onClick={() => fileRef.current?.click()}>
                    {uploading
                      ? <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--color-muted)' }} />
                      : <Camera className="w-7 h-7" style={{ color: 'var(--color-muted)' }} />
                    }
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Click to upload or drag and drop</p>
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>PNG, JPG, WebP up to 4MB</p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3" style={s}>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Username</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Your username is how others will find you. You can change it once every 7 days.</p>
                </div>
                <hr style={{ borderColor: 'var(--color-border)' }} />
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface2)' }}>
                  <div className="flex-1">
                    <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-muted)' }}>Current Username</p>
                    <Input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveUsername()}
                      className="border-0 p-0 h-auto text-sm font-medium bg-transparent focus-visible:ring-0"
                      style={{ color: 'var(--color-text)' }} />
                  </div>
                  <Button onClick={handleSaveUsername}
                    disabled={savingUsername || !newUsername.trim() || newUsername.trim() === username}
                    className="shrink-0 border-0 rounded-lg px-4"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                    {savingUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Username'}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3" style={s}>
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <FileText className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} /> Bio
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Tell others about yourself. This will appear on your profile page.</p>
                </div>
                <hr style={{ borderColor: 'var(--color-border)' }} />
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="No bio set"
                  rows={4}
                  className="w-full resize-none rounded-lg border p-3 text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <Button onClick={handleSaveBio} disabled={savingBio}
                  className="border-0 rounded-lg px-5"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                  {savingBio ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Bio
                </Button>
              </div>

              {isPro && (
                <div className="rounded-xl border p-4 space-y-3" style={s}>
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                      <span className="text-sm">🏷️</span> Custom Badge
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#000' }}>✦ PRO</span>
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Set a custom badge that appears on your profile.</p>
                  </div>
                  <hr style={{ borderColor: 'var(--color-border)' }} />
                  <div className="flex gap-2">
                    <input
                      value={customBadge}
                      onChange={e => setCustomBadge(e.target.value.slice(0, 20))}
                      placeholder="e.g. SCRIPTER, OG, LEGEND"
                      maxLength={20}
                      className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                    <input type="color" value={badgeColor} onChange={e => setBadgeColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border cursor-pointer"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }} />
                  </div>
                  {customBadge && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Preview:</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded border" style={{ color: badgeColor, borderColor: badgeColor + '50', backgroundColor: badgeColor + '15' }}>
                        {customBadge.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <Button onClick={handleSaveBadge} disabled={savingBadge}
                    className="border-0 rounded-lg px-5"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                    {savingBadge ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Badge
                  </Button>
                </div>
              )}

              <div className="rounded-xl border p-4 space-y-3" style={s}>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Account Information</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Your account details and preferences</p>
                </div>
                <hr style={{ borderColor: 'var(--color-border)' }} />
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Email</p>
                    <div className="flex gap-2 mt-1">
                      <Input value={emailInput} onChange={e => setEmailInput(e.target.value)}
                        placeholder="your@email.com" type="email"
                        style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                      <Button onClick={handleSaveEmail} disabled={savingEmail || !emailInput.trim() || emailInput === currentEmail}
                        className="shrink-0 border-0" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                        {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Username</p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text)' }}>{username}</p>
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Subscription Tier</p>
                    <p className="text-sm font-bold mt-0.5" style={{
                      color: subscriptionTier === 'Founder' ? '#f59e0b'
                           : subscriptionTier === 'Pro' ? '#f97316'
                           : subscriptionTier === 'Staff' ? '#3b82f6'
                           : 'var(--color-muted)'
                    }}>{subscriptionTier}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3" style={s}>
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                  <Lock className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} /> Change Password
                </h3>
                <Input type="password" value={currentPassword} onChange={e => { setCurrentPassword(e.target.value); setPwError(''); }}
                  placeholder="Current password" autoComplete="current-password"
                  style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                <Input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPwError(''); }}
                  placeholder="New password" autoComplete="new-password"
                  style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                <Input type="password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setPwError(''); }}
                  placeholder="Confirm new password" autoComplete="new-password"
                  onKeyDown={e => e.key === 'Enter' && handleSavePassword()}
                  style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                {pwError && <p className="text-[11px] text-rose-400">{pwError}</p>}
                <Button onClick={handleSavePassword}
                  disabled={savingPassword || !currentPassword || !newPassword || !confirmPw}
                  className="w-full border-0" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                  {savingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Update Password'}
                </Button>
              </div>

              <div className="rounded-xl border border-red-500/30 p-4 space-y-3" style={{ backgroundColor: 'rgba(239,68,68,0.04)' }}>
                <h3 className="text-sm font-semibold flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" /> Danger Zone
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
                <Button onClick={handleDeleteAccount}
                  className="border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Account
                </Button>
              </div>
            </>
          )}

          {/* ── SOCIALS TAB ── */}
          {tab === 'socials' && (
            <div className="space-y-4">
              <div className="rounded-xl border p-4 space-y-1" style={s}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Your Social Links</h3>
                <p className="text-xs pb-3" style={{ color: 'var(--color-muted)' }}>Add your socials — they'll appear as badges on your profile.</p>
                {SOCIAL_FIELDS.map(field => (
                  <div key={field.key} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: field.color + '22', color: field.color }}>
                      {field.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--color-muted)' }}>{field.label}</p>
                      <Input
                        value={socials[field.key] ?? ''}
                        onChange={e => setSocials(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="h-7 text-xs"
                        style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                      />
                    </div>
                    {socials[field.key] && (
                      <button onClick={() => setSocials(prev => { const n = { ...prev }; delete n[field.key]; return n; })}
                        className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs" style={{ color: 'var(--color-muted)' }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveSocials} disabled={savingSocials}
                className="w-full border-0" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                {savingSocials ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Social Links'}
              </Button>
              <p className="text-[11px] text-center" style={{ color: 'var(--color-muted)' }}>
                Links saved here will display as clickable badges on your public profile.
              </p>
            </div>
          )}

          {/* ── EMBED TAB ── */}
          {tab === 'embed' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold mb-1" style={{ color: 'var(--color-text)' }}>Profile Embed</h3>
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Embed your vhx hub profile card on your website, portfolio, or README to showcase your scripts and stats.</p>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Badge theme</p>
                <div className="flex gap-2 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--color-surface2)' }}>
                  <button onClick={() => setEmbedTheme('dark')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={embedTheme === 'dark'
                      ? { backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }
                      : { color: 'var(--color-muted)' }}>
                    <Moon className="w-4 h-4" /> Dark
                  </button>
                  <button onClick={() => setEmbedTheme('light')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={embedTheme === 'light'
                      ? { backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }
                      : { color: 'var(--color-muted)' }}>
                    <Sun className="w-4 h-4" /> Light
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Preview</p>
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)', backgroundColor: embedTheme === 'dark' ? '#18181b' : '#f4f4f5' }}>
                  <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: embedTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <span className="text-[10px] ml-1 truncate" style={{ color: embedTheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{embedUrl}</span>
                  </div>
                  <div className="p-4">
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: embedTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', backgroundColor: embedTheme === 'dark' ? '#09090b' : '#fff' }}>
                      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
                      <div className="flex items-center gap-3 p-4">
                        {avatarUrl
                          ? <img src={avatarUrl} alt={username} className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: 'rgba(99,102,241,0.5)' }} />
                          : <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2" style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.5)' }}>{username[0]?.toUpperCase() ?? '?'}</div>
                        }
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold" style={{ color: embedTheme === 'dark' ? '#fff' : '#000' }}>{username || 'username'}</span>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#3b82f6">
                              <path fillRule="evenodd" clipRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" />
                            </svg>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: embedTheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>vhx hub member</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-4 pb-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}>
                            <span className="text-[8px] font-black text-white">V</span>
                          </div>
                          <span className="text-[10px] font-bold tracking-wider" style={{ color: embedTheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>VHX HUB</span>
                        </div>
                        <span className="text-[11px]" style={{ color: '#6366f1' }}>View profile →</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Embed Code</p>
                <div className="relative rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', border: '1px solid' }}>
                  <code className="text-xs break-all pr-8" style={{ color: 'var(--color-muted)', fontFamily: 'monospace' }}>{embedCode}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(embedCode); toast.success('Copied!'); }}
                    className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
