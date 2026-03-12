import { useState } from 'react';
import { login, register, forgotPassword } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Lock, User, Mail, Loader2, AlertCircle, CheckCircle2, X, Gamepad2, ArrowLeft, Key } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LoginModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

type Mode = 'login' | 'register' | 'forgot';
type RegisterStep = 'roblox' | 'account';

type RobloxUser = {
  id: number;
  name: string;
  displayName: string;
};

async function verifyRobloxUsername(username: string): Promise<RobloxUser | null> {
  try {
    const res = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const user = json.data?.[0];
    if (!user) return null;
    return { id: user.id, name: user.name, displayName: user.displayName };
  } catch {
    return null;
  }
}

function generateToken(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function ensureUniqueToken(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = generateToken();
    const { data } = await supabase
      .from('user_tokens')
      .select('token')
      .eq('token', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return generateToken(8);
}

export function LoginModal({ onSuccess, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('roblox');

  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');

  const [robloxInput, setRobloxInput]       = useState('');
  const [verifiedRoblox, setVerifiedRoblox] = useState<RobloxUser | null>(null);

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const resetAll = () => {
    setEmail(''); setUsername(''); setPassword(''); setConfirm('');
    setRobloxInput(''); setVerifiedRoblox(null);
    setError(''); setForgotSent(false);
    setRegisterStep('roblox');
  };

  const switchMode = (m: Mode) => { setMode(m); resetAll(); };

  const handleVerifyRoblox = async () => {
    const trimmed = robloxInput.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');

    const robloxUser = await verifyRobloxUsername(trimmed);
    if (!robloxUser) {
      setError(`Roblox user "${trimmed}" not found. Check the spelling and try again.`);
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from('user_tokens')
      .select('user_id')
      .eq('roblox_user_id', robloxUser.id)
      .maybeSingle();

    if (existing) {
      setError('This Roblox account is already linked to another dashboard account.');
      setLoading(false);
      return;
    }

    setVerifiedRoblox(robloxUser);
    setRegisterStep('account');
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!verifiedRoblox) return;
    if (!username.trim() || !email.trim() || !password.trim()) return;
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    setError('');

    const result = await register(email, password, username);
    if (!result.success) {
      setError(result.error ?? 'Something went wrong.');
      setLoading(false);
      return;
    }

    const newToken = await ensureUniqueToken();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('user_tokens').upsert({
        user_id: user.id,
        token: newToken,
        roblox_username: verifiedRoblox.name,
        roblox_user_id: verifiedRoblox.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    setLoading(false);
    onSuccess();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (result.success) onSuccess();
    else setError(result.error ?? 'Something went wrong.');
  };

  const handleForgot = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const result = await forgotPassword(email);
    setLoading(false);
    if (result.success) setForgotSent(true);
    else setError(result.error ?? 'Failed to send reset email.');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (mode === 'login') handleLogin();
    else if (mode === 'forgot') handleForgot();
    else if (registerStep === 'roblox') handleVerifyRoblox();
    else handleRegister();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-300 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            {mode === 'login' ? 'Sign In' : mode === 'forgot' ? 'Reset Password' : registerStep === 'roblox' ? 'Verify Roblox' : 'Create Account'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'login' ? 'Access your dashboard' : mode === 'forgot' ? "We'll send a reset link to your email" : registerStep === 'roblox' ? 'Step 1 of 2 — Link your Roblox account' : 'Step 2 of 2 — Set your login details'}
          </p>
        </div>

        {mode !== 'forgot' && !(mode === 'register' && registerStep === 'account') && (
          <div className="flex gap-1 bg-gray-950 border border-gray-800 rounded-lg p-1 mb-4">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${mode === m ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">

          {mode === 'login' && (
            <>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder="Email" autoComplete="email" className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder="Password" autoComplete="current-password" className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500" />
              </div>
            </>
          )}

          {mode === 'register' && registerStep === 'roblox' && (
            <>
              <div className="relative">
                <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={robloxInput}
                  onChange={e => { setRobloxInput(e.target.value); setError(''); }}
                  onKeyDown={handleKey}
                  placeholder="Roblox username"
                  disabled={loading}
                  className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500"
                />
              </div>
              <p className="text-[11px] text-gray-600">
                Your Roblox account will be permanently linked and a token auto-generated upon registration.
              </p>
            </>
          )}

          {mode === 'register' && registerStep === 'account' && verifiedRoblox && (
            <>
              <button
                onClick={() => { setRegisterStep('roblox'); setError(''); }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-1"
              >
                <ArrowLeft className="w-3 h-3" /> Change Roblox account
              </button>

              <div className="flex items-center gap-2.5 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-500/30 flex-shrink-0 bg-gray-800">
                  <img
                    src={`https://tr.rbxcdn.com/avatar-thumbnail/150/150/AvatarHeadshot/Png?userId=${verifiedRoblox.id}`}
                    alt={verifiedRoblox.name}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{verifiedRoblox.displayName}</p>
                  <p className="text-[10px] text-gray-500">@{verifiedRoblox.name} · ID {verifiedRoblox.id}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              </div>

              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input value={username} onChange={e => { setUsername(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder="Dashboard username" className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500" />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder="Email" autoComplete="email" className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder="Password" autoComplete="new-password" className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder="Confirm password" autoComplete="new-password" className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500" />
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                <Key className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <p className="text-[11px] text-amber-300/70">A token will be generated automatically when you register.</p>
              </div>
            </>
          )}

          {mode === 'forgot' && (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder="Email" autoComplete="email" className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          )}

          {forgotSent && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-400">Reset link sent! Check your email.</p>
            </div>
          )}

          <Button
            onClick={
              mode === 'login' ? handleLogin :
              mode === 'forgot' ? handleForgot :
              registerStep === 'roblox' ? handleVerifyRoblox :
              handleRegister
            }
            disabled={
              loading ||
              (mode === 'login' && (!email.trim() || !password.trim())) ||
              (mode === 'forgot' && !email.trim()) ||
              (mode === 'register' && registerStep === 'roblox' && !robloxInput.trim()) ||
              (mode === 'register' && registerStep === 'account' && (!username.trim() || !email.trim() || !password.trim() || !confirm.trim()))
            }
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === 'login' ? 'Signing in...' :
                 mode === 'forgot' ? 'Sending...' :
                 registerStep === 'roblox' ? 'Verifying...' :
                 'Creating account...'}
              </>
            ) : (
              mode === 'login' ? 'Sign In' :
              mode === 'forgot' ? 'Send Reset Link' :
              registerStep === 'roblox' ? 'Verify & Continue' :
              'Create Account & Get Token'
            )}
          </Button>

          {mode === 'login' && (
            <button onClick={() => switchMode('forgot')} className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors mt-1">
              Forgot password?
            </button>
          )}

          {mode === 'forgot' && (
            <button onClick={() => switchMode('login')} className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors mt-1">
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
