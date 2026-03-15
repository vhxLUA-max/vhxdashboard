import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Key, Copy, Check, RefreshCw, Loader2, AlertCircle, ShieldCheck, Gamepad2, ExternalLink, User, ClipboardCopy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function generateToken(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateVerifyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `VHX-${part(4)}`;
}

async function ensureUniqueToken(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = generateToken();
    const { data } = await supabase.from('user_tokens').select('token').eq('token', candidate).maybeSingle();
    if (!data) return candidate;
  }
  return generateToken(8);
}

type RobloxUser = { id: number; name: string; displayName: string };

async function lookupRobloxUser(username: string): Promise<RobloxUser | null> {
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
  } catch { return null; }
}

async function fetchRobloxBio(userId: number): Promise<string | null> {
  try {
    const res = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.description ?? '';
  } catch { return null; }
}

type TokenRow = { token: string; roblox_username: string; roblox_user_id: number };
type Step = 'username' | 'verify' | 'done';

export function MyTokenPanel() {
  const [tokenRow, setTokenRow]     = useState<TokenRow | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [step, setStep]             = useState<Step>('username');

  const [robloxInput, setRobloxInput]       = useState('');
  const [lookingUp, setLookingUp]           = useState(false);
  const [robloxUser, setRobloxUser]         = useState<RobloxUser | null>(null);
  const [verifyCode, setVerifyCode]         = useState('');
  const [codeCopied, setCodeCopied]         = useState(false);
  const [verifying, setVerifying]           = useState(false);
  const [tokenCopied, setTokenCopied]       = useState(false);
  const [regenerating, setRegenerating]     = useState(false);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error: err } = await supabase
      .from('user_tokens')
      .select('token, roblox_username, roblox_user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (err) setError(err.message);
    else setTokenRow(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchToken(); }, [fetchToken]);

  const handleLookup = async () => {
    const trimmed = robloxInput.trim();
    if (!trimmed) return;
    setLookingUp(true);
    setError('');
    const user = await lookupRobloxUser(trimmed);
    if (!user) {
      setError(`Roblox user "${trimmed}" not found.`);
      setLookingUp(false);
      return;
    }
    const { data: existing } = await supabase
      .from('user_tokens')
      .select('user_id')
      .eq('roblox_user_id', user.id)
      .maybeSingle();
    if (existing) {
      setError('This Roblox account is already linked to another token.');
      setLookingUp(false);
      return;
    }
    setRobloxUser(user);
    setVerifyCode(generateVerifyCode());
    setStep('verify');
    setLookingUp(false);
  };

  const handleVerify = async () => {
    if (!robloxUser || !verifyCode) return;
    setVerifying(true);
    setError('');
    const bio = await fetchRobloxBio(robloxUser.id);
    if (bio === null) {
      setError('Could not fetch your Roblox profile. Try again.');
      setVerifying(false);
      return;
    }
    if (!bio.includes(verifyCode)) {
      setError(`Code not found in your bio. Make sure "${verifyCode}" is saved in your Roblox profile description.`);
      setVerifying(false);
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');
      const newToken = await ensureUniqueToken();
      const { error: upsertErr } = await supabase.from('user_tokens').upsert({
        user_id: user.id,
        token: newToken,
        roblox_username: robloxUser.name,
        roblox_user_id: robloxUser.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (upsertErr) throw new Error(upsertErr.message);
      setTokenRow({ token: newToken, roblox_username: robloxUser.name, roblox_user_id: robloxUser.id });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setVerifying(false);
    }
  };

  const handleRegenerate = async () => {
    if (!tokenRow) return;
    setRegenerating(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');
      const newToken = await ensureUniqueToken();
      const { error: upsertErr } = await supabase.from('user_tokens').upsert({
        user_id: user.id,
        token: newToken,
        roblox_username: tokenRow.roblox_username,
        roblox_user_id: tokenRow.roblox_user_id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (upsertErr) throw new Error(upsertErr.message);
      setTokenRow({ ...tokenRow, token: newToken });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate token.');
    } finally {
      setRegenerating(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(verifyCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyToken = () => {
    if (!tokenRow) return;
    navigator.clipboard.writeText(tokenRow.token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  if (loading) return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
    </div>
  );

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
        <Key className="w-5 h-5 text-amber-400" />
        My Token
      </h3>
      <p className="text-sm text-gray-500 mb-5">
        Links your Roblox identity to your dashboard token.
      </p>

      {tokenRow ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Linked Roblox account</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">@{tokenRow.roblox_username}</p>
            </div>
            <a
              href={`https://www.roblox.com/users/${tokenRow.roblox_user_id}/profile`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-gray-950 border border-amber-500/20 rounded-xl px-4 py-4">
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold tracking-[0.3em] text-amber-400 font-mono select-all">
                {tokenRow.token}
              </p>
            </div>
            <button
              onClick={copyToken}
              className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {tokenCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/15 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-400/80 leading-relaxed">
              Enter this token in-game. Regenerating creates a new token — the old one stops working immediately.
            </p>
          </div>

          <Button
            onClick={handleRegenerate}
            disabled={regenerating}
            variant="outline"
            className="w-full border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 text-xs h-8"
          >
            {regenerating
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Regenerating...</>
              : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate Token</>
            }
          </Button>
        </div>

      ) : step === 'username' ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">Your Roblox username</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={robloxInput}
                  onChange={e => { setRobloxInput(e.target.value); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleLookup(); }}
                  placeholder="e.g. Builderman"
                  disabled={lookingUp}
                  className="pl-9 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-amber-500"
                />
              </div>
              <Button
                onClick={handleLookup}
                disabled={!robloxInput.trim() || lookingUp}
                className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold border-0 flex-shrink-0 min-w-[80px]"
              >
                {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-6 gap-2 bg-white dark:bg-gray-950 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-400/60" />
            </div>
            <p className="text-xs text-gray-400">Prove you own the Roblox account to get your token</p>
          </div>
        </div>

      ) : (
        <div className="space-y-4">
          <button
            onClick={() => { setStep('username'); setRobloxUser(null); setVerifyCode(''); setError(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ← Change account
          </button>

          {robloxUser && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg">
              <img
                src={`https://tr.rbxcdn.com/avatar-thumbnail/150/150/AvatarHeadshot/Png?userId=${robloxUser.id}`}
                alt={robloxUser.name}
                className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 object-cover bg-gray-100 dark:bg-gray-800"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{robloxUser.displayName}</p>
                <p className="text-[10px] text-gray-500">@{robloxUser.name}</p>
              </div>
            </div>
          )}

          <div className="space-y-2 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <p className="text-xs font-semibold text-amber-400">Step 1 — Add this code to your Roblox bio</p>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-950 border border-amber-500/30 rounded-lg px-3 py-2.5">
              <span className="flex-1 font-mono text-lg font-bold tracking-widest text-amber-400">{verifyCode}</span>
              <button
                onClick={copyCode}
                className="p-1.5 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
              >
                {codeCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ClipboardCopy className="w-4 h-4" />}
              </button>
            </div>
            <ol className="space-y-1 text-[11px] text-gray-500">
              <li>1. Go to <a href="https://www.roblox.com/my/account#!/info" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">roblox.com/my/account</a> → Profile → About</li>
              <li>2. Paste <span className="font-mono text-amber-400">{verifyCode}</span> anywhere in your bio and save</li>
              <li>3. Come back and click Verify below</li>
            </ol>
          </div>

          <Button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0"
          >
            {verifying
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking bio...</>
              : <><ShieldCheck className="w-4 h-4 mr-2" /> Verify & Get Token</>
            }
          </Button>

          <p className="text-[11px] text-gray-500 text-center">
            You can remove the code from your bio after verification.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-2.5 mt-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
          <p className="text-xs text-rose-400">{error}</p>
        </div>
      )}
    </div>
  );
}
