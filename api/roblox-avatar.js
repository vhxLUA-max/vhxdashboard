export default async function handler(req, res) {
  const { userId } = req.query;
  if (!userId) return res.status(400).end();

  try {
    const r = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
    );
    const json = await r.json();
    const url = json?.data?.[0]?.imageUrl;
    if (!url) return res.status(404).end();

    // Fetch and pipe the image
    const img = await fetch(url);
    const buf = await img.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(buf));
  } catch {
    res.status(500).end();
  }
}
