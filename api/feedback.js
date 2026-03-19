const WEBHOOK_URL = process.env.FEEDBACK_WEBHOOK_URL;
const RATE_LIMIT  = new Map();
const LIMIT_MS    = 60000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();

  if (!WEBHOOK_URL) return res.status(500).json({ error: 'Feedback not configured.' });

  const ip  = req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown';
  const now = Date.now();
  if (RATE_LIMIT.has(ip) && now - RATE_LIMIT.get(ip) < LIMIT_MS) {
    return res.status(429).json({ error: 'Please wait before sending another message.' });
  }
  RATE_LIMIT.set(ip, now);

  const { type, message, username, rating, avatarUrl, userId } = req.body ?? {};
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required.' });
  if (message.length > 1000) return res.status(400).json({ error: 'Message too long.' });

  // Save to Supabase
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (SUPABASE_URL && SUPABASE_KEY) {
    await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId ?? null,
        username: username ?? null,
        type: type ?? 'other',
        message: message.trim(),
        rating: rating ?? null,
      }),
    }).catch(() => {});
  }

  const t = type ?? 'other';

  const COLORS  = { bug: 0xef4444, suggestion: 0x6366f1, praise: 0xf59e0b, other: 0x6b7280 };
  const BADGES  = { bug: '🐛  BUG REPORT', suggestion: '💡  SUGGESTION', praise: '⭐  PRAISE', other: '💬  FEEDBACK' };
  const DIVIDER = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';

  const stars     = rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : null;
  const fromLine  = username ? `> **@${username}**` : '> *Anonymous*';
  const starLine  = stars ? `\n> ${stars}  \`${rating}/5\`` : '';

  const description = [
    `## ${BADGES[t] ?? BADGES.other}`,
    DIVIDER,
    `>>> ${message.trim()}`,
    '',
    DIVIDER,
    fromLine + starLine,
  ].join('\n');

  const embed = {
    username: 'vhxLUA Hub',
    avatar_url: 'https://i.imgur.com/4M34hi2.png',
    embeds: [{
      description,
      color: COLORS[t] ?? COLORS.other,
      ...(avatarUrl ? { thumbnail: { url: avatarUrl } } : {}),
      footer: {
        text: `vhxLUA Hub · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      },
    }],
  };

  try {
    const r = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed),
    });
    if (!r.ok) throw new Error(`Discord error ${r.status}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
