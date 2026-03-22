import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { WORLD_SVG_PATHS } from './worldPaths';
import { X, User, Gamepad2, Clock, Shield, Cpu } from 'lucide-react';

interface Dot {
  lat: number;
  lng: number;
  username: string;
  game_name: string;
  last_seen: string;
  country: string;
  country_code: string;
  city: string;
  region: string;
  fresh: boolean;
}

interface UserRow {
  roblox_user_id: number;
  username: string;
  game_name: string;
  execution_count: number;
  first_seen: string;
  last_seen: string;
  country: string;
  region: string;
  city: string;
  ip_address: string;
  hwid: string;
  fingerprint: string;
}

const W = 2000, H = 857;

function project(lat: number, lng: number) {
  return { x: ((lng + 180) / 360) * W, y: ((90 - lat) / 180) * H };
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function CountryPanel({ countryCode, countryName, onClose }: {
  countryCode: string;
  countryName: string;
  onClose: () => void;
}) {
  const [users, setUsers]     = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserRow | null>(null);

  useEffect(() => {
    supabase
      .from('unique_users')
      .select('roblox_user_id,username,game_name,execution_count,first_seen,last_seen,country,region,city,ip_address,hwid,fingerprint')
      .eq('country_code', countryCode)
      .order('last_seen', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        // Aggregate by roblox_user_id
        const agg: Record<number, UserRow> = {};
        for (const r of (data ?? [])) {
          const id = r.roblox_user_id;
          if (!agg[id]) agg[id] = { ...r, execution_count: 0 };
          agg[id].execution_count += r.execution_count ?? 0;
          if (r.last_seen > agg[id].last_seen) Object.assign(agg[id], r);
        }
        setUsers(Object.values(agg).sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime()));
        setLoading(false);
      });
  }, [countryCode]);

  if (selected) return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={() => setSelected(null)}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}>
        {/* Profile header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: 'var(--color-accent)' }}>
              {selected.username[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>@{selected.username}</p>
              <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>#{selected.roblox_user_id}</p>
            </div>
          </div>
          <button onClick={() => setSelected(null)} style={{ color: 'var(--color-muted)' }}><X className="w-5 h-5" /></button>
        </div>
        {/* Info rows */}
        <div className="divide-y overflow-y-auto max-h-[60vh]" style={{ borderColor: 'var(--color-border)' }}>
          {[
            { icon: Gamepad2, label: 'Game',       value: selected.game_name || '—' },
            { icon: Shield,   label: 'Executions', value: selected.execution_count.toLocaleString() },
            { icon: Clock,    label: 'Last seen',  value: timeAgo(selected.last_seen) },
            { icon: Clock,    label: 'First seen', value: new Date(selected.first_seen).toLocaleDateString() },
            { icon: User,     label: 'Location',   value: [selected.city, selected.region, selected.country].filter(Boolean).join(', ') || '—' },
            { icon: User,     label: 'IP',         value: selected.ip_address || '—' },
            { icon: Cpu,      label: 'HWID',       value: selected.hwid ? selected.hwid.slice(0, 20) + '…' : '—' },
            { icon: Cpu,      label: 'Fingerprint',value: selected.fingerprint ? selected.fingerprint.slice(0, 20) + '…' : '—' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3 px-4 py-3">
              <row.icon className="w-4 h-4 shrink-0" style={{ color: 'var(--color-muted)' }} />
              <span className="text-xs w-24 shrink-0" style={{ color: 'var(--color-muted)' }}>{row.label}</span>
              <span className="text-xs font-medium break-all" style={{ color: 'var(--color-text)' }}>{String(row.value)}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <a href={`https://www.roblox.com/users/${selected.roblox_user_id}/profile`} target="_blank" rel="noopener noreferrer"
            className="block w-full py-2 rounded-xl text-sm font-semibold text-center text-white hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)' }}>
            View Roblox Profile
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{countryName}</p>
            <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{loading ? 'Loading...' : `${users.length} user${users.length !== 1 ? 's' : ''}`}</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-muted)' }}><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b animate-pulse" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="w-9 h-9 rounded-full" style={{ backgroundColor: 'var(--color-surface2)' }} />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-32 rounded" style={{ backgroundColor: 'var(--color-surface2)' }} />
                    <div className="h-2.5 w-24 rounded" style={{ backgroundColor: 'var(--color-surface2)' }} />
                  </div>
                </div>
              ))
            : users.length === 0
            ? <p className="text-center py-10 text-sm" style={{ color: 'var(--color-muted)' }}>No users found in {countryName}</p>
            : users.map(u => (
                <button key={u.roblox_user_id} onClick={() => setSelected(u)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b hover:opacity-80 transition-opacity text-left"
                  style={{ borderColor: 'var(--color-border)' }}>
                  <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-bold text-sm text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}>
                    {u.username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>@{u.username}</p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--color-muted)' }}>
                      {u.game_name || '—'} · {u.execution_count} execs · {timeAgo(u.last_seen)}
                    </p>
                  </div>
                  <p className="text-[10px] shrink-0" style={{ color: 'var(--color-muted)' }}>
                    {[u.city, u.region].filter(Boolean).join(', ')}
                  </p>
                </button>
              ))
          }
        </div>
      </div>
    </div>
  );
}

export function ExecutionWorldMap() {
  const [dots, setDots]             = useState<Dot[]>([]);
  const [tooltip, setTooltip]       = useState<{ dot: Dot; x: number; y: number } | null>(null);
  const [countryPanel, setCountryPanel] = useState<{ code: string; name: string } | null>(null);
  const [loading, setLoading]       = useState(true);
  const containerRef                = useRef<HTMLDivElement>(null);

  const loadDots = useCallback(async (markFresh = false) => {
    const { data } = await supabase
      .from('unique_users')
      .select('username,game_name,last_seen,lat,lng,country,country_code,city,region')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .order('last_seen', { ascending: false })
      .limit(50);

    if (!data) { setLoading(false); return; }
    const freshCutoff = new Date(Date.now() - 15000).toISOString();
    setDots(data.map(r => ({
      lat: r.lat as number, lng: r.lng as number,
      username: r.username, game_name: r.game_name ?? '',
      last_seen: r.last_seen,
      country: r.country ?? '', country_code: r.country_code ?? '',
      city: r.city ?? '', region: r.region ?? '',
      fresh: markFresh && r.last_seen > freshCutoff,
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch('/api/geo-resolve', { method: 'POST' }).then(() => loadDots()).catch(() => loadDots());
    const ch = supabase.channel('worldmap-v5')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unique_users' }, async () => {
        await fetch('/api/geo-resolve', { method: 'POST' }).catch(() => {});
        loadDots(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadDots]);

  const showDot = useCallback((dot: Dot, svgX: number, svgY: number) => {
    setTooltip({ dot, x: (svgX / W) * 100, y: (svgY / H) * 100 });
  }, []);

  // Group dots by country for click handling
  const dotsByCountry = dots.reduce<Record<string, Dot[]>>((acc, d) => {
    if (d.country_code) (acc[d.country_code] = acc[d.country_code] || []).push(d);
    return acc;
  }, {});

  return (
    <>
      <div className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        {/* Console header */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(0,0,0,0.25)' }}>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-3 text-[11px] font-mono" style={{ color: 'var(--color-muted)' }}>execution_map.sh</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--color-muted)' }}>
            {loading && <span className="animate-pulse">loading...</span>}
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {dots.length} locations · {Object.keys(dotsByCountry).length} countries
            </span>
          </div>
        </div>

        {/* Map */}
        <div ref={containerRef} className="relative w-full select-none"
          style={{ paddingBottom: '42.85%', backgroundColor: '#060d1f' }}
          onMouseLeave={() => setTooltip(null)}>

          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
            <rect width={W} height={H} fill="#060d1f" />

            {/* Grid lines */}
            {[-60,-30,0,30,60].map(lat => {
              const y = ((90-lat)/180)*H;
              return <line key={lat} x1={0} y1={y} x2={W} y2={y}
                stroke={lat===0?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.04)'}
                strokeWidth={lat===0?1.5:1} />;
            })}
            {[-120,-60,0,60,120].map(lng => {
              const x = ((lng+180)/360)*W;
              return <line key={lng} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />;
            })}

            {/* Countries — highlighted if they have users */}
            <g dangerouslySetInnerHTML={{ __html: WORLD_SVG_PATHS.replace(
              /class="([^"]+)"/g,
              (_match, cls) => {
                const code = cls.trim().toUpperCase();
                const hasUsers = !!dotsByCountry[code];
                return `class="${cls}" fill="${hasUsers ? '#1e3a5f' : '#1a2a42'}" stroke="${hasUsers ? '#3b82f6' : '#243858'}" stroke-width="1" style="cursor:${hasUsers ? 'pointer' : 'default'}" data-code="${code}"`;
              }
            )}} />

            {/* Invisible country click zones */}
            {Object.entries(dotsByCountry).map(([code, cdots]) => {
              const avgLat = cdots.reduce((s, d) => s + d.lat, 0) / cdots.length;
              const avgLng = cdots.reduce((s, d) => s + d.lng, 0) / cdots.length;
              const { x, y } = project(avgLat, avgLng);
              return (
                <circle key={`zone-${code}`} cx={x} cy={y} r="40" fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setCountryPanel({ code, name: cdots[0].country || code })} />
              );
            })}

            {/* Dots */}
            {dots.map((dot, i) => {
              const { x, y } = project(dot.lat, dot.lng);
              const color = dot.fresh ? '#10b981' : '#3b82f6';
              return (
                <g key={i} style={{ cursor: 'pointer' }}
                  onMouseEnter={() => showDot(dot, x, y)}
                  onMouseLeave={() => setTooltip(null)}
                  onTouchStart={e => { e.preventDefault(); showDot(dot, x, y); }}
                  onTouchEnd={() => setTimeout(() => setTooltip(null), 2500)}
                  onClick={() => setCountryPanel({ code: dot.country_code, name: dot.country })}>
                  {dot.fresh && (
                    <circle cx={x} cy={y} fill="none" stroke={color} strokeWidth="2" opacity="0.5">
                      <animate attributeName="r" values="6;24" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.7;0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={x} cy={y} r="10" fill={color} opacity="0.15" />
                  <circle cx={x} cy={y} r="6" fill={color} />
                  <circle cx={x} cy={y} r="2.5" fill="white" opacity="0.9" />
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div className="absolute z-10 pointer-events-none px-3 py-2 rounded-lg text-xs shadow-2xl"
              style={{
                left: `${Math.min(Math.max(tooltip.x, 3), 68)}%`,
                top: `${Math.min(Math.max(tooltip.y - 14, 2), 76)}%`,
                backgroundColor: 'rgba(8,12,28,0.97)',
                border: '1px solid rgba(99,102,241,0.5)',
                color: '#e2e8f0',
                backdropFilter: 'blur(8px)',
                maxWidth: '160px',
              }}>
              <p className="font-bold truncate">@{tooltip.dot.username}</p>
              <p className="truncate mt-0.5" style={{ color: '#94a3b8' }}>{tooltip.dot.game_name || '—'}</p>
              <p className="mt-0.5" style={{ color: '#6ee7b7' }}>
                {[tooltip.dot.city, tooltip.dot.country].filter(Boolean).join(', ') || '—'}
              </p>
              <p className="mt-0.5" style={{ color: '#64748b' }}>{timeAgo(tooltip.dot.last_seen)}</p>
              <p className="mt-1 text-[9px]" style={{ color: '#4b5563' }}>Click to view country users</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]"
          style={{ color: 'var(--color-muted)', borderTop: '1px solid var(--color-border)' }}>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Execution</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Recent (&lt;15s)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#1e3a5f', border: '1px solid #3b82f6' }} /> Has users</span>
          <span className="ml-auto hidden sm:block">Tap dot or country to view users</span>
        </div>
      </div>

      {/* Country panel */}
      {countryPanel && (
        <CountryPanel
          countryCode={countryPanel.code}
          countryName={countryPanel.name}
          onClose={() => setCountryPanel(null)}
        />
      )}
    </>
  );
}
