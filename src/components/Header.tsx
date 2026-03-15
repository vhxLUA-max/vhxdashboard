import { Activity, Database, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  isConnected?: boolean;
}

export function Header({ isConnected = true }: HeaderProps) {
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
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Execution Analytics</h1>
              <p className="text-xs text-gray-500">Real-time monitoring dashboard</p>
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
          </div>
        </div>
      </div>
    </header>
  );
}
