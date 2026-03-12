import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Key, Copy, Check, RefreshCw, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

function generateToken(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function ensureUniqueToken(): Promise<string> {
  for (let attempts = 0; attempts < 10; attempts++) {
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

export function MyTokenPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error: fetchErr } = await supabase
      .from('user_tokens')
      .select('token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchErr) setError(fetchErr.message);
    else setToken(data?.token ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchToken(); }, [fetchToken]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');

      const newToken = await ensureUniqueToken();

      const { error: upsertErr } = await supabase
        .from('user_tokens')
        .upsert({ user_id: user.id, token: newToken, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

      if (upsertErr) throw new Error(upsertErr.message);
      setToken(newToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate token.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Key className="w-5 h-5 text-amber-400" />
        My Token
      </h3>
      <p className="text-sm text-gray-500 mb-5">
        Your unique token links in-game activity to your account.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
        </div>
      ) : token ? (
        <div className="space-y-4">
          <div className="relative flex items-center gap-2 bg-gray-950 border border-amber-500/20 rounded-xl px-4 py-4">
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold tracking-[0.3em] text-amber-400 font-mono select-all">
                {token}
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
            <p className="text-[11px] text-emerald-400 text-center">Copied to clipboard!</p>
          )}

          <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/15 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-300/70 leading-relaxed">
              Use this token in-game via <span className="font-mono text-blue-300">Settings → Enter Token</span>. Each account has exactly one token. Regenerating invalidates the old one.
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            variant="outline"
            className="w-full border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 text-xs h-8"
          >
            {generating
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Regenerating...</>
              : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerate Token</>
            }
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-6 gap-3 bg-gray-950 border border-dashed border-gray-700 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-400/60" />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-400 font-medium">No token yet</p>
              <p className="text-xs text-gray-600 mt-0.5">Generate one to link your in-game activity</p>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold border-0"
          >
            {generating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              : <><Key className="w-4 h-4 mr-2" /> Generate My Token</>
            }
          </Button>
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
