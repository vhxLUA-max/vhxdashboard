import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Key, Copy, Check, RefreshCw, Loader2, AlertCircle, ShieldCheck, Gamepad2, ExternalLink, User, ClipboardCopy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const WORDS = ['FIRE','IRON','VOID','DARK','SOUL','BONE','VEIL','GRIM','ASH','FLUX','BOLT','CLAW','DUSK','ECHO','FADE','GALE','HEX','JADE','KEEN','MIST','NOVA','ONYX','PIKE','RUIN','SAGE','TIDE','VILE','WARP','ZEAL','FANG'];

function generateToken() {
  return WORDS[Math.floor(Math.random() * WORDS.length)] + (Math.floor(Math.random() * 9000) + 1000);
}

async function ensureUniqueToken(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const t = generateToken();
    const { data } = await supabase.from('user_tokens').select('token').eq('token', t).maybeSingle();
    if (!data) return t;
  }
  return generateToken();
}

function generateVerifyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `VHX-${part(4)}`;
}

async function robloxProxy(path: string, method = 'GET', body?: unknown) {
  const res = await fetch('/api/roblox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, method, body }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function lookupRobloxUser(username: string): Promise<{ id: number; name: string; displayName: string } | null> {
  try {
    const json = await robloxProxy('/v1/usernames/users', 'POST', { usernames: [username], excludeBannedUsers: false }) as { data?: { id: number; name: string; displayName: string }[] } | null;
    return json?.data?.[0] ?? null;
  } catch { return null; }
}

async function fetchRobloxBio(userId: number): Promise<string | null> {
  try {
    // users.roblox.com/v1/users/{id} — returns { description: "..." }
    const res = await fetch('/api/roblox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `/v1/users/${userId}`, domain: 'https://users.roblox.com' }),
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    // API returns errors array when something goes wrong
    if (!json || Array.isArray(json.errors) || json.error) return null;
    const bio = json.description ?? json.Description ?? '';
    return typeof bio === 'string' ? bio : '';
  } catch { return null; }
}

type TokenRow = { token: string; roblox_username: string; roblox_user_id: number | null; updated_at?: string };
type Step = 'username' | 'verify' | 'done';
type RobloxUser = { id: number; name: string; displayName: string };

// Persist verify step in localStorage so refresh doesn't reset it
const LS_TOKEN   = 'vhx_token_row';
const LS_STEP    = 'vhx_token_step';
const LS_RBXUSER = 'vhx_rbx_user';
const LS_CODE    = 'vhx_verify_code';

function lsGet<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function lsDel(...keys: string[]) {
  keys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
}

export function MyTokenPanel() {
  const [tokenRow,     setTokenRow]     = useState<TokenRow | null>(() => lsGet<TokenRow>(LS_TOKEN));
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [step,         setStep]         = useState<Step>(() => lsGet<Step>(LS_STEP) ?? 'username');
  const [robloxInput,  setRobloxInput]  = useState('');
  const [lookingUp,    setLookingUp]    = useState(false);
  const [robloxUser,   setRobloxUser]   = useState<RobloxUser | null>(() => lsGet<RobloxUser>(LS_RBXUSER));
  const [verifyCode,   setVerifyCode]   = useState<string>(() => lsGet<string>(LS_CODE) ?? '');
  const [codeCopied,   setCodeCopied]   = useState(false);
  const [verifying,    setVerifying]    = useState(false);
  const [tokenCopied,  setTokenCopied]  = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Sync from Supabase if logged in, but always show localStorage data immediately
  const fetchToken = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_tokens')
        .select('token,roblox_username,roblox_user_id,updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setTokenRow(data);
        lsSet(LS_TOKEN, data);
        // Clear verify state since we have a confirmed token
        setStep('done');
        lsSet(LS_STEP, 'done');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchToken(); }, [fetchToken]);

  const goToVerify = (rbxUser: RobloxUser) => {
    const code = generateVerifyCode();
    setRobloxUser(rbxUser);
    setVerifyCode(code);
    setStep('verify');
    lsSet(LS_RBXUSER, rbxUser);
    lsSet(LS_CODE, code);
    lsSet(LS_STEP, 'verify');
  };

  const resetVerify = () => {
    setStep('username');
    setRobloxUser(null);
    setVerifyCode('');
    setError('');
    lsDel(LS_STEP, LS_RBXUSER, LS_CODE);
  };

  const handleLookup = async () => {
    const trimmed = robloxInput.trim();
    if (!trimmed) return;
    setLookingUp(true); setError('');
    const rbxUser = await lookupRobloxUser(trimmed);
    if (rbxUser) { goToVerify(rbxUser); setLookingUp(false); return; }
    const { data: dbUser } = await supabase.from('user_tokens').select('user_id,roblox_username').ilike('roblox_username', trimmed).limit(1).maybeSingle() as any;
    if (!dbUser) { setError(`Username "${trimmed}" not found. Run a script in-game first.`); setLookingUp(false); return; }
    goToVerify({ id: dbUser.roblox_user_id, name: dbUser.username, displayName: dbUser.username });
    setLookingUp(false);
  };

  const handleVerify = async () => {
    if (!robloxUser || !verifyCode) return;
    setVerifying(true); setError('');
    const bio = await fetchRobloxBio(robloxUser.id);
    if (bio === null) { setError('Could not fetch your Roblox profile.'); setVerifying(false); return; }
    if (!bio.includes(verifyCode)) { setError(`Code "${verifyCode}" not found in your bio. Paste it and save first.`); setVerifying(false); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in.');
      const newToken = await ensureUniqueToken();
      await supabase.from('user_tokens').delete().eq('user_id', user.id);
      const { error: err } = await supabase.from('user_tokens').insert({
        user_id: user.id, token: newToken,
        roblox_username: robloxUser.name, roblox_user_id: robloxUser.id,
        updated_at: new Date().toISOString(),
      });
      if (err) throw new Error(err.message);
    // token stored in user_tokens only
      const newRow = { token: newToken, roblox_username: robloxUser.name, roblox_user_id: robloxUser.id, updated_at: new Date().toISOString() };
      setTokenRow(newRow); lsSet(LS_TOKEN, newRow);
      setStep('done');     lsSet(LS_STEP, 'done');
      lsDel(LS_RBXUSER, LS_CODE);
      toast.success('Token generated!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally { setVerifying(false); }
  };

  const handleRegenerate = async () => {
    if (!tokenRow) return;
    setRegenerating(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in.');
      const newToken = await ensureUniqueToken();
      const { error: err } = await supabase.from('user_tokens').upsert({
        user_id: user.id, token: newToken,
        roblox_username: tokenRow.roblox_username, roblox_user_id: tokenRow.roblox_user_id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (err) throw new Error(err.message);
    // token stored in user_tokens only
      const newRow = { ...tokenRow, token: newToken, updated_at: new Date().toISOString() };
      setTokenRow(newRow); lsSet(LS_TOKEN, newRow);
      toast.success('Token regenerated. Old token is now invalid.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate.');
    } finally { setRegenerating(false); }
  };

  const copyToken = () => {
    if (!tokenRow) return;
    navigator.clipboard.writeText(tokenRow.token);
    setTokenCopied(true); setTimeout(() => setTokenCopied(false), 2000);
    toast.success('Token copied!');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(verifyCode);
    setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000);
  };

  const timeAgo = (iso: string) => {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  };

  if (loading && !tokenRow && step === 'username') return (
    <div className="rounded-xl border p-6 flex items-center justify-center py-12" style={{ borderColor: 'var(--color-border)' }}>
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-muted)' }} />
    </div>
  );

  return (
    <div className="rounded-xl border p-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <h3 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
        <Key className="w-5 h-5 text-amber-400" /> My Token
      </h3>
      <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>
        Verify your Roblox account to get a token. Use it to search stats or send webhook reports.
      </p>

      {tokenRow ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)' }}>
              <Gamepad2 className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Linked Roblox account</p>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>@{tokenRow.roblox_username}</p>
            </div>
            <a href={`https://www.roblox.com/users/${tokenRow.roblox_user_id}/profile`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-2 rounded-xl px-4 py-4 border border-amber-500/20" style={{ backgroundColor: 'var(--color-surface2)' }}>
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold tracking-[0.25em] text-amber-400 font-mono select-all">{tokenRow.token}</p>
              {tokenRow.updated_at && <p className="text-[10px] mt-1" style={{ color: 'var(--color-muted)' }}>Generated {timeAgo(tokenRow.updated_at)}</p>}
            </div>
            <button onClick={copyToken} className="shrink-0 p-2 rounded-lg transition-colors" style={{ color: 'var(--color-muted)' }}>
              {tokenCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, #3b82f6 8%, transparent)', border: '1px solid color-mix(in srgb, #3b82f6 20%, transparent)' }}>
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-400/80 leading-relaxed">
              Use in <strong>User Search</strong> and <strong>Webhook</strong>. Regenerating invalidates the old token immediately.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={copyToken} className="flex-1 text-xs h-8 border-0" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Token
            </Button>
            <Button onClick={handleRegenerate} disabled={regenerating} variant="outline" className="flex-1 text-xs h-8" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
              {regenerating ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Regenerating...</> : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate</>}
            </Button>
          </div>
        </div>

      ) : step === 'verify' && robloxUser ? (
        <div className="space-y-4">
          <button onClick={resetVerify} className="text-xs transition-colors" style={{ color: 'var(--color-muted)' }}>← Change account</button>

          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
            <img src={`https://tr.rbxcdn.com/avatar-thumbnail/150/150/AvatarHeadshot/Png?userId=${robloxUser.id}`} alt={robloxUser.name} className="w-8 h-8 rounded-full object-cover" style={{ border: '1px solid var(--color-border)' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{robloxUser.displayName}</p>
              <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>@{robloxUser.name} · ID {robloxUser.id}</p>
            </div>
          </div>

          <div className="space-y-3 p-4 rounded-xl border border-amber-500/20" style={{ backgroundColor: 'rgba(245,158,11,0.05)' }}>
            <p className="text-xs font-semibold text-amber-400">Add this code to your Roblox bio</p>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 border border-amber-500/30" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <span className="flex-1 font-mono text-lg font-bold tracking-widest text-amber-400">{verifyCode}</span>
              <button onClick={copyCode} className="p-1.5 rounded transition-colors shrink-0" style={{ color: 'var(--color-muted)' }}>
                {codeCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ClipboardCopy className="w-4 h-4" />}
              </button>
            </div>
            <ol className="space-y-1 text-[11px]" style={{ color: 'var(--color-muted)' }}>
              <li>1. Go to <a href="https://www.roblox.com/my/account#!/info" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }} className="hover:underline">roblox.com/my/account</a> → About</li>
              <li>2. Paste <span className="font-mono text-amber-400">{verifyCode}</span> in your bio and save</li>
              <li>3. Come back and click Verify — you can remove it from bio after</li>
            </ol>
            <p className="text-[10px] text-amber-400/60">This step is saved — refreshing this page will keep your progress.</p>
          </div>

          <Button onClick={handleVerify} disabled={verifying} className="w-full border-0" style={{ backgroundColor: '#10b981', color: '#fff' }}>
            {verifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking bio...</> : <><ShieldCheck className="w-4 h-4 mr-2" /> Verify & Get Token</>}
          </Button>
        </div>

      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: 'var(--color-muted)' }}>Your Roblox username</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-muted)' }} />
                <Input value={robloxInput} onChange={e => { setRobloxInput(e.target.value); setError(''); }} onKeyDown={e => e.key === 'Enter' && handleLookup()} placeholder="e.g. Builderman" disabled={lookingUp} className="pl-9" style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              </div>
              <Button onClick={handleLookup} disabled={!robloxInput.trim() || lookingUp} className="shrink-0 min-w-[90px] border-0 font-semibold" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue →'}
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-8 gap-3 rounded-xl border border-dashed" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center border border-amber-500/30" style={{ backgroundColor: 'rgba(245,158,11,0.08)' }}>
              <Key className="w-5 h-5 text-amber-400/70" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>Verify ownership → get token</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted)' }}>Works across Search, Webhook, and in-game</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-2.5 mt-3 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <p className="text-xs text-rose-400">{error}</p>
        </div>
      )}
    </div>
  );
}
