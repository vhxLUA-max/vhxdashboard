import { useState } from 'react';
import { updatePassword } from '@/lib/auth';
import { Lock, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ChangePasswordModalProps {
  username: string;
  onClose: () => void;
}

export function ChangePasswordModal({ username, onClose }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm]         = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  const handleSubmit = async () => {
    if (!newPassword || !confirm) return;
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    const result = await updatePassword(newPassword);
    setLoading(false);
    if (result.success) { setSuccess(true); setTimeout(onClose, 2000); }
    else setError(result.error ?? 'Failed to update password.');
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-300 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Change Password</h2>
          <p className="text-xs text-gray-500 mt-1">Signed in as <span className="text-gray-300">{username}</span></p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <p className="text-sm text-emerald-400 font-medium">Password updated!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder="New password" autoComplete="new-password" className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }} onKeyDown={handleKey} placeholder="Confirm new password" autoComplete="new-password" className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-indigo-500" />
            </div>
            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <p className="text-xs text-rose-400">{error}</p>
              </div>
            )}
            <Button onClick={handleSubmit} disabled={loading || !newPassword || !confirm} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</> : 'Update Password'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
