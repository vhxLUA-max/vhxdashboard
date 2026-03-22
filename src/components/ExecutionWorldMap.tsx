import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Dot {
  lat: number;
  lng: number;
  username: string;
  game_name: string;
  last_seen: string;
  fresh: boolean;
}

function project(lat: number, lng: number, W: number, H: number) {
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
  // ip-api batch supports up to 100 IPs, only IPv4
  const ipv4 = ips.filter(ip => !ip.includes(':'));
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
  } catch { /* silently fail */ }
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

    // Batch resolve IPs we don't have coords for yet
    if (needsGeo.length > 0) {
      const ips = [...new Set(needsGeo.map(r => r.ip_address as string))];
      const geoMap = await batchGeoResolve(ips);

      for (const [ip, geo] of Object.entries(geoMap)) {
        // Save back to Supabase so next load is instant
        await supabase.from('unique_users').update({ lat: geo.lat, lng: geo.lng }).eq('ip_address', ip);
        const row = needsGeo.find(r => r.ip_address === ip);
        if (row) resolved.push({
          lat: geo.lat, lng: geo.lng,
          username: row.username, game_name: row.game_name ?? '',
          last_seen: row.last_seen,
          fresh: markFresh && row.last_seen > freshCutoff,
        });
      }
    }

    setDots(resolved);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('worldmap')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const W = 1000, H = 500;

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>🌍 Execution Map</span>
        <div className="flex items-center gap-2">
          {loading && <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>Resolving...</span>}
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{dots.length} locations</span>
        </div>
      </div>

      <div className="relative w-full" style={{ paddingBottom: '50%', background: '#0a0f1a' }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">

          {/* Ocean */}
          <rect width={W} height={H} fill="#0a0f1a" />

          {/* Latitude lines */}
          {[-60,-30,0,30,60].map(lat => {
            const y = ((90 - lat) / 180) * H;
            return <line key={lat} x1={0} y1={y} x2={W} y2={y} stroke={lat === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'} strokeWidth={lat === 0 ? 1.5 : 1} />;
          })}
          {/* Longitude lines */}
          {[-120,-60,0,60,120].map(lng => {
            const x = ((lng + 180) / 360) * W;
            return <line key={lng} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />;
          })}

          {/* World land masses — simplified SVG paths */}
          <g fill="#1a2744" stroke="#243058" strokeWidth="0.8" opacity="0.9">
            {/* North America */}
            <path d="M155,80 L130,95 L120,120 L110,145 L105,165 L115,175 L125,185 L140,195 L155,200 L165,210 L170,225 L175,240 L185,235 L200,220 L215,210 L225,195 L230,175 L235,155 L230,135 L220,115 L210,100 L195,88 L180,80 Z" />
            {/* Greenland */}
            <path d="M220,35 L235,30 L250,35 L260,50 L255,65 L240,70 L225,65 L215,50 Z" />
            {/* Central America */}
            <path d="M165,210 L170,225 L168,235 L162,240 L158,235 L160,222 Z" />
            {/* South America */}
            <path d="M185,235 L195,230 L210,235 L225,250 L235,270 L240,295 L238,320 L230,345 L218,365 L205,375 L195,365 L188,345 L182,320 L178,295 L175,270 L175,248 Z" />
            {/* Europe */}
            <path d="M450,65 L460,60 L475,62 L485,70 L490,85 L485,95 L475,100 L465,105 L455,100 L445,90 L443,78 Z" />
            {/* Scandinavia */}
            <path d="M460,40 L470,35 L480,38 L485,50 L478,60 L468,62 L458,55 L456,45 Z" />
            {/* UK */}
            <path d="M438,72 L444,68 L448,75 L445,83 L440,85 L435,80 Z" />
            {/* Africa */}
            <path d="M455,145 L470,140 L490,142 L510,150 L525,165 L535,185 L540,210 L538,235 L530,258 L518,278 L505,292 L492,298 L478,292 L465,275 L455,255 L448,230 L445,205 L447,180 L450,158 Z" />
            {/* Middle East */}
            <path d="M510,130 L530,125 L550,128 L565,140 L568,155 L558,165 L540,168 L522,162 L510,150 Z" />
            {/* Asia - Main */}
            <path d="M510,60 L540,55 L580,50 L630,48 L680,52 L720,58 L760,65 L790,75 L810,90 L815,110 L805,130 L785,145 L760,155 L730,162 L700,165 L670,162 L640,155 L615,145 L595,132 L575,118 L558,105 L540,95 L520,88 L505,78 Z" />
            {/* India */}
            <path d="M580,145 L600,140 L620,145 L630,162 L628,182 L620,200 L608,210 L596,205 L585,190 L578,172 L576,155 Z" />
            {/* Southeast Asia */}
            <path d="M660,155 L685,150 L710,155 L730,168 L735,185 L725,195 L705,195 L685,188 L665,178 Z" />
            {/* China/East Asia */}
            <path d="M700,80 L740,75 L780,80 L810,90 L820,108 L815,125 L798,138 L775,145 L750,148 L725,142 L705,130 L695,112 L695,95 Z" />
            {/* Japan */}
            <path d="M820,88 L828,85 L835,90 L832,100 L822,103 L816,97 Z" />
            {/* Australia */}
            <path d="M720,255 L748,248 L778,250 L805,258 L822,272 L828,292 L820,312 L804,325 L782,330 L758,328 L735,318 L715,302 L705,282 L708,263 Z" />
            {/* New Zealand */}
            <path d="M845,308 L852,302 L858,308 L856,320 L848,325 L842,318 Z" />
            {/* Iceland */}
            <path d="M402,48 L415,44 L425,48 L428,58 L420,65 L408,63 L400,55 Z" />
          </g>

          {/* Dots */}
          {dots.map((dot, i) => {
            const { x, y } = project(dot.lat, dot.lng, W, H);
            return (
              <g key={i} style={{ cursor: 'pointer' }}
                onMouseEnter={ev => {
                  const rect = (ev.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect();
                  const svgX = (x / W) * rect.width + rect.left;
                  const svgY = (y / H) * rect.height + rect.top;
                  setTooltip({ dot, mx: svgX, my: svgY });
                }}
                onMouseLeave={() => setTooltip(null)}>
                {dot.fresh && (
                  <circle cx={x} cy={y} r="8" fill="none" stroke="#10b981" strokeWidth="1">
                    <animate attributeName="r" values="4;14" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={x} cy={y} r="3.5" fill={dot.fresh ? '#10b981' : '#3b82f6'} />
                <circle cx={x} cy={y} r="1.5" fill="white" opacity="0.9" />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg text-xs shadow-xl"
            style={{
              left: tooltip.mx + 10,
              top: tooltip.my - 50,
              backgroundColor: '#111827',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0',
            }}>
            <p className="font-bold">@{tooltip.dot.username}</p>
            <p style={{ color: '#94a3b8' }}>{tooltip.dot.game_name || '—'}</p>
            <p style={{ color: '#64748b' }}>{timeAgo(tooltip.dot.last_seen)}</p>
          </div>
        )}
      </div>

      <div className="px-4 py-2 flex items-center gap-4 text-[10px]" style={{ color: 'var(--color-muted)' }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Execution</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Recent (&lt;15s)</span>
        <span className="ml-auto">Max 50 · hover for details</span>
      </div>
    </div>
  );
}
