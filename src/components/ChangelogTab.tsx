import { Megaphone } from 'lucide-react';

interface Entry { date: string; game: string; title: string; body: string; type: 'update' | 'fix' | 'new'; }

const CHANGELOG: Entry[] = [
  { date: '2025-03-18', game: 'Pixel Blade', title: 'Auto-farm v2.1', body: 'Improved loot detection and stamina loop stability.', type: 'update' },
  { date: '2025-03-15', game: 'Loot Hero', title: 'Initial release', body: 'Script now live and fully supported.', type: 'new' },
  { date: '2025-03-10', game: 'Pixel Blade', title: 'Anti-kick fix', body: 'Fixed disconnect loop caused by idle detection.', type: 'fix' },
  { date: '2025-03-05', game: 'Flick', title: 'Launch', body: 'Flick script added to the lineup.', type: 'new' },
];

const TYPE_STYLE: Record<Entry['type'], string> = {
  update: 'bg-indigo-500/10 text-indigo-400',
  fix:    'bg-rose-500/10 text-rose-400',
  new:    'bg-emerald-500/10 text-emerald-400',
};

export function ChangelogTab() {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-indigo-400" />
        Changelog
      </h3>
      <div className="space-y-2">
        {CHANGELOG.map((entry, i) => (
          <div key={i} className="p-3 bg-gray-950 rounded-lg border border-gray-800 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_STYLE[entry.type]}`}>{entry.type}</span>
                <span className="text-xs text-gray-500">{entry.game}</span>
              </div>
              <span className="text-xs text-gray-600">{entry.date}</span>
            </div>
            <p className="text-sm font-medium text-white">{entry.title}</p>
            <p className="text-xs text-gray-400">{entry.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
