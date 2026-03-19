import { useState, useEffect } from 'react';
import { MessageSquare, Bug, Lightbulb, Star, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

type FeedbackType = 'bug' | 'suggestion' | 'praise' | 'other';

const TYPES: { id: FeedbackType; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'bug',        label: 'Bug Report',  icon: Bug,          color: '#ef4444' },
  { id: 'suggestion', label: 'Suggestion',  icon: Lightbulb,    color: '#6366f1' },
  { id: 'praise',     label: 'Praise',      icon: Star,         color: '#10b981' },
  { id: 'other',      label: 'Other',       icon: MessageSquare,color: '#6b7280' },
];

export function FeedbackTab() {
  const [type, setType]       = useState<FeedbackType>('suggestion');
  const [message, setMessage] = useState('');
  const [rating, setRating]   = useState(0);
  const [hover, setHover]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [username, setUsername]   = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsername(session?.user?.user_metadata?.username ?? null);
      setAvatarUrl(session?.user?.user_metadata?.avatar_url ?? null);
    });
  }, []);

  const handleSubmit = async () => {
    if (!message.trim()) { toast.error('Please write a message'); return; }
    if (message.length > 1000) { toast.error('Message too long (max 1000 chars)'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: message.trim(), username, rating: rating || null, avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send');
      setSent(true);
      toast.success('Feedback sent! Thanks 🙏');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send feedback');
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <CheckCircle2 className="w-14 h-14 text-emerald-400" />
      <div className="text-center">
        <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Thanks for your feedback!</p>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>It's been sent to the dev.</p>
      </div>
      <button onClick={() => { setSent(false); setMessage(''); setRating(0); }}
        className="text-xs underline" style={{ color: 'var(--color-accent)' }}>
        Send another
      </button>
    </div>
  );

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Feedback</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>Report a bug, suggest a feature, or just say hi.</p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TYPES.map(t => {
          const active = type === t.id;
          return (
            <button key={t.id} onClick={() => setType(t.id)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all"
              style={{
                borderColor: active ? t.color : 'var(--color-border)',
                backgroundColor: active ? `${t.color}12` : 'var(--color-surface)',
                boxShadow: active ? `0 0 0 1px ${t.color}30` : 'none',
              }}>
              <t.icon className="w-5 h-5" style={{ color: active ? t.color : 'var(--color-muted)' }} />
              <span className="text-[11px] font-medium" style={{ color: active ? t.color : 'var(--color-muted)' }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Star rating (only for praise) */}
      {type === 'praise' && (
        <div>
          <label className="text-xs mb-2 block" style={{ color: 'var(--color-muted)' }}>Rating</label>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="transition-transform hover:scale-110">
                <Star className="w-7 h-7" fill={(hover || rating) >= n ? '#f59e0b' : 'none'}
                  style={{ color: (hover || rating) >= n ? '#f59e0b' : 'var(--color-border)' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message */}
      <div>
        <label className="text-xs mb-2 block" style={{ color: 'var(--color-muted)' }}>
          Message <span style={{ opacity: 0.5 }}>({message.length}/1000)</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          placeholder={
            type === 'bug'        ? "Describe the bug — what happened, what game, what executor..." :
            type === 'suggestion' ? "What feature would you like to see?" :
            type === 'praise'     ? "What do you love about vhxLUA?" :
            "Anything on your mind..."
          }
          className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none border transition-colors"
          style={{
            backgroundColor: 'var(--color-surface2)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          maxLength={1000}
        />
      </div>

      {/* From */}
      <div className="flex items-center gap-2 p-3 rounded-lg border text-xs" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-muted)' }}>
        <span>Sending as:</span>
        <span className="font-medium" style={{ color: 'var(--color-text)' }}>{username ? `@${username}` : 'Guest (not logged in)'}</span>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading || !message.trim()}
        className="w-full border-0 font-semibold"
        style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}
      >
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Send Feedback</>}
      </Button>
    </div>
  );
}
