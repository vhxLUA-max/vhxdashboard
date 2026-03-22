import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Globe } from 'lucide-react';

interface CountryRow {
  country: string;
  country_code: string;
  users: number;
  total_executions: number;
}

const FLAG_BASE = 'https://flagcdn.com/24x18';

function flag(code: string) {
  if (!code || code.length !== 2) return null;
  return `${FLAG_BASE}/${code.toLowerCase()}.png`;
}

export function CountryLeaderboard() {
  const [rows, setRows]     = useState<CountryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc('country_execution_stats');
      if (data) setRows(data);
      setLoading(false);
    };
    load();
    const ch = supabase.channel('country-lb')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const max = rows[0]?.total_executions ?? 1;

  return (
    <div className="rounded-xl border p-5 space-y-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Executions by Country</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--color-surface2)' }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: 'var(--color-muted)' }}>No location data yet</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.country} className="flex items-center gap-3">
              <span className="text-xs font-bold w-5 text-right shrink-0" style={{ color: 'var(--color-muted)' }}>
                {i + 1}
              </span>
              {flag(r.country_code)
                ? <img src={flag(r.country_code)!} alt={r.country} className="w-6 h-4 rounded-sm shrink-0 object-cover" />
                : <span className="w-6 h-4 shrink-0 flex items-center justify-center text-sm">🌐</span>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{r.country}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{r.users} users</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>
                      {r.total_executions.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-surface2)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(r.total_executions / max) * 100}%`,
                      background: i === 0
                        ? 'linear-gradient(90deg,#f59e0b,#f97316)'
                        : i === 1
                        ? 'linear-gradient(90deg,#94a3b8,#64748b)'
                        : i === 2
                        ? 'linear-gradient(90deg,#b45309,#92400e)'
                        : 'var(--color-accent)',
                    }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
