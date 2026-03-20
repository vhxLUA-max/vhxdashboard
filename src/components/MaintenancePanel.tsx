import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Wrench, Power } from 'lucide-react';

interface GameStatus {
  id: string;
  game_name: string;
  maintenance: boolean;
  maintenance_msg: string;
}

export function MaintenancePanel() {
  const [games, setGames]   = useState<GameStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('game_status').select('*').order('game_name').then(({ data }) => {
      if (data) setGames(data);
      setLoading(false);
    });
  }, []);

  const toggle = async (g: GameStatus) => {
    const { error } = await supabase.from('game_status')
      .update({ maintenance: !g.maintenance, updated_at: new Date().toISOString() })
      .eq('id', g.id);
    if (error) return toast.error(error.message);
    setGames(prev => prev.map(x => x.id === g.id ? { ...x, maintenance: !g.maintenance } : x));
    toast.success(`${g.game_name} ${!g.maintenance ? 'put into maintenance' : 'brought back online'}`);
  };

  const updateMsg = async (g: GameStatus, msg: string) => {
    await supabase.from('game_status').update({ maintenance_msg: msg }).eq('id', g.id);
    setGames(prev => prev.map(x => x.id === g.id ? { ...x, maintenance_msg: msg } : x));
  };

  if (loading) return <div className="text-xs" style={{ color: 'var(--color-muted)' }}>Loading...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Maintenance Mode</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">per-game</span>
      </div>
      {games.map(g => (
        <div key={g.id} className="rounded-xl border p-4 space-y-3" style={{ borderColor: g.maintenance ? '#f59e0b40' : 'var(--color-border)', backgroundColor: g.maintenance ? 'rgba(245,158,11,0.05)' : 'var(--color-surface2)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${g.maintenance ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{g.game_name}</span>
              {g.maintenance && <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">MAINTENANCE</span>}
            </div>
            <button
              onClick={() => toggle(g)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: g.maintenance ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: g.maintenance ? '#10b981' : '#ef4444',
                border: `1px solid ${g.maintenance ? '#10b98140' : '#ef444440'}`,
              }}>
              <Power className="w-3 h-3" />
              {g.maintenance ? 'Bring Online' : 'Set Maintenance'}
            </button>
          </div>
          {g.maintenance && (
            <input
              defaultValue={g.maintenance_msg}
              onBlur={e => updateMsg(g, e.target.value)}
              placeholder="Maintenance message shown to users..."
              className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
