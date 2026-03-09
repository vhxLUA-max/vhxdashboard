import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseFetcher, isFetcherConfigured } from '@/lib/supabase';
import type { Execution, DashboardData, DateRange, UseSupabaseDashboardReturn } from '@/types';

// Generate mock data for demo purposes when Supabase is not configured
const generateMockData = (dateRange: DateRange): DashboardData => {
  const now = new Date();
  const rangeMap: Record<DateRange, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  };
  
  const rangeMs = rangeMap[dateRange];
  const count = Math.floor(Math.random() * 500) + 100;
  
  const mockExecutions: Execution[] = Array.from({ length: count }, (_, i) => {
    const createdAt = new Date(now.getTime() - Math.random() * rangeMs);
    const isSuccess = Math.random() > 0.15;
    const execution: Execution = {
      id: `exec-${i}-${Date.now()}`,
      created_at: createdAt.toISOString(),
      username: `user${Math.floor(Math.random() * 50) + 1}`,
      user_id: `user-${Math.floor(Math.random() * 50) + 1}`,
      status: isSuccess ? 'success' : 'failed',
      duration_ms: Math.floor(Math.random() * 5000) + 100,
      metadata: { source: 'mock', region: 'us-east-1' },
    };
    return execution;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const successful = mockExecutions.filter(e => e.status === 'success').length;
  const failed = mockExecutions.filter(e => e.status === 'failed').length;
  const uniqueUsers = new Set(mockExecutions.map(e => e.user_id)).size;
  const totalDuration = mockExecutions.reduce((sum, e) => sum + e.duration_ms, 0);

  return {
    totalExecutions: count,
    uniqueUsers,
    successRate: (successful / count) * 100,
    avgDuration: totalDuration / count,
    successful,
    failed,
    recentExecutions: mockExecutions.slice(0, 10),
  };
};

export function useSupabaseDashboard(dateRange: DateRange): UseSupabaseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [realtimeExecutions, setRealtimeExecutions] = useState<Execution[]>([]);
  const realtimeQueueRef = useRef<Execution[]>([]);
  const channelRef = useRef<ReturnType<typeof supabaseFetcher.channel> | null>(null);

  const getStartDate = useCallback((): string => {
    const now = new Date();
    const rangeMap: Record<DateRange, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    const startDate = new Date(now.getTime() - rangeMap[dateRange]);
    return startDate.toISOString();
  }, [dateRange]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if Supabase is configured
      if (!isFetcherConfigured()) {
        // Use mock data for demo
        const mockData = generateMockData(dateRange);
        setData(mockData);
        setLoading(false);
        return;
      }

      const startDate = getStartDate();

      // Fetch executions from DB 1
      const { data: executions, error: fetchError } = await supabaseFetcher
        .from('executions')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const executionsList: Execution[] = (executions || []).map((e: any) => ({
        ...e,
        status: e.status as 'success' | 'failed',
      }));

      // Calculate metrics
      const totalExecutions = executionsList.length;
      const successful = executionsList.filter(e => e.status === 'success').length;
      const failed = executionsList.filter(e => e.status === 'failed').length;
      const uniqueUsers = new Set(executionsList.map(e => e.user_id)).size;
      const totalDuration = executionsList.reduce((sum, e) => sum + (e.duration_ms || 0), 0);
      const avgDuration = totalExecutions > 0 ? totalDuration / totalExecutions : 0;
      const successRate = totalExecutions > 0 ? (successful / totalExecutions) * 100 : 0;

      setData({
        totalExecutions,
        uniqueUsers,
        successRate,
        avgDuration,
        successful,
        failed,
        recentExecutions: executionsList.slice(0, 10),
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [dateRange, getStartDate]);

  // Setup realtime subscription
  useEffect(() => {
    if (!isFetcherConfigured()) return;

    // Clean up existing channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    // Create new realtime channel
    const channel = supabaseFetcher
      .channel('executions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'executions',
        },
        (payload) => {
          const newExecution = payload.new as Execution;
          realtimeQueueRef.current = [newExecution, ...realtimeQueueRef.current].slice(0, 50);
          setRealtimeExecutions([...realtimeQueueRef.current]);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Initial fetch and refresh on date range change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Clear realtime executions when user refreshes
  useEffect(() => {
    if (!loading && data) {
      realtimeQueueRef.current = [];
      setRealtimeExecutions([]);
    }
  }, [data, loading]);

  return {
    data,
    loading,
    error,
    realtimeExecutions,
    refresh,
  };
}
