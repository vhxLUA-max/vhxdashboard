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

  const { type, message, username, rating } = req.body ?? {};

  if (!message?.trim()) return res.status(400).json({ error: 'Message is required.' });
  if (message.length > 1000) return res.status(400).json({ error: 'Message too long.' });

  const COLORS = { bug: 0xef4444, suggestion: 0x6366f1, praise: 0x10b981, other: 0x6b7280 };
  const EMOJIS = { bug: '🐛', suggestion: '💡', praise: '⭐', other: '💬' };
  const t = type ?? 'other';

  const stars = rating ? '⭐'.repeat(Math.min(5, Math.max(1, rating))) : null;

  const embed = {
    username: 'vhxLUA Feedback',
    avatar_url: 'https://i.imgur.com/4M34hi2.png',
    embeds: [{
      title: `${EMOJIS[t] ?? '💬'} New ${t.charAt(0).toUpperCase() + t.slice(1)} Feedback`,
      description: message.trim(),
      color: COLORS[t] ?? COLORS.other,
      fields: [
        ...(username ? [{ name: '👤 From', value: `@${username}`, inline: true }] : [{ name: '👤 From', value: 'Guest', inline: true }]),
        { name: '📂 Type', value: t.charAt(0).toUpperCase() + t.slice(1), inline: true },
        ...(stars ? [{ name: '⭐ Rating', value: stars, inline: true }] : []),
      ],
      footer: { text: 'vhxLUA Hub Feedback' },
      timestamp: new Date().toISOString(),
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
