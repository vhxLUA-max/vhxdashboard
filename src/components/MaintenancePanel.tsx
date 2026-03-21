import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Wrench, Power, Loader2, Timer, ExternalLink, Code, Copy, Check } from 'lucide-react';

interface GameStatus {
  id: string;
  game_name: string;
  maintenance: boolean;
  maintenance_msg: string;
  end_timestamp: string | null;
  redirect_url: string | null;
  execute_script: string | null;
}

const DEFAULT_GAMES = ['Pixel Blade', 'Loot Hero', 'Flick', 'Survive Lava', 'UNC Tester'];
const DASHBOARD_URL = 'https://vhxdashboard.vercel.app/';

function getRemainingSeconds(endTs: string | null): number {
  if (!endTs) return -1;
  const endMs = Date.parse(endTs);
  if (isNaN(endMs)) return -1;
  return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
}

function formatSeconds(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function Countdown({ endTs, onExpired }: { endTs: string | null; onExpired?: () => void }) {
  const [secs, setSecs] = useState(() => getRemainingSeconds(endTs));
  const firedRef = useRef(false);
  useEffect(() => {
    firedRef.current = false;
    setSecs(getRemainingSeconds(endTs));
    if (!endTs) return;
    const id = setInterval(() => {
      const remaining = getRemainingSeconds(endTs);
      setSecs(remaining);
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(id);
        onExpired?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [endTs]);
  if (!endTs || secs < 0) return null;
  return <>{formatSeconds(secs)}</>;
}

function DurationPicker({ value, onChange, disabled }: {
  value: { h: number; m: number; s: number };
  onChange: (v: { h: number; m: number; s: number }) => void;
  disabled?: boolean;
}) {
  const spin = (field: 'h'|'m'|'s', max: number) => (
    <div className="flex flex-col items-center">
      <button type="button" disabled={disabled}
        onClick={() => onChange({ ...value, [field]: Math.min(max, value[field]+1) })}
        className="text-xs px-2 py-0.5 rounded hover:opacity-80 disabled:opacity-30"
        style={{ color: 'var(--color-accent)' }}>▲</button>
      <input type="number" min={0} max={max} disabled={disabled}
        value={String(value[field]).padStart(2,'0')}
        onChange={e => { const n=Math.min(max,Math.max(0,parseInt(e.target.value)||0)); onChange({...value,[field]:n}); }}
        className="w-10 text-center text-sm font-mono font-bold rounded border outline-none py-1 disabled:opacity-50"
        style={{ backgroundColor:'var(--color-surface)', borderColor:'var(--color-border)', color:'var(--color-text)' }} />
      <button type="button" disabled={disabled}
        onClick={() => onChange({ ...value, [field]: Math.max(0, value[field]-1) })}
        className="text-xs px-2 py-0.5 rounded hover:opacity-80 disabled:opacity-30"
        style={{ color: 'var(--color-accent)' }}>▼</button>
    </div>
  );
  return (
    <div className="flex items-center gap-1">
      {spin('h', 99)}
      <span className="text-sm font-bold pb-0.5" style={{ color: 'var(--color-muted)' }}>:</span>
      {spin('m', 59)}
      <span className="text-sm font-bold pb-0.5" style={{ color: 'var(--color-muted)' }}>:</span>
      {spin('s', 59)}
      <span className="text-[10px] ml-1" style={{ color: 'var(--color-muted)' }}>HH MM SS</span>
    </div>
  );
}

export function MaintenancePanel() {
  const [games, setGames] = useState<GameStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, { h:number; m:number; s:number }>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('game_status')
      .select('id, game_name, maintenance, maintenance_msg, end_timestamp, redirect_url, execute_script')
      .order('game_name');
    if (error) { toast.error('Failed to load: ' + error.message); setLoading(false); return; }
    const existing: GameStatus[] = (data ?? []) as GameStatus[];
    const existingNames = existing.map(g => g.game_name);
    const missing = DEFAULT_GAMES.filter(n => !existingNames.includes(n));
    if (missing.length > 0) {
      const { data: inserted } = await supabase.from('game_status')
        .insert(missing.map(name => ({ game_name: name, maintenance: false, maintenance_msg: 'Under maintenance. Check back soon.', end_timestamp: null, redirect_url: DASHBOARD_URL, execute_script: null })))
        .select('id, game_name, maintenance, maintenance_msg, end_timestamp, redirect_url, execute_script');
      if (inserted) existing.push(...(inserted as GameStatus[]));
    }
    existing.sort((a, b) => a.game_name.localeCompare(b.game_name));
    setGames(existing);
    setLoading(false);
  };

  useEffect(() => {
    load();
    channelRef.current = supabase.channel('maint-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_status' }, load)
      .subscribe();
    return () => { channelRef.current && supabase.removeChannel(channelRef.current); };
  }, []);

  const getDuration = (id: string) => durations[id] ?? { h: 1, m: 0, s: 0 };
  const setDuration = (id: string, v: { h:number; m:number; s:number }) =>
    setDurations(prev => ({ ...prev, [id]: v }));

  const bringOnline = async (g: GameStatus) => {
    setSaving(g.id);
    const update = { maintenance: false, end_timestamp: null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('game_status').update(update).eq('id', g.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    setGames(prev => prev.map(x => x.id === g.id ? { ...x, ...update } : x));
    toast.success(`${g.game_name} is back online`);
  };

  const activate = async (g: GameStatus) => {
    const dur = getDuration(g.id);
    const totalSecs = dur.h * 3600 + dur.m * 60 + dur.s;
    const endTs = totalSecs > 0 ? new Date(Date.now() + totalSecs * 1000).toISOString() : null;
    setSaving(g.id);
    const update: Partial<GameStatus> & { updated_at: string } = { maintenance: true, end_timestamp: endTs, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('game_status').update(update).eq('id', g.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    setGames(prev => prev.map(x => x.id === g.id ? { ...x, ...update } : x));
    toast.success(`${g.game_name} set to maintenance${endTs ? ` for ${formatSeconds(totalSecs)}` : ''}`);
  };

  const saveField = async (g: GameStatus, field: 'maintenance_msg' | 'redirect_url' | 'execute_script', value: string) => {
    const { error } = await supabase.from('game_status').update({ [field]: value || null }).eq('id', g.id);
    if (error) { toast.error(error.message); return; }
    setGames(prev => prev.map(x => x.id === g.id ? { ...x, [field]: value || null } : x));
  };

  const copyScript = (script: string, id: string) => {
    navigator.clipboard.writeText(script);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Script copied!');
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12 gap-2">
      <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-muted)' }} />
      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Loading...</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Maintenance Mode</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">per-game · live</span>
      </div>

      {games.map(g => (
        <div key={g.id} className="rounded-xl border transition-all overflow-hidden"
          style={{ borderColor: g.maintenance ? '#f59e0b50' : 'var(--color-border)', backgroundColor: g.maintenance ? 'rgba(245,158,11,0.04)' : 'var(--color-surface2)' }}>

          {/* Header row */}
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2 h-2 rounded-full shrink-0 ${g.maintenance ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ boxShadow: g.maintenance ? '0 0 6px #f59e0b88' : '0 0 6px #34d39988' }} />
              <div className="min-w-0">
                <span className="text-sm font-medium truncate block" style={{ color: 'var(--color-text)' }}>{g.game_name}</span>
                {g.maintenance && g.end_timestamp && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Timer className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-xs font-mono font-bold text-amber-400">
                      <Countdown endTs={g.end_timestamp} onExpired={() => bringOnline(g)} />
                    </span>
                  </div>
                )}
                {g.maintenance && !g.end_timestamp && (
                  <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>No timer set</span>
                )}
              </div>
              {g.maintenance && <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full shrink-0">MAINTENANCE</span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                {expanded === g.id ? 'Less' : 'Config'}
              </button>
              <button onClick={() => g.maintenance ? bringOnline(g) : activate(g)}
                disabled={saving === g.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: g.maintenance ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: g.maintenance ? '#10b981' : '#ef4444', border: `1px solid ${g.maintenance ? '#10b98140' : '#ef444440'}` }}>
                <Power className="w-3 h-3" />
                {saving === g.id ? '...' : g.maintenance ? 'Bring Online' : 'Set Maintenance'}
              </button>
            </div>
          </div>

          {/* Expanded config */}
          {expanded === g.id && (
            <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="pt-3">
                <label className="text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                  Maintenance Message
                  {g.maintenance && <span className="text-[9px] text-amber-400/60">locked while active</span>}
                </label>
                <input key={g.id + '_msg'} defaultValue={g.maintenance_msg ?? ''}
                  onBlur={e => saveField(g, 'maintenance_msg', e.target.value)}
                  placeholder="Message shown to players in-game..."
                  disabled={g.maintenance}
                  className="w-full text-xs px-3 py-2 rounded-lg border outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              </div>

              {/* Redirect URL */}
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                  <ExternalLink className="w-3 h-3" /> Redirect URL
                  <span className="text-[9px]" style={{ color: 'var(--color-muted)' }}>— where the in-game notification links to</span>
                </label>
                <div className="flex gap-2">
                  <input key={g.id + '_url'} defaultValue={g.redirect_url ?? DASHBOARD_URL}
                    onBlur={e => saveField(g, 'redirect_url', e.target.value)}
                    placeholder={DASHBOARD_URL}
                    className="flex-1 text-xs px-3 py-2 rounded-lg border outline-none"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  <button onClick={() => { const el = document.createElement('input'); el.value = g.redirect_url ?? DASHBOARD_URL; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); toast.success('URL copied!'); }}
                    className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    Copy
                  </button>
                </div>
              </div>

              {/* Execute Script */}
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                  <Code className="w-3 h-3" /> Execute Script
                  <span className="text-[9px]" style={{ color: 'var(--color-muted)' }}>— Lua script run when game starts</span>
                </label>
                <div className="relative">
                  <textarea key={g.id + '_script'} defaultValue={g.execute_script ?? ''}
                    onBlur={e => saveField(g, 'execute_script', e.target.value)}
                    placeholder={`-- Executed when ${g.game_name} loads\n-- Use this to redirect players to dashboard during maintenance\nloadstring(game:HttpGet("${DASHBOARD_URL}"))() `}
                    rows={4}
                    className="w-full text-xs px-3 py-2.5 rounded-lg border outline-none resize-none font-mono"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  {g.execute_script && (
                    <button onClick={() => copyScript(g.execute_script!, g.id + '_copy')}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all"
                      style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                      {copied === g.id + '_copy' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied === g.id + '_copy' ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--color-muted)' }}>
                  This script is run client-side when maintenance activates. Use <code className="text-xs" style={{ color: 'var(--color-accent)' }}>loadstring</code> to redirect players to the dashboard.
                </p>
              </div>

              {/* Duration picker — only shown when not in maintenance */}
              {!g.maintenance && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                    Duration <span className="text-[9px] text-emerald-400/60">starts counting when you activate</span>
                  </label>
                  <DurationPicker value={getDuration(g.id)} onChange={v => setDuration(g.id, v)} />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
