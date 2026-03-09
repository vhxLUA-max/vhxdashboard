import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Execution } from '@/types';

// DB 1: Data Fetcher (Read-only) - Contains executions table
const fetcherUrl = import.meta.env.REACT_APP_SUPABASE_URL_FETCHER || '';
const fetcherKey = import.meta.env.REACT_APP_SUPABASE_ANON_KEY_FETCHER || '';

// DB 2: Dashboard DB (Read/write) - For preferences and user config
const dashboardUrl = import.meta.env.REACT_APP_SUPABASE_URL_DASHBOARD || '';
const dashboardKey = import.meta.env.REACT_APP_SUPABASE_ANON_KEY_DASHBOARD || '';

// Validate environment variables
if (!fetcherUrl || !fetcherKey) {
  console.warn('Missing DB 1 (Data Fetcher) Supabase credentials. Using mock data.');
}

if (!dashboardUrl || !dashboardKey) {
  console.warn('Missing DB 2 (Dashboard DB) Supabase credentials. Dashboard preferences will not be saved.');
}

// Create separate Supabase client instances
export const supabaseFetcher: SupabaseClient = createClient(
  fetcherUrl || 'https://placeholder.fetcher.supabase.co',
  fetcherKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export const supabaseDashboard: SupabaseClient = createClient(
  dashboardUrl || 'https://placeholder.dashboard.supabase.co',
  dashboardKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Helper to check if DB 1 is configured
export const isFetcherConfigured = (): boolean => {
  return !!fetcherUrl && !!fetcherKey && 
         !fetcherUrl.includes('placeholder') && 
         !fetcherKey.includes('placeholder');
};

// Helper to check if DB 2 is configured
export const isDashboardConfigured = (): boolean => {
  return !!dashboardUrl && !!dashboardKey && 
         !dashboardUrl.includes('placeholder') && 
         !dashboardKey.includes('placeholder');
};

// Type for the executions table
export type ExecutionsTable = Execution;
