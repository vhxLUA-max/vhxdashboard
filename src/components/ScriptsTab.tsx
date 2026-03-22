import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Loader2, Users, ThumbsUp, ExternalLink, Wrench, Timer } from 'lucide-react';
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
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return (
    <span className="font-mono text-amber-300 text-[10px]">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
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

const GAME_NAMES: Record<number, string> = {
  18172550962: 'Pixel Blade', 18172553902: 'Pixel Blade', 133884972346775: 'Pixel Blade',
  138013005633222: 'Loot Hero', 77439980360504: 'Loot Hero',
  119987266683883: 'Survive Lava', 136801880565837: 'Flick', 123974602339071: 'UNC Tester',
};

type GameInfo = {
  universeId: number;
  name: string;
  playing: number;
  visits: number;
  thumbUrl: string | null;
  likeCount: number;
  dislikeCount: number;
  creatorName: string;
};

async function robloxProxy(path: string): Promise<unknown> {
  const res = await fetch('/api/roblox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
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
      robloxProxy(`/v1/games?universeIds=${uid}`) as Promise<{ data?: any[] } | null>,
      robloxProxy(`/v1/games/icons?universeIds=${uid}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`) as Promise<{ data?: { imageUrl?: string }[] } | null>,
      robloxProxy(`/v1/games/votes?universeIds=${uid}`) as Promise<{ data?: { upVotes?: number; downVotes?: number }[] } | null>,
    ]);
    const d = (details as any)?.data?.[0];
    if (!d) return null;
    return {
      universeId: uid,
      name: d.name ?? 'Unknown',
      playing: d.playing ?? 0,
      visits: d.visits ?? 0,
      thumbUrl: (thumb as any)?.data?.[0]?.imageUrl ?? null,
      likeCount: (votes as any)?.data?.[0]?.upVotes ?? 0,
      dislikeCount: (votes as any)?.data?.[0]?.downVotes ?? 0,
      creatorName: d.creator?.name ?? 'Unknown',
    };
  } catch { return null; }
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

type CardState = { loading: boolean; info: GameInfo | null };

function RobloxGameCard({ game, info, loading, maintenance }: {
  game: typeof GAMES[number];
  info: GameInfo | null;
  loading: boolean;
  maintenance: { on: boolean; msg: string; endTs: string | null } | null;
}) {
  const [copied, setCopied] = useState(false);
  const inMaintenance = maintenance?.on ?? false;
  const likePercent = info && (info.likeCount + info.dislikeCount) > 0
    ? Math.round((info.likeCount / (info.likeCount + info.dislikeCount)) * 100)
    : null;

  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(game.loader);
    setCopied(true);
    toast.success(`Script copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = info?.name ?? GAME_NAMES[game.placeId] ?? 'Unknown';

  return (
    <div className="flex flex-col group cursor-pointer" style={{ minWidth: 0 }}>
      {/* Thumbnail — Roblox 16:9 ratio */}
      <div className="relative w-full overflow-hidden rounded-xl mb-2"
        style={{ paddingBottom: '56.25%', backgroundColor: 'var(--color-surface2)' }}>
        <div className="absolute inset-0">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-muted)' }} />
            </div>
          ) : info?.thumbUrl ? (
            <img src={info.thumbUrl} alt={displayName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              style={{ filter: inMaintenance ? 'brightness(0.3) saturate(0.4)' : 'none' }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1e1e2e, #2d2d44)' }}>
              <span className="text-4xl">🎮</span>
            </div>
          )}

          {/* Maintenance overlay */}
          {inMaintenance && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Wrench className="w-6 h-6 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-400 text-center px-3 leading-tight">Under Maintenance</span>
              <ScriptCountdown endTs={maintenance?.endTs ?? null} />
            </div>
          )}

          {/* Playing badge */}
          {!loading && info && !inMaintenance && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ backgroundColor: 'rgba(0,0,0,0.75)', color: '#fff', backdropFilter: 'blur(4px)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {formatNum(info.playing)} playing
            </div>
          )}
        </div>
      </div>

      {/* Info below thumbnail — Roblox style */}
      <div className="flex items-start gap-2 px-0.5">
        {/* Game icon circle */}
        <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden mt-0.5"
          style={{ backgroundColor: 'var(--color-surface2)', border: '2px solid var(--color-border)' }}>
          {info?.thumbUrl && (
            <img src={info.thumbUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-1">
              <div className="h-3.5 w-28 rounded animate-pulse" style={{ backgroundColor: 'var(--color-surface2)' }} />
              <div className="h-3 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--color-surface2)' }} />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--color-text)' }}>{displayName}</p>
              <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--color-muted)' }}>{info?.creatorName ?? 'Roblox'}</p>
              <div className="flex items-center gap-2 mt-1">
                {likePercent !== null && (
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-muted)' }}>
                    <ThumbsUp className="w-3 h-3" />{likePercent}%
                  </span>
                )}
                {info && (
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--color-muted)' }}>
                    <Users className="w-3 h-3" />{formatNum(info.visits)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Copy button */}
      <button onClick={copy} disabled={loading || inMaintenance}
        className="mt-3 w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
        style={copied
          ? { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
          : { backgroundColor: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }
        }>
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied!' : inMaintenance ? 'Maintenance' : 'Get Script'}
      </button>
    </div>
  );
}

export function ScriptsTab() {
  const [cards, setCards]             = useState<Record<number, CardState>>({});
  const [maintenance, setMaintenance] = useState<Record<string, { on: boolean; msg: string; endTs: string | null }>>({});

  useEffect(() => {
    GAMES.forEach(async game => {
      setCards(prev => ({ ...prev, [game.placeId]: { loading: true, info: null } }));
      const info = await fetchGameInfo(game.placeId);
      setCards(prev => ({ ...prev, [game.placeId]: { loading: false, info } }));
    });

    const loadMaintenance = async () => {
      const { data } = await supabase.from('game_status').select('game_name,maintenance,maintenance_msg,end_timestamp');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Scripts</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Click Get Script to copy the executor script</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://rscripts.net/@vhxLUA_" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
            <ExternalLink className="w-3 h-3" /> Rscripts
          </a>
          <a href="https://youtube.com/@vhxlua" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
            <ExternalLink className="w-3 h-3" /> YouTube
          </a>
        </div>
      </div>

      {/* Game grid — Roblox style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {GAMES.map(game => {
          const card = cards[game.placeId];
          const gameName = GAME_NAMES[game.placeId];
          const mStatus = gameName ? maintenance[gameName] : null;
          return (
            <RobloxGameCard
              key={game.placeId}
              game={game}
              info={card?.info ?? null}
              loading={card?.loading ?? true}
              maintenance={mStatus ?? null}
            />
          );
        })}
      </div>
    </div>
  );
}
