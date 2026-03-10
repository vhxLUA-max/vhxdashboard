import { useState } from 'react';
import { login, register, forgotPassword } from '@/lib/auth';
import { Lock, User, Mail, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LoginModalProps {
  onSuccess: (username: string) => void;
  onClose: () => void;
}

type Mode = 'login' | 'register' | 'forgot';

export function LoginModal({ onSuccess, onClose }: LoginModalProps) {
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const reset = () => { setEmail(''); setUsername(''); setPassword(''); setConfirm(''); setError(''); setSuccess(''); };
  const switchMode = (m: Mode) => { setMode(m); reset(); };

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (mode === 'forgot') {
      if (!email.trim()) return;
      setLoading(true);
      const result = await forgotPassword(email);
      setLoading(false);
      if (result.success) setSuccess('Reset link sent! Check your email.');
      else setError(result.error ?? 'Failed to send reset email.');
      return;
    }
    if (!email.trim() || !password.trim()) return;
    if (mode === 'register') {
      if (!username.trim()) return;
      if (password !== confirm) { setError('Passwords do not match.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    }
    setLoading(true);
    const result = mode === 'login'
      ? await login(email, password)
      : await register(email, password, username);
    setLoading(false);
    if (result.success) {
      if (mode === 'register') {
        setSuccess('Account created! Check your email to confirm.');
      } else {
        onSuccess(username || email.split('@')[0]);
      }
    } else {
      setError(result.error ?? 'Something went wrong.');
    }
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSubmit(); };

  const titles: Record<Mode, { title: string; sub: string }> = {
    login:    { title: 'Sign In',        sub: 'Access User Search and Webhooks'   },
    register: { title: 'Create Account', sub: 'Register to unlock all features'   },
    forgot:   { title: 'Reset Password', sub: "We'll send a reset link to your email" },
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
          <h2 className="text-lg font-semibold text-white">{titles[mode].title}</h2>
          <p className="text-xs text-gray-500 mt-1">{titles[mode].sub}</p>
        </div>

        {mode !== 'forgot' && (
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
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                onKeyDown={handleKey}
                placeholder="Username"
                className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={handleKey}
              placeholder="Email"
              autoComplete="email"
              className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500"
            />
          </div>

          {mode !== 'forgot' && (
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
          )}

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

          {success && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-400">{success}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading || !email.trim() || (mode !== 'forgot' && !password.trim())}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {mode === 'login' ? 'Signing in...' : mode === 'register' ? 'Creating account...' : 'Sending...'}</>
              : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'
            }
          </Button>

          {mode === 'login' && (
            <button
              onClick={() => switchMode('forgot')}
              className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors mt-1"
            >
              Forgot password?
            </button>
          )}

          {mode === 'forgot' && (
            <button
              onClick={() => switchMode('login')}
              className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors mt-1"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
