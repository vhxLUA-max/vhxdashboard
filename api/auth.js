const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const COOKIE_NAME  = 'vhx-session';
const IS_PROD      = process.env.NODE_ENV === 'production';

const COOKIE_OPTS = [
  'HttpOnly',
  'Path=/',
  'SameSite=Strict',
  IS_PROD ? 'Secure' : '',
  'Max-Age=604800',
].filter(Boolean).join('; ');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const cookie = parseCookie(req.headers.cookie, COOKIE_NAME);
    if (!cookie) return res.status(401).json({ user: null });
    try {
      const { access_token, refresh_token } = JSON.parse(cookie);
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${access_token}` },
      });
      if (!r.ok) {
        const refreshed = await refreshSession(refresh_token);
        if (!refreshed) {
          res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
          return res.status(401).json({ user: null });
        }
        setSessionCookie(res, refreshed);
        return res.status(200).json({ user: refreshed.user });
      }
      return res.status(200).json({ user: await r.json() });
    } catch { return res.status(401).json({ user: null }); }
  }

  if (req.method === 'POST') {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(401).json({ error: data.error_description || 'Invalid credentials' });
    setSessionCookie(res, data);
    return res.status(200).json({ user: data.user });
  }

  if (req.method === 'DELETE') {
    const cookie = parseCookie(req.headers.cookie, COOKIE_NAME);
    if (cookie) {
      try {
        const { access_token } = JSON.parse(cookie);
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${access_token}` },
        });
      } catch {}
    }
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

function setSessionCookie(res, session) {
  const value = JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token });
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(value)}; ${COOKIE_OPTS}`);
}

async function refreshSession(refresh_token) {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  if (!match) return null;
  try { return decodeURIComponent(match.split('=').slice(1).join('=')); } catch { return null; }
}
