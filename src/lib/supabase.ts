import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'vhx-auth',
      lock: async (name, _acquireTimeout, fn) => {
        // Use Web Locks API if available, fallback to direct execution
        if (typeof navigator !== 'undefined' && navigator.locks) {
          return navigator.locks.request(name, { ifAvailable: true }, async (lock) => {
            if (!lock) return fn();
            return fn();
          });
        }
        return fn();
      },
    },
    realtime: { params: { eventsPerSecond: 20 } },
  }
);

export const isConfigured = () => !!url && !!key && !url.includes('placeholder');
