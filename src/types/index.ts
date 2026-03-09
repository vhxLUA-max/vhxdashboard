export interface Execution {
  id: string;
  created_at: string;
  username: string;
  user_id: string;
  status: 'success' | 'failed';
  duration_ms: number;
  metadata: Record<string, any>;
}

export interface DashboardData {
  totalExecutions: number;
  uniqueUsers: number;
  successRate: number;
  avgDuration: number;
  successful: number;
  failed: number;
  recentExecutions: Execution[];
}

export type DateRange = '24h' | '7d' | '30d' | '90d';

export interface UseSupabaseDashboardReturn {
  data: DashboardData | null;
  loading: boolean;
  error: Error | null;
  realtimeExecutions: Execution[];
  refresh: () => void;
}
