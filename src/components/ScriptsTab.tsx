import { useState, useEffect } from 'react';
import { Copy, Check, Loader2, Gamepad2 } from 'lucide-react';

const SCRIPT_URL = 'https://raw.githubusercontent.com/vhxLUA-max/vhxframeworks/refs/heads/main/main.lua';

const GAMES = [
  { name: 'Pixel Blade',             placeId: 18172550962     },
  { name: 'Loot Hero',               placeId: 138013005633222 },
  { name: 'Survive The Lava',        placeId: 119987266683883 },
  { name: 'Flick',                   placeId: 136801880565837 },
];

const LOADER = `loadstring(game:HttpGet("${SCRIPT_URL}"))()`;

type Thumb = { placeId: number; url: string | null };

async function fetchThumbnail(placeId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/games/icons?universeIds=${placeId}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.imageUrl ?? null;
  } catch {
    return null;
  }
}

async function placeToUniverse(placeId: number): Promise<number | null> {
  try {
    const res = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.universeId ?? null;
  } catch {
    return null;
  }
}

export function ScriptsTab() {
  const [thumbs, setThumbs]     = useState<Record<number, string | null>>({});
  const [loadingThumbs, setLoadingThumbs] = useState(true);
  const [copied, setCopied]     = useState<number | 'all' | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingThumbs(true);
      const results: Thumb[] = await Promise.all(
        GAMES.map(async g => {
          const universeId = await placeToUniverse(g.placeId);
          const url = universeId ? await fetchThumbnail(universeId) : null;
          return { placeId: g.placeId, url };
        })
      );
      if (!cancelled) {
        const map: Record<number, string | null> = {};
        results.forEach(r => { map[r.placeId] = r.url; });
        setThumbs(map);
        setLoadingThumbs(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const copy = (text: string, key: number | 'all') => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scripts</h2>
          <p className="text-sm text-gray-500 mt-0.5">Copy the loader script for any supported game</p>
        </div>
        <button
          onClick={() => copy(LOADER, 'all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            copied === 'all'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500/50 hover:text-indigo-400'
          }`}
        >
          {copied === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied === 'all' ? 'Copied!' : 'Copy Universal Loader'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GAMES.map(game => (
          <div
            key={game.placeId}
            className="group bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all"
          >
            <div className="relative h-32 bg-gray-200 dark:bg-gray-800 overflow-hidden">
              {loadingThumbs ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              ) : thumbs[game.placeId] ? (
                <img
                  src={thumbs[game.placeId]!}
                  alt={game.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <Gamepad2 className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <p className="absolute bottom-2 left-3 text-sm font-semibold text-white">{game.name}</p>
            </div>

            <div className="p-3 flex items-center justify-between gap-2">
              <code className="text-[10px] text-gray-500 dark:text-gray-500 truncate flex-1 font-mono">
                {LOADER}
              </code>
              <button
                onClick={() => copy(LOADER, game.placeId)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  copied === game.placeId
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-500/40 hover:text-indigo-400'
                }`}
              >
                {copied === game.placeId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === game.placeId ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <p className="text-xs text-amber-400/80">
          All games use the same universal loader — it auto-detects the game and runs the correct script.
        </p>
      </div>
    </div>
  );
}
