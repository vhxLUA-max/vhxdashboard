import { useState, useRef } from 'react';
import { login, register, checkUsernameAvailable } from '@/lib/auth';
import { Lock, User, Loader2, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LoginModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

type Mode = 'login' | 'register';

export function LoginModal({ onSuccess, onClose }: LoginModalProps) {
  const [mode, setMode]         = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
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
    }
    setLoading(true);
    const result = mode === 'login'
      ? await login(username, password)
      : await register(username, password);
    setLoading(false);
    if (result.success) onSuccess();
    else setError(result.error ?? 'Something went wrong.');
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'login' ? 'Access your dashboard' : 'Register to unlock all features'}
          </p>
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
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
              : mode === 'login' ? 'Sign In' : 'Create Account'
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
