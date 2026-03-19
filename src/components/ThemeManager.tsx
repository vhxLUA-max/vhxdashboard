import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

const THEME_KEY = 'vhx_theme';

type Theme = {
  id: string;
  name: string;
  description: string;
  icon: string;
  dark: boolean;
  vars: Record<string, string>;
  swatches: string[];
};

const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean neutral look for everyday use.',
    icon: '▲',
    dark: true,
    vars: {
      '--tw-bg-base': '3 7% 6%',
      '--accent-primary': '239 84% 67%',
      '--accent-secondary': '262 83% 58%',
    },
    swatches: ['#6366f1', '#8b5cf6', '#34d399', '#1f2937'],
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    description: 'Neon sunset colors straight out of the arcade.',
    icon: '📊',
    dark: true,
    vars: {
      '--accent-primary': '328 100% 60%',
      '--accent-secondary': '197 100% 60%',
    },
    swatches: ['#ff2d87', '#00d4ff', '#ff9f00', '#1a0533'],
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Leafy greens with cozy woodland vibes.',
    icon: '🌲',
    dark: true,
    vars: {
      '--accent-primary': '142 71% 45%',
      '--accent-secondary': '161 100% 35%',
    },
    swatches: ['#22c55e', '#10b981', '#14b8a6', '#111'],
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Discord-inspired violet, charcoal, and blurple accents.',
    icon: '🎮',
    dark: true,
    vars: {
      '--accent-primary': '235 86% 65%',
      '--accent-secondary': '197 100% 48%',
    },
    swatches: ['#5865f2', '#4f5660', '#7289da', '#36393f'],
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'Dark purple with vibrant pink and cyan accents.',
    icon: '🧛',
    dark: true,
    vars: {
      '--accent-primary': '326 100% 74%',
      '--accent-secondary': '191 97% 77%',
    },
    swatches: ['#ff79c6', '#bd93f9', '#8be9fd', '#282a36'],
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Deep blacks with electric blue and purple.',
    icon: '◆',
    dark: true,
    vars: {
      '--accent-primary': '199 89% 48%',
      '--accent-secondary': '258 90% 66%',
    },
    swatches: ['#0ea5e9', '#7c3aed', '#06b6d4', '#0a0a0a'],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern lights palette with teal and violet.',
    icon: '✨',
    dark: true,
    vars: {
      '--accent-primary': '174 72% 56%',
      '--accent-secondary': '280 68% 60%',
    },
    swatches: ['#2dd4bf', '#a855f7', '#4ade80', '#0f172a'],
  },
  {
    id: 'matrix',
    name: 'Matrix',
    description: 'Terminal green on pure black.',
    icon: '▶',
    dark: true,
    vars: {
      '--accent-primary': '120 100% 40%',
      '--accent-secondary': '120 100% 28%',
    },
    swatches: ['#00ff41', '#00cc33', '#00aa22', '#000'],
  },
  {
    id: 'rosepine',
    name: 'Rosé Pine',
    description: 'Muted tones with warm rose and pine.',
    icon: '🌹',
    dark: true,
    vars: {
      '--accent-primary': '349 60% 68%',
      '--accent-secondary': '196 40% 58%',
    },
    swatches: ['#ebbcba', '#c4a7e7', '#9ccfd8', '#191724'],
  },
  {
    id: 'mocha',
    name: 'Mocha',
    description: 'Warm browns and amber tones.',
    icon: '☕',
    dark: true,
    vars: {
      '--accent-primary': '25 95% 53%',
      '--accent-secondary': '15 80% 45%',
    },
    swatches: ['#f97316', '#b45309', '#d97706', '#1c1008'],
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Soft purples and pastel pinks on light.',
    icon: '💜',
    dark: false,
    vars: {
      '--accent-primary': '270 70% 60%',
      '--accent-secondary': '330 80% 68%',
    },
    swatches: ['#a78bfa', '#f472b6', '#818cf8', '#f5f0ff'],
  },
  {
    id: 'mint',
    name: 'Mint',
    description: 'Fresh greens on clean white.',
    icon: '🌿',
    dark: false,
    vars: {
      '--accent-primary': '152 76% 40%',
      '--accent-secondary': '174 72% 36%',
    },
    swatches: ['#10b981', '#059669', '#0d9488', '#f0fdf4'],
  },
  {
    id: 'bubblegum',
    name: 'Bubblegum',
    description: 'Playful pinks and bright teals.',
    icon: '🍬',
    dark: false,
    vars: {
      '--accent-primary': '328 100% 60%',
      '--accent-secondary': '174 100% 42%',
    },
    swatches: ['#ff2d87', '#a855f7', '#06b6d4', '#fff0f7'],
  },
  {
    id: 'christmas',
    name: 'Christmas',
    description: 'Festive reds, mints, and snowy cheer.',
    icon: '🎄',
    dark: true,
    vars: {
      '--accent-primary': '0 84% 60%',
      '--accent-secondary': '142 71% 45%',
    },
    swatches: ['#22c55e', '#ef4444', '#f59e0b', '#0d1f0d'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Familiar red and charcoal, like the app.',
    icon: '▶',
    dark: true,
    vars: {
      '--accent-primary': '0 100% 50%',
      '--accent-secondary': '0 72% 42%',
    },
    swatches: ['#ff0000', '#cc0000', '#ff4444', '#0f0f0f'],
  },
  {
    id: 'grape',
    name: 'Grape',
    description: 'Rich purples and violet hues.',
    icon: '🍇',
    dark: true,
    vars: {
      '--accent-primary': '280 100% 65%',
      '--accent-secondary': '265 89% 58%',
    },
    swatches: ['#d946ef', '#a855f7', '#7c3aed', '#1a0a2e'],
  },
];

const CSS_OVERRIDES: Record<string, string> = {
  synthwave: `
    .dark { --background: 10 7% 8%; }
    .tab-animate, main { --tw-bg-opacity: 1; }
    :root { color-scheme: dark; }
    .bg-indigo-600 { background-color: #ff2d87 !important; }
    .bg-indigo-500 { background-color: #e0257a !important; }
    .text-indigo-400 { color: #00d4ff !important; }
    .border-indigo-500 { border-color: #ff2d87 !important; }
    .bg-indigo-500\\/10 { background-color: rgba(0,212,255,0.1) !important; }
    .text-purple-400 { color: #ff2d87 !important; }
  `,
  matrix: `
    .bg-indigo-600 { background-color: #00cc33 !important; }
    .bg-indigo-500 { background-color: #00aa22 !important; }
    .text-indigo-400 { color: #00ff41 !important; }
    .text-indigo-500 { color: #00ff41 !important; }
    .border-indigo-500 { border-color: #00ff41 !important; }
    .bg-indigo-500\\/10 { background-color: rgba(0,255,65,0.1) !important; }
    .text-purple-400 { color: #00ff41 !important; }
    * { font-family: 'Courier New', monospace !important; }
  `,
  dracula: `
    .bg-indigo-600 { background-color: #ff79c6 !important; }
    .bg-indigo-500 { background-color: #e066b3 !important; }
    .text-indigo-400 { color: #bd93f9 !important; }
    .text-indigo-500 { color: #ff79c6 !important; }
    .border-indigo-500 { border-color: #ff79c6 !important; }
    .bg-indigo-500\\/10 { background-color: rgba(189,147,249,0.1) !important; }
    .text-purple-400 { color: #ff79c6 !important; }
  `,
  obsidian: `
    .bg-indigo-600 { background-color: #0ea5e9 !important; }
    .bg-indigo-500 { background-color: #0284c7 !important; }
    .text-indigo-400 { color: #0ea5e9 !important; }
    .text-indigo-500 { color: #0ea5e9 !important; }
    .border-indigo-500 { border-color: #0ea5e9 !important; }
    .bg-indigo-500\\/10 { background-color: rgba(14,165,233,0.1) !important; }
    .text-purple-400 { color: #7c3aed !important; }
  `,
  forest: `
    .bg-indigo-600 { background-color: #22c55e !important; }
    .bg-indigo-500 { background-color: #16a34a !important; }
    .text-indigo-400 { color: #22c55e !important; }
    .text-indigo-500 { color: #22c55e !important; }
    .border-indigo-500 { border-color: #22c55e !important; }
    .bg-indigo-500\\/10 { background-color: rgba(34,197,94,0.1) !important; }
    .text-purple-400 { color: #10b981 !important; }
  `,
  mocha: `
    .bg-indigo-600 { background-color: #f97316 !important; }
    .bg-indigo-500 { background-color: #ea6c0d !important; }
    .text-indigo-400 { color: #f97316 !important; }
    .text-indigo-500 { color: #f97316 !important; }
    .border-indigo-500 { border-color: #f97316 !important; }
    .bg-indigo-500\\/10 { background-color: rgba(249,115,22,0.1) !important; }
    .text-purple-400 { color: #d97706 !important; }
    .dark { --background: 24 10% 8%; }
  `,
  aurora: `
    .bg-indigo-600 { background-color: #2dd4bf !important; }
    .bg-indigo-500 { background-color: #14b8a6 !important; }
    .text-indigo-400 { color: #2dd4bf !important; }
    .text-indigo-500 { color: #2dd4bf !important; }
    .border-indigo-500 { border-color: #2dd4bf !important; }
    .bg-indigo-500\\/10 { background-color: rgba(45,212,191,0.1) !important; }
    .text-purple-400 { color: #a855f7 !important; }
  `,
  youtube: `
    .bg-indigo-600 { background-color: #ff0000 !important; }
    .bg-indigo-500 { background-color: #cc0000 !important; }
    .text-indigo-400 { color: #ff4444 !important; }
    .text-indigo-500 { color: #ff0000 !important; }
    .border-indigo-500 { border-color: #ff0000 !important; }
    .bg-indigo-500\\/10 { background-color: rgba(255,0,0,0.1) !important; }
    .text-purple-400 { color: #ff4444 !important; }
  `,
  grape: `
    .bg-indigo-600 { background-color: #d946ef !important; }
    .bg-indigo-500 { background-color: #c026d3 !important; }
    .text-indigo-400 { color: #d946ef !important; }
    .text-indigo-500 { color: #d946ef !important; }
    .border-indigo-500 { border-color: #d946ef !important; }
    .bg-indigo-500\\/10 { background-color: rgba(217,70,239,0.1) !important; }
    .text-purple-400 { color: #a855f7 !important; }
  `,
  rosepine: `
    .bg-indigo-600 { background-color: #ebbcba !important; color: #1f1d2e !important; }
    .bg-indigo-500 { background-color: #d4a5a3 !important; }
    .text-indigo-400 { color: #ebbcba !important; }
    .text-indigo-500 { color: #ebbcba !important; }
    .border-indigo-500 { border-color: #ebbcba !important; }
    .bg-indigo-500\\/10 { background-color: rgba(235,188,186,0.1) !important; }
    .text-purple-400 { color: #c4a7e7 !important; }
    .dark { --background: 245 16% 10%; }
  `,
  christmas: `
    .bg-indigo-600 { background-color: #ef4444 !important; }
    .bg-indigo-500 { background-color: #dc2626 !important; }
    .text-indigo-400 { color: #22c55e !important; }
    .text-indigo-500 { color: #22c55e !important; }
    .border-indigo-500 { border-color: #ef4444 !important; }
    .bg-indigo-500\\/10 { background-color: rgba(239,68,68,0.1) !important; }
    .text-purple-400 { color: #22c55e !important; }
  `,
};

function applyTheme(theme: Theme) {
  const existing = document.getElementById('vhx-theme-override');
  if (existing) existing.remove();

  if (theme.dark) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }

  const css = CSS_OVERRIDES[theme.id];
  if (css) {
    const style = document.createElement('style');
    style.id = 'vhx-theme-override';
    style.textContent = css;
    document.head.appendChild(style);
  }

  localStorage.setItem(THEME_KEY, theme.id);
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) ?? 'default';
  const theme = THEMES.find(t => t.id === saved) ?? THEMES[0];
  applyTheme(theme);
}

export function ThemeManager() {
  const [active, setActive] = useState(() => localStorage.getItem(THEME_KEY) ?? 'default');

  useEffect(() => { initTheme(); }, []);

  const select = (theme: Theme) => {
    applyTheme(theme);
    setActive(theme.id);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Themes</h2>
        <p className="text-sm text-gray-500 mt-0.5">Tap any card to apply. Changes take effect instantly.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {THEMES.map(theme => {
          const isActive = active === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => select(theme)}
              className={`text-left p-4 rounded-2xl border transition-all ${
                isActive
                  ? 'border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10'
                  : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-white dark:hover:bg-gray-800/60'
              } ${!theme.dark ? 'bg-white! border-gray-300' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border ${
                    theme.dark
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-gray-100 border-gray-200'
                  }`}>
                    {theme.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{theme.name}</p>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5 line-clamp-2 max-w-[140px]">{theme.description}</p>
                  </div>
                </div>
                {isActive && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full shrink-0">
                    <Check className="w-2.5 h-2.5" /> Active
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                {theme.swatches.map((color, i) => (
                  <div
                    key={i}
                    className="flex-1 h-8 rounded-lg border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
