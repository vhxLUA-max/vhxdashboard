import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Dot {
  lat: number;
  lng: number;
  username: string;
  game_name: string;
  last_seen: string;
  fresh?: boolean;
}

// Equirectangular projection: lat/lng → x/y percent on SVG
function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return { x, y };
}

// Geo-lookup via ip-api (free, no key needed, called client-side)
async function geoIP(ip: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://ip-api.com/json/${ip}?fields=lat,lon,status`);
    const d = await res.json();
    if (d.status === 'success') return { lat: d.lat, lng: d.lon };
    return null;
  } catch { return null; }
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function ExecutionWorldMap() {
  const [dots, setDots]       = useState<Dot[]>([]);
  const [tooltip, setTooltip] = useState<{ dot: Dot; x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const resolving = useRef(new Set<string>());
  const svgRef = useRef<SVGSVGElement>(null);

  const fetchDots = async (fresh = false) => {
    const { data } = await supabase
      .from('unique_users')
      .select('ip_address,username,game_name,last_seen,lat,lng')
      .not('ip_address', 'is', null)
      .neq('ip_address', '')
      .order('last_seen', { ascending: false })
      .limit(50);

    if (!data) return;

    const resolved: Dot[] = [];
    const toResolve: typeof data = [];

    for (const row of data) {
      if (row.lat != null && row.lng != null) {
        resolved.push({ lat: row.lat, lng: row.lng, username: row.username, game_name: row.game_name ?? '', last_seen: row.last_seen });
      } else if (row.ip_address && !resolving.current.has(row.ip_address)) {
        toResolve.push(row);
      }
    }

    setDots(prev => {
      const next = [...resolved];
      if (fresh) next.forEach(d => { if (d.last_seen > new Date(Date.now() - 10000).toISOString()) d.fresh = true; });
      return next;
    });
    setLoading(false);

    // Resolve unknown IPs in background (rate-limited to avoid ip-api limits)
    for (const row of toResolve.slice(0, 5)) {
      if (!row.ip_address) continue;
      resolving.current.add(row.ip_address);
      await new Promise(r => setTimeout(r, 200)); // 5 req/s max
      const geo = await geoIP(row.ip_address);
      if (geo) {
        await supabase.from('unique_users')
          .update({ lat: geo.lat, lng: geo.lng })
          .eq('ip_address', row.ip_address);
        setDots(prev => {
          if (prev.find(d => d.lat === geo.lat && d.lng === geo.lng)) return prev;
          return [...prev, { lat: geo.lat, lng: geo.lng, username: row.username, game_name: row.game_name ?? '', last_seen: row.last_seen }].slice(-50);
        });
      }
      resolving.current.delete(row.ip_address);
    }
  };

  useEffect(() => {
    fetchDots();

    const ch = supabase.channel('worldmap-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, () => fetchDots(true))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="rounded-xl border p-4 relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>🌍 Execution Map</span>
          {loading && <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Resolving locations...</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-muted)' }}>{dots.length} locations</span>
        </div>
      </div>

      {/* SVG World Map */}
      <div className="relative w-full" style={{ paddingBottom: '50%' }}>
        <svg
          ref={svgRef}
          viewBox="0 0 1000 500"
          className="absolute inset-0 w-full h-full"
          style={{ backgroundColor: '#0d1117' }}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Ocean background */}
          <rect width="1000" height="500" fill="#0d1117" />

          {/* Simple grid lines */}
          {[-60, -30, 0, 30, 60].map(lat => {
            const y = ((90 - lat) / 180) * 500;
            return <line key={lat} x1="0" y1={y} x2="1000" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />;
          })}
          {[-120, -60, 0, 60, 120].map(lng => {
            const x = ((lng + 180) / 360) * 1000;
            return <line key={lng} x1={x} y1="0" x2={x} y2="500" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />;
          })}

          {/* Equator */}
          <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

          {/* Dots */}
          {dots.map((dot, i) => {
            const { x, y } = project(dot.lat, dot.lng);
            const cx = (x / 100) * 1000;
            const cy = (y / 100) * 500;
            const isFresh = dot.fresh;
            return (
              <g key={i}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => {
                  const svg = svgRef.current;
                  if (!svg) return;
                  const rect = svg.getBoundingClientRect();
                  setTooltip({ dot, x: ((cx / 1000) * rect.width) + rect.left, y: ((cy / 500) * rect.height) + rect.top });
                }}
                onMouseLeave={() => setTooltip(null)}>
                {isFresh && (
                  <circle cx={cx} cy={cy} r="10" fill="none" stroke="#10b981" strokeWidth="1.5"
                    style={{ animation: 'ping 1.5s ease-out infinite', transformOrigin: `${cx}px ${cy}px` }}>
                    <animate attributeName="r" from="4" to="16" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={cx} cy={cy} r="3.5" fill={isFresh ? '#10b981' : '#3b82f6'} opacity="0.9" />
                <circle cx={cx} cy={cy} r="1.5" fill="#fff" opacity="0.8" />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div className="fixed z-50 px-3 py-2 rounded-xl text-xs shadow-xl pointer-events-none"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 40,
              backgroundColor: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0',
              backdropFilter: 'blur(8px)',
            }}>
            <p className="font-semibold">@{tooltip.dot.username}</p>
            <p style={{ color: '#94a3b8' }}>{tooltip.dot.game_name || 'Unknown game'}</p>
            <p style={{ color: '#64748b' }}>{timeAgo(tooltip.dot.last_seen)}</p>
          </div>
        )}
      </div>

      <p className="text-[10px] mt-2" style={{ color: 'var(--color-muted)' }}>
        Showing last 50 unique locations. Hover dots for details. Green = recent execution.
      </p>
    </div>
  );
}
