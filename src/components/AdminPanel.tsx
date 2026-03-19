import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Shield, Users, Key, Megaphone, ScrollText,
  Loader2, Trash2, Ban, CheckCircle2, Plus, X,
  RefreshCw, AlertTriangle, Info, Check, Zap
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type AdminTab = 'accounts' | 'tokens' | 'bans' | 'announcements' | 'audit';

type DashboardUser = {
  id: string;
  email: string;
  username: string;
  created_at: string;
  last_sign_in_at: string | null;
};

type BannedUser = {
  id: string;
  roblox_user_id: number;
  username: string;
  reason: string | null;
  created_at: string;
};

type Announcement = {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  active: boolean;
  created_at: string;
  expires_at: string | null;
};

type AuditEntry = {
  id: string;
  username: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

type TokenRow = {
  token: string;
  roblox_username: string;
  roblox_user_id: number;
  updated_at: string;
  user_id: string;
};

const WORDS = ['FIRE','IRON','VOID','DARK','SOUL','BONE','VEIL','GRIM','ASH','FLUX','BOLT','CLAW','DUSK','ECHO','FADE','GALE','HEX','JADE','KEEN','MIST','NOVA','ONYX','PIKE','RUIN','SAGE','TIDE','VILE','WARP','ZEAL','FANG'];
function generateToken() {
  return WORDS[Math.floor(Math.random() * WORDS.length)] + (Math.floor(Math.random() * 9000) + 1000);
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ANNOUNCE_ICONS = { info: Info, warning: AlertTriangle, success: CheckCircle2, error: X };
const ANNOUNCE_COLORS = { info: '#3b82f6', warning: '#f59e0b', success: '#10b981', error: '#ef4444' };

export function AdminPanel() {
  const [tab, setTab]             = useState<AdminTab>('accounts');
  const [isAdmin, setIsAdmin]     = useState<boolean | null>(null);
  const [loading, setLoading]     = useState(false);

  // Accounts
  const [accounts, setAccounts]   = useState<DashboardUser[]>([]);

  // Tokens
  const [tokens, setTokens]       = useState<TokenRow[]>([]);
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [newTokenVal, setNewTokenVal]   = useState('');

  // Bans
  const [bans, setBans]           = useState<BannedUser[]>([]);
  const [banInput, setBanInput]   = useState('');
  const [banReason, setBanReason] = useState('');

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newMsg, setNewMsg]       = useState('');
  const [newType, setNewType]     = useState<Announcement['type']>('info');
  const [newExpiry, setNewExpiry] = useState('');

  // Audit
  const [audit, setAudit]         = useState<AuditEntry[]>([]);

  useEffect(() => {
    setIsAdmin(true);
  }, []);

  const logAction = useCallback(async (action: string, details?: Record<string, unknown>) => {
    await supabase.rpc('log_action', { p_action: action, p_details: details ?? null });
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_tokens')
      .select('user_id, roblox_username, roblox_user_id, updated_at')
      .order('updated_at', { ascending: false });
    setAccounts((data ?? []).map((u: { user_id: string; roblox_username: string; roblox_user_id: number; updated_at: string }) => ({
      id: u.user_id,
      email: '',
      username: u.roblox_username,
      created_at: u.updated_at,
      last_sign_in_at: u.updated_at,
    })));
    setLoading(false);
  }, []);

  const loadTokens = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('user_tokens').select('*').order('updated_at', { ascending: false });
    setTokens(data ?? []);
    setLoading(false);
  }, []);

  const loadBans = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('banned_users').select('*').order('created_at', { ascending: false });
    setBans(data ?? []);
    setLoading(false);
  }, []);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setAnnouncements(data ?? []);
    setLoading(false);
  }, []);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
    setAudit(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'accounts')      loadAccounts();
    if (tab === 'tokens')        loadTokens();
    if (tab === 'bans')          loadBans();
    if (tab === 'announcements') loadAnnouncements();
    if (tab === 'audit')         loadAudit();
  }, [tab, isAdmin, loadAccounts, loadTokens, loadBans, loadAnnouncements, loadAudit]);

  const resetToken = async (row: TokenRow) => {
    const newTok = generateToken();
    const { error } = await supabase.from('user_tokens').update({ token: newTok, updated_at: new Date().toISOString() }).eq('user_id', row.user_id);
    if (error) { toast.error('Failed to reset token'); return; }
    await supabase.from('unique_users').update({ token: newTok }).eq('roblox_user_id', row.roblox_user_id);
    await logAction('reset_token', { roblox_username: row.roblox_username, old_token: row.token, new_token: newTok });
    toast.success(`Token reset for @${row.roblox_username}`);
    loadTokens();
  };

  const saveToken = async (row: TokenRow) => {
    const val = newTokenVal.trim().toUpperCase();
    if (!val) return;
    const { error } = await supabase.from('user_tokens').update({ token: val, updated_at: new Date().toISOString() }).eq('user_id', row.user_id);
    if (error) { toast.error('Failed to save token'); return; }
    await supabase.from('unique_users').update({ token: val }).eq('roblox_user_id', row.roblox_user_id);
    await logAction('assign_token', { roblox_username: row.roblox_username, new_token: val });
    toast.success(`Token updated for @${row.roblox_username}`);
    setEditingToken(null);
    setNewTokenVal('');
    loadTokens();
  };

  const banUser = async () => {
    const username = banInput.trim();
    if (!username) { toast.error('Enter a Roblox username'); return; }

    const { data: rows } = await supabase
      .from('unique_users')
      .select('roblox_user_id, username')
      .ilike('username', username)
      .limit(1);

    const dbUser = rows?.[0];

    if (!dbUser || !dbUser.roblox_user_id) {
      toast.error(`"${username}" not found in the database. They must run a script in-game first.`);
      return;
    }

    const { error } = await supabase.from('banned_users').insert({
      roblox_user_id: dbUser.roblox_user_id,
      username: dbUser.username,
      reason: banReason || null,
    });
    if (error) { toast.error(error.message); return; }
    await logAction('ban_user', { roblox_user_id: dbUser.roblox_user_id, username: dbUser.username, reason: banReason });
    toast.success(`@${dbUser.username} banned`);
    setBanInput(''); setBanReason('');
    loadBans();
  };

  const unbanUser = async (ban: BannedUser) => {
    await supabase.from('banned_users').delete().eq('id', ban.id);
    await logAction('unban_user', { roblox_user_id: ban.roblox_user_id, username: ban.username });
    toast.success(`@${ban.username ?? ban.roblox_user_id} unbanned`);
    loadBans();
  };

  const postAnnouncement = async () => {
    if (!newMsg.trim()) return;
    const { error } = await supabase.from('announcements').insert({
      message: newMsg.trim(),
      type: newType,
      active: true,
      expires_at: newExpiry ? new Date(newExpiry).toISOString() : null,
    });
    if (error) { toast.error('Post failed: ' + error.message); return; }
    await logAction('post_announcement', { message: newMsg, type: newType });
    toast.success('Announcement posted — visible to all users now');
    setNewMsg(''); setNewExpiry('');
    loadAnnouncements();
  };

  const toggleAnnouncement = async (a: Announcement) => {
    const { error } = await supabase.from('announcements').update({ active: !a.active }).eq('id', a.id);
    if (error) { toast.error('Toggle failed: ' + error.message); return; }
    await logAction(a.active ? 'deactivate_announcement' : 'activate_announcement', { id: a.id });
    loadAnnouncements();
  };

  const deleteAnnouncement = async (a: Announcement) => {
    const { error } = await supabase.from('announcements').delete().eq('id', a.id);
    if (error) { toast.error('Delete failed: ' + error.message); return; }
    await logAction('delete_announcement', { id: a.id });
    toast.success('Announcement deleted');
    loadAnnouncements();
  };

  if (isAdmin === null) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-muted)' }} />
    </div>
  );

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Shield className="w-10 h-10" style={{ color: 'var(--color-muted)' }} />
      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Admin access required</p>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Your account doesn't have admin privileges.</p>
    </div>
  );

  const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'accounts',      label: 'Accounts',      icon: Users       },
    { id: 'tokens',        label: 'Tokens',         icon: Key         },
    { id: 'bans',          label: 'Bans',           icon: Ban         },
    { id: 'announcements', label: 'Announcements',  icon: Megaphone   },
    { id: 'audit',         label: 'Audit Log',      icon: ScrollText  },
  ];

  const s = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' };
  const s2 = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-rose-400" />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Admin Panel</h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">ADMIN ONLY</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl border overflow-x-auto" style={s2}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
            style={tab === t.id ? { backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' } : { color: 'var(--color-muted)' }}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-muted)' }} /></div>}

      {/* ── Accounts ── */}
      {!loading && tab === 'accounts' && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{accounts.length} registered accounts</p>
          {accounts.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border" style={s2}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' }}>
                {(a.username[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>@{a.username}</p>
                <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>linked {timeAgo(a.created_at)}</p>
              </div>
              <p className="text-[10px] shrink-0" style={{ color: 'var(--color-muted)' }}>
                {a.last_sign_in_at ? `last seen ${timeAgo(a.last_sign_in_at)}` : 'never signed in'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tokens ── */}
      {!loading && tab === 'tokens' && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{tokens.length} verified tokens</p>
          {tokens.map(row => (
            <div key={row.user_id} className="p-3 rounded-lg border space-y-2" style={s2}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>@{row.roblox_username}</p>
                  <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>ID {row.roblox_user_id}</span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => resetToken(row)} title="Auto-generate new token"
                    className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-muted)' }}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditingToken(row.user_id); setNewTokenVal(row.token); }}
                    className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-accent)' }}>
                    <Key className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {editingToken === row.user_id ? (
                <div className="flex gap-2">
                  <Input value={newTokenVal} onChange={e => setNewTokenVal(e.target.value.toUpperCase())}
                    className="font-mono text-xs h-8" maxLength={12}
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  <Button onClick={() => saveToken(row)} size="sm" className="h-8 text-xs border-0 px-3" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button onClick={() => { setEditingToken(null); setNewTokenVal(''); }} variant="outline" size="sm" className="h-8 px-3"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <code className="text-sm font-bold font-mono tracking-widest text-amber-400">{row.token}</code>
                  <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{timeAgo(row.updated_at)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Bans ── */}
      {!loading && tab === 'bans' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border space-y-3" style={s}>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Ban a user</p>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: 'var(--color-muted)' }}>Roblox username</label>
                <Input
                  value={banInput}
                  onChange={e => setBanInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && banUser()}
                  placeholder="e.g. Builderman"
                  style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="text-[11px] mb-1 block" style={{ color: 'var(--color-muted)' }}>Reason <span style={{ color: 'var(--color-muted)', opacity: 0.6 }}>(shown to the user in-game)</span></label>
                <Input
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && banUser()}
                  placeholder="e.g. Cheating, exploiting, abuse..."
                  style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>

            {/* Preview what the user will see in Roblox */}
            {(banInput.trim() || banReason.trim()) && (
              <div className="p-3 rounded-lg border border-dashed border-rose-500/30" style={{ backgroundColor: 'rgba(239,68,68,0.05)' }}>
                <p className="text-[10px] font-semibold text-rose-400 mb-1">Preview — what they'll see in console:</p>
                <code className="text-[11px] text-rose-300 font-mono">
                  [vhxLUA] You are banned. Reason: {banReason.trim() || 'No reason provided.'}
                </code>
              </div>
            )}

            <Button onClick={banUser} className="w-full border-0 font-semibold" style={{ backgroundColor: '#ef4444', color: '#fff' }}>
              <Ban className="w-4 h-4 mr-2" /> Ban {banInput.trim() ? `@${banInput.trim()}` : 'User'}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{bans.length} banned users</p>
            {bans.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border" style={s2}>
                <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{b.username ?? `User ${b.roblox_user_id}`}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>ID {b.roblox_user_id} · {b.reason ?? 'No reason'} · {timeAgo(b.created_at)}</p>
                </div>
                <button onClick={() => unbanUser(b)} className="text-xs px-2 py-1 rounded-lg border transition-colors"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                  Unban
                </button>
              </div>
            ))}
            {bans.length === 0 && <p className="text-center text-xs py-6" style={{ color: 'var(--color-muted)' }}>No banned users</p>}
          </div>
        </div>
      )}

      {/* ── Announcements ── */}
      {!loading && tab === 'announcements' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border space-y-3" style={s}>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Post announcement</p>
            <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Message..."
              style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            <div className="flex gap-2">
              <div className="flex gap-1">
                {(['info','warning','success','error'] as const).map(t => (
                  <button key={t} onClick={() => setNewType(t)}
                    className="w-7 h-7 rounded-lg border text-xs font-bold transition-all"
                    style={{ borderColor: newType === t ? ANNOUNCE_COLORS[t] : 'var(--color-border)', backgroundColor: newType === t ? `${ANNOUNCE_COLORS[t]}18` : 'transparent', color: ANNOUNCE_COLORS[t] }}>
                    {t[0].toUpperCase()}
                  </button>
                ))}
              </div>
              <Input type="datetime-local" value={newExpiry} onChange={e => setNewExpiry(e.target.value)}
                className="flex-1 text-xs h-8"
                style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              <Button onClick={postAnnouncement} size="sm" className="h-8 px-3 border-0 shrink-0" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Post
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {announcements.map(a => {
              const Icon = ANNOUNCE_ICONS[a.type];
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border" style={{ ...s2, opacity: a.active ? 1 : 0.5 }}>
                  <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: ANNOUNCE_COLORS[a.type] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>{a.message}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
                      {a.type} · {timeAgo(a.created_at)} {a.expires_at ? `· expires ${timeAgo(a.expires_at)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => toggleAnnouncement(a)} className="p-1.5 rounded-lg transition-colors" style={{ color: a.active ? '#10b981' : 'var(--color-muted)' }}>
                      {a.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => deleteAnnouncement(a)} className="p-1.5 rounded-lg transition-colors text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {announcements.length === 0 && <p className="text-center text-xs py-6" style={{ color: 'var(--color-muted)' }}>No announcements</p>}
          </div>
        </div>
      )}

      {/* ── Audit Log ── */}
      {!loading && tab === 'audit' && (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Last 100 admin actions</p>
          {audit.map(entry => (
            <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border" style={s2}>
              <ScrollText className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono font-bold" style={{ color: 'var(--color-text)' }}>{entry.action}</code>
                  {entry.username && <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>by @{entry.username}</span>}
                </div>
                {entry.details && (
                  <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'var(--color-muted)' }}>
                    {JSON.stringify(entry.details)}
                  </p>
                )}
              </div>
              <span className="text-[10px] shrink-0" style={{ color: 'var(--color-muted)' }}>{timeAgo(entry.created_at)}</span>
            </div>
          ))}
          {audit.length === 0 && <p className="text-center text-xs py-6" style={{ color: 'var(--color-muted)' }}>No audit entries yet</p>}
        </div>
      )}
    </div>
  );
}
