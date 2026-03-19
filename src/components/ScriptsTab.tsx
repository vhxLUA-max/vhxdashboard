import { useState, useEffect } from 'react';
import { Copy, Check, Loader2, Gamepad2 } from 'lucide-react';

const LOADER = `loadstring(game:HttpGet("https://raw.githubusercontent.com/vhxLUA-max/vhxframeworks/refs/heads/main/main.lua"))()`;
const UNC_LOADER = `loadstring(game:HttpGet("https://raw.githubusercontent.com/vhxLUA-max/vhxframeworks/refs/heads/main/unctester"))()`;

const GAMES = [
  { name: 'Pixel Blade',      placeId: 18172550962,     loader: LOADER     },
  { name: 'Loot Hero',        placeId: 138013005633222, loader: LOADER     },
  { name: 'Survive The Lava', placeId: 119987266683883, loader: LOADER     },
  { name: 'Flick',            placeId: 136801880565837, loader: LOADER     },
  { name: 'UNC Tester',       placeId: 0,               loader: UNC_LOADER },
];

async function robloxProxy(path: string): Promise<unknown> {
  const res = await fetch('/api/roblox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchThumb(placeId: number): Promise<string | null> {
  try {
    const uni = await robloxProxy(`/universes/v1/places/${placeId}/universe`) as { universeId?: number } | null;
    if (!uni?.universeId) return null;
    const thumb = await robloxProxy(`/v1/games/icons?universeIds=${uni.universeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`) as { data?: { imageUrl?: string }[] } | null;
    return thumb?.data?.[0]?.imageUrl ?? null;
  } catch {
    return null;
  }
}

export function ScriptsTab() {
  const [thumbs, setThumbs]   = useState<Record<number, string | null>>({});
  const [thumbLoading, setThumbLoading] = useState(true);
  const [copied, setCopied]   = useState<number | 'all' | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(GAMES.filter(g => g.placeId !== 0).map(async g => ({ placeId: g.placeId, url: await fetchThumb(g.placeId) }))).then(results => {
      if (cancelled) return;
      const map: Record<number, string | null> = {};
      results.forEach(r => { map[r.placeId] = r.url; });
      setThumbs(map);
      setThumbLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const copy = (game: typeof GAMES[number]) => {
    navigator.clipboard.writeText(game.loader);
    setCopied(game.placeId);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scripts</h2>
          <p className="text-sm text-gray-500 mt-0.5">One loader works for all supported games</p>
        </div>
        <button
          onClick={() => copy(GAMES[0])}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            copied === 'all'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500/50 hover:text-indigo-400'
          }`}
        >
          {copied === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied === 'all' ? 'Copied!' : 'Copy Script'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {GAMES.map(game => (
          <div
            key={game.placeId}
            className="group bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
          >
            <div className="relative aspect-square bg-gray-200 dark:bg-gray-800">
              {thumbLoading && game.placeId !== 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              ) : thumbs[game.placeId] ? (
                <img
                  src={thumbs[game.placeId]!}
                  alt={game.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Gamepad2 className="w-10 h-10 text-gray-600" />
                </div>
              )}
            </div>

            <div className="p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{game.name}</p>
              <button
                onClick={() => copy(game)}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
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
    </div>
  );
}
