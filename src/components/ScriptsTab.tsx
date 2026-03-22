import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Loader2, Gamepad2, Users, ThumbsUp, ThumbsDown, Star, ExternalLink, ArrowLeft, Play, Wrench, Timer, Bell, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

function getRemainingSeconds(endTs: string | null): number {
  if (!endTs) return -1;
  const endMs = Date.parse(endTs);
  if (isNaN(endMs)) return -1;
  return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
}

function ScriptCountdown({ endTs }: { endTs: string | null }) {
  const [secs, setSecs] = useState(() => getRemainingSeconds(endTs));
  const firedRef = useRef(false);
  useEffect(() => {
    firedRef.current = false;
    setSecs(getRemainingSeconds(endTs));
    if (!endTs) return;
    const id = setInterval(() => {
      const r = getRemainingSeconds(endTs);
      setSecs(r);
      if (r <= 0 && !firedRef.current) { firedRef.current = true; clearInterval(id); }
    }, 1000);
    return () => clearInterval(id);
  }, [endTs]);
  if (!endTs || secs < 0) return null;
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60;
  return (
    <span className="text-[9px] font-mono font-bold text-amber-400">
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  );
}

const LOADER = `loadstring(game:HttpGet("https://raw.githubusercontent.com/vhxLUA-max/vhxframeworks/refs/heads/main/mainloader"))()`;

const GAMES = [
  { placeId: 18172550962,     loader: LOADER },
  { placeId: 138013005633222, loader: LOADER },
  { placeId: 119987266683883, loader: LOADER },
  { placeId: 136801880565837, loader: LOADER },
  { placeId: 123974602339071, loader: LOADER },
];

type GameInfo = {
  universeId: number;
  name: string;
  description: string;
  playing: number;
  visits: number;
  maxPlayers: number;
  thumbUrl: string | null;
  favoriteCount: number;
  likeCount: number;
  dislikeCount: number;
  created: string;
  updated: string;
  genre: string;
};

async function robloxProxy(path: string, method = 'GET', body?: object): Promise<unknown> {
  const res = await fetch('/api/roblox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, method, body }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchGameInfo(placeId: number): Promise<GameInfo | null> {
  try {
    const uni = await robloxProxy(`/universes/v1/places/${placeId}/universe`) as { universeId?: number } | null;
    if (!uni?.universeId) return null;
    const uid = uni.universeId;

    const [details, thumb, votes] = await Promise.all([
      robloxProxy(`/v1/games?universeIds=${uid}`),
      robloxProxy(`/v1/games/icons?universeIds=${uid}&returnPolicy=PlaceHolder&size=768x432&format=Png&isCircular=false`),
      robloxProxy(`/v1/games/votes?universeIds=${uid}`),
    ]) as any[];

    const d = details?.data?.[0];
    if (!d) return null;

    return {
      universeId: uid,
      name: d.name ?? 'Unknown',
      description: d.description ?? '',
      playing: d.playing ?? 0,
      visits: d.visits ?? 0,
      maxPlayers: d.maxPlayers ?? 0,
      favoriteCount: d.favoritedCount ?? 0,
      thumbUrl: thumb?.data?.[0]?.imageUrl ?? null,
      likeCount: votes?.data?.[0]?.upVotes ?? 0,
      dislikeCount: votes?.data?.[0]?.downVotes ?? 0,
      created: d.created ? new Date(d.created).toLocaleDateString() : '',
      updated: d.updated ? new Date(d.updated).toLocaleDateString() : '',
      genre: d.genre ?? '',
    };
  } catch {
    return null;
  }
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function GameDetailPanel({ info, placeId, loader, onBack }: { info: GameInfo; placeId: number; loader: string; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const total = info.likeCount + info.dislikeCount;
  const likePercent = total > 0 ? Math.round((info.likeCount / total) * 100) : null;

  const copy = () => {
    navigator.clipboard.writeText(loader);
    setCopied(true);
    toast.success(`Script copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const infoRows = [
    { label: 'Server Size',  value: info.maxPlayers.toString() },
    { label: 'Genre',        value: info.genre || '—' },
    { label: 'Created',      value: info.created || '—' },
    { label: 'Updated',      value: info.updated || '—' },
  ];

  return (
    <div className="space-y-0" style={{ color: 'var(--color-text)' }}>
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs mb-4 hover:opacity-80 transition-opacity" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to scripts
      </button>

      {/* Banner thumbnail */}
      <div className="w-full rounded-2xl overflow-hidden bg-gray-800 aspect-video mb-4">
        {info.thumbUrl
          ? <img src={info.thumbUrl} alt={info.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="w-16 h-16 text-gray-600" /></div>
        }
      </div>

      {/* Title + creator */}
      <div className="mb-3">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{info.name}</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>By vhxLUA</p>
      </div>

      {/* Action row — Roblox style */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Play button */}
        <a href={`https://www.roblox.com/games/${placeId}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)' }}>
          <Play className="w-4 h-4 fill-white" /> Play
        </a>
        {/* Copy script */}
        <button onClick={copy}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
          style={{
            backgroundColor: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
            color: copied ? '#10b981' : 'var(--color-text)',
            border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
          }}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy Script'}
        </button>
        {/* Like % */}
        {likePercent !== null && (
          <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-muted)' }}>
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-emerald-400">{likePercent}%</span>
          </div>
        )}
        {/* Active players */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-muted)' }}>
          <Users className="w-3.5 h-3.5" />
          <span>{formatNum(info.playing)} active</span>
        </div>
        {/* Favorites */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-muted)' }}>
          <Heart className="w-3.5 h-3.5" />
          <span>{formatNum(info.favoriteCount)}</span>
        </div>
      </div>

      {/* Description */}
      {info.description && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Description</h3>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-muted)' }}>
            {info.description}
          </p>
        </div>
      )}

      {/* Info rows — Roblox style */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        {infoRows.map((row, i) => (
          <div key={row.label}
            className="flex items-center justify-between px-4 py-3.5 text-sm"
            style={{
              borderBottom: i < infoRows.length - 1 ? '1px solid var(--color-border)' : 'none',
              backgroundColor: 'var(--color-surface)',
            }}>
            <span style={{ color: 'var(--color-muted)' }}>{row.label}</span>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{row.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3.5 text-sm"
          style={{ backgroundColor: 'var(--color-surface)' }}>
          <span style={{ color: 'var(--color-muted)' }}>Visits</span>
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{formatNum(info.visits)}</span>
        </div>
      </div>
    </div>
  );
}

const GAME_NAMES: Record<number, string> = {
  18172550962: 'Pixel Blade', 18172553902: 'Pixel Blade', 133884972346775: 'Pixel Blade',
  138013005633222: 'Loot Hero', 77439980360504: 'Loot Hero',
  119987266683883: 'Survive Lava', 136801880565837: 'Flick', 123974602339071: 'UNC Tester',
};

type CardState = { loading: boolean; info: GameInfo | null };

export function ScriptsTab() {
  const [cards,       setCards]       = useState<Record<number, CardState>>({});
  const [selected,    setSelected]    = useState<typeof GAMES[number] | null>(null);
  const [maintenance, setMaintenance] = useState<Record<string, { on: boolean; msg: string; endTs: string | null }>>({});

  useEffect(() => {
    GAMES.forEach(async game => {
      setCards(prev => ({ ...prev, [game.placeId]: { loading: true, info: null } }));
      const info = await fetchGameInfo(game.placeId);
      setCards(prev => ({ ...prev, [game.placeId]: { loading: false, info } }));
    });

    const loadMaintenance = async () => {
      const { data } = await supabase.from('game_status').select('game_name, maintenance, maintenance_msg, end_timestamp');
      if (!data) return;
      const m: Record<string, { on: boolean; msg: string; endTs: string | null }> = {};
      data.forEach((r: any) => { m[r.game_name] = { on: !!r.maintenance, msg: r.maintenance_msg ?? '', endTs: r.end_timestamp ?? null }; });
      setMaintenance(m);
    };
    loadMaintenance();

    const ch = supabase.channel('scripts-maintenance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_status' }, loadMaintenance)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (selected) {
    const card = cards[selected.placeId];
    if (card?.info) {
      return <GameDetailPanel info={card.info} placeId={selected.placeId} loader={selected.loader} onBack={() => setSelected(null)} />;
    }
    if (card?.loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-muted)' }} />
        </div>
      );
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Scripts</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Click a game to copy the script</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href="https://rscripts.net/@vhxLUA_" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
            <ExternalLink className="w-3 h-3" /> rscripts
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {GAMES.map(game => {
          const card = cards[game.placeId];
          const loading = card?.loading ?? true;
          const info = card?.info ?? null;
          const gameName = GAME_NAMES[game.placeId];
          const mStatus = gameName ? maintenance[gameName] : null;
          const inMaintenance = mStatus?.on ?? false;

          return (
            <button key={game.placeId} onClick={() => setSelected(game)} disabled={loading}
              className="group text-left rounded-2xl overflow-hidden transition-all disabled:opacity-60 disabled:cursor-wait hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: `1px solid ${inMaintenance ? '#f59e0b40' : 'var(--color-border)'}`,
              }}>
              {/* Thumbnail */}
              <div className="aspect-video bg-gray-800 relative overflow-hidden">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-muted)' }} />
                  </div>
                ) : info?.thumbUrl ? (
                  <img src={info.thumbUrl} alt={info.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    style={{ filter: inMaintenance ? 'brightness(0.35)' : 'none' }} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Gamepad2 className="w-10 h-10 text-gray-600" />
                  </div>
                )}
                {inMaintenance && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3">
                    <Wrench className="w-5 h-5 text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400">MAINTENANCE</span>
                    {mStatus?.endTs && (
                      <div className="flex items-center gap-1">
                        <Timer className="w-2.5 h-2.5 text-amber-400" />
                        <ScriptCountdown endTs={mStatus.endTs} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                  {loading ? <span className="block h-3 w-20 bg-gray-700 rounded animate-pulse" /> : (info?.name ?? 'Unknown')}
                </p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: inMaintenance ? '#f59e0b' : 'var(--color-muted)' }}>
                  {loading ? '' : inMaintenance ? '🔧 Under maintenance' : `${formatNum(info?.playing ?? 0)} playing`}
                </p>
                {!loading && info && (
                  <div className="flex items-center gap-2 mt-2">
                    {info.likeCount + info.dislikeCount > 0 && (
                      <span className="text-[10px] flex items-center gap-1 text-emerald-400">
                        <ThumbsUp className="w-2.5 h-2.5" />
                        {Math.round(info.likeCount / (info.likeCount + info.dislikeCount) * 100)}%
                      </span>
                    )}
                    <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                      <Users className="w-2.5 h-2.5" />
                      {formatNum(info.visits)}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
