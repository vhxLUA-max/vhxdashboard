import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Wrench, Power, Loader2, Timer } from 'lucide-react';

interface GameStatus {
  id: string;
  game_name: string;
  maintenance: boolean;
  maintenance_msg: string;
  end_timestamp: string | null;
}

const DEFAULT_GAMES = ['Pixel Blade', 'Loot Hero', 'Flick', 'Survive Lava', 'UNC Tester'];

function formatCountdown(endTs: string | null): string {
  if (!endTs) return '';
  const remaining = Math.max(0, Math.floor((new Date(endTs).getTime() - Date.now()) / 1000));
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function Countdown({ endTs, onExpired }: { endTs: string | null; onExpired?: () => void }) {
  const [display, setDisplay] = useState(formatCountdown(endTs));
  useEffect(() => {
    if (!endTs) return;
    const id = setInterval(() => {
      const fmt = formatCountdown(endTs);
      setDisplay(fmt);
      if (fmt === '00:00:00') { clearInterval(id); onExpired?.(); }
    }, 1000);
    return () => clearInterval(id);
  }, [endTs, onExpired]);
  if (!endTs) return null;
  return <>{display}</>;
}

export function MaintenancePanel() {
  const [games,   setGames]   = useState<GameStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('game_status')
      .select('id, game_name, maintenance, maintenance_msg, end_timestamp')
      .order('game_name');
    if (error) { toast.error('Failed to load: ' + error.message); setLoading(false); return; }
    const existing: GameStatus[] = (data ?? []) as GameStatus[];
    const existingNames = existing.map(g => g.game_name);
    const missing = DEFAULT_GAMES.filter(n => !existingNames.includes(n));
    if (missing.length > 0) {
      const { data: inserted } = await supabase.from('game_status')
        .insert(missing.map(name => ({ game_name: name, maintenance: false, maintenance_msg: 'Under maintenance. Check back soon.', end_timestamp: null })))
        .select('id, game_name, maintenance, maintenance_msg, end_timestamp');
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

  const bringOnline = async (g: GameStatus) => {
    setSaving(g.id);
    const update = { maintenance: false, end_timestamp: null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('game_status').update(update).eq('id', g.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    setGames(prev => prev.map(x => x.id === g.id ? { ...x, ...update } : x));
    toast.success(`${g.game_name} brought back online`);
  };

  const toggle = async (g: GameStatus) => {
    if (g.maintenance) return bringOnline(g);
    setSaving(g.id);
    const update: any = { maintenance: true, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('game_status').update(update).eq('id', g.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    setGames(prev => prev.map(x => x.id === g.id ? { ...x, ...update } : x));
    toast.success(`${g.game_name} set to maintenance`);
  };

  const updateMsg = async (g: GameStatus, msg: string) => {
    if (g.maintenance) return; // locked while active
    const { error } = await supabase.from('game_status').update({ maintenance_msg: msg }).eq('id', g.id);
    if (!error) setGames(prev => prev.map(x => x.id === g.id ? { ...x, maintenance_msg: msg } : x));
  };

  const updateEndTime = async (g: GameStatus, val: string) => {
    if (g.maintenance) return; // locked while active
    const ts = val ? new Date(val).toISOString() : null;
    const { error } = await supabase.from('game_status').update({ end_timestamp: ts }).eq('id', g.id);
    if (error) return toast.error(error.message);
    setGames(prev => prev.map(x => x.id === g.id ? { ...x, end_timestamp: ts } : x));
    toast.success('End time updated');
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
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">per-game • live</span>
      </div>
      {games.map(g => (
        <div key={g.id} className="rounded-xl border p-4 space-y-3 transition-all"
          style={{ borderColor: g.maintenance ? '#f59e0b50' : 'var(--color-border)', backgroundColor: g.maintenance ? 'rgba(245,158,11,0.05)' : 'var(--color-surface2)' }}>
          <div className="flex items-center justify-between gap-3">
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
                  <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>No end time set</span>
                )}
              </div>
              {g.maintenance && <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full shrink-0">MAINTENANCE</span>}
            </div>
            <button onClick={() => toggle(g)} disabled={saving === g.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 disabled:opacity-50"
              style={{ backgroundColor: g.maintenance ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: g.maintenance ? '#10b981' : '#ef4444', border: `1px solid ${g.maintenance ? '#10b98140' : '#ef444440'}` }}>
              <Power className="w-3 h-3" />
              {saving === g.id ? '...' : g.maintenance ? 'Bring Online' : 'Set Maintenance'}
            </button>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                Message shown to players
                {g.maintenance && <span className="text-[9px] text-amber-400/60">locked during maintenance</span>}
              </label>
              <input key={g.id + g.maintenance_msg} defaultValue={g.maintenance_msg}
                onBlur={e => updateMsg(g, e.target.value)} placeholder="Maintenance message..."
                disabled={g.maintenance}
                className="w-full text-xs px-3 py-2 rounded-lg border outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                End time
                {g.maintenance
                  ? <span className="text-[9px] text-amber-400/60">locked during maintenance</span>
                  : <span className="text-[9px] text-emerald-400/60">set before activating</span>
                }
              </label>
              <input type="datetime-local"
                defaultValue={g.end_timestamp ? new Date(g.end_timestamp).toISOString().slice(0,16) : ''}
                onBlur={e => updateEndTime(g, e.target.value)}
                disabled={g.maintenance}
                className="w-full text-xs px-3 py-2 rounded-lg border outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
              <p className="text-[10px] mt-1" style={{ color: 'var(--color-muted)' }}>
                Drives the live HH:MM:SS countdown. Automatically brings script online when it hits 00:00:00.
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
