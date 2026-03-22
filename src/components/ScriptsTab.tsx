import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Loader2, Users, ThumbsUp, ThumbsDown, ExternalLink, ArrowLeft, Wrench, Bell, Star, ChevronRight } from 'lucide-react';
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
  const ref = useRef(false);
  useEffect(() => {
    ref.current = false;
    setSecs(getRemainingSeconds(endTs));
    if (!endTs) return;
    const id = setInterval(() => {
      const r = getRemainingSeconds(endTs);
      setSecs(r);
      if (r <= 0 && !ref.current) { ref.current = true; clearInterval(id); }
    }, 1000);
    return () => clearInterval(id);
  }, [endTs]);
  if (!endTs || secs < 0) return null;
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return <span className="font-mono text-amber-400 text-xs">{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>;
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
  description: string;
  playing: number;
  visits: number;
  maxPlayers: number;
  thumbUrl: string | null;
  mediaUrls: string[];
  likeCount: number;
  dislikeCount: number;
  creatorName: string;
  creatorVerified: boolean;
  genre: string;
  created: string;
  updated: string;
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
    const [details, thumb, votes, media] = await Promise.all([
      robloxProxy(`/v1/games?universeIds=${uid}`) as Promise<{ data?: any[] } | null>,
      robloxProxy(`/v1/games/icons?universeIds=${uid}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`) as Promise<{ data?: { imageUrl?: string }[] } | null>,
      robloxProxy(`/v1/games/votes?universeIds=${uid}`) as Promise<{ data?: { upVotes?: number; downVotes?: number }[] } | null>,
      robloxProxy(`/v1/games/${uid}/media`) as Promise<{ data?: { assetType?: string; imageId?: number; videoHash?: string; imageUrl?: string }[] } | null>,
    ]);
    const d = (details as any)?.data?.[0];
    if (!d) return null;
    const mediaUrls = ((media as any)?.data ?? [])
      .filter((m: any) => m.assetType === 'Image' && m.imageUrl)
      .map((m: any) => m.imageUrl)
      .slice(0, 6);
    return {
      universeId: uid,
      name: d.name ?? 'Unknown',
      description: d.description ?? '',
      playing: d.playing ?? 0,
      visits: d.visits ?? 0,
      maxPlayers: d.maxPlayers ?? 0,
      thumbUrl: (thumb as any)?.data?.[0]?.imageUrl ?? null,
      mediaUrls,
      likeCount: (votes as any)?.data?.[0]?.upVotes ?? 0,
      dislikeCount: (votes as any)?.data?.[0]?.downVotes ?? 0,
      creatorName: d.creator?.name ?? 'Unknown',
      creatorVerified: d.creator?.hasVerifiedBadge ?? false,
      genre: d.genre ?? '',
      created: d.created ? new Date(d.created).toLocaleDateString() : '',
      updated: d.updated ? new Date(d.updated).toLocaleDateString() : '',
    };
  } catch { return null; }
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

type CardState = { loading: boolean; info: GameInfo | null };

// Full Roblox-style game detail panel
function GameDetailPanel({ game, info, onBack, loader }: {
  game: typeof GAMES[number];
  info: GameInfo;
  onBack: () => void;
  loader: string;
}) {
  const [copied, setCopied] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  const likePercent = (info.likeCount + info.dislikeCount) > 0
    ? Math.round((info.likeCount / (info.likeCount + info.dislikeCount)) * 100) : null;

  const copy = () => {
    navigator.clipboard.writeText(loader);
    setCopied(true);
    toast.success('Script copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const allMedia = [info.thumbUrl, ...info.mediaUrls].filter(Boolean) as string[];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 px-4 py-3 text-sm hover:opacity-70 transition-opacity" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft className="w-4 h-4" /> Back to Scripts
      </button>

      {/* Header — game icon + title */}
      <div className="flex items-center gap-4 px-4 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {info.thumbUrl
          ? <img src={info.thumbUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
          : <div className="w-16 h-16 rounded-xl shrink-0" style={{ backgroundColor: 'var(--color-surface2)' }} />
        }
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight" style={{ color: 'var(--color-text)' }}>{info.name}</h1>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{info.creatorName}</span>
            {info.creatorVerified && (
              <svg className="w-4 h-4 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--color-muted)' }}>
            Maturity: Mild
          </span>
        </div>
      </div>

      {/* Media carousel */}
      {allMedia.length > 0 && (
        <div className="relative">
          <div className="w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <img src={allMedia[mediaIdx]} alt="" className="w-full h-full object-cover" />
          </div>
          {allMedia.length > 1 && (
            <>
              <button onClick={() => setMediaIdx(i => (i - 1 + allMedia.length) % allMedia.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => setMediaIdx(i => (i + 1) % allMedia.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {allMedia.map((_, i) => (
                  <button key={i} onClick={() => setMediaIdx(i)}
                    className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{ backgroundColor: i === mediaIdx ? 'white' : 'rgba(255,255,255,0.4)' }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Stats row — like Roblox */}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full shrink-0 text-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <ThumbsUp className="w-4 h-4" />
          <span>{likePercent != null ? `${likePercent}%` : '—'}</span>
          <ThumbsDown className="w-3.5 h-3.5 opacity-40" />
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full shrink-0 text-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <Users className="w-4 h-4" />
          <span>{formatNum(info.playing)} active</span>
        </div>
        <button onClick={copy}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full shrink-0 text-sm font-semibold transition-all"
          style={{ backgroundColor: copied ? '#10b981' : '#2563eb', color: 'white' }}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Get Script'}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-full shrink-0 text-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <Bell className="w-4 h-4" /> Notify
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-full shrink-0 text-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <Star className="w-4 h-4" /> Favorite
        </button>
      </div>

      {/* Description */}
      {info.description && (
        <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>Description</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--color-muted)' }}>
            {info.description.slice(0, 600)}{info.description.length > 600 ? '...' : ''}
          </p>
        </div>
      )}

      {/* Info rows — Roblox detail style */}
      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {[
          { label: 'Developer', value: info.creatorName, verified: info.creatorVerified },
          { label: 'Server Size', value: info.maxPlayers },
          { label: 'Genre', value: info.genre || 'All Genres' },
          { label: 'Created', value: info.created },
          { label: 'Updated', value: info.updated },
          { label: 'Visits', value: formatNum(info.visits) },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between px-4 py-3.5" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{row.label}</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{String(row.value)}</span>
              {(row as any).verified && (
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* External links */}
      <div className="divide-y mb-8" style={{ borderColor: 'var(--color-border)' }}>
        {[
          { label: 'View on Roblox', url: `https://www.roblox.com/games/${game.placeId}` },
          { label: 'Rscripts Page', url: 'https://rscripts.net/@vhxLUA_' },
        ].map(item => (
          <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-3.5 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text)', textDecoration: 'none' }}>
            <span className="text-sm">{item.label}</span>
            <ExternalLink className="w-4 h-4" style={{ color: 'var(--color-muted)' }} />
          </a>
        ))}
      </div>
    </div>
  );
}

// Small game card — Roblox homepage tile style
function GameTile({ game, info, loading, maintenance, onSelect }: {
  game: typeof GAMES[number];
  info: GameInfo | null;
  loading: boolean;
  maintenance: { on: boolean; msg: string; endTs: string | null } | null;
  onSelect: () => void;
}) {
  const inMaintenance = maintenance?.on ?? false;
  const likePercent = info && (info.likeCount + info.dislikeCount) > 0
    ? Math.round((info.likeCount / (info.likeCount + info.dislikeCount)) * 100) : null;

  return (
    <button onClick={!loading ? onSelect : undefined}
      className="text-left w-full group">
      {/* Thumbnail 16:9 */}
      <div className="relative w-full rounded-xl overflow-hidden mb-2" style={{ aspectRatio: '16/9', backgroundColor: 'var(--color-surface2)' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-muted)' }} />
          </div>
        ) : info?.thumbUrl ? (
          <img src={info.thumbUrl} alt={info.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            style={{ filter: inMaintenance ? 'brightness(0.3)' : 'none' }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🎮</div>
        )}
        {inMaintenance && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <Wrench className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400">MAINTENANCE</span>
            <ScriptCountdown endTs={maintenance?.endTs ?? null} />
          </div>
        )}
        {!loading && info && !inMaintenance && (
          <div className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', color: 'white' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {formatNum(info.playing)}
          </div>
        )}
      </div>

      {/* Below thumbnail */}
      <div className="flex items-start gap-2 px-0.5">
        {info?.thumbUrl && (
          <img src={info.thumbUrl} alt="" className="w-8 h-8 rounded-full shrink-0 mt-0.5 object-cover"
            style={{ border: '1.5px solid var(--color-border)' }} />
        )}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-1">
              <div className="h-3.5 w-28 rounded animate-pulse" style={{ backgroundColor: 'var(--color-surface2)' }} />
              <div className="h-3 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--color-surface2)' }} />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--color-text)' }}>
                {info?.name ?? GAME_NAMES[game.placeId]}
              </p>
              <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--color-muted)' }}>
                {info?.creatorName ?? 'Roblox'}
              </p>
              {likePercent !== null && (
                <div className="flex items-center gap-1 mt-0.5 text-[10px]" style={{ color: 'var(--color-muted)' }}>
                  <ThumbsUp className="w-2.5 h-2.5" />{likePercent}%
                  <span className="mx-1">·</span>
                  <Users className="w-2.5 h-2.5" />{formatNum(info?.visits ?? 0)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  );
}

export function ScriptsTab() {
  const [cards, setCards]             = useState<Record<number, CardState>>({});
  const [maintenance, setMaintenance] = useState<Record<string, { on: boolean; msg: string; endTs: string | null }>>({});
  const [selected, setSelected]       = useState<{ game: typeof GAMES[number]; info: GameInfo } | null>(null);

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
    const ch = supabase.channel('scripts-maint')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_status' }, loadMaintenance)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (selected) {
    return <GameDetailPanel game={selected.game} info={selected.info} loader={selected.game.loader} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Scripts</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Tap a game to view details and copy script</p>
        </div>
        <a href="https://rscripts.net/@vhxLUA_" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium hover:opacity-80"
          style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
          <ExternalLink className="w-3 h-3" /> Rscripts
        </a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {GAMES.map(game => {
          const card = cards[game.placeId];
          const gameName = GAME_NAMES[game.placeId];
          const mStatus = gameName ? maintenance[gameName] : null;
          return (
            <GameTile
              key={game.placeId}
              game={game}
              info={card?.info ?? null}
              loading={card?.loading ?? true}
              maintenance={mStatus ?? null}
              onSelect={() => card?.info && setSelected({ game, info: card.info })}
            />
          );
        })}
      </div>
    </div>
  );
}
