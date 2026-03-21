import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { updatePassword, updateUserEmail } from '@/lib/auth';
import { X, User, Lock, Camera, Loader2, Check, Image as ImageIcon, FileText, Code2, Link2, AlertTriangle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SocialsTab } from '@/components/SocialsTab';

interface AccountManagerProps {
  onClose: () => void;
  onUsernameChange: (username: string) => void;
  onAvatarChange: (url: string | null) => void;
}

type Tab = 'account' | 'socials' | 'embed';

export function AccountManager({ onClose, onUsernameChange, onAvatarChange }: AccountManagerProps) {
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
  const [pwError, setPwError]         = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState('Free');
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
      setSubscriptionTier(user.user_metadata?.subscription_tier ?? 'Free');
      const email = user.email ?? '';
      if (!email.endsWith('@vhx.local')) { setCurrentEmail(email); setEmailInput(email); }
    });
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { toast.error('Image must be under 4MB'); return; }
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
    const { error } = await supabase.auth.updateUser({ data: { username: trimmed } });
    setSavingUsername(false);
    if (error) { toast.error(error.message); return; }
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
              </div>

              <div className="rounded-xl border p-4 space-y-3" style={s}>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Profile Picture</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Upload a new profile picture. GIFs are available for Pro users.</p>
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
                  Add Bio
                </Button>
              </div>

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
                    <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>{subscriptionTier}</p>
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

          {tab === 'socials' && <SocialsTab />}

          {tab === 'embed' && (
            <div className="rounded-xl border p-6 text-center space-y-3" style={s}>
              <Code2 className="w-10 h-10 mx-auto" style={{ color: 'var(--color-muted)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Embed your profile</h3>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Embed widget coming soon. You'll be able to add your vhxLUA profile to any website.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
