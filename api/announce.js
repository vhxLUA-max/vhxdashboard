const WEBHOOK_URL = 'https://discord.com/api/webhooks/1475666913307918469/gpdq8YFcBTBekkaerhxfSOJy-qjhAKt5-DFyNecmcTNl6u0pc--uuBY7-iWOqhacCgox';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { embed } = req.body ?? {};
  if (!embed) return res.status(400).json({ error: 'No embed provided' });

  try {
    const r = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'vhxLUA', embeds: [embed] }),
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
