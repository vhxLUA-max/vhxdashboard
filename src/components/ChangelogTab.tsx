import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Megaphone, Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Entry = {
  id: string;
  date: string;
  game: string;
  title: string;
  body: string;
  type: 'update' | 'fix' | 'new';
};

const TYPE_STYLE: Record<Entry['type'], string> = {
  update: 'bg-indigo-500/10 text-indigo-400',
  fix:    'bg-rose-500/10 text-rose-400',
  new:    'bg-emerald-500/10 text-emerald-400',
};

const GAMES = ['Pixel Blade', 'Loot Hero', 'Flick', 'Survive Lava', 'General'];
const TYPES: Entry['type'][] = ['new', 'update', 'fix'];

const EMPTY: Omit<Entry, 'id'> = { date: new Date().toISOString().slice(0, 10), game: 'Pixel Blade', title: '', body: '', type: 'update' };

export function ChangelogTab() {
  const [entries, setEntries]     = useState<Entry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY });
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [editForm, setEditForm]   = useState<Omit<Entry, 'id'>>({ ...EMPTY });

  const load = useCallback(async () => {
    const { data } = await supabase.from('changelog').select('*').order('date', { ascending: false });
    setEntries(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user?.user_metadata?.username?.toLowerCase();
      setIsAdmin(u === 'vhxlua-max' || u === 'vhxlua');
    });
  }, [load]);

  const WEBHOOK = 'https://discord.com/api/webhooks/1475304437177385052/D6bMTTr-Y-h5DHkLAvqVEKZ7Yx7ioyqcnm5yIBzk0Dyk82VxhHe_sMlOISMVLjD52cHF';

  const sendWebhook = async (entry: typeof form) => {
    const color = entry.type === 'new' ? 0x10b981 : entry.type === 'update' ? 0x6366f1 : 0xf59e0b;
    const tag = entry.type === 'new' ? 'NEW' : entry.type === 'update' ? 'UPDATE' : 'FIX';
    const lines = [
      '```json',
      '{',
      `  "type"    : "${tag}",`,
      `  "game"    : "${entry.game}",`,
      `  "title"   : "${entry.title}",`,
      ...(entry.body ? [`  "details" : "${entry.body}",`] : []),
      `  "date"    : "${entry.date}",`,
      `  "script"  : "vhxdashboard.vercel.app"`,
      '}',
      '```',
    ].join('\n');
    await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'vhxLUA',
        avatar_url: 'https://vhxlua.vercel.app/favicon.ico',
        embeds: [{
          title: 'Script Update',
          description: lines,
          color,
          footer: { text: `vhxLUA Script Hub  •  ${entry.date}` },
        }],
        components: [{
          type: 1,
          components: [{
            type: 2,
            style: 5,
            label: 'Get Script',
            url: 'https://vhxdashboard.vercel.app/?tab=scripts',
          }],
        }],
      }),
    }).catch(() => {});
  };

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('changelog').insert({ ...form, title: form.title.trim(), body: form.body.trim() });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await sendWebhook(form);
    toast.success('Entry added and posted to Discord');
    setShowForm(false);
    setForm({ ...EMPTY });
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('changelog').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Entry deleted');
    load();
  };

  const startEdit = (e: Entry) => {
    setEditId(e.id);
    setEditForm({ date: e.date, game: e.game, title: e.title, body: e.body, type: e.type });
  };

  const handleSaveEdit = async () => {
    if (!editId || !editForm.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('changelog').update({ ...editForm, title: editForm.title.trim(), body: editForm.body.trim() }).eq('id', editId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Entry updated');
    setEditId(null);
    load();
  };

  return (
    <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Megaphone className="w-5 h-5 text-indigo-400" /> Changelog
        </h3>
        {isAdmin && (
          <Button onClick={() => setShowForm(v => !v)} size="sm" className="h-8 text-xs border-0" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Entry
          </Button>
        )}
      </div>

      {isAdmin && showForm && (
        <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] mb-1 block" style={{ color: 'var(--color-muted)' }}>Game</label>
              <select value={form.game} onChange={e => setForm(f => ({ ...f, game: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-xs border outline-none"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                {GAMES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] mb-1 block" style={{ color: 'var(--color-muted)' }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Entry['type'] }))}
                className="w-full rounded-lg px-3 py-2 text-xs border outline-none"
                style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] mb-1 block" style={{ color: 'var(--color-muted)' }}>Date</label>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <div>
            <label className="text-[11px] mb-1 block" style={{ color: 'var(--color-muted)' }}>Title</label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Auto-farm v2.1"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <div>
            <label className="text-[11px] mb-1 block" style={{ color: 'var(--color-muted)' }}>Description</label>
            <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={2} placeholder="What changed..."
              className="w-full rounded-lg px-3 py-2 text-xs border outline-none resize-none"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving} className="flex-1 border-0 text-xs h-8" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post Entry'}
            </Button>
            <Button onClick={() => { setShowForm(false); setForm({ ...EMPTY }); }} variant="outline" className="text-xs h-8" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-muted)' }} /></div>
      ) : entries.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: 'var(--color-muted)' }}>No entries yet</p>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div key={entry.id} className="p-3 rounded-lg border space-y-1" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
              {editId === entry.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select value={editForm.game} onChange={e => setEditForm(f => ({ ...f, game: e.target.value }))}
                      className="rounded-lg px-2 py-1.5 text-xs border outline-none"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                      {GAMES.map(g => <option key={g}>{g}</option>)}
                    </select>
                    <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value as Entry['type'] }))}
                      className="rounded-lg px-2 py-1.5 text-xs border outline-none"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                      {TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    className="text-xs h-8" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  <textarea value={editForm.body} onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))} rows={2}
                    className="w-full rounded-lg px-3 py-2 text-xs border outline-none resize-none"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }} />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border-0" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-fg)' }}>
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3" /> Save</>}
                    </button>
                    <button onClick={() => setEditId(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_STYLE[entry.type]}`}>{entry.type}</span>
                      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{entry.game}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{entry.date}</span>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(entry)} className="p-1 rounded transition-colors" style={{ color: 'var(--color-muted)' }}>
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(entry.id)} className="p-1 rounded transition-colors text-rose-400">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{entry.title}</p>
                  {entry.body && <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{entry.body}</p>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
// Fri Mar 20 10:36:07 UTC 2026
