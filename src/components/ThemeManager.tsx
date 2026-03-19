import { useState } from 'react';
import { Check } from 'lucide-react';

const THEME_KEY = 'vhx_theme';

type Theme = {
  id: string;
  name: string;
  description: string;
  icon: string;
  dark: boolean;
  vars: {
    bg: string; surface: string; surface2: string;
    border: string; text: string; muted: string;
    accent: string; accent2: string; accentFg: string;
  };
  swatches: string[];
};

const THEMES: Theme[] = [
  {
    id: 'default', name: 'Default', description: 'Clean neutral look for everyday use.', icon: '▲', dark: true,
    vars: { bg:'#030712', surface:'#111827', surface2:'#1f2937', border:'#1f2937', text:'#f9fafb', muted:'#6b7280', accent:'#6366f1', accent2:'#8b5cf6', accentFg:'#fff' },
    swatches: ['#6366f1', '#8b5cf6', '#34d399', '#1f2937'],
  },
  {
    id: 'synthwave', name: 'Synthwave', description: 'Neon sunset colors straight out of the arcade.', icon: '🌆', dark: true,
    vars: { bg:'#0d0415', surface:'#1a0533', surface2:'#2d0a52', border:'#3d1468', text:'#f0e6ff', muted:'#9d7ab8', accent:'#ff2d87', accent2:'#00d4ff', accentFg:'#fff' },
    swatches: ['#ff2d87', '#00d4ff', '#ff9f00', '#1a0533'],
  },
  {
    id: 'forest', name: 'Forest', description: 'Leafy greens with cozy woodland vibes.', icon: '🌲', dark: true,
    vars: { bg:'#0a120a', surface:'#0f1f0f', surface2:'#1a2f1a', border:'#1f3d1f', text:'#e8f5e8', muted:'#6b8f6b', accent:'#22c55e', accent2:'#10b981', accentFg:'#fff' },
    swatches: ['#22c55e', '#10b981', '#14b8a6', '#0f1f0f'],
  },
  {
    id: 'discord', name: 'Discord', description: 'Discord-inspired violet and charcoal.', icon: '🎮', dark: true,
    vars: { bg:'#1e1f22', surface:'#2b2d31', surface2:'#313338', border:'#3f4248', text:'#dbdee1', muted:'#80848e', accent:'#5865f2', accent2:'#7289da', accentFg:'#fff' },
    swatches: ['#5865f2', '#4f5660', '#7289da', '#36393f'],
  },
  {
    id: 'dracula', name: 'Dracula', description: 'Dark purple with vibrant pink and cyan.', icon: '🧛', dark: true,
    vars: { bg:'#191921', surface:'#282a36', surface2:'#363849', border:'#44475a', text:'#f8f8f2', muted:'#8b8fa8', accent:'#ff79c6', accent2:'#bd93f9', accentFg:'#282a36' },
    swatches: ['#ff79c6', '#bd93f9', '#8be9fd', '#282a36'],
  },
  {
    id: 'obsidian', name: 'Obsidian', description: 'Deep blacks with electric blue and purple.', icon: '◆', dark: true,
    vars: { bg:'#000000', surface:'#0a0a0a', surface2:'#141414', border:'#1e1e1e', text:'#e8f4f8', muted:'#607080', accent:'#0ea5e9', accent2:'#7c3aed', accentFg:'#fff' },
    swatches: ['#0ea5e9', '#7c3aed', '#06b6d4', '#0a0a0a'],
  },
  {
    id: 'aurora', name: 'Aurora', description: 'Northern lights palette with teal and violet.', icon: '✨', dark: true,
    vars: { bg:'#050d18', surface:'#0a1628', surface2:'#0f2040', border:'#162950', text:'#e8f4ff', muted:'#5a7a9a', accent:'#2dd4bf', accent2:'#a855f7', accentFg:'#fff' },
    swatches: ['#2dd4bf', '#a855f7', '#4ade80', '#0f2040'],
  },
  {
    id: 'matrix', name: 'Matrix', description: 'Terminal green on pure black.', icon: '▶', dark: true,
    vars: { bg:'#000000', surface:'#000000', surface2:'#001100', border:'#003300', text:'#00ff41', muted:'#007a1f', accent:'#00ff41', accent2:'#00cc33', accentFg:'#000' },
    swatches: ['#00ff41', '#00cc33', '#00aa22', '#001100'],
  },
  {
    id: 'rosepine', name: 'Rosé Pine', description: 'Muted tones with warm rose and pine.', icon: '🌹', dark: true,
    vars: { bg:'#111020', surface:'#1f1d2e', surface2:'#2a2839', border:'#403d52', text:'#e0def4', muted:'#908caa', accent:'#ebbcba', accent2:'#c4a7e7', accentFg:'#1f1d2e' },
    swatches: ['#ebbcba', '#c4a7e7', '#9ccfd8', '#1f1d2e'],
  },
  {
    id: 'mocha', name: 'Mocha', description: 'Warm browns and amber tones.', icon: '☕', dark: true,
    vars: { bg:'#0d0805', surface:'#1c1008', surface2:'#2a1a0d', border:'#3d2614', text:'#f5e6d0', muted:'#8a6a4a', accent:'#f97316', accent2:'#d97706', accentFg:'#fff' },
    swatches: ['#f97316', '#b45309', '#d97706', '#1c1008'],
  },
  {
    id: 'lavender', name: 'Lavender', description: 'Soft purples and pastel pinks on light.', icon: '💜', dark: false,
    vars: { bg:'#faf5ff', surface:'#f3e8ff', surface2:'#ede9fe', border:'#ddd6fe', text:'#3b0764', muted:'#7c3aed', accent:'#7c3aed', accent2:'#db2777', accentFg:'#fff' },
    swatches: ['#a78bfa', '#f472b6', '#818cf8', '#f3e8ff'],
  },
  {
    id: 'mint', name: 'Mint', description: 'Fresh greens on clean white.', icon: '🌿', dark: false,
    vars: { bg:'#f0fdf4', surface:'#dcfce7', surface2:'#bbf7d0', border:'#86efac', text:'#14532d', muted:'#16a34a', accent:'#10b981', accent2:'#0d9488', accentFg:'#fff' },
    swatches: ['#10b981', '#059669', '#0d9488', '#dcfce7'],
  },
  {
    id: 'bubblegum', name: 'Bubblegum', description: 'Playful pinks and bright teals.', icon: '🍬', dark: false,
    vars: { bg:'#fff0f7', surface:'#ffe0ef', surface2:'#ffc0e0', border:'#ffaad6', text:'#7d0044', muted:'#c0548a', accent:'#ff2d87', accent2:'#06b6d4', accentFg:'#fff' },
    swatches: ['#ff2d87', '#a855f7', '#06b6d4', '#fff0f7'],
  },
  {
    id: 'christmas', name: 'Christmas', description: 'Festive reds, mints, and snowy cheer.', icon: '🎄', dark: true,
    vars: { bg:'#060f06', surface:'#0d1f0d', surface2:'#1a2f14', border:'#1f3d1a', text:'#f0fff0', muted:'#6a8f6a', accent:'#ef4444', accent2:'#22c55e', accentFg:'#fff' },
    swatches: ['#22c55e', '#ef4444', '#f59e0b', '#0d1f0d'],
  },
  {
    id: 'youtube', name: 'YouTube', description: 'Familiar red and charcoal, like the app.', icon: '▶', dark: true,
    vars: { bg:'#0f0f0f', surface:'#1a1a1a', surface2:'#272727', border:'#303030', text:'#f1f1f1', muted:'#717171', accent:'#ff0000', accent2:'#cc0000', accentFg:'#fff' },
    swatches: ['#ff0000', '#cc0000', '#ff4444', '#1a1a1a'],
  },
  {
    id: 'grape', name: 'Grape', description: 'Rich purples and violet hues.', icon: '🍇', dark: true,
    vars: { bg:'#0d0515', surface:'#1a0a2e', surface2:'#260f42', border:'#38145e', text:'#f0e6ff', muted:'#8a60a8', accent:'#d946ef', accent2:'#a855f7', accentFg:'#fff' },
    swatches: ['#d946ef', '#a855f7', '#7c3aed', '#1a0a2e'],
  },
  {
    id: 'arctic', name: 'Arctic', description: 'Icy blues and frosted whites.', icon: '❄️', dark: true,
    vars: { bg:'#080e18', surface:'#0e1a2e', surface2:'#142440', border:'#1c3054', text:'#e0f0ff', muted:'#4a6f9a', accent:'#38bdf8', accent2:'#7dd3fc', accentFg:'#080e18' },
    swatches: ['#38bdf8', '#7dd3fc', '#93c5fd', '#0e1a2e'],
  },
  {
    id: 'volcano', name: 'Volcano', description: 'Fiery reds and molten orange on dark ash.', icon: '🌋', dark: true,
    vars: { bg:'#0d0500', surface:'#1a0a00', surface2:'#2e1000', border:'#451800', text:'#fff0e0', muted:'#8a5030', accent:'#f97316', accent2:'#ef4444', accentFg:'#fff' },
    swatches: ['#f97316', '#ef4444', '#fbbf24', '#1a0a00'],
  },
];

export function applyTheme(themeId: string) {
  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];
  const root  = document.documentElement;
  const v     = theme.vars;

  root.style.setProperty('--color-bg',       v.bg);
  root.style.setProperty('--color-surface',  v.surface);
  root.style.setProperty('--color-surface2', v.surface2);
  root.style.setProperty('--color-border',   v.border);
  root.style.setProperty('--color-text',     v.text);
  root.style.setProperty('--color-muted',    v.muted);
  root.style.setProperty('--color-accent',   v.accent);
  root.style.setProperty('--color-accent2',  v.accent2);
  root.style.setProperty('--color-accent-fg',v.accentFg);

  if (theme.dark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }

  document.body.style.backgroundColor = v.bg;
  document.body.style.color = v.text;

  localStorage.setItem(THEME_KEY, themeId);
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) ?? 'default';
  applyTheme(saved);
}

export function ThemeManager() {
  const [active, setActive] = useState(() => localStorage.getItem(THEME_KEY) ?? 'default');

  const select = (theme: Theme) => {
    applyTheme(theme.id);
    setActive(theme.id);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Themes</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Tap any card to apply. Saves automatically.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {THEMES.map(theme => {
          const isActive = active === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => select(theme)}
              style={{
                backgroundColor: isActive ? theme.vars.surface2 : theme.vars.surface,
                borderColor: isActive ? theme.vars.accent : theme.vars.border,
                boxShadow: isActive ? `0 0 0 1px ${theme.vars.accent}40` : 'none',
              }}
              className="text-left p-4 rounded-2xl border transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base border"
                    style={{ backgroundColor: theme.vars.surface2, borderColor: theme.vars.border }}
                  >
                    {theme.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight" style={{ color: theme.vars.text }}>
                      {theme.name}
                    </p>
                    <p className="text-[11px] leading-tight mt-0.5 line-clamp-2 max-w-[160px]" style={{ color: theme.vars.muted }}>
                      {theme.description}
                    </p>
                  </div>
                </div>
                {isActive && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: theme.vars.accent, backgroundColor: `${theme.vars.accent}18`, border: `1px solid ${theme.vars.accent}40` }}
                  >
                    <Check className="w-2.5 h-2.5" /> Active
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                {theme.swatches.map((color, i) => (
                  <div
                    key={i}
                    className="flex-1 h-8 rounded-lg"
                    style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.15)' }}
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
