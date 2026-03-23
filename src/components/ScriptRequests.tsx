import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ThumbsUp, Plus, Loader2, ExternalLink, CheckCircle, Clock, XCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

type Request = {
  id: string;
  game_name: string;
  game_url: string | null;
  description: string | null;
  votes: number;
  status: 'pending' | 'in_progress' | 'done' | 'rejected';
  created_at: string;
  roblox_username: string | null;
  voted?: boolean;
};

const STATUS_STYLE: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  pending:     { label: 'Pending',     color: '#94a3b8', icon: Clock       },
  in_progress: { label: 'In Progress', color: '#f59e0b', icon: Zap         },
  done:        { label: 'Done',        color: '#10b981', icon: CheckCircle  },
  rejected:    { label: 'Rejected',    color: '#ef4444', icon: XCircle     },
};

export function ScriptRequests({ isAdmin = false }: { isAdmin?: boolean }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userId, setUserId]     = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ game_name: '', game_url: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setUsername(data.user?.user_metadata?.username ?? null);
    });
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('script_requests')
      .select('*')
      .order('votes', { ascending: false });
    if (!data) { setLoading(false); return; }

    // Check which ones current user voted on
    let votedIds = new Set<string>();
    if (userId) {
      const { data: votes } = await supabase
        .from('script_request_votes')
        .select('request_id')
        .eq('user_id', userId);
      votedIds = new Set((votes ?? []).map((v: any) => v.request_id));
    }

    setRequests(data.map((r: any) => ({ ...r, voted: votedIds.has(r.id) })));
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel('script-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'script_requests' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const vote = async (req: Request) => {
    if (!userId) return toast.error('Sign in to vote');
    if (req.voted) return;

    // Optimistic update
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, votes: r.votes + 1, voted: true } : r));

    await Promise.all([
      supabase.from('script_requests').update({ votes: req.votes + 1 }).eq('id', req.id),
      supabase.from('script_request_votes').insert({ request_id: req.id, user_id: userId }),
    ]);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('script_requests').update({ status }).eq('id', id);
    toast.success('Status updated');
  };

  const submit = async () => {
    if (!form.game_name.trim()) return toast.error('Game name required');
    setSubmitting(true);
    const { error } = await supabase.from('script_requests').insert({
      user_id: userId,
      roblox_username: username,
      game_name: form.game_name.trim(),
      game_url: form.game_url.trim() || null,
      description: form.description.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error('Failed to submit');
    setForm({ game_name: '', game_url: '', description: '' });
    setShowForm(false);
    toast.success('Request submitted!');
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Script Requests</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Vote for games you want scripted. Most voted get priority.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--color-accent)' }}>
          <Plus className="w-4 h-4" /> Request
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>New Request</p>
          <input value={form.game_name} onChange={e => setForm(f => ({ ...f, game_name: e.target.value }))}
            placeholder="Game name *" maxLength={60}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
            style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          <input value={form.game_url} onChange={e => setForm(f => ({ ...f, game_url: e.target.value }))}
            placeholder="Roblox game URL (optional)"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
            style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Why should this be scripted? (optional)" rows={2} maxLength={300}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none border resize-none"
            style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          <div className="flex gap-2">
            <button onClick={submit} disabled={submitting}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)' }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Submit'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-muted)' }} /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--color-muted)' }}>
          <p className="text-sm">No requests yet — be the first!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(req => {
            const s = STATUS_STYLE[req.status] ?? STATUS_STYLE.pending;
            return (
              <div key={req.id} className="flex items-center gap-3 p-4 rounded-xl border"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                {/* Vote button */}
                <button onClick={() => vote(req)} disabled={!userId || req.voted}
                  className="flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-lg shrink-0 transition-all"
                  style={{
                    backgroundColor: req.voted ? 'rgba(99,102,241,0.12)' : 'var(--color-surface2)',
                    color: req.voted ? 'var(--color-accent)' : 'var(--color-muted)',
                    border: `1px solid ${req.voted ? 'rgba(99,102,241,0.3)' : 'var(--color-border)'}`,
                  }}>
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">{req.votes}</span>
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text)' }}>{req.game_name}</p>
                    <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: `${s.color}18`, color: s.color }}>
                      <s.icon className="w-2.5 h-2.5" />{s.label}
                    </span>
                  </div>
                  {req.description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-muted)' }}>{req.description}</p>}
                  {req.roblox_username && <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-muted)' }}>by @{req.roblox_username}</p>}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {req.game_url && (
                    <a href={req.game_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--color-muted)' }}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {isAdmin && (
                    <select value={req.status} onChange={e => updateStatus(req.id, e.target.value)}
                      className="text-[11px] px-2 py-1 rounded-lg border outline-none"
                      style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                      {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
