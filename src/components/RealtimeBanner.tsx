import type { GameExecution } from '@/types';
import { RefreshCw, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface RealtimeBannerProps {
  executions: Execution[];
  onRefresh: () => void;
  onDismiss: () => void;
}

export function RealtimeBanner({ executions, onRefresh, onDismiss }: RealtimeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    if (executions.length > 0) {
      setDisplayCount(executions.length);
      setIsVisible(true);
    }
  }, [executions.length]);

  const handleRefresh = () => {
    onRefresh();
    setIsVisible(false);
    setDisplayCount(0);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible || displayCount === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg shadow-lg backdrop-blur-sm">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <span className="text-emerald-400 font-medium">
          {displayCount} new execution{displayCount > 1 ? 's' : ''}
        </span>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium rounded-md transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-emerald-400/60 hover:text-emerald-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
