// Vercel serverless function — resolves IPs and writes lat/lng back to Supabase
// Called by the dashboard on load; resolves up to 50 unresolved IPs per call

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === 'GET') return res.json();
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Fetch unresolved IPv4s
    const rows = await supabase('GET',
      `unique_users?select=ip_address&ip_address=not.is.null&ip_address=neq.&lat=is.null&limit=50`
    );

    const ipv4s = [...new Set(
      (rows || [])
        .map(r => r.ip_address)
        .filter(ip => ip && !ip.includes(':'))
    )].slice(0, 100);

    if (!ipv4s.length) return res.status(200).json({ resolved: 0 });

    // Batch geo lookup via ip-api.com (no key needed, works server-side)
    const geoRes = await fetch('http://ip-api.com/batch?fields=status,query,lat,lon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ipv4s.map(q => ({ query: q }))),
    });

    const geoData = await geoRes.json();
    const resolved = geoData.filter(d => d.status === 'success');

    // Write lat/lng back to Supabase for each IP
    await Promise.all(resolved.map(d =>
      supabase('PATCH',
        `unique_users?ip_address=eq.${encodeURIComponent(d.query)}`,
        { lat: d.lat, lng: d.lon }
      )
    ));

    return res.status(200).json({ resolved: resolved.length, total: ipv4s.length });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
