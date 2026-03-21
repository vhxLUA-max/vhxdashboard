import { useState, useEffect, useRef } from 'react';
import { Search, BarChart3, Code, Key, Megaphone, Users, Webhook, Palette, MessageSquare, ShieldCheck, Shield, ArrowRight, Gamepad2, ExternalLink } from 'lucide-react';

type Result = {
  type: 'tab' | 'script' | 'action' | 'link';
  label: string;
  sub?: string;
  icon: React.ReactNode;
  action: () => void;
};

const SCRIPTS = [
  { name: 'Pixel Blade', desc: 'Kill Aura, ESP, Fly, Auto Buy' },
  { name: 'Loot Hero',   desc: 'Auto farm, loot collection'     },
  { name: 'Flick',       desc: 'Auto aim, speed mods'           },
  { name: 'Survive Lava',desc: 'Auto escape, safe zones'        },
];

const LINKS = [
  { label: 'Discord Server', url: 'https://discord.gg/AuQqvrJE79' },
  { label: 'TikTok',         url: 'https://tiktok.com/@vhxlua'   },
  { label: 'YouTube',        url: 'https://youtube.com/@vhx hub'  },
];

const TAB_META = [
  { id: 'stats',     label: 'Stats',     sub: 'Execution metrics & analytics',  icon: <BarChart3 className="w-4 h-4" />     },
  { id: 'scripts',   label: 'Scripts',   sub: 'Browse & copy loadstrings',       icon: <Code className="w-4 h-4" />         },
  { id: 'search',    label: 'Search',    sub: 'Find users by token or username', icon: <Search className="w-4 h-4" />       },
  { id: 'token',     label: 'Token',     sub: 'Your vhx hub token',               icon: <Key className="w-4 h-4" />          },
  { id: 'changelog', label: 'Updates',   sub: 'Changelogs & patch notes',        icon: <Megaphone className="w-4 h-4" />    },
  { id: 'socials',   label: 'Socials',   sub: 'Discord, TikTok, YouTube',        icon: <Users className="w-4 h-4" />        },
  { id: 'webhook',   label: 'Webhook',   sub: 'Configure Discord webhooks',      icon: <Webhook className="w-4 h-4" />      },
  { id: 'themes',    label: 'Themes',    sub: 'Customize dashboard appearance',  icon: <Palette className="w-4 h-4" />      },
  { id: 'feedback',  label: 'Feedback',  sub: 'Send feedback or bug reports',    icon: <MessageSquare className="w-4 h-4" />},
  { id: 'status',    label: 'Status',    sub: 'System & game status',            icon: <ShieldCheck className="w-4 h-4" />  },
  { id: 'admin',     label: 'Admin',     sub: 'Admin panel & user management',   icon: <Shield className="w-4 h-4" />       },
];

export function SiteSearch({
  onClose,
  onNavigate,
  isAdmin,
}: {
  onClose: () => void;
  onNavigate: (tab: string) => void;
  isAdmin: boolean;
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const q = query.toLowerCase().trim();

  const results: Result[] = [];

  // Tabs
  TAB_META
    .filter(t => t.id !== 'admin' || isAdmin)
    .filter(t => !q || t.label.toLowerCase().includes(q) || t.sub.toLowerCase().includes(q))
    .forEach(t => results.push({
      type: 'tab', label: t.label, sub: t.sub, icon: t.icon,
      action: () => { onNavigate(t.id); onClose(); },
    }));

  // Scripts
  SCRIPTS
    .filter(s => !q || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
    .forEach(s => results.push({
      type: 'script', label: s.name, sub: s.desc,
      icon: <Gamepad2 className="w-4 h-4" />,
      action: () => { onNavigate('scripts'); onClose(); },
    }));

  // Community links
  LINKS
    .filter(l => !q || l.label.toLowerCase().includes(q))
    .forEach(l => results.push({
      type: 'link', label: l.label, sub: l.url,
      icon: <ExternalLink className="w-4 h-4" />,
      action: () => { window.open(l.url, '_blank'); onClose(); },
    }));

  // Reset cursor when results change
  useEffect(() => { setCursor(0); }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown')  { e.preventDefault(); setCursor(c => Math.min(c+1, results.length-1)); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setCursor(c => Math.max(c-1, 0)); }
      if (e.key === 'Enter')      { results[cursor]?.action(); }
      if (e.key === 'Escape')     { onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [results, cursor, onClose]);

  // Scroll cursor into view
  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const typeLabel: Record<string, string> = { tab: 'Page', script: 'Script', action: 'Action', link: 'Link' };
  const typeColor: Record<string, string> = {
    tab:    'rgba(99,102,241,0.15)',
    script: 'rgba(16,185,129,0.15)',
    link:   'rgba(245,158,11,0.15)',
    action: 'rgba(139,92,246,0.15)',
  };
  const typeText: Record<string, string> = { tab: '#818cf8', script: '#34d399', link: '#fbbf24', action: '#a78bfa' };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Search panel — slides down from top */}
      <div className="relative w-full max-w-lg mx-auto mt-[env(safe-area-inset-top)] sm:mt-16 px-3 sm:px-0"
        onClick={e => e.stopPropagation()}>
        <div className="rounded-2xl overflow-hidden shadow-2xl border"
          style={{ backgroundColor: '#111113', borderColor: 'rgba(255,255,255,0.1)' }}>

          {/* Input row */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: 'rgba(160,160,175,0.6)' }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search tabs, scripts, links..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--color-text)', caretColor: 'var(--color-accent)' }}
            />
            {query && (
              <button onClick={() => setQuery('')}
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ color: 'rgba(160,160,175,0.6)', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                clear
              </button>
            )}
            <kbd className="hidden sm:block text-[10px] px-1.5 py-0.5 rounded border font-mono"
              style={{ color: 'rgba(160,160,175,0.5)', borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="overflow-y-auto max-h-[60vh] py-1">
            {results.length === 0 && (
              <div className="py-10 text-center text-sm" style={{ color: 'rgba(160,160,175,0.5)' }}>
                No results for "{query}"
              </div>
            )}
            {results.map((r, i) => (
              <button key={i} onClick={r.action}
                onMouseEnter={() => setCursor(i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{ backgroundColor: cursor === i ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: typeColor[r.type], color: typeText[r.type] }}>
                  {r.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{r.label}</p>
                  {r.sub && <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(160,160,175,0.6)' }}>{r.sub}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: typeColor[r.type], color: typeText[r.type] }}>
                    {typeLabel[r.type]}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: 'rgba(160,160,175,0.3)' }} />
                </div>
              </button>
            ))}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <span className="text-[10px]" style={{ color: 'rgba(160,160,175,0.4)' }}>↑↓ navigate</span>
            <span className="text-[10px]" style={{ color: 'rgba(160,160,175,0.4)' }}>↵ select</span>
            <span className="text-[10px]" style={{ color: 'rgba(160,160,175,0.4)' }}>ESC close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
