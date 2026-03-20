import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Shield, Ban, Gamepad2, Clock, Key, Fingerprint, Monitor, AlertTriangle } from 'lucide-react';

interface UserRow {
  roblox_user_id: number;
  username: string;
  game_name: string;
  place_id: number;
  execution_count: number;
  first_seen: string;
  last_seen: string;
  token: string;
  fingerprint: string;
  hwid: string;
}

interface BanRow { id: string; reason: string; created_at: string; unban_at: string | null; }

const PLACE_NAMES: Record<number, string> = {
  18172550962:'Pixel Blade',18172553902:'Pixel Blade',133884972346775:'Pixel Blade',
  138013005633222:'Loot Hero',77439980360504:'Loot Hero',
  119987266683883:'Survive Lava',136801880565837:'Flick',123974602339071:'UNC Tester',
};
const gName = (r: UserRow) => r.game_name || PLACE_NAMES[r.place_id] || `Place ${r.place_id}`;
const timeAgo = (iso: string) => { const d=(Date.now()-new Date(iso).getTime())/1000; if(d<60)return`${Math.floor(d)}s ago`;if(d<3600)return`${Math.floor(d/60)}m ago`;if(d<86400)return`${Math.floor(d/3600)}h ago`;return`${Math.floor(d/86400)}d ago`; };
const fmt = (iso: string) => new Date(iso).toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'});

interface Props { userId: number; username: string; onBack: () => void; isAdmin: boolean; }

export function UserProfile({ userId, username, onBack, isAdmin }: Props) {
  const [rows,    setRows]    = useState<UserRow[]>([]);
  const [ban,     setBan]     = useState<BanRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatar,  setAvatar]  = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: userRows }, { data: banRow }] = await Promise.all([
        supabase.from('unique_users').select('*').eq('roblox_user_id', userId).order('last_seen', { ascending: false }),
        supabase.from('banned_users').select('*').eq('roblox_user_id', userId).maybeSingle(),
      ]);
      if (userRows) setRows(userRows);
      if (banRow)   setBan(banRow);
      try {
        const r = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`);
        const j = await r.json();
        setAvatar(j?.data?.[0]?.imageUrl ?? null);
      } catch { /**/ }
      setLoading(false);
    })();
  }, [userId]);

  const totalExecs = rows.reduce((s, r) => s + (r.execution_count ?? 0), 0);
  const firstSeen  = rows.length ? rows.reduce((a,b)=>new Date(a.first_seen)<new Date(b.first_seen)?a:b).first_seen : null;
  const lastSeen   = rows.length ? rows.reduce((a,b)=>new Date(a.last_seen)>new Date(b.last_seen)?a:b).last_seen : null;
  const token = rows[0]?.token ?? null;
  const fp    = rows[0]?.fingerprint ?? null;
  const hwid  = rows[0]?.hwid ?? null;

  const doBan = async () => {
    if (!banReason.trim()) return toast.error('Enter a reason');
    const { error } = await supabase.from('banned_users').insert({ roblox_user_id: userId, username, reason: banReason });
    if (error) return toast.error(error.message);
    toast.success(`@${username} banned`);
    setBan({ id: '', reason: banReason, created_at: new Date().toISOString(), unban_at: null });
  };
  const doUnban = async () => {
    await supabase.from('banned_users').delete().eq('roblox_user_id', userId);
    toast.success(`@${username} unbanned`); setBan(null);
  };
  const doHWIDBan = async () => {
    if (!hwid) return toast.error('No HWID found');
    if (!banReason.trim()) return toast.error('Enter a reason');
    await supabase.from('hwid_bans').insert({ hwid, roblox_user_id: userId, username, reason: banReason });
    toast.success('HWID banned');
  };
  const doFPBan = async () => {
    if (!fp) return toast.error('No fingerprint found');
    if (!banReason.trim()) return toast.error('Enter a reason');
    await supabase.from('fingerprint_bans').insert({ fingerprint: fp, roblox_user_id: userId, username, reason: banReason });
    toast.success('Device banned');
  };
    toast.success('Device banned');
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="rounded-xl border p-5 flex items-center gap-5" style={{ borderColor:'var(--color-border)',backgroundColor:'var(--color-surface)' }}>
        {avatar
          ? <img src={avatar} alt={username} className="w-16 h-16 rounded-full border-2" style={{ borderColor:'var(--color-border)' }} />
          : <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor:'var(--color-surface2)',color:'var(--color-text)' }}>{username[0]?.toUpperCase()}</div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold" style={{ color:'var(--color-text)' }}>@{username}</h2>
            {ban && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">BANNED</span>}
          </div>
          <a href={`https://www.roblox.com/users/${userId}/profile`} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline">View Roblox Profile</a>
          <div className="flex gap-4 mt-1 flex-wrap">
            <span className="text-xs" style={{ color:'var(--color-muted)' }}>Joined {firstSeen ? fmt(firstSeen) : '—'}</span>
            <span className="text-xs" style={{ color:'var(--color-muted)' }}>Last seen {lastSeen ? timeAgo(lastSeen) : '—'}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold" style={{ color:'var(--color-text)' }}>{totalExecs.toLocaleString()}</div>
          <div className="text-xs" style={{ color:'var(--color-muted)' }}>total executions</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Games Played',value:rows.length,icon:Gamepad2,color:'#818cf8'},
          {label:'Total Execs',value:totalExecs.toLocaleString(),icon:Clock,color:'#34d399'},
          {label:'First Seen',value:firstSeen?fmt(firstSeen):'—',icon:Clock,color:'#fbbf24'},
          {label:'Last Seen',value:lastSeen?timeAgo(lastSeen):'—',icon:Clock,color:'#f87171'},
        ].map(s=>(
          <div key={s.label} className="rounded-xl border p-4" style={{ borderColor:'var(--color-border)',backgroundColor:'var(--color-surface)' }}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-3.5 h-3.5" style={{ color:s.color }} />
              <span className="text-[10px]" style={{ color:'var(--color-muted)' }}>{s.label}</span>
            </div>
            <div className="text-sm font-bold" style={{ color:'var(--color-text)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-5" style={{ borderColor:'var(--color-border)',backgroundColor:'var(--color-surface)' }}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color:'var(--color-text)' }}><Gamepad2 className="w-4 h-4 text-indigo-400" /> Game Breakdown</h3>
        <div className="space-y-3">
          {rows.sort((a,b)=>b.execution_count-a.execution_count).map((r,i)=>{
            const pct = totalExecs>0?(r.execution_count/totalExecs)*100:0;
            return (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color:'var(--color-text)' }}>{gName(r)}</span>
                  <span style={{ color:'var(--color-muted)' }}>{r.execution_count.toLocaleString()} execs</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ backgroundColor:'var(--color-surface2)' }}>
                  <div className="h-full rounded-full bg-indigo-500" style={{ width:`${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor:'var(--color-border)',backgroundColor:'var(--color-surface)' }}>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color:'var(--color-text)' }}><Shield className="w-4 h-4 text-rose-400" /> Security Info</h3>
          {[{label:'Token',value:token,icon:Key},{label:'Fingerprint',value:fp,icon:Fingerprint},{label:'HWID',value:hwid,icon:Monitor}].map(s=>(
            <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor:'var(--color-surface2)' }}>
              <s.icon className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
              <span className="text-xs shrink-0 w-20" style={{ color:'var(--color-muted)' }}>{s.label}</span>
              <code className="text-xs font-mono truncate" style={{ color:'var(--color-text)' }}>{s.value??'—'}</code>
            </div>
          ))}
        </div>
      )}

      {ban && (
        <div className="rounded-xl border border-red-500/20 p-4 bg-red-500/5">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-400" /><span className="text-sm font-semibold text-red-400">Currently Banned</span></div>
          <p className="text-xs" style={{ color:'var(--color-muted)' }}>Reason: {ban.reason}</p>
          <p className="text-xs mt-1" style={{ color:'var(--color-muted)' }}>Since: {fmt(ban.created_at)}</p>
          {ban.unban_at && <p className="text-xs mt-1 text-amber-400">Auto-unban: {fmt(ban.unban_at)}</p>}
        </div>
      )}

      {isAdmin && (
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor:'var(--color-border)',backgroundColor:'var(--color-surface)' }}>
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color:'var(--color-text)' }}><Ban className="w-4 h-4 text-rose-400" /> Admin Actions</h3>
          <input value={banReason} onChange={e=>setBanReason(e.target.value)} placeholder="Reason for ban / device ban..." className="w-full text-xs px-3 py-2 rounded-lg border outline-none" style={{ backgroundColor:'var(--color-surface2)',borderColor:'var(--color-border)',color:'var(--color-text)' }} />
          <div className="flex gap-2 flex-wrap">
            {!ban
              ? <button onClick={doBan} className="px-4 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors">Ban User</button>
              : <button onClick={doUnban} className="px-4 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">Unban User</button>
            }
            <button onClick={doFPBan} className="px-4 py-2 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors">Device Ban</button>
            <button onClick={doHWIDBan} className="px-4 py-2 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors">HWID Ban</button>
          </div>
        </div>
      )}
    </div>
  );
}
