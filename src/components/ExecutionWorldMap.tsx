import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { WORLD_SVG_PATHS } from './worldPaths';

interface Dot {
  lat: number;
  lng: number;
  username: string;
  game_name: string;
  last_seen: string;
  fresh: boolean;
}

// The simplemaps SVG uses viewBox 0 0 2000 857
// It maps: lng -180..180 → x 0..2000, lat 90..-90 → y 0..857
const W = 2000, H = 857;

function project(lat: number, lng: number) {
  const x = ((lng + 180) / 360) * W;
  const y = ((90 - lat) / 180) * H;
  return { x, y };
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

async function batchGeoResolve(ips: string[]): Promise<Record<string, { lat: number; lng: number }>> {
  const result: Record<string, { lat: number; lng: number }> = {};
  const ipv4 = [...new Set(ips.filter(ip => !ip.includes(':')))];
  if (!ipv4.length) return result;
  try {
    const res = await fetch('http://ip-api.com/batch?fields=status,query,lat,lon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ipv4.slice(0, 100).map(q => ({ query: q }))),
    });
    const data = await res.json();
    for (const d of data) {
      if (d.status === 'success') result[d.query] = { lat: d.lat, lng: d.lon };
    }
  } catch { /* silent */ }
  return result;
}

export function ExecutionWorldMap() {
  const [dots, setDots]       = useState<Dot[]>([]);
  const [tooltip, setTooltip] = useState<{ dot: Dot; mx: number; my: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (markFresh = false) => {
    const { data } = await supabase
      .from('unique_users')
      .select('ip_address,username,game_name,last_seen,lat,lng')
      .not('ip_address', 'is', null)
      .neq('ip_address', '')
      .order('last_seen', { ascending: false })
      .limit(50);

    if (!data) { setLoading(false); return; }

    const freshCutoff = new Date(Date.now() - 15000).toISOString();
    const resolved: Dot[] = [];
    const needsGeo: typeof data = [];

    for (const row of data) {
      if (row.lat != null && row.lng != null) {
        resolved.push({
          lat: row.lat, lng: row.lng,
          username: row.username, game_name: row.game_name ?? '',
          last_seen: row.last_seen,
          fresh: markFresh && row.last_seen > freshCutoff,
        });
      } else {
        needsGeo.push(row);
      }
    }

    if (needsGeo.length > 0) {
      const ips = needsGeo.map(r => r.ip_address as string);
      const geoMap = await batchGeoResolve(ips);
      for (const [ip, geo] of Object.entries(geoMap)) {
        await supabase.from('unique_users').update({ lat: geo.lat, lng: geo.lng }).eq('ip_address', ip);
        const rows = needsGeo.filter(r => r.ip_address === ip);
        for (const row of rows) {
          resolved.push({
            lat: geo.lat, lng: geo.lng,
            username: row.username, game_name: row.game_name ?? '',
            last_seen: row.last_seen,
            fresh: markFresh && row.last_seen > freshCutoff,
          });
        }
      }
    }

    setDots(resolved);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('worldmap-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Console-style header with 3 dots */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span className="ml-3 text-xs font-mono" style={{ color: 'var(--color-muted)' }}>execution_map.sh</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--color-muted)' }}>
          {loading && <span>resolving locations...</span>}
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            {dots.length} active
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="relative w-full" style={{ paddingBottom: '50%', backgroundColor: '#0a0e1a' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Ocean */}
          <rect width={W} height={H} fill="#0a0e1a" />

          {/* World paths from simplemaps */}
          <g
            fill="#1e293b"
            stroke="#334155"
            strokeWidth="0.5"
            dangerouslySetInnerHTML={{ __html: WORLD_SVG_PATHS }}
          />

          {/* Dots */}
          {dots.map((dot, i) => {
            const { x, y } = project(dot.lat, dot.lng);
            return (
              <g key={i} style={{ cursor: 'pointer' }}
                onMouseEnter={ev => {
                  const rect = (ev.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect();
                  setTooltip({
                    dot,
                    mx: (x / W) * rect.width + rect.left,
                    my: (y / H) * rect.height + rect.top,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}>
                {dot.fresh && (
                  <circle cx={x} cy={y} fill="none" stroke="#10b981" strokeWidth="1.5">
                    <animate attributeName="r" values="3;16" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={x} cy={y} r="7" fill={dot.fresh ? '#10b981' : '#3b82f6'} opacity="0.85" />
                <circle cx={x} cy={y} r="3.5" fill="white" opacity="0.95" />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div className="fixed z-50 pointer-events-none px-3 py-2 rounded-xl text-xs shadow-2xl"
            style={{
              left: tooltip.mx + 12,
              top: tooltip.my - 55,
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#e2e8f0',
            }}>
            <p className="font-bold">@{tooltip.dot.username}</p>
            <p style={{ color: '#94a3b8' }}>{tooltip.dot.game_name || '—'}</p>
            <p style={{ color: '#64748b' }}>{timeAgo(tooltip.dot.last_seen)}</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 flex items-center gap-4 text-[10px]" style={{ color: 'var(--color-muted)', borderTop: '1px solid var(--color-border)' }}>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Execution</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Recent (&lt;15s)</span>
        <span className="ml-auto">Hover dots for details</span>
      </div>
    </div>
  );
}
