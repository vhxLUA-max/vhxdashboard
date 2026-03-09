import { Activity, Database, LogIn, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  isConnected?: boolean;
  isLoggedIn?: boolean;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

export function Header({ isConnected = true, isLoggedIn = false, username, onLogin, onLogout }: HeaderProps) {
  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Execution Analytics</h1>
              <p className="text-xs text-gray-500">Real-time monitoring dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
              <span className="text-gray-400">{isConnected ? 'Live' : 'Offline'}</span>
            </div>

            <div className="h-6 w-px bg-gray-800" />

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">projectcounter</span>
            </div>

            <div className="h-6 w-px bg-gray-800" />

            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{username}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLogout}
                  title="Sign out"
                  className="text-gray-400 hover:text-rose-400 hover:bg-gray-800 w-8 h-8"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogin}
                className="text-gray-400 hover:text-white hover:bg-gray-800 gap-1.5 text-xs h-8"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
