import { Activity, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  isConnected?: boolean;
  username?: string | null;
  avatarUrl?: string | null;
  onLoginClick?: () => void;
  onLogout?: () => void;
  onAccountClick?: () => void;
}

export function Header({ isConnected = true, username, avatarUrl, onLoginClick, onLogout, onAccountClick }: HeaderProps) {
  return (
    <header className="border-b sticky top-0 z-40 backdrop-blur-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'color-mix(in srgb, var(--color-bg) 85%, transparent)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>vhx hub</h1>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Scripts · Analytics · Tools</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{isConnected ? 'Live' : 'Offline'}</span>
            </div>

            <div className="w-px h-5" style={{ backgroundColor: 'var(--color-border)' }} />

            {username ? (
              <div className="flex items-center gap-2">
                <button onClick={onAccountClick} className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all hover:opacity-80" style={{ backgroundColor: 'var(--color-surface2)' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={username} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                      {username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium hidden sm:inline" style={{ color: 'var(--color-text)' }}>@{username}</span>
                </button>
                <Button variant="ghost" size="icon" onClick={onLogout} title="Sign out"
                  className="w-8 h-8" style={{ color: 'var(--color-muted)' }}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={onLoginClick}
                className="gap-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>
                <LogIn className="w-3.5 h-3.5" />
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
