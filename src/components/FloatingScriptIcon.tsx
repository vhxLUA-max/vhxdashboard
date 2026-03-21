import { useState, useRef, useEffect } from 'react';
import { Code, X, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const LOADER = 'loadstring(game:HttpGet("https://raw.githubusercontent.com/vhxLUA-max/vhxframeworks/refs/heads/main/mainloader"))()';
const UNC    = 'loadstring(game:HttpGet("https://raw.githubusercontent.com/vhxLUA-max/vhxframeworks/refs/heads/main/unctester"))()';

const SCRIPTS = [
  { name: 'Pixel Blade',  loader: LOADER, color: '#818cf8' },
  { name: 'Loot Hero',    loader: LOADER, color: '#34d399' },
  { name: 'Flick',        loader: LOADER, color: '#f87171' },
  { name: 'Survive Lava', loader: LOADER, color: '#fb923c' },
  { name: 'UNC Tester',   loader: UNC,    color: '#fbbf24' },
];

export function FloatingScriptIcon() {
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pos,    setPos]    = useState({ x: 16, y: -1 });
  const dragging  = useRef(false);
  const startPos  = useRef({ x: 0, y: 0 });
  const startEl   = useRef({ x: 0, y: 0 });
  const btnRef    = useRef<HTMLDivElement>(null);
  const hasMoved  = useRef(false);

  // Init Y position to bottom of screen
  useEffect(() => {
    setPos({ x: 16, y: window.innerHeight - 80 });
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    hasMoved.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    startEl.current  = { x: pos.x, y: pos.y };
    btnRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true;
    const nx = Math.max(0, Math.min(window.innerWidth - 56, startEl.current.x + dx));
    const ny = Math.max(0, Math.min(window.innerHeight - 56, startEl.current.y + dy));
    setPos({ x: nx, y: ny });
  };

  const onPointerUp = () => {
    dragging.current = false;
    if (!hasMoved.current) setOpen(o => !o);
  };

  const copy = (script: typeof SCRIPTS[number]) => {
    navigator.clipboard.writeText(script.loader);
    setCopied(script.name);
    toast.success(`${script.name} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      {/* Floating button */}
      <div
        ref={btnRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          zIndex: 9999,
          touchAction: 'none',
          cursor: dragging.current ? 'grabbing' : 'grab',
        }}>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-transform active:scale-95"
          style={{
            background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
            boxShadow: '0 4px 24px rgba(99,102,241,0.5)',
          }}>
          {open
            ? <X className="w-6 h-6 text-white" />
            : <Code className="w-6 h-6 text-white" />
          }
        </div>
      </div>

      {/* Script menu */}
      {open && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(pos.x, window.innerWidth - 240),
            top: pos.y - (SCRIPTS.length * 56 + 16),
            zIndex: 9998,
            width: 232,
          }}>
          <div className="rounded-2xl border shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="px-4 py-3 border-b flex items-center gap-2"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
              <Code className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>vhxLUA Scripts</span>
            </div>
            {SCRIPTS.map(s => (
              <div key={s.name} className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-white/5 transition-colors"
                style={{ borderColor: 'var(--color-border)' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="flex-1 text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{s.name}</span>
                <button onClick={() => copy(s)}
                  className="p-1.5 rounded-lg transition-colors shrink-0"
                  style={{ color: copied === s.name ? '#34d399' : 'var(--color-muted)' }}
                  title="Copy loader">
                  {copied === s.name
                    ? <Check className="w-3.5 h-3.5" />
                    : <Copy className="w-3.5 h-3.5" />
                  }
                </button>
                <a href={`https://www.roblox.com/discover`} target="_blank" rel="noreferrer"
                  className="p-1.5 rounded-lg transition-colors shrink-0"
                  style={{ color: 'var(--color-muted)' }}
                  title="Open Roblox">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
