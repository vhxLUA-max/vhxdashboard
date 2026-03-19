export interface GameExecution {
  place_id: number;
  count: number;
  last_executed_at: string;
  game_name: string | null;
}

export interface UniqueUser {
  user_id: number;
  roblox_user_id: number;
  place_id: number;
  username: string;
  first_seen: string;
  last_seen: string;
  execution_count: number;
}

export interface DashboardData {
  totalExecutions: number;
  uniqueUsers: number;
  activeGames: number;
  lastExecutedAt: string | null;
  recentExecutions: GameExecution[];
  allExecutions: GameExecution[];
  recentUsers: UniqueUser[];
}

export type DateRange = '24h' | '7d' | '30d' | '90d';

export interface UseSupabaseDashboardReturn {
  data: DashboardData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}
