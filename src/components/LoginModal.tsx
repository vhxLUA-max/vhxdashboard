import { useState, useRef } from 'react';
import { login, register, checkUsernameAvailable, loginWithDiscord, loginWithGoogle, isUsernameVhxReserved } from '@/lib/auth';
import { Lock, User, Loader2, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LoginModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

type Mode = 'login' | 'register';

const DiscordIcon = () => (
  <svg viewBox="0 0 127.14 96.36" fill="currentColor" className="w-4 h-4">
    <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15ZM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69Zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69Z"/>
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export function LoginModal({ onSuccess, onClose }: LoginModalProps) {
  const [mode, setMode]         = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [googleLoading, setGoogleLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setUsername(''); setPassword(''); setConfirm('');
    setError(''); setUsernameStatus('idle');
  };
  const switchMode = (m: Mode) => { setMode(m); reset(); };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setError('');
    if (mode !== 'register') return;
    if (value.trim().length < 3) { setUsernameStatus('idle'); return; }
    if (isUsernameVhxReserved(value)) { setUsernameStatus('taken'); return; }
    setUsernameStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const available = await checkUsernameAvailable(value.trim());
      setUsernameStatus(available ? 'available' : 'taken');
    }, 400);
  };

  const handleSubmit = async () => {
    setError('');
    if (!username.trim() || !password.trim()) return;
    if (mode === 'register') {
      if (password !== confirm) { setError('Passwords do not match.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (username.trim().length < 3) { setError('Username must be at least 3 characters.'); return; }
      if (usernameStatus === 'taken') { setError('Username is already taken.'); return; }
      if (usernameStatus === 'checking') { setError('Please wait while we check your username.'); return; }
      if (isUsernameVhxReserved(username)) { setError('This username is reserved and cannot be registered.'); return; }
    }
    setLoading(true);
    const result = mode === 'login'
      ? await login(username, password)
      : await register(username, password);
    setLoading(false);
    if (result.success) onSuccess();
    else setError(result.error ?? 'Something went wrong.');
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    const result = await loginWithGoogle();
    if (!result.success) {
      setError(result.error ?? 'Google sign-in failed.');
      setGoogleLoading(false);
    }
  };

  const handleDiscord = async () => {
    setDiscordLoading(true);
    setError('');
    const result = await loginWithDiscord();
    if (!result.success) {
      setError(result.error ?? 'Discord sign-in failed.');
      setDiscordLoading(false);
    }
    // On success Supabase redirects — no need to setLoading(false)
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-300 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'login' ? 'Access your dashboard' : 'Register to unlock all features'}
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="flex gap-2.5 mb-4">
          <button onClick={handleDiscord} disabled={discordLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
            style={{ backgroundColor: '#5865F2', color: '#fff' }}>
            {discordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><DiscordIcon /> Discord</>}
          </button>
          <button onClick={handleGoogle} disabled={googleLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
            style={{ backgroundColor: '#fff', color: '#1f1f1f', border: '1px solid #e5e7eb' }}>
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <><GoogleIcon /> Google</>}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-[11px] text-gray-600 font-medium">or use username</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

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

        <div className="space-y-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={username}
              onChange={e => handleUsernameChange(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Username"
              autoComplete="username"
              className={`pl-9 pr-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500 ${
                mode === 'register' && usernameStatus === 'taken' ? 'border-rose-500/60 focus:border-rose-500' :
                mode === 'register' && usernameStatus === 'available' ? 'border-emerald-500/60 focus:border-emerald-500' : ''
              }`}
            />
            {mode === 'register' && username.trim().length >= 3 && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />}
                {usernameStatus === 'available' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {usernameStatus === 'taken' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
              </div>
            )}
          </div>
          {mode === 'register' && usernameStatus === 'taken' && (
            <p className="text-[11px] text-rose-400 -mt-1 pl-1">Username already taken</p>
          )}
          {mode === 'register' && usernameStatus === 'available' && (
            <p className="text-[11px] text-emerald-400 -mt-1 pl-1">Username is available</p>
          )}

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={handleKey}
              placeholder="Password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500"
            />
          </div>

          {mode === 'register' && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                type="password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(''); }}
                onKeyDown={handleKey}
                placeholder="Confirm password"
                autoComplete="new-password"
                className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full bg-indigo-600 hover:bg-blue-600 text-white border-0"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
              : mode === 'login' ? 'Sign In' : 'Create Account'
            }
          </Button>
          <p className="text-center text-[10px] pt-1" style={{ color: 'rgba(160,160,175,0.5)' }}>
            By signing in you agree to our Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

interface LoginModalProps {
  onSuccess: () => void;
  onClose: () => void;
}
