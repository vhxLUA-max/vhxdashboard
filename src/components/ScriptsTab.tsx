import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Loader2, Gamepad2, Users, ThumbsUp, ExternalLink, ArrowLeft, Play, Wrench, Timer, Shield, Star } from 'lucide-react';
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
    <span className="font-mono text-amber-400 text-[10px]">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

const LOADER     = `loadstring(game:HttpGet("https://raw.githubusercontent.com/vhxLUA-max/vhxframeworks/refs/heads/main/mainloader"))()`;
const UNC_LOADER = `loadstring(game:HttpGet("https://raw.githubusercontent.com/vhxLUA-max/vhxframeworks/refs/heads/main/mainloader"))()`;

const GAMES = [
  { placeId: 18172550962,     loader: LOADER,     tag: 'Combat'    },
  { placeId: 138013005633222, loader: LOADER,     tag: 'RPG'       },
  { placeId: 119987266683883, loader: LOADER,     tag: 'Survival'  },
  { placeId: 136801880565837, loader: LOADER,     tag: 'Casual'    },
  { placeId: 123974602339071, loader: UNC_LOADER, tag: 'Utility'   },
];

type GameInfo = {
  universeId: number;
  name: string;
  description: string;
  playing: number;
  visits: number;
  maxPlayers: number;
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
      description: d.description ?? '',
      playing: d.playing ?? 0,
      visits: d.visits ?? 0,
      maxPlayers: d.maxPlayers ?? 0,
      thumbUrl: (thumb as any)?.data?.[0]?.imageUrl ?? null,
      likeCount: (votes as any)?.data?.[0]?.upVotes ?? 0,
      dislikeCount: (votes as any)?.data?.[0]?.downVotes ?? 0,
      creatorName: d.creator?.name ?? 'Unknown',
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

function CopyButton({ loader, name }: { loader: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(loader);
    setCopied(true);
    toast.success(`${name} script copied!`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0"
      style={copied
        ? { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
        : { backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
      }>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy Script'}
    </button>
  );
}

const GAME_NAMES: Record<number, string> = {
  18172550962: 'Pixel Blade', 18172553902: 'Pixel Blade', 133884972346775: 'Pixel Blade',
  138013005633222: 'Loot Hero', 77439980360504: 'Loot Hero',
  119987266683883: 'Survive Lava', 136801880565837: 'Flick', 123974602339071: 'UNC Tester',
};

type CardState = { loading: boolean; info: GameInfo | null };

function ScriptCard({
  game, info, loading, maintenance, onSelect
}: {
  game: typeof GAMES[number];
  info: GameInfo | null;
  loading: boolean;
  maintenance: { on: boolean; msg: string; endTs: string | null } | null;
  onSelect: () => void;
}) {
  const inMaintenance = maintenance?.on ?? false;
  const likePercent = info && (info.likeCount + info.dislikeCount) > 0
    ? Math.round((info.likeCount / (info.likeCount + info.dislikeCount)) * 100)
    : null;

  return (
    <div
      onClick={!loading ? onSelect : undefined}
      className="group flex items-stretch gap-0 rounded-2xl overflow-hidden border cursor-pointer transition-all hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: inMaintenance ? 'rgba(245,158,11,0.35)' : 'var(--color-border)',
      }}>

      {/* Thumbnail */}
      <div className="w-28 sm:w-36 shrink-0 relative overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface2)' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-muted)' }} />
          </div>
        ) : info?.thumbUrl ? (
          <img src={info.thumbUrl} alt={info.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            style={{ filter: inMaintenance ? 'brightness(0.3) saturate(0.5)' : 'none' }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Gamepad2 className="w-10 h-10" style={{ color: 'var(--color-muted)' }} />
          </div>
        )}
        {inMaintenance && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            <span className="text-[9px] font-bold text-amber-400 text-center leading-tight">MAINTENANCE</span>
            <ScriptCountdown endTs={maintenance?.endTs ?? null} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-between p-4 min-w-0">
        <div className="space-y-1.5">
          {/* Name + tag */}
          <div className="flex items-center gap-2 flex-wrap">
            {loading ? (
              <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: 'var(--color-surface2)' }} />
            ) : (
              <>
                <span className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>
                  {info?.name ?? GAME_NAMES[game.placeId] ?? 'Unknown'}
                </span>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                  {game.tag}
                </span>
                {inMaintenance && (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                    🔧 Maintenance
                  </span>
                )}
              </>
            )}
          </div>

          {/* Creator */}
          {!loading && info && (
            <p className="text-[11px] truncate" style={{ color: 'var(--color-muted)' }}>
              by {info.creatorName}
            </p>
          )}

          {/* Stats */}
          {!loading && info && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-muted)' }}>
                <Users className="w-3 h-3" /> {formatNum(info.playing)} playing
              </span>
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-muted)' }}>
                <Star className="w-3 h-3" /> {formatNum(info.visits)} visits
              </span>
              {likePercent !== null && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <ThumbsUp className="w-3 h-3" /> {likePercent}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          {!loading && !inMaintenance && (
            <CopyButton loader={game.loader} name={info?.name ?? 'Script'} />
          )}
          <a href={`https://www.roblox.com/games/${game.placeId}`}
            target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
            <Play className="w-3 h-3" /> Play
          </a>
          <a href={`https://www.roblox.com/games/${game.placeId}`}
            target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="p-2 rounded-xl transition-all"
            style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

function GameDetailPanel({ info, placeId, loader, onBack }: { info: GameInfo; placeId: number; loader: string; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const likePercent = (info.likeCount + info.dislikeCount) > 0
    ? Math.round((info.likeCount / (info.likeCount + info.dislikeCount)) * 100) : null;

  const copy = () => {
    navigator.clipboard.writeText(loader);
    setCopied(true);
    toast.success(`${info.name} script copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-80" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to scripts
      </button>

      <div className="rounded-2xl overflow-hidden border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-56 shrink-0" style={{ backgroundColor: 'var(--color-surface2)' }}>
            {info.thumbUrl
              ? <img src={info.thumbUrl} alt={info.name} className="w-full aspect-square object-cover" />
              : <div className="w-full aspect-square flex items-center justify-center"><Gamepad2 className="w-12 h-12" style={{ color: 'var(--color-muted)' }} /></div>
            }
          </div>

          <div className="flex-1 p-6 space-y-4 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{info.name}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>by {info.creatorName}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">Verified</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Users, label: 'Playing', value: formatNum(info.playing) },
                { icon: Star, label: 'Visits', value: formatNum(info.visits) },
                { icon: ThumbsUp, label: 'Rating', value: likePercent !== null ? `${likePercent}%` : 'N/A' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--color-surface2)' }}>
                  <s.icon className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--color-accent)' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{s.value}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {info.description && (
              <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--color-muted)' }}>{info.description}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={copy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={copied
                  ? { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                  : { backgroundColor: 'var(--color-accent)', color: '#fff', border: '1px solid var(--color-accent)' }
                }>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Script'}
              </button>
              <a href={`https://www.roblox.com/games/${placeId}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ backgroundColor: 'var(--color-surface2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
                <Play className="w-4 h-4" /> Play
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScriptsTab() {
  const [cards, setCards] = useState<Record<number, CardState>>({});
  const [selected, setSelected] = useState<typeof GAMES[number] | null>(null);
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
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Scripts</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Tap a game to view details or copy the script directly</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {[
            { label: 'rscripts', url: 'https://rscripts.net/@vhxLUA_', color: '#818cf8' },
            { label: 'YouTube',  url: 'https://youtube.com/@vhxlua?si=0j9rYLl0qPf3gu1Y', color: '#f87171' },
            { label: 'TikTok',   url: 'https://www.tiktok.com/@vhxlua_?lang=en', color: '#f472b6' },
          ].map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--color-surface2)', color: l.color, border: '1px solid var(--color-border)' }}>
              {l.label}
            </a>
          ))}
        </div>
      </div>

      {/* Script list — Rscripts style horizontal cards */}
      <div className="space-y-3">
        {GAMES.map(game => {
          const card = cards[game.placeId];
          const gameName = GAME_NAMES[game.placeId];
          const mStatus = gameName ? maintenance[gameName] : null;
          return (
            <ScriptCard
              key={game.placeId}
              game={game}
              info={card?.info ?? null}
              loading={card?.loading ?? true}
              maintenance={mStatus ?? null}
              onSelect={() => setSelected(game)}
            />
          );
        })}
      </div>
    </div>
  );
}
