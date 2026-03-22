import { useEffect, useState, useRef, useCallback } from 'react';
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

interface Tooltip {
  dot: Dot;
  x: number; // percent of container
  y: number;
}

const W = 2000, H = 857;

function project(lat: number, lng: number) {
  return {
    x: ((lng + 180) / 360) * W,
    y: ((90 - lat) / 180) * H,
  };
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
    // Use HTTPS to avoid mixed-content blocks
    const res = await fetch('https://ip-api.com/batch?fields=status,query,lat,lon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ipv4.slice(0, 100).map(q => ({ query: q }))),
    });
    if (!res.ok) return result;
    const data = await res.json();
    for (const d of data) {
      if (d.status === 'success') result[d.query] = { lat: d.lat, lng: d.lon };
    }
  } catch { /* silent */ }
  return result;
}

export function ExecutionWorldMap() {
  const [dots, setDots]       = useState<Dot[]>([]);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef          = useRef<HTMLDivElement>(null);

  const load = useCallback(async (markFresh = false) => {
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
          username: row.username,
          game_name: row.game_name ?? '',
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
        await supabase.from('unique_users')
          .update({ lat: geo.lat, lng: geo.lng })
          .eq('ip_address', ip);
        for (const row of needsGeo.filter(r => r.ip_address === ip)) {
          resolved.push({
            lat: geo.lat, lng: geo.lng,
            username: row.username,
            game_name: row.game_name ?? '',
            last_seen: row.last_seen,
            fresh: markFresh && row.last_seen > freshCutoff,
          });
        }
      }
    }

    setDots(resolved);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel('worldmap-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  // Show tooltip relative to container — works on both mobile and desktop
  const showTooltip = useCallback((dot: Dot, svgX: number, svgY: number) => {
    setTooltip({
      dot,
      x: (svgX / W) * 100,
      y: (svgY / H) * 100,
    });
  }, []);

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

      {/* macOS console header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(0,0,0,0.25)' }}>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-3 text-[11px] font-mono" style={{ color: 'var(--color-muted)' }}>
            execution_map.sh
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--color-muted)' }}>
          {loading && <span className="animate-pulse">resolving...</span>}
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {dots.length} locations
          </span>
        </div>
      </div>

      {/* Map container — relative so tooltip is positioned inside it */}
      <div ref={containerRef} className="relative w-full select-none"
        style={{ paddingBottom: '42.85%', backgroundColor: '#060d1f' }}
        onMouseLeave={() => setTooltip(null)}>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}>

          {/* Ocean */}
          <rect width={W} height={H} fill="#060d1f" />

          {/* Graticules */}
          {[-60, -30, 0, 30, 60].map(lat => {
            const y = ((90 - lat) / 180) * H;
            return <line key={`lat${lat}`} x1={0} y1={y} x2={W} y2={y}
              stroke={lat === 0 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)'} strokeWidth={lat === 0 ? 1.5 : 1} />;
          })}
          {[-120, -60, 0, 60, 120].map(lng => {
            const x = ((lng + 180) / 360) * W;
            return <line key={`lng${lng}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />;
          })}

          {/* Country paths */}
          <g fill="#1e2d4a" stroke="#2d4a6e" strokeWidth="1"
            dangerouslySetInnerHTML={{ __html: WORLD_SVG_PATHS }} />

          {/* Dots */}
          {dots.map((dot, i) => {
            const { x, y } = project(dot.lat, dot.lng);
            const color = dot.fresh ? '#10b981' : '#3b82f6';
            return (
              <g key={i}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => showTooltip(dot, x, y)}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={e => { e.preventDefault(); showTooltip(dot, x, y); }}
                onTouchEnd={() => setTimeout(() => setTooltip(null), 2000)}>
                {/* Pulse ring for fresh */}
                {dot.fresh && (
                  <circle cx={x} cy={y} fill="none" stroke={color} strokeWidth="2" opacity="0.6">
                    <animate attributeName="r" values="6;22" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Glow */}
                <circle cx={x} cy={y} r="10" fill={color} opacity="0.2" />
                {/* Main dot */}
                <circle cx={x} cy={y} r="6" fill={color} />
                {/* Inner white */}
                <circle cx={x} cy={y} r="2.5" fill="white" opacity="0.9" />
              </g>
            );
          })}
        </svg>

        {/* Tooltip — positioned relative to container using percent */}
        {tooltip && (() => {
          // Clamp so it doesn't overflow edges
          const left = Math.min(Math.max(tooltip.x, 5), 75);
          const top  = Math.min(Math.max(tooltip.y - 12, 2), 80);
          return (
            <div className="absolute z-10 pointer-events-none px-3 py-2 rounded-lg text-xs shadow-2xl"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                backgroundColor: 'rgba(10,15,35,0.95)',
                border: '1px solid rgba(99,102,241,0.4)',
                color: '#e2e8f0',
                backdropFilter: 'blur(8px)',
                maxWidth: '160px',
              }}>
              <p className="font-bold truncate">@{tooltip.dot.username}</p>
              <p className="truncate mt-0.5" style={{ color: '#94a3b8' }}>{tooltip.dot.game_name || '—'}</p>
              <p className="mt-0.5" style={{ color: '#64748b' }}>{timeAgo(tooltip.dot.last_seen)}</p>
            </div>
          );
        })()}
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]"
        style={{ color: 'var(--color-muted)', borderTop: '1px solid var(--color-border)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" /> Execution
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" /> Recent (&lt;15s)
        </span>
        <span className="ml-auto hidden sm:block">Tap/hover dots for details</span>
      </div>
    </div>
  );
}
