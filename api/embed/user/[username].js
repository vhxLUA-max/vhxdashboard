const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function fetchUserData(username) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  // Get user auth metadata by username
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?username=ilike.${encodeURIComponent(username)}&select=username,avatar_url,bio,socials&limit=1`,
    { headers }
  );

  // Also pull execution stats
  const statsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/unique_users?username=ilike.${encodeURIComponent(username)}&select=execution_count,game_name`,
    { headers }
  );

  let profile = null;
  let stats = [];

  if (profileRes.ok) {
    const data = await profileRes.json();
    profile = data?.[0] ?? null;
  }

  if (statsRes.ok) {
    stats = await statsRes.json() ?? [];
  }

  const totalExecs = stats.reduce((s, r) => s + (r.execution_count ?? 0), 0);

  return {
    username: profile?.username ?? username,
    avatarUrl: profile?.avatar_url ?? null,
    totalExecs,
    scriptCount: new Set(stats.map(r => r.game_name).filter(Boolean)).size,
  };
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSVG({ username, avatarUrl, totalExecs, scriptCount, theme }) {
  const dark = theme !== 'light';

  const bg        = dark ? '#0d0d0f' : '#ffffff';
  const cardBg    = dark ? '#111115' : '#f8fafc';
  const border    = dark ? '#1e1e28' : '#e2e8f0';
  const textPrim  = dark ? '#f1f5f9' : '#0f172a';
  const textSec   = dark ? '#64748b' : '#94a3b8';
  const accentBar = 'url(#grad)';
  const brandClr  = dark ? '#475569' : '#94a3b8';

  const statsText = [
    scriptCount > 0 ? `${scriptCount} script${scriptCount !== 1 ? 's' : ''}` : null,
    totalExecs > 0  ? `${totalExecs.toLocaleString()} executions` : null,
  ].filter(Boolean).join(' · ') || 'vhxLUA Hub member';

  // Avatar: either base64 embedded image or initials fallback
  const initials = escapeXml((username ?? 'U')[0].toUpperCase());
  const avatarSection = avatarUrl
    ? `<image href="${escapeXml(avatarUrl)}" x="20" y="24" width="52" height="52" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="46" cy="50" r="26" fill="#3b82f6"/><text x="46" y="57" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="700" fill="white" text-anchor="middle">${initials}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="360" height="132" viewBox="0 0 360 132" role="img" aria-label="${escapeXml(username)} on vhxLUA Hub">
  <title>${escapeXml(username)} on vhxLUA Hub</title>
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <clipPath id="avatarClip">
      <circle cx="46" cy="50" r="26"/>
    </clipPath>
    <clipPath id="cardClip">
      <rect width="360" height="132" rx="12"/>
    </clipPath>
  </defs>

  <!-- Card background -->
  <rect width="360" height="132" rx="12" fill="${bg}" stroke="${border}" stroke-width="1"/>

  <!-- Inner card -->
  <rect x="1" y="1" width="358" height="130" rx="11" fill="${cardBg}" clip-path="url(#cardClip)"/>

  <!-- Accent bar top -->
  <rect x="0" y="0" width="360" height="3" rx="2" fill="${accentBar}"/>

  <!-- Avatar -->
  ${avatarSection}

  <!-- Username -->
  <text x="90" y="46" font-family="Inter,Arial,sans-serif" font-size="17" font-weight="700" fill="${textPrim}">${escapeXml(username)}</text>

  <!-- Verified badge -->
  <g transform="translate(${90 + Math.min(username.length * 10, 180) + 6}, 32)">
    <circle cx="9" cy="9" r="9" fill="#3b82f6"/>
    <polyline points="5.5,9 8,11.5 13,6.5" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- Stats -->
  <text x="90" y="66" font-family="Inter,Arial,sans-serif" font-size="12" fill="${textSec}">${escapeXml(statsText)}</text>

  <!-- Divider -->
  <line x1="20" y1="92" x2="340" y2="92" stroke="${border}" stroke-width="1"/>

  <!-- Brand -->
  <rect x="20" y="104" width="16" height="16" rx="4" fill="url(#grad)"/>
  <text x="28" y="116" font-family="Inter,Arial,sans-serif" font-size="9" font-weight="900" fill="white" text-anchor="middle">V</text>
  <text x="42" y="116" font-family="Inter,Arial,sans-serif" font-size="10" font-weight="600" fill="${brandClr}" letter-spacing="1">VHXLUA HUB</text>

  <!-- View profile -->
  <text x="340" y="116" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="500" fill="#3b82f6" text-anchor="end">View profile →</text>
</svg>`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');

  const { username } = req.query;
  const theme = req.query.theme === 'light' ? 'light' : 'dark';

  if (!username) {
    return res.status(400).send('Missing username');
  }

  let data = { username, avatarUrl: null, totalExecs: 0, scriptCount: 0 };

  try {
    const fetched = await fetchUserData(username);
    if (fetched) data = fetched;
  } catch (_) {}

  const svg = buildSVG({ ...data, theme });

  res.setHeader('Content-Type', 'image/svg+xml');
  res.status(200).send(svg);
}
