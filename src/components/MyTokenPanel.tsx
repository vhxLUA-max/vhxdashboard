import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Key, Copy, Check, RefreshCw, Loader2, AlertCircle, ShieldCheck, Gamepad2, ExternalLink, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

type TokenRow = {
  token: string;
  roblox_username: string;
  roblox_user_id: number;
};

export function MyTokenPanel() {
  const [tokenRow, setTokenRow] = useState<TokenRow | null>(null);
  const [loading, setLoading]   = useState(true);
  const [step, setStep]         = useState<'idle' | 'verifying' | 'generating'>('idle');
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState('');

  const [robloxInput, setRobloxInput]       = useState('');
  const [verifiedRoblox, setVerifiedRoblox] = useState<RobloxUser | null>(null);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError('');
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

  const handleVerify = async () => {
    const trimmed = robloxInput.trim();
    if (!trimmed) return;
    setStep('verifying');
    setError('');
    setVerifiedRoblox(null);

    const robloxUser = await verifyRobloxUsername(trimmed);
    if (!robloxUser) {
      setError(`Roblox user "${trimmed}" not found. Check the spelling and try again.`);
      setStep('idle');
      return;
    }

    const { data: existing } = await supabase
      .from('user_tokens')
      .select('user_id')
      .eq('roblox_user_id', robloxUser.id)
      .maybeSingle();

    if (existing) {
      setError('This Roblox account is already linked to another dashboard account.');
      setStep('idle');
      return;
    }

    setVerifiedRoblox(robloxUser);
    setStep('idle');
  };

  const handleGenerate = async () => {
    if (!verifiedRoblox) return;
    setStep('generating');
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');

      const newToken = await ensureUniqueToken();

      const { error: upsertErr } = await supabase
        .from('user_tokens')
        .upsert({
          user_id: user.id,
          token: newToken,
          roblox_username: verifiedRoblox.name,
          roblox_user_id: verifiedRoblox.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertErr) throw new Error(upsertErr.message);
      setTokenRow({ token: newToken, roblox_username: verifiedRoblox.name, roblox_user_id: verifiedRoblox.id });
      setVerifiedRoblox(null);
      setRobloxInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate token.');
    } finally {
      setStep('idle');
    }
  };

  const handleRegenerate = async () => {
    if (!tokenRow) return;
    setStep('generating');
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');

      const newToken = await ensureUniqueToken();

      const { error: upsertErr } = await supabase
        .from('user_tokens')
        .upsert({
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
      setStep('idle');
    }
  };

  const handleCopy = () => {
    if (!tokenRow) return;
    navigator.clipboard.writeText(tokenRow.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoading = step !== 'idle';

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Key className="w-5 h-5 text-amber-400" />
        My Token
      </h3>
      <p className="text-sm text-gray-500 mb-5">
        Links your dashboard account to your Roblox identity.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
        </div>

      ) : tokenRow ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-950 border border-gray-800 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Linked Roblox account</p>
              <p className="text-sm font-semibold text-white truncate">@{tokenRow.roblox_username}</p>
            </div>
            <a
              href={`https://www.roblox.com/users/${tokenRow.roblox_user_id}/profile`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
              title="View on Roblox"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-2 bg-gray-950 border border-amber-500/20 rounded-xl px-4 py-4">
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold tracking-[0.3em] text-amber-400 font-mono select-all">
                {tokenRow.token}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
              title="Copy token"
            >
              {copied
                ? <Check className="w-4 h-4 text-emerald-400" />
                : <Copy className="w-4 h-4" />
              }
            </button>
          </div>

          {copied && (
            <p className="text-[11px] text-emerald-400 text-center -mt-2">Copied to clipboard!</p>
          )}

          <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/15 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-300/70 leading-relaxed">
              Enter this token in-game via <span className="font-mono text-blue-300">Settings → Enter Token</span>. Regenerating creates a new token — the old one stops working immediately.
            </p>
          </div>

          <Button
            onClick={handleRegenerate}
            disabled={isLoading}
            variant="outline"
            className="w-full border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 text-xs h-8"
          >
            {step === 'generating'
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Regenerating...</>
              : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate Token</>
            }
          </Button>
        </div>

      ) : (
        <div className="space-y-4">
          {!verifiedRoblox ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-400">Your Roblox username</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      value={robloxInput}
                      onChange={e => { setRobloxInput(e.target.value); setError(''); }}
                      onKeyDown={e => { if (e.key === 'Enter') handleVerify(); }}
                      placeholder="e.g. Builderman"
                      className="pl-9 bg-gray-950 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500"
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    onClick={handleVerify}
                    disabled={!robloxInput.trim() || isLoading}
                    className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold border-0 flex-shrink-0"
                  >
                    {step === 'verifying'
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : 'Verify'
                    }
                  </Button>
                </div>
                <p className="text-[11px] text-gray-600">
                  We verify this account exists on Roblox before linking it.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center py-5 gap-2 bg-gray-950 border border-dashed border-gray-800 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Key className="w-5 h-5 text-amber-400/60" />
                </div>
                <p className="text-xs text-gray-600">Verify your Roblox account to generate a token</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-emerald-500/30 flex-shrink-0 bg-gray-800">
                  <img
                    src={`https://tr.rbxcdn.com/avatar-thumbnail/150/150/AvatarHeadshot/Png?userId=${verifiedRoblox.id}`}
                    alt={verifiedRoblox.name}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{verifiedRoblox.displayName}</p>
                  <p className="text-[11px] text-gray-500">@{verifiedRoblox.name} · ID {verifiedRoblox.id}</p>
                </div>
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              </div>

              <p className="text-[11px] text-gray-500 text-center">
                This Roblox account will be permanently linked to your dashboard.{' '}
                <button
                  onClick={() => { setVerifiedRoblox(null); setRobloxInput(''); }}
                  className="text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Use a different account
                </button>
              </p>

              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold border-0"
              >
                {step === 'generating'
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  : <><Key className="w-4 h-4 mr-2" /> Generate My Token</>
                }
              </Button>
            </>
          )}
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
