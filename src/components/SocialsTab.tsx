import { ExternalLink } from 'lucide-react';

const SOCIALS = [
  {
    name: 'Discord',
    handle: 'discord.gg/usEnYvqnaJ',
    url: 'https://discord.gg/usEnYvqnaJ',
    desc: 'Join the community, get updates, report bugs',
    color: '#5865F2',
    bg: 'rgba(88,101,242,0.08)',
    border: 'rgba(88,101,242,0.25)',
    icon: (
      <svg viewBox="0 0 127.14 96.36" fill="currentColor" className="w-6 h-6">
        <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/>
      </svg>
    ),
  },
  {
    name: 'TikTok',
    handle: '@vhxlua_',
    url: 'https://www.tiktok.com/@vhxlua__?lang=en',
    desc: 'Script showcases, tutorials and gameplay clips',
    color: '#ff0050',
    bg: 'rgba(255,0,80,0.08)',
    border: 'rgba(255,0,80,0.25)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
      </svg>
    ),
  },
  {
    name: 'YouTube',
    handle: '@vhxlua',
    url: 'https://youtube.com/@vhxlua?si=0j9rYLl0qPf3gu1Y',
    desc: 'Full tutorials, feature demos and update videos',
    color: '#FF0000',
    bg: 'rgba(255,0,0,0.08)',
    border: 'rgba(255,0,0,0.25)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    name: 'GitHub',
    handle: 'vhxLUA-max',
    url: 'https://github.com/vhxLUA-max',
    desc: 'Open source scripts and framework code',
    color: '#e6edf3',
    bg: 'rgba(230,237,243,0.06)',
    border: 'rgba(230,237,243,0.15)',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
  },
];

export function SocialsTab() {
  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Hero */}
      <div className="rounded-2xl border p-6 text-center mb-6"
        style={{ borderColor: 'var(--color-border)', background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%)' }}>
        <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-2xl font-black"
          style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)', color: '#fff' }}>V</div>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text)' }}>vhxLUA</h2>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          The best Roblox script hub — follow for updates, clips and drops
        </p>
      </div>

      {SOCIALS.map(s => (
        <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-95 hover:scale-[1.01]"
          style={{ borderColor: s.border, backgroundColor: s.bg, textDecoration: 'none' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: s.color + '22', color: s.color }}>
            {s.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{s.name}</span>
              <ExternalLink className="w-3 h-3" style={{ color: 'var(--color-muted)' }} />
            </div>
            <p className="text-xs font-mono mt-0.5" style={{ color: s.color }}>{s.handle}</p>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-muted)' }}>{s.desc}</p>
          </div>
        </a>
      ))}

      <p className="text-center text-[11px] pt-2" style={{ color: 'var(--color-muted)' }}>
        More platforms coming soon
      </p>
    </div>
  );
}
