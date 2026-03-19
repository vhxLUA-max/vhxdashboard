import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

type Announcement = { id: string; message: string; type: 'info' | 'warning' | 'success' | 'error' };

const STYLES = {
  info:    { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)',  text: '#93c5fd', icon: Info          },
  warning: { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  text: '#fcd34d', icon: AlertTriangle  },
  success: { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  text: '#6ee7b7', icon: CheckCircle2   },
  error:   { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   text: '#fca5a5', icon: X              },
};

export function AnnouncementBanner() {
  const [items, setItems]       = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('vhx_dismissed_announcements') ?? '[]')); }
    catch { return new Set(); }
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('announcements').select('id,message,type').eq('active', true);
      setItems(data ?? []);
    };
    fetch();
    const ch = supabase.channel('announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const dismiss = (id: string) => {
    const next = new Set([...dismissed, id]);
    setDismissed(next);
    localStorage.setItem('vhx_dismissed_announcements', JSON.stringify([...next]));
  };

  const visible = items.filter(i => !dismissed.has(i.id));
  if (!visible.length) return null;

  return (
    <div className="space-y-1 px-4 sm:px-6 lg:px-8 pt-3 max-w-none">
      {visible.map(item => {
        const style = STYLES[item.type];
        const Icon  = style.icon;
        return (
          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm"
            style={{ backgroundColor: style.bg, borderColor: style.border }}>
            <Icon className="w-4 h-4 shrink-0" style={{ color: style.text }} />
            <p className="flex-1 text-xs" style={{ color: style.text }}>{item.message}</p>
            <button onClick={() => dismiss(item.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity" style={{ color: style.text }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
