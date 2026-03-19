import { Activity, Database, Sun, Moon, Monitor, LogIn, LogOut, KeyRound } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  isConnected?: boolean;
  username?: string | null;
  onLoginClick?: () => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
}

export function Header({ isConnected = true, username, onLoginClick, onLogout, onChangePassword }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const nextTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="border-b border-gray-800 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">vhxLUA Hub</h1>
              <p className="text-xs text-gray-500">Scripts · Analytics · Tools</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
              <span className="text-gray-400">{isConnected ? 'Live' : 'Offline'}</span>
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">projectcounter</span>
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />

            <Button
              variant="ghost"
              size="icon"
              onClick={nextTheme}
              title={`Theme: ${theme}`}
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 w-8 h-8"
            >
              <ThemeIcon className="w-4 h-4" />
            </Button>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />

            {username ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 hidden sm:inline">@{username}</span>
                <Button variant="ghost" size="icon" onClick={onChangePassword} title="Change password"
                  className="text-gray-500 hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 w-8 h-8">
                  <KeyRound className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onLogout} title="Sign out"
                  className="text-gray-500 hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-gray-800 w-8 h-8">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoginClick}
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 gap-1.5 text-xs"
              >
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
