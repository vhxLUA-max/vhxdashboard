export function PrivacyPolicy() {
  const sections = [
    {
      title: '1. Information We Collect',
      content: [
        'Roblox username and user ID — collected when you execute a vhxLUA script in-game.',
        'Execution data — which games you ran scripts in and when, used for analytics.',
        'Device fingerprint and HWID — collected to enforce bans and prevent abuse.',
        'Email address — only if you voluntarily add one to your account settings.',
        'IP address metadata — used for VPN/proxy detection to enforce fair use.',
        'OAuth profile data (Google/Discord) — username, email, and profile picture if you sign in via Google or Discord.',
      ],
    },
    {
      title: '2. How We Use Your Information',
      content: [
        'To identify your account across sessions and display your stats on this dashboard.',
        'To enforce bans and security policies (HWID bans, fingerprint bans, VPN detection).',
        'To generate anonymous aggregate analytics (total executions, active users).',
        'To send verification emails if you choose to add an email to your account.',
        'We do not sell, rent, or share your personal data with third parties.',
      ],
    },
    {
      title: '3. Data Storage',
      content: [
        'All data is stored on Supabase (supabase.com), hosted on AWS infrastructure.',
        'Data is retained for as long as your account is active.',
        'You may request deletion of your data at any time by contacting us on Discord.',
        'Execution logs older than 90 days may be purged automatically.',
      ],
    },
    {
      title: '4. Cookies & Local Storage',
      content: [
        'We use localStorage to remember your active tab, theme preference, and cached token.',
        'No advertising or tracking cookies are used.',
        'OAuth sessions are managed via Supabase Auth using secure HTTP-only cookies.',
      ],
    },
    {
      title: '5. Third-Party Services',
      content: [
        'Supabase — database and authentication provider.',
        'Discord OAuth — optional login method. Governed by Discord\'s Privacy Policy.',
        'Google OAuth — optional login method. Governed by Google\'s Privacy Policy.',
        'Vercel — hosts this dashboard. Governed by Vercel\'s Privacy Policy.',
      ],
    },
    {
      title: '6. Security',
      content: [
        'Row Level Security (RLS) is enabled on all database tables.',
        'Sensitive tables (user tokens, audit logs) are not accessible via public API.',
        'Passwords are hashed by Supabase Auth — we never store plaintext passwords.',
        'HWID and fingerprint data is used solely for ban enforcement.',
      ],
    },
    {
      title: '7. Your Rights',
      content: [
        'You can request to view, export, or delete your data at any time.',
        'You can remove your linked Roblox account from your profile settings.',
        'You can revoke Google/Discord OAuth access from your Google or Discord account settings.',
        'Contact us via Discord (discord.gg/usEnYvqnaJ) for any data requests.',
      ],
    },
    {
      title: '8. Children\'s Privacy',
      content: [
        'vhx hub is intended for use alongside Roblox, which requires users to be at least 13 years old.',
        'We do not knowingly collect data from children under 13.',
        'If you believe a child under 13 has submitted data, contact us immediately.',
      ],
    },
    {
      title: '9. Changes to This Policy',
      content: [
        'We may update this policy as the service evolves.',
        'Significant changes will be announced via the Announcements tab and Discord server.',
        'Continued use of the service after changes constitutes acceptance.',
      ],
    },
    {
      title: '10. Contact',
      content: [
        'Discord: discord.gg/usEnYvqnaJ',
        'Rscripts: rscripts.net/@vhxLUA_',
        'For data deletion or privacy concerns, message us directly on Discord.',
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 border" style={{ borderColor: 'var(--color-border)', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))' }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>V</div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Privacy Policy</h1>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>vhx hub — Last updated March 2026</p>
          </div>
        </div>
        <p className="text-sm mt-3" style={{ color: 'var(--color-muted)' }}>
          This policy explains what data vhx hub collects when you use our scripts or dashboard, how we use it, and your rights regarding that data.
        </p>
      </div>

      {/* Sections */}
      {sections.map(s => (
        <div key={s.title} className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text)' }}>{s.title}</h2>
          <ul className="space-y-2">
            {s.content.map((line, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-accent)' }} />
                {line}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="text-center text-[11px] pb-4" style={{ color: 'var(--color-muted)' }}>
        © 2026 vhx hub · All rights reserved
      </p>
    </div>
  );
}
