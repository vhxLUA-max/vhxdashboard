const SCRIPT_ID = process.env.SHEETS_WEBHOOK_ID;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  if (!SCRIPT_ID) return res.status(500).json({ error: 'Not configured' });

  const action = req.query.action || '';
  const sheetsUrl = `https://script.google.com/macros/s/${SCRIPT_ID}/exec?action=${action}`;

  try {
    const response = await fetch(sheetsUrl, { redirect: 'follow' });
    const data = await response.json();
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
