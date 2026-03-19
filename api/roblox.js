export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { path, method = 'GET', body } = req.body;

  let domain;
  if (path.startsWith('/v1/games/icons') || path.startsWith('/v1/games/thumbnails')) {
    domain = 'https://thumbnails.roblox.com';
  } else if (path.startsWith('/universes/')) {
    domain = 'https://apis.roblox.com';
  } else {
    domain = 'https://games.roblox.com';
  }

  try {
    const robloxRes = await fetch(`${domain}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await robloxRes.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
