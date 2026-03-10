import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LockedTabProps {
  label: string;
  onLogin: () => void;
}

export function LockedTab({ label, onLogin }: LockedTabProps) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 flex flex-col items-center justify-center text-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
        <Lock className="w-5 h-5 text-gray-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-300">{label} is restricted</p>
        <p className="text-xs text-gray-600 mt-1">Sign in or register to access this feature</p>
      </div>
      <Button onClick={onLogin} className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 text-xs h-8 px-4">
        Sign In
      </Button>
    </div>
  );
}
