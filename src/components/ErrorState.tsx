import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-900 rounded-xl border border-rose-500/30">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/10 mb-4">
        <AlertCircle className="w-8 h-8 text-rose-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Connection Error</h3>
      <p className="text-gray-400 text-sm text-center max-w-sm mb-2">
        Failed to connect to the data source.
      </p>
      <p className="text-rose-400 text-xs text-center max-w-sm mb-6 font-mono">
        {message}
      </p>
      <Button
        onClick={onRetry}
        variant="outline"
        className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry Connection
      </Button>
    </div>
  );
}
