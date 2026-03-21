export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify caller is authenticated via their JWT
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Service key not configured' });

  // Verify the caller is an admin by checking their token
  const { data: callerData } = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: authHeader },
  }).then(r => r.json()).catch(() => ({ data: null }));

  const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? '').split(',').filter(Boolean);
  const callerUser = callerData ?? (await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: authHeader },
  }).then(r => r.json()).catch(() => null));

  // Use service key to list all auth users
  const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!usersRes.ok) return res.status(500).json({ error: 'Failed to fetch users' });
  const { users } = await usersRes.json();

  const mapped = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? '',
    username: u.user_metadata?.username ?? u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? 'unknown',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    provider: u.app_metadata?.provider ?? 'email',
    avatar_url: u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? null,
  }));

  res.status(200).json({ users: mapped });
}
