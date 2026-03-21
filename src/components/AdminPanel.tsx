import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { UserProfile } from '@/components/UserProfile';
import { MaintenancePanel } from '@/components/MaintenancePanel';
import {
  Shield, Users, Key, Megaphone, ScrollText, Wrench,
  Loader2, Trash2, Ban, CheckCircle2, Plus, X,
  RefreshCw, AlertTriangle, Info, Check, Zap,
  ChevronLeft, ChevronRight, Gamepad2, Calendar, Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type AdminTab = 'accounts' | 'users' | 'tokens' | 'bans' | 'announcements' | 'audit' | 'maintenance';

type DashboardUser = {
  id: string;
  email: string;
  username: string;
  created_at: string;
  last_sign_in_at: string | null;
  roblox_user_id: number | null;
  provider: 'google' | 'discord' | 'email' | 'unknown';
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

type ScriptUser = {
  roblox_user_id: number; username: string;
  execution_count: number; first_seen: string;
  last_seen: string; token: string | null;
  place_id: number; banned: boolean;
};

const PAGE_SIZE = 20;

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  const pages = Math.min(total, 7);
  const start = total <= 7 ? 1 : page <= 4 ? 1 : page >= total - 3 ? total - 6 : page - 3;
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Page {page} of {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1}
          className="p-1.5 rounded-lg border disabled:opacity-30"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
          <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--color-muted)' }} />
        </button>
        {Array.from({ length: pages }, (_, i) => start + i).map(p => (
          <button key={p} onClick={() => onChange(p)}
            className="w-7 h-7 rounded-lg text-xs font-medium border transition-colors"
            style={p === page
              ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }
              : { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)', color: 'var(--color-muted)' }}>
            {p}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page >= total}
          className="p-1.5 rounded-lg border disabled:opacity-30"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
          <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--color-muted)' }} />
        </button>
      </div>
    </div>
  );
}
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
  const [profileUser, setProfileUser] = useState<{ userId: number; username: string } | null>(null);
  const [isAdmin, setIsAdmin]     = useState<boolean | null>(null);
  const [loading, setLoading]     = useState(false);


  const [accounts, setAccounts]   = useState<DashboardUser[]>([]);
  const [acctPage, setAcctPage]   = useState(1);

  const [scriptUsers, setScriptUsers] = useState<ScriptUser[]>([]);
  const [userPage, setUserPage]       = useState(1);
  const [userSearch, setUserSearch]   = useState('');


  const [tokens, setTokens]       = useState<TokenRow[]>([]);
  const [tokenFilter, setTokenFilter] = useState('');
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [newTokenVal, setNewTokenVal]   = useState('');

  const [bans, setBans]           = useState<BannedUser[]>([]);
  const [banFilter, setBanFilter] = useState('');
  const [banInput, setBanInput]   = useState('');
  const [banReason, setBanReason] = useState('');


  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newMsg, setNewMsg]       = useState('');
  const [newType, setNewType]     = useState<Announcement['type']>('info');
  const [newExpiry, setNewExpiry] = useState('');
  const [newTitle, setNewTitle]   = useState('');
  const [sendAsJson, setSendAsJson] = useState(false);


  const [audit, setAudit]         = useState<AuditEntry[]>([]);

  useEffect(() => {
    setIsAdmin(true);
  }, []);

  const logAction = useCallback(async (action: string, details?: Record<string, unknown>) => {
    await supabase.rpc('log_action', { p_action: action, p_details: details ?? null });
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      // Get auth session for the API call
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Try admin API first (needs SUPABASE_SERVICE_ROLE_KEY set in Vercel env)
      if (token) {
        const res = await fetch('/api/admin-users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { users } = await res.json();
          // Also get unique_users for roblox_user_id mapping
          const { data: gameUsers } = await supabase
            .from('unique_users')
            .select('roblox_user_id, username, last_seen')
            .order('last_seen', { ascending: false });
          const gameMap = new Map<string, { roblox_user_id: number; username: string; last_seen: string }>();
          // Match by username
          (gameUsers ?? []).forEach((u: any) => gameMap.set(u.username?.toLowerCase(), u));

          setAccounts(users.map((u: any) => {
            const game = gameMap.get(u.username?.toLowerCase());
            const provider = u.provider === 'google' ? 'google'
              : u.provider === 'discord' ? 'discord'
              : 'email';
            return {
              id: u.id, email: u.email, username: u.username,
              roblox_user_id: game?.roblox_user_id ?? null,
              created_at: u.created_at,
              last_sign_in_at: u.last_sign_in_at,
              provider,
            };
          }));
          setLoading(false);
          return;
        }
      }

      // Fallback: use user_tokens table which only has dashboard-registered users
      const { data } = await supabase
        .from('user_tokens')
        .select('user_id, roblox_username, roblox_user_id, updated_at')
        .order('updated_at', { ascending: false });
      setAccounts((data ?? []).map((u: any) => ({
        id: u.user_id,
        email: '',
        username: u.roblox_username ?? 'unknown',
        roblox_user_id: u.roblox_user_id ?? null,
        created_at: u.updated_at,
        last_sign_in_at: u.updated_at ?? null,
        provider: 'email' as const,
      })));
    } catch (e) {
      console.error('loadAccounts error:', e);
    }
    setLoading(false);
  }, []);

  const loadScriptUsers = useCallback(async () => {
    setLoading(true);
    const [{ data: rows }, { data: bansData }] = await Promise.all([
      supabase.from('unique_users').select('roblox_user_id,username,execution_count,first_seen,last_seen,token,place_id'),
      supabase.from('banned_users').select('roblox_user_id'),
    ]);
    const bannedSet = new Set((bansData ?? []).map((b: { roblox_user_id: number }) => b.roblox_user_id));

    const agg: Record<number, ScriptUser> = {};
    for (const r of (rows ?? [])) {
      const id = r.roblox_user_id;
      if (!id) continue;
      if (!agg[id]) {
        agg[id] = { ...r, execution_count: 0, banned: bannedSet.has(id) };
      }
      agg[id].execution_count += r.execution_count ?? 0;
      if (r.last_seen > agg[id].last_seen) agg[id].last_seen = r.last_seen;
      if (r.first_seen < agg[id].first_seen) agg[id].first_seen = r.first_seen;
      if (!agg[id].token && r.token) agg[id].token = r.token;
    }

    // Sort by most recently seen first
    const sorted = Object.values(agg).sort((a, b) =>
      new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()
    );
    setScriptUsers(sorted);
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

  // Auto-reload accounts when auth changes and subscribe to user_tokens for new registrations
  useEffect(() => {
    if (tab !== 'accounts') return;
    const ch = supabase
      .channel('admin-accounts-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_tokens' }, loadAccounts)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tab, loadAccounts]);

  // Realtime: refresh bans tab and script users whenever banned_users changes
  useEffect(() => {
    const ch = supabase.channel('admin-bans-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banned_users' }, () => {
        loadBans();
        loadScriptUsers();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadBans, loadScriptUsers]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'accounts')      loadAccounts();
    if (tab === 'users')         loadScriptUsers();
    if (tab === 'tokens')        loadTokens();
    if (tab === 'bans')          loadBans();
    if (tab === 'announcements') loadAnnouncements();
    if (tab === 'audit')         loadAudit();
  }, [tab, isAdmin, loadAccounts, loadScriptUsers, loadTokens, loadBans, loadAnnouncements, loadAudit]);

  // Realtime updates for script users tab
  useEffect(() => {
    if (tab !== 'users') return;
    const ch = supabase.channel('admin-script-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, loadScriptUsers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banned_users' }, loadScriptUsers)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tab, loadScriptUsers]);

  const resetToken = async (row: TokenRow) => {
    if (!window.confirm(`Reset token for @${row.roblox_username}? Their current token will stop working.`)) return;
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

  const quickUnban = async (robloxUserId: number, username: string) => {
    await supabase.from('banned_users').delete().eq('roblox_user_id', robloxUserId);
    await logAction('unban_user', { username });
    toast.success(`@${username} unbanned`);
    loadScriptUsers();
    loadBans();
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
      toast.error(`"${username}" not found. They must run a script in-game first.`);
      return;
    }

    if (!window.confirm(`Ban @${dbUser.username}? This will block them from all vhxLUA scripts.`)) return;

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
    if (!window.confirm(`Unban @${ban.username ?? ban.roblox_user_id}?`)) return;
    await supabase.from('banned_users').delete().eq('id', ban.id);
    await logAction('unban_user', { roblox_user_id: ban.roblox_user_id, username: ban.username });
    toast.success(`@${ban.username ?? ban.roblox_user_id} unbanned`);
    loadBans();
  };

  // Parse JSON input into Discord embed fields
  const parseJsonInput = (raw: string) => {
    try {
      const j = JSON.parse(raw);
      return { ok: true, data: j };
    } catch {
      return { ok: false, data: null };
    }
  };

  const buildEmbed = (raw: string, type: typeof newType) => {
    const colorMap: Record<string, number> = { info: 0x6366f1, warning: 0xf59e0b, success: 0x10b981, error: 0xef4444 };
    const color = colorMap[type] ?? 0x6366f1;
    if (!sendAsJson) {
      return {
        title: newTitle.trim() || `[${type.toUpperCase()}] Announcement`,
        description: raw.trim(),
        color,
        footer: { text: `vhxLUA • ${new Date().toLocaleDateString()}` },
      };
    }
    const parsed = parseJsonInput(raw);
    if (!parsed.ok || !parsed.data) return null;
    const j = parsed.data;
    // Map JSON fields to embed — supports: title, description/message/content, color, fields (array), footer, url, image, thumbnail
    return {
      title: j.title ?? j.type ?? `[${type.toUpperCase()}]`,
      description: j.description ?? j.message ?? j.content ?? '',
      color: typeof j.color === 'number' ? j.color : color,
      url: j.url ?? undefined,
      fields: Array.isArray(j.fields)
        ? j.fields.map((f: any) => ({ name: String(f.name ?? ''), value: String(f.value ?? ''), inline: !!f.inline }))
        : undefined,
      footer: j.footer ? { text: String(j.footer?.text ?? j.footer) } : { text: `vhxLUA • ${new Date().toLocaleDateString()}` },
      image: j.image ? { url: String(j.image?.url ?? j.image) } : undefined,
      thumbnail: j.thumbnail ? { url: String(j.thumbnail?.url ?? j.thumbnail) } : undefined,
    };
  };

  const postAnnouncement = async () => {
    if (!newMsg.trim()) return;
    const embed = buildEmbed(newMsg, newType);
    if (sendAsJson && !embed) { toast.error('Invalid JSON — check your input'); return; }

    const displayMsg = sendAsJson
      ? (parseJsonInput(newMsg).data?.description ?? parseJsonInput(newMsg).data?.message ?? newMsg)
      : newMsg.trim();

    const { error } = await supabase.from('announcements').insert({
      message: displayMsg,
      type: newType,
      active: true,
      expires_at: newExpiry ? new Date(newExpiry).toISOString() : null,
    });
    if (error) { toast.error('Post failed: ' + error.message); return; }
    await logAction('post_announcement', { message: displayMsg, type: newType });

    if (embed) {
      const r = await fetch('/api/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embed }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast.error('Discord send failed: ' + (err.error ?? r.status));
        return;
      }
    }

    toast.success('Announcement posted and sent to Discord');
    setNewMsg(''); setNewTitle(''); setNewExpiry(''); setSendAsJson(false);
    loadAnnouncements();
  };

  const toggleAnnouncement = async (a: Announcement) => {
    const { error } = await supabase.from('announcements').update({ active: !a.active }).eq('id', a.id);
    if (error) { toast.error('Toggle failed: ' + error.message); return; }
    await logAction(a.active ? 'deactivate_announcement' : 'activate_announcement', { id: a.id });
    loadAnnouncements();
  };

  const deleteAnnouncement = async (a: Announcement) => {
    if (!window.confirm('Delete this announcement?')) return;
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
    { id: 'users',         label: 'Script Users',  icon: Gamepad2    },
    { id: 'tokens',        label: 'Tokens',         icon: Key         },
    { id: 'bans',          label: 'Bans',           icon: Ban         },
    { id: 'announcements', label: 'Announcements',  icon: Megaphone   },
    { id: 'audit',         label: 'Audit Log',      icon: ScrollText  },
    { id: 'maintenance',   label: 'Maintenance',    icon: Wrench      },
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


      {!loading && tab === 'accounts' && (
        profileUser
          ? <UserProfile userId={profileUser.userId} username={profileUser.username} onBack={() => setProfileUser(null)} isAdmin={true} />
          : <div className="space-y-2">
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{accounts.length} players — click to view profile</p>
              {accounts.slice((acctPage - 1) * PAGE_SIZE, acctPage * PAGE_SIZE).map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:opacity-75 transition-opacity" style={s2}
                  onClick={() => a.roblox_user_id ? setProfileUser({ userId: a.roblox_user_id, username: a.username }) : null}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)' }}>
                    {(a.username[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>@{a.username}</p>
                      {/* Provider badge */}
                      {a.provider === 'google' && (
                        <span title="Signed in with Google">
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        </span>
                      )}
                      {a.provider === 'discord' && (
                        <span title="Signed in with Discord">
                          <svg viewBox="0 0 24 24" fill="#5865F2" className="w-3.5 h-3.5 shrink-0">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                          </svg>
                        </span>
                      )}
                      {a.provider === 'email' && (
                        <span title="Signed in with username/password" className="text-[9px] px-1 py-0.5 rounded"
                          style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>pw</span>
                      )}
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
                      {a.roblox_user_id ? `ID ${a.roblox_user_id} · ` : ''}first seen {timeAgo(a.created_at)}
                    </p>
                  </div>
                  <p className="text-[10px] shrink-0" style={{ color: 'var(--color-muted)' }}>
                    {a.last_sign_in_at ? timeAgo(a.last_sign_in_at) : '—'}
                  </p>
                </div>
              ))}
              {accounts.length === 0 && (
                <p className="text-center text-xs py-8" style={{ color: 'var(--color-muted)' }}>No players found</p>
              )}
              <Pagination page={acctPage} total={Math.max(1, Math.ceil(accounts.length / PAGE_SIZE))} onChange={setAcctPage} />
            </div>
      )}


      {!loading && tab === 'users' && (() => {
        if (profileUser) {
          return <UserProfile userId={profileUser.userId} username={profileUser.username} onBack={() => setProfileUser(null)} isAdmin={true} />;
        }
        const filtered = userSearch
          ? scriptUsers.filter(u => u.username?.toLowerCase().includes(userSearch.toLowerCase()))
          : scriptUsers;
        const paged = filtered.slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE);
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                placeholder="Search by username..."
                className="flex-1 rounded-lg px-3 py-2 text-xs border outline-none"
                style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
              <p className="text-xs shrink-0" style={{ color: 'var(--color-muted)' }}>{filtered.length} unique users</p>
            </div>
            {paged.map((u, i) => (
              <button
                key={`${u.roblox_user_id}-${i}`}
                onClick={() => setProfileUser({ userId: u.roblox_user_id, username: u.username })}
                className="w-full text-left p-3 rounded-lg border transition-all hover:opacity-80"
                style={{ borderColor: u.banned ? 'rgba(239,68,68,0.3)' : 'var(--color-border)', backgroundColor: u.banned ? 'rgba(239,68,68,0.05)' : 'var(--color-surface2)' }}>
                <div className="flex items-center gap-3">
                  <img
                    src={`/api/roblox-avatar?userId=${u.roblox_user_id}`}
                    alt={u.username}
                    className="w-10 h-10 rounded-full shrink-0 object-cover border"
                    style={{ borderColor: 'var(--color-border)' }}
                    onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=6366f1&color=fff`; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: u.banned ? '#f87171' : 'var(--color-text)', textDecoration: u.banned ? 'line-through' : 'none' }}>
                        {u.username}
                      </p>
                      {u.banned && (
                        <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <Ban className="w-2.5 h-2.5" /> banned
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-accent)' }}>
                        <Zap className="w-3 h-3" />{(u.execution_count ?? 0).toLocaleString()} execs
                      </span>
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-muted)' }}>
                        <Calendar className="w-3 h-3" />first {timeAgo(u.first_seen)}
                      </span>
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-muted)' }}>
                        <Clock className="w-3 h-3" />last {timeAgo(u.last_seen)}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>ID {u.roblox_user_id}</span>
                    </div>
                  </div>
                  {u.token && (
                    <code className="text-[10px] font-mono px-2 py-1 rounded border shrink-0"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}>
                      {u.token}
                    </code>
                  )}
                  {u.banned && (
                    <button
                      onClick={e => { e.stopPropagation(); quickUnban(u.roblox_user_id, u.username); }}
                      className="text-[10px] px-2 py-1 rounded-lg border shrink-0 transition-colors hover:bg-emerald-500/20"
                      style={{ borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' }}>
                      Unban
                    </button>
                  )}
                </div>
              </button>
            ))}
            {paged.length === 0 && <p className="text-center text-xs py-6" style={{ color: 'var(--color-muted)' }}>No users found</p>}
            <Pagination page={userPage} total={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))} onChange={setUserPage} />
          </div>
        );
      })()}

      {!loading && tab === 'tokens' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs flex-1" style={{ color: 'var(--color-muted)' }}>{tokens.length} verified tokens</p>
            <input value={tokenFilter} onChange={e => setTokenFilter(e.target.value)} placeholder="Filter by username..." className="rounded-lg px-2.5 py-1.5 text-xs border outline-none w-40" style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          {tokens.filter(r => !tokenFilter || r.roblox_username.toLowerCase().includes(tokenFilter.toLowerCase()) || r.token.toLowerCase().includes(tokenFilter.toLowerCase())).map(row => (
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
            <div className="flex items-center gap-2">
              <p className="text-xs flex-1" style={{ color: 'var(--color-muted)' }}>{bans.length} banned users</p>
              <input value={banFilter} onChange={e => setBanFilter(e.target.value)} placeholder="Filter by username..." className="rounded-lg px-2.5 py-1.5 text-xs border outline-none w-40" style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            </div>
            {bans.filter(b => !banFilter || (b.username ?? '').toLowerCase().includes(banFilter.toLowerCase())).map(b => (
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


      {!loading && tab === 'announcements' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border space-y-3" style={s}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>Post announcement</p>
              <div className="flex gap-1">
                <button onClick={() => setSendAsJson(false)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all"
                  style={{ borderColor: !sendAsJson ? 'var(--color-accent)' : 'var(--color-border)', backgroundColor: !sendAsJson ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'transparent', color: !sendAsJson ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                  Text
                </button>
                <button onClick={() => setSendAsJson(true)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all"
                  style={{ borderColor: sendAsJson ? '#6366f1' : 'var(--color-border)', backgroundColor: sendAsJson ? '#6366f120' : 'transparent', color: sendAsJson ? '#6366f1' : 'var(--color-muted)' }}>
                  {'{ } JSON'}
                </button>
              </div>
            </div>

            {!sendAsJson ? (
              <>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title (optional)..."
                  className="text-xs" style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Message..."
                  style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              </>
            ) : (
              <div className="space-y-2">
                <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  placeholder={`{
  "title": "Update v2.0",
  "description": "New features dropped!",
  "color": 6618580,
  "fields": [
    { "name": "What's new", "value": "Kill Aura improvements", "inline": true }
  ],
  "footer": { "text": "vhxLUA" }
}`}
                  rows={8} spellCheck={false}
                  className="w-full text-[11px] font-mono px-3 py-2 rounded-lg border outline-none resize-none"
                  style={{ backgroundColor: 'var(--color-surface2)', borderColor: (newMsg && !parseJsonInput(newMsg).ok) ? '#ef4444' : 'var(--color-border)', color: 'var(--color-text)' }} />
                {newMsg && !parseJsonInput(newMsg).ok && (
                  <p className="text-[10px] text-rose-400">Invalid JSON — check syntax</p>
                )}
                {newMsg && parseJsonInput(newMsg).ok && (() => {
                  const e = buildEmbed(newMsg, newType);
                  if (!e) return null;
                  const hexColor = '#' + (e.color ?? 0x6366f1).toString(16).padStart(6, '0');
                  return (
                    <div className="rounded-lg border p-3 space-y-1.5" style={{ backgroundColor: '#1e1f22', borderColor: '#3f3f46' }}>
                      <p className="text-[9px] uppercase tracking-wider mb-2" style={{ color: '#71717a' }}>Discord embed preview</p>
                      <div className="flex gap-2">
                        <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: hexColor, minHeight: '40px' }} />
                        <div className="flex-1 min-w-0 space-y-1">
                          {e.title && <p className="text-sm font-semibold text-white">{String(e.title)}</p>}
                          {e.description && <p className="text-xs" style={{ color: '#d4d4d8' }}>{String(e.description)}</p>}
                          {Array.isArray(e.fields) && e.fields.length > 0 && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                              {(e.fields as any[]).map((f: any, i: number) => (
                                <div key={i}>
                                  <p className="text-[10px] font-semibold text-white">{f.name}</p>
                                  <p className="text-[10px]" style={{ color: '#a1a1aa' }}>{f.value}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          {e.footer && <p className="text-[9px] pt-1" style={{ color: '#71717a' }}>{String((e.footer as any).text ?? '')}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex gap-2 items-center flex-wrap">
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

      {tab === 'maintenance' && <MaintenancePanel />}
    </div>
  );
}
