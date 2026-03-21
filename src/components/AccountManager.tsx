import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { updateUserEmail, sendVerificationOTP, verifyOTPAndResetPassword } from '@/lib/auth';
import { X, User, Lock, Camera, Loader2, Check, Mail, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AccountManagerProps {
  onClose: () => void;
  onUsernameChange: (username: string) => void;
  onAvatarChange: (url: string | null) => void;
}

type PwStep = 'idle' | 'email' | 'otp' | 'newpw';

export function AccountManager({ onClose, onUsernameChange, onAvatarChange }: AccountManagerProps) {
  const [username, setUsername]       = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState('');
  const [emailInput, setEmailInput]   = useState('');
  const [otpInput, setOtpInput]       = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [uploading, setUploading]     = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [pwStep, setPwStep]           = useState<PwStep>('idle');
  const [pwLoading, setPwLoading]     = useState(false);
  const [pwError, setPwError]         = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const u = user.user_metadata?.username ?? '';
      setUsername(u); setNewUsername(u);
      setAvatarUrl(user.user_metadata?.avatar_url ?? null);
      // Show real email if it's not the fake vhx.local one
      const email = user.email ?? '';
      if (!email.endsWith('@vhx.local')) { setCurrentEmail(email); setEmailInput(email); }
    });
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }

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
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
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

  const handleSaveEmail = async () => {
    if (!emailInput.trim() || emailInput === currentEmail) return;
    setSavingEmail(true);
    const result = await updateUserEmail(emailInput);
    setSavingEmail(false);
    if (!result.success) { toast.error(result.error ?? 'Failed to update email'); return; }
    setCurrentEmail(emailInput);
    toast.success('Confirmation sent — check your new email inbox');
  };

  // Step 1 — send OTP to email
  const handleSendOTP = async () => {
    if (!emailInput.trim()) { setPwError('Enter your email first'); return; }
    setPwLoading(true); setPwError('');
    const result = await sendVerificationOTP(emailInput.trim());
    setPwLoading(false);
    if (!result.success) { setPwError(result.error ?? 'Failed to send code'); return; }
    setPwStep('otp');
    toast.success('Verification code sent to ' + emailInput.trim());
  };

  // Step 2 — verify OTP
  const handleVerifyOTP = async () => {
    if (!otpInput.trim()) { setPwError('Enter the code'); return; }
    setPwLoading(true); setPwError('');
    // Just advance — actual verify happens with password submit
    setPwLoading(false);
    setPwStep('newpw');
  };

  // Step 3 — set new password
  const handleSavePassword = async () => {
    if (!newPassword || !confirmPw) return;
    if (newPassword !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    setPwLoading(true); setPwError('');
    const result = await verifyOTPAndResetPassword(emailInput.trim(), otpInput.trim(), newPassword);
    setPwLoading(false);
    if (!result.success) { setPwError(result.error ?? 'Failed'); return; }
    setNewPassword(''); setConfirmPw(''); setOtpInput(''); setPwStep('idle');
    toast.success('Password updated!');
  };

  const resetPwFlow = () => { setPwStep('idle'); setPwError(''); setOtpInput(''); setNewPassword(''); setConfirmPw(''); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }} onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Account Settings</h2>
          <button onClick={onClose} style={{ color: 'var(--color-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-6">


          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="w-20 h-20 rounded-full object-cover border-2" style={{ borderColor: 'var(--color-accent)' }} />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-2" style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
                  {username[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <button onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-surface)', color: 'var(--color-accent-fg)' }}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>JPG, PNG or GIF · max 2MB</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>


          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
              <User className="w-3.5 h-3.5" /> Username
            </label>
            <div className="flex gap-2">
              <Input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveUsername()}
                style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              <Button onClick={handleSaveUsername}
                disabled={savingUsername || !newUsername.trim() || newUsername.trim() === username}
                className="shrink-0 border-0" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                {savingUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </Button>
            </div>
          </div>


          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
              <Mail className="w-3.5 h-3.5" /> Email
            </label>
            <div className="flex gap-2">
              <Input value={emailInput} onChange={e => setEmailInput(e.target.value)}
                placeholder="your@email.com" type="email"
                style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              <Button onClick={handleSaveEmail} disabled={savingEmail || !emailInput.trim() || emailInput === currentEmail}
                className="shrink-0 border-0" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </Button>
            </div>
            {currentEmail && <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Current: {currentEmail}</p>}
          </div>

          {/* Change Password — email OTP gated */}
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
              <Lock className="w-3.5 h-3.5" /> Change Password
            </label>

            {pwStep === 'idle' && (
              <Button onClick={() => { setPwStep('email'); setPwError(''); }}
                variant="outline" className="w-full text-xs"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                Change password
              </Button>
            )}

            {pwStep === 'email' && (
              <div className="space-y-2 p-3 rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  We'll send a 6-digit code to your email to verify it's you.
                </p>
                <Input value={emailInput} onChange={e => setEmailInput(e.target.value)}
                  placeholder="your@email.com" type="email"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                {pwError && <p className="text-[11px] text-rose-400">{pwError}</p>}
                <div className="flex gap-2">
                  <Button onClick={resetPwFlow} variant="outline" className="flex-1 text-xs h-8"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>Cancel</Button>
                  <Button onClick={handleSendOTP} disabled={pwLoading || !emailInput.trim()} className="flex-1 text-xs h-8 border-0"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                    {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Code'}
                  </Button>
                </div>
              </div>
            )}

            {pwStep === 'otp' && (
              <div className="space-y-2 p-3 rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    Code sent to <strong style={{ color: 'var(--color-text)' }}>{emailInput}</strong>
                  </p>
                </div>
                <Input value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g,'').slice(0,6))}
                  placeholder="6-digit code" maxLength={6}
                  className="text-center text-xl font-mono tracking-[0.5em]"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                {pwError && <p className="text-[11px] text-rose-400">{pwError}</p>}
                <div className="flex gap-2">
                  <Button onClick={resetPwFlow} variant="outline" className="flex-1 text-xs h-8"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>Cancel</Button>
                  <Button onClick={handleVerifyOTP} disabled={pwLoading || otpInput.length < 6} className="flex-1 text-xs h-8 border-0"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                    {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify Code'}
                  </Button>
                </div>
                <button onClick={handleSendOTP} className="text-[11px] w-full text-center" style={{ color: 'var(--color-muted)' }}>
                  Didn't receive it? Resend
                </button>
              </div>
            )}

            {pwStep === 'newpw' && (
              <div className="space-y-2 p-3 rounded-xl border" style={{ borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.05)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-400 font-medium">Identity verified — set your new password</p>
                </div>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Confirm new password"
                  onKeyDown={e => e.key === 'Enter' && handleSavePassword()}
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                {pwError && <p className="text-[11px] text-rose-400">{pwError}</p>}
                <div className="flex gap-2">
                  <Button onClick={resetPwFlow} variant="outline" className="flex-1 text-xs h-8"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>Cancel</Button>
                  <Button onClick={handleSavePassword} disabled={pwLoading || !newPassword || !confirmPw} className="flex-1 text-xs h-8 border-0"
                    style={{ backgroundColor: '#10b981', color: '#fff' }}>
                    {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update Password'}
                  </Button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
