import { Inbox, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onAction?: () => void;
}

export function EmptyState({ onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-900 rounded-xl border border-gray-800">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
        <Inbox className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">No executions found</h3>
      <p className="text-gray-400 text-sm text-center max-w-sm mb-6">
        There are no executions in the selected date range. Try adjusting your filters or wait for new executions to arrive.
      </p>
      {onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Test Execution
        </Button>
      )}
    </div>
  );
}
