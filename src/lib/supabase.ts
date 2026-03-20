import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key',
  {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 20 } },
  }
);

export const isConfigured = () => !!url && !!key && !url.includes('placeholder');
