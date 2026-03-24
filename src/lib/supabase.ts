import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const cookieStorage = {
  getItem: (k: string): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith(`${k}=`));
    if (!match) return null;
    try { return decodeURIComponent(match.split('=').slice(1).join('=')); } catch { return null; }
  },
  setItem: (k: string, v: string): void => {
    if (typeof document === 'undefined') return;
    const exp = new Date(Date.now() + 7 * 864e5).toUTCString();
    document.cookie = `${k}=${encodeURIComponent(v)}; path=/; expires=${exp}; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
  },
  removeItem: (k: string): void => {
    if (typeof document === 'undefined') return;
    document.cookie = `${k}=; path=/; Max-Age=0`;
  },
};

export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key',
  {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      storageKey:         'vhx-auth',
      storage:            cookieStorage,
    },
    realtime: { params: { eventsPerSecond: 20 } },
  }
);

export const isConfigured = () => !!url && !!key && !url.includes('placeholder');
