import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Loader2, Gamepad2, Users, ThumbsUp, Star, ExternalLink, ArrowLeft, Play, Wrench, Timer } from 'lucide-react';
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
    <div className="flex items-center gap-1 justify-center">
      <Timer className="w-2.5 h-2.5 text-amber-400 shrink-0" />
      <span className="text-[9px] font-mono font-bold text-amber-400">
        {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      </span>
    </div>
  );
}

const LOADER = `loadstring(game:HttpGet("https://raw.githubusercontent.com/vhxLUA-max/vhxframeworks/refs/heads/main/mainloader"))()`;
const UNC_LOADER = `loadstring(game:HttpGet("https://raw.githubusercontent.com/vhxLUA-max/vhxframeworks/refs/heads/main/mainloader"))()`;

const GAMES = [
  { placeId: 18172550962,     loader: LOADER     },
  { placeId: 138013005633222, loader: LOADER     },
  { placeId: 119987266683883, loader: LOADER     },
  { placeId: 136801880565837, loader: LOADER     },
  { placeId: 123974602339071, loader: UNC_LOADER },
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
      robloxProxy(`/v1/games?universeIds=${uid}`) as Promise<{ data?: { name?: string; description?: string; playing?: number; visits?: number; maxPlayers?: number; favoritedCount?: number }[] } | null>,
      robloxProxy(`/v1/games/icons?universeIds=${uid}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`) as Promise<{ data?: { imageUrl?: string }[] } | null>,
      robloxProxy(`/v1/games/votes?universeIds=${uid}`) as Promise<{ data?: { upVotes?: number; downVotes?: number }[] } | null>,
    ]);

    const d = (details as { data?: { name?: string; description?: string; playing?: number; visits?: number; maxPlayers?: number; favoritedCount?: number }[] })?.data?.[0];
    if (!d) return null;

    return {
      universeId: uid,
      name: d.name ?? 'Unknown',
      description: d.description ?? '',
      playing: d.playing ?? 0,
      visits: d.visits ?? 0,
      maxPlayers: d.maxPlayers ?? 0,
      favoriteCount: d.favoritedCount ?? 0,
      thumbUrl: (thumb as { data?: { imageUrl?: string }[] })?.data?.[0]?.imageUrl ?? null,
      likeCount: (votes as { data?: { upVotes?: number }[] })?.data?.[0]?.upVotes ?? 0,
      dislikeCount: (votes as { data?: { downVotes?: number }[] })?.data?.[0]?.downVotes ?? 0,
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
  const likePercent = info.likeCount + info.dislikeCount > 0
    ? Math.round((info.likeCount / (info.likeCount + info.dislikeCount)) * 100)
    : null;

  const copy = () => {
    navigator.clipboard.writeText(loader);
    setCopied(true);
    toast.success(`${info.name} script copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to scripts
      </button>

      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-0">
          <div className="sm:w-48 shrink-0 bg-gray-800">
            {info.thumbUrl ? (
              <img src={info.thumbUrl} alt={info.name} className="w-full sm:h-full aspect-square object-contain" />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center">
                <Gamepad2 className="w-12 h-12 text-gray-600" />
              </div>
            )}
          </div>

          <div className="flex-1 p-5 space-y-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">{info.name}</h2>
                {likePercent !== null && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <ThumbsUp className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-xs text-emerald-400 font-medium">{likePercent}%</span>
                    <span className="text-xs text-gray-500">{formatNum(info.likeCount + info.dislikeCount)} votes</span>
                  </div>
                )}
              </div>
              <a
                href={`https://www.roblox.com/games/${placeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Users,    label: 'Playing',   value: formatNum(info.playing)          },
                { icon: Star,     label: 'Visits',     value: formatNum(info.visits)            },
                { icon: ThumbsUp, label: 'Favorites',  value: formatNum(info.favoriteCount)     },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2.5 text-center">
                  <stat.icon className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-[10px] text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {info.description ? (
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{info.description}</p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <button
                onClick={copy}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  copied
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-indigo-600 hover:bg-blue-600 border-indigo-600 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Script'}
              </button>
              <a
                href={`https://www.roblox.com/games/${placeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all"
              >
                <Play className="w-3.5 h-3.5" /> Play
              </a>
            </div>
          </div>
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_status' }, () => {
        loadMaintenance();
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  if (selected) {
    const card = cards[selected.placeId];
    if (card?.info) {
      return <GameDetailPanel info={card.info} placeId={selected.placeId} loader={selected.loader} onBack={() => setSelected(null)} />;
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scripts</h2>
          <p className="text-sm text-gray-500 mt-0.5">Click a game to view info and copy the script</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href="https://rscripts.net/@vhxLUA_" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-indigo-400 hover:border-indigo-500/40 transition-all">
            <ExternalLink className="w-3 h-3" /> rscripts
          </a>
          <a href="https://youtube.com/@vhxlua?si=0j9rYLl0qPf3gu1Y" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-red-400 hover:border-red-500/40 transition-all">
            <ExternalLink className="w-3 h-3" /> YouTube
          </a>
          <a href="https://www.tiktok.com/@vhxlua_?lang=en" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-pink-400 hover:border-pink-500/40 transition-all">
            <ExternalLink className="w-3 h-3" /> TikTok
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
            <button
              key={game.placeId}
              onClick={() => setSelected(game)}
              disabled={loading}
              className="group text-left bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all disabled:opacity-60 disabled:cursor-wait"
              style={inMaintenance ? { borderColor: '#f59e0b60' } : {}}
            >
              <div className="aspect-square bg-gray-200 dark:bg-gray-800 relative">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  </div>
                ) : info?.thumbUrl ? (
                  <img src={info.thumbUrl} alt={info.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" style={{ filter: inMaintenance ? 'brightness(0.4)' : 'none' }} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Gamepad2 className="w-10 h-10 text-gray-600" />
                  </div>
                )}
                {inMaintenance && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                      <Wrench className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 text-center leading-tight">MAINTENANCE</span>
                    {mStatus?.msg && (
                      <span className="text-[9px] text-amber-300/70 text-center leading-tight line-clamp-2">{mStatus.msg}</span>
                    )}
                    <ScriptCountdown endTs={mStatus?.endTs ?? null} />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  {loading ? <span className="block h-3 w-20 bg-gray-700 rounded animate-pulse" /> : (info?.name ?? 'Unknown')}
                </p>
                {!loading && info && (
                  <p className="text-[10px] mt-0.5" style={{ color: inMaintenance ? '#f59e0b' : 'rgb(107 114 128)' }}>
                    {inMaintenance ? '🔧 Under maintenance' : `${formatNum(info.playing)} playing`}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
