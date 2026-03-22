const SCRIPT_ID = process.env.SHEETS_WEBHOOK_ID;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!SCRIPT_ID) return res.status(500).json({ error: 'Not configured' });

  const sheetsUrl = `https://script.google.com/macros/s/${SCRIPT_ID}/exec`;

  // GET — HWID lookup
  if (req.method === 'GET') {
    try {
      const { action, uid } = req.query;
      const response = await fetch(`${sheetsUrl}?action=${action}&uid=${encodeURIComponent(uid)}`, {
        redirect: 'follow',
      });
      const data = await response.json().catch(() => ({}));
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }

  // POST — log execution
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // Apps Script POST always 302 redirects — the redirect drops the body.
      // Solution: encode data as query params on the final URL so it arrives intact.
      const params = new URLSearchParams({
        roblox_user_id: String(body.roblox_user_id || ''),
        username:       String(body.username       || ''),
        game_name:      String(body.game_name      || ''),
        fingerprint:    String(body.fingerprint    || ''),
        hwid:           String(body.hwid           || ''),
        ip_address:     String(body.ip_address     || ''),
      });

      // Step 1: hit the script URL to get the redirect location
      const init = await fetch(sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        redirect: 'manual',
      });

      const location = init.headers.get('location');

      // Step 2: POST to the redirect URL with data
      const targetUrl = location || sheetsUrl;
      const final = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        redirect: 'follow',
      });

      const text = await final.text();
      const data = JSON.parse(text);
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }

  return res.status(405).end();
}
