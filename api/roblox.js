export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { path, method = 'GET', body, domain: customDomain } = req.body;
  if (!path) return res.status(400).json({ error: 'Missing path' });

  let domain;
  if (customDomain) {
    domain = customDomain;
  } else if (
    path.startsWith('/v1/users/avatar') ||
    path.startsWith('/v1/users/avatar-headshot') ||
    path.includes('avatar-headshot') ||
    path.startsWith('/v1/games/icons') ||
    path.startsWith('/v1/games/thumbnails')
  ) {
    domain = 'https://thumbnails.roblox.com';
  } else if (path.startsWith('/v1/presence') || path.includes('/presence')) {
    domain = 'https://presence.roblox.com';
  } else if (
    path.startsWith('/v1/users') ||
    path.startsWith('/v1/usernames')
  ) {
    domain = 'https://users.roblox.com';
  } else if (path.includes('/friends') || path.includes('/followers') || path.includes('/followings')) {
    domain = 'https://friends.roblox.com';
  } else if (path.startsWith('/universes/')) {
    domain = 'https://apis.roblox.com';
  } else if (path.startsWith('/v1/games') || path.startsWith('/v2/games')) {
    domain = 'https://games.roblox.com';
  } else {
    domain = 'https://apis.roblox.com';
  }

  try {
    const robloxRes = await fetch(`${domain}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await robloxRes.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
