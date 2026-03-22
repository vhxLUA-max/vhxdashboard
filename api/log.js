const SCRIPT_ID = process.env.SHEETS_WEBHOOK_ID;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!SCRIPT_ID) return res.status(500).json({ error: 'Not configured' });

  const sheetsUrl = `https://script.google.com/macros/s/${SCRIPT_ID}/exec`;

  if (req.method === 'GET') {
    try {
      const { action, uid } = req.query;
      const url = `${sheetsUrl}?action=${action}&uid=${uid}`;
      const response = await fetch(url, { redirect: 'follow' });
      const data = await response.json().catch(() => ({}));
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = JSON.stringify(req.body);
      const init = await fetch(sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        redirect: 'manual',
      });
      const location = init.headers.get('location');
      const targetUrl = location || sheetsUrl;
      const final = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        redirect: 'follow',
      });
      const data = await final.json().catch(() => ({}));
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }

  return res.status(405).end();
}
