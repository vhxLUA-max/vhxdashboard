import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const GAME_NAMES: Record<number, string> = {
  18172550962: 'Pixel Blade', 138013005633222: 'Loot Hero',
  119987266683883: 'Survive Lava', 136801880565837: 'Flick', 123974602339071: 'UNC Tester',
};

export function LiveToastFeed() {
  const seenRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip first batch on mount to avoid flooding on load
    const ch = supabase.channel('live-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'unique_users' }, (payload) => {
        if (!mountedRef.current) return;
        const row = payload.new as any;
        const key = `${row.roblox_user_id}-${row.place_id}`;
        if (seenRef.current.has(key)) return;
        seenRef.current.add(key);
        const game = GAME_NAMES[row.place_id] ?? row.game_name ?? 'Unknown';
        toast(`${row.username} executed ${game}`, { duration: 3000 });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'banned_users' }, (payload) => {
        if (!mountedRef.current) return;
        const row = payload.new as any;
        toast.error(`Banned: @${row.username}`, { duration: 4000 });
      })
      .subscribe();

    setTimeout(() => { mountedRef.current = true; }, 2000);
    return () => { supabase.removeChannel(ch); };
  }, []);

  return null;
}
