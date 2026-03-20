import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Wrench, Power, Loader2 } from 'lucide-react';

interface GameStatus {
  id: string;
  game_name: string;
  maintenance: boolean;
  maintenance_msg: string;
}

const DEFAULT_GAMES = ['Pixel Blade', 'Loot Hero', 'Flick', 'Survive Lava', 'UNC Tester'];

export function MaintenancePanel() {
  const [games,   setGames]   = useState<GameStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('game_status')
        .select('id, game_name, maintenance, maintenance_msg')
        .order('game_name');

      if (error) {
        toast.error('Failed to load game status: ' + error.message);
        setLoading(false);
        return;
      }

      const existing = data ?? [];

      // Auto-insert any missing games
      const existingNames = existing.map(g => g.game_name);
      const missing = DEFAULT_GAMES.filter(n => !existingNames.includes(n));
      if (missing.length > 0) {
        const { data: inserted } = await supabase
          .from('game_status')
          .insert(missing.map(name => ({
            game_name: name,
            maintenance: false,
            maintenance_msg: 'This script is under maintenance. Check back soon.',
          })))
          .select('id, game_name, maintenance, maintenance_msg');
        if (inserted) existing.push(...inserted);
      }

      existing.sort((a, b) => a.game_name.localeCompare(b.game_name));
      setGames(existing);
      setLoading(false);
    };
    load();
  }, []);

  const toggle = async (g: GameStatus) => {
    setSaving(g.id);
    const newVal = !g.maintenance;
    const { error } = await supabase
      .from('game_status')
      .update({ maintenance: newVal, updated_at: new Date().toISOString() })
      .eq('id', g.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    setGames(prev => prev.map(x => x.id === g.id ? { ...x, maintenance: newVal } : x));
    toast.success(`${g.game_name} ${newVal ? 'set to maintenance' : 'brought back online'}`);
  };

  const updateMsg = async (g: GameStatus, msg: string) => {
    const { error } = await supabase
      .from('game_status')
      .update({ maintenance_msg: msg })
      .eq('id', g.id);
    if (!error) setGames(prev => prev.map(x => x.id === g.id ? { ...x, maintenance_msg: msg } : x));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12 gap-2">
      <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-muted)' }} />
      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Loading game status...</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Maintenance Mode</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">per-game</span>
      </div>

      {games.length === 0 && (
        <p className="text-xs text-center py-6" style={{ color: 'var(--color-muted)' }}>
          No games found. Make sure the game_status table exists in Supabase.
        </p>
      )}

      {games.map(g => (
        <div key={g.id} className="rounded-xl border p-4 space-y-3 transition-all"
          style={{
            borderColor: g.maintenance ? '#f59e0b50' : 'var(--color-border)',
            backgroundColor: g.maintenance ? 'rgba(245,158,11,0.05)' : 'var(--color-surface2)',
          }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2 h-2 rounded-full shrink-0 ${g.maintenance ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ boxShadow: g.maintenance ? '0 0 6px #f59e0b88' : '0 0 6px #34d39988' }} />
              <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{g.game_name}</span>
              {g.maintenance && (
                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full shrink-0">MAINTENANCE</span>
              )}
            </div>
            <button
              onClick={() => toggle(g)}
              disabled={saving === g.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 disabled:opacity-50"
              style={{
                backgroundColor: g.maintenance ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: g.maintenance ? '#10b981' : '#ef4444',
                border: `1px solid ${g.maintenance ? '#10b98140' : '#ef444440'}`,
              }}>
              <Power className="w-3 h-3" />
              {saving === g.id ? '...' : g.maintenance ? 'Bring Online' : 'Set Maintenance'}
            </button>
          </div>

          {g.maintenance && (
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--color-muted)' }}>
                Message shown to players
              </label>
              <input
                key={g.id + g.maintenance_msg}
                defaultValue={g.maintenance_msg}
                onBlur={e => updateMsg(g, e.target.value)}
                placeholder="This script is under maintenance..."
                className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
