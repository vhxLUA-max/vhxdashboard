const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://aowuatmvtpbwpbzzvtua.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvd3VhdG12dHBid3Bienp2dHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDQ3MjEsImV4cCI6MjA4OTcyMDcyMX0.PUSrmtZm1eNccfcGlbHTRnuqI7gWExBePBhZQ0apZ4Q';

async function sbFetch(method, path, body) {
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

// Validate coords are on land (rough bounding box check)
// Rejects clearly wrong ocean placements
function isLikelyValid(lat, lng) {
  if (lat === 0 && lng === 0) return false;
  if (Math.abs(lat) > 85) return false;
  // Known ocean zones to reject
  const oceanZones = [
    { latMin: -60, latMax: 60, lngMin: -30, lngMax: -15 }, // Mid-Atlantic
    { latMin: -60, latMax: 0,  lngMin: -180, lngMax: -90 }, // South Pacific
    { latMin: 0,   latMax: 30,  lngMin: 60, lngMax: 80 },  // Indian Ocean
  ];
  for (const z of oceanZones) {
    if (lat >= z.latMin && lat <= z.latMax && lng >= z.lngMin && lng <= z.lngMax) return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Fetch rows missing geo data
    const rows = await sbFetch('GET',
      `unique_users?select=ip_address&ip_address=not.is.null&ip_address=neq.&lat=is.null&limit=100`
    );

    const ipv4s = [...new Set(
      (rows || []).map(r => r.ip_address).filter(ip => ip && !ip.includes(':'))
    )].slice(0, 100);

    if (!ipv4s.length) return res.status(200).json({ resolved: 0 });

    // ip-api batch — includes city, region, country
    const geoRes = await fetch('http://ip-api.com/batch?fields=status,query,lat,lon,country,countryCode,regionName,city', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ipv4s.map(q => ({ query: q }))),
    });

    const geoData = await geoRes.json();
    const valid = geoData.filter(d =>
      d.status === 'success' && isLikelyValid(d.lat, d.lon)
    );

    // Write back to Supabase with all geo fields
    await Promise.all(valid.map(d =>
      sbFetch('PATCH',
        `unique_users?ip_address=eq.${encodeURIComponent(d.query)}`,
        {
          lat:          d.lat,
          lng:          d.lon,
          country:      d.country      || null,
          country_code: d.countryCode  || null,
          region:       d.regionName   || null,
          city:         d.city         || null,
        }
      )
    ));

    return res.status(200).json({ resolved: valid.length, total: ipv4s.length });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
