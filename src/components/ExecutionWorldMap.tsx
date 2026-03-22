import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { WORLD_SVG_PATHS } from './worldPaths';
import { X, Zap, Users, Clock } from 'lucide-react';

interface UserRow {
  roblox_user_id: number;
  username: string;
  game_name: string;
  last_seen: string;
  execution_count: number;
  ip_address: string;
  lat: number | null;
  lng: number | null;
  country_code: string | null;
  country_name: string | null;
}

interface CountryPanel { code: string; name: string; users: UserRow[]; }

const W = 2000, H = 857;

function project(lat: number, lng: number) {
  return { x: ((lng + 180) / 360) * W, y: ((90 - lat) / 180) * H };
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `${Math.floor(s)}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

async function resolveIPs(rows: UserRow[]): Promise<UserRow[]> {
  const needsGeo = rows.filter(r => r.lat == null && r.ip_address && !r.ip_address.includes(':'));
  if (!needsGeo.length) return rows;
  try {
    const ips = [...new Set(needsGeo.map(r => r.ip_address))].slice(0, 100);
    const res  = await fetch('http://ip-api.com/batch?fields=status,query,lat,lon,countryCode,country', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ips.map(q => ({ query: q }))),
    });
    const data = await res.json();
    const geo: Record<string, { lat: number; lng: number; cc: string; cn: string }> = {};
    for (const d of data) {
      if (d.status === 'success') geo[d.query] = { lat: d.lat, lng: d.lon, cc: d.countryCode, cn: d.country };
    }
    for (const [ip, g] of Object.entries(geo)) {
      await supabase.from('unique_users').update({ lat: g.lat, lng: g.lng, country_code: g.cc, country_name: g.cn }).eq('ip_address', ip);
    }
    return rows.map(r => {
      const g = geo[r.ip_address];
      return g ? { ...r, lat: g.lat, lng: g.lng, country_code: g.cc, country_name: g.cn } : r;
    });
  } catch { return rows; }
}

export function ExecutionWorldMap() {
  const [users, setUsers]     = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel]     = useState<CountryPanel | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tip, setTip]         = useState<{ x: number; y: number; name: string; count: number } | null>(null);
  const [tf, setTf]           = useState({ x: 0, y: 0, scale: 1 });
  const drag                  = useRef(false);
  const last                  = useRef({ x: 0, y: 0 });

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('unique_users')
      .select('roblox_user_id,username,game_name,last_seen,execution_count,ip_address,lat,lng,country_code,country_name')
      .not('ip_address', 'is', null)
      .neq('ip_address', '')
      .order('last_seen', { ascending: false })
      .limit(200);
    if (!data) { setLoading(false); return; }
    const resolved = await resolveIPs(data as UserRow[]);
    setUsers(resolved);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel('map-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const countryMap: Record<string, UserRow[]> = {};
  for (const u of users) {
    if (!u.country_code) continue;
    if (!countryMap[u.country_code]) countryMap[u.country_code] = [];
    countryMap[u.country_code].push(u);
  }

  const dots       = users.filter(u => u.lat != null && u.lng != null);
  const freshCut   = new Date(Date.now() - 15000).toISOString();
  const countryFill = (code: string) => {
    const n = countryMap[code]?.length ?? 0;
    if (code === hovered && n > 0) return '#3b82f6';
    if (n === 0)  return '#1e293b';
    if (n < 3)   return '#1e40af';
    if (n < 10)  return '#2563eb';
    return '#60a5fa';
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.2 : 0.85;
    setTf(t => ({ ...t, scale: Math.min(12, Math.max(1, t.scale * f)) }));
  };
  const onMD = (e: React.MouseEvent) => { drag.current = true; last.current = { x: e.clientX, y: e.clientY }; };
  const onMM = (e: React.MouseEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - last.current.x, dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setTf(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
  };
  const onMU = () => { drag.current = false; };

  // Inject fills into SVG paths
  const coloredPaths = WORLD_SVG_PATHS.replace(
    /id="([A-Z]{1,3})"/g,
    (match, code) => `${match} style="fill:${countryFill(code)}"`
  );

  return (
    <div className="rounded-xl border overflow-hidden flex flex-col"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', minHeight: 520 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-3 text-xs font-mono" style={{ color: 'var(--color-muted)' }}>execution_map.live</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--color-muted)' }}>
          {loading && <span className="animate-pulse">resolving...</span>}
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />{dots.length} plotted</span>
          <span>{Object.keys(countryMap).length} countries</span>
          <button onClick={() => setTf({ x: 0, y: 0, scale: 1 })}
            className="px-2 py-0.5 rounded border hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>Reset</button>
        </div>
      </div>

      {/* Map container */}
      <div className="relative flex-1 overflow-hidden"
        style={{ backgroundColor: '#060d1a', cursor: drag.current ? 'grabbing' : 'grab', minHeight: 400 }}
        onWheel={onWheel} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU}
        onMouseLeave={() => { onMU(); setHovered(null); setTip(null); }}>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
          <g transform={`translate(${tf.x},${tf.y}) scale(${tf.scale})`}>
            <rect width={W} height={H} fill="#060d1a" />

            {/* Coloured world paths */}
            <g stroke="#334155" strokeWidth="0.8" dangerouslySetInnerHTML={{ __html: coloredPaths }}
              onClick={(e) => {
                const el = e.target as SVGPathElement;
                const code = el.id || el.getAttribute('id');
                const name = el.getAttribute('name');
                if (code && name && countryMap[code]?.length) {
                  setPanel({ code, name, users: countryMap[code] });
                }
              }}
              onMouseMove={(e) => {
                const el = e.target as SVGPathElement;
                const code = el.id || el.getAttribute('id');
                const name = el.getAttribute('name');
                if (code && name) {
                  const n = countryMap[code]?.length ?? 0;
                  setHovered(code);
                  if (n > 0) setTip({ x: e.clientX, y: e.clientY, name, count: n });
                  else setTip(null);
                  (el as any).style.cursor = n > 0 ? 'pointer' : 'default';
                } else { setHovered(null); setTip(null); }
              }}
              onMouseLeave={() => { setHovered(null); setTip(null); }}
            />

            {/* Execution dots */}
            {dots.map((u, i) => {
              const { x, y } = project(u.lat!, u.lng!);
              const fresh = u.last_seen > freshCut;
              return (
                <g key={i}>
                  {fresh && (
                    <circle cx={x} cy={y} fill="none" stroke="#10b981" strokeWidth="1.5">
                      <animate attributeName="r" values={`${4/tf.scale};${20/tf.scale}`} dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={x} cy={y} r={7 / tf.scale} fill={fresh ? '#10b981' : '#3b82f6'} opacity="0.9" />
                  <circle cx={x} cy={y} r={3.5 / tf.scale} fill="white" opacity="0.95" />
                </g>
              );
            })}
          </g>
        </svg>

        <div className="absolute bottom-3 right-3 text-[10px] px-2 py-1 rounded"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.35)' }}>
          Scroll to zoom · Drag to pan · Click country for users
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 flex items-center gap-4 text-[10px] shrink-0"
        style={{ color: 'var(--color-muted)', borderTop: '1px solid var(--color-border)' }}>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Execution</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Live (&lt;15s)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-300 inline-block opacity-60" /> High activity</span>
        <span className="ml-auto">{users.length} users mapped</span>
      </div>

      {/* Hover tooltip */}
      {tip && (
        <div className="fixed z-50 pointer-events-none px-3 py-2 rounded-xl text-xs shadow-2xl"
          style={{ left: tip.x + 14, top: tip.y - 52, backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}>
          <p className="font-bold">{tip.name}</p>
          <p style={{ color: '#94a3b8' }}>{tip.count} user{tip.count !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Country users side panel */}
      {panel && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 shadow-2xl flex flex-col"
          style={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{panel.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{panel.users.length} user{panel.users.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setPanel(null)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--color-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {panel.users
              .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())
              .map((u, i) => (
                <div key={i} className="p-3 rounded-lg border"
                  style={{ backgroundColor: 'var(--color-surface2)', borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{u.username}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
                      {u.roblox_user_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] flex-wrap" style={{ color: 'var(--color-muted)' }}>
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{u.execution_count.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{u.game_name || '—'}</span>
                    <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{timeAgo(u.last_seen)}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
