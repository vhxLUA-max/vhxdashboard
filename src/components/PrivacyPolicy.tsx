export function PrivacyPolicy() {
  const sections = [
    {
      title: '1. What We Collect',
      content: [
        'Roblox username and user ID — collected when you execute a vhxLUA script in-game.',
        'Execution data — which games you ran scripts in and when, used to display your stats.',
        'Device fingerprint and hardware ID — used only to enforce bans and prevent abuse.',
        'Email address — only if you voluntarily add one to your account.',
        'Profile data — username, avatar, bio, and social links you set in your profile.',
      ],
    },
    {
      title: '2. How We Use It',
      content: [
        'To display your stats and profile on the dashboard.',
        'To enforce bans and keep the service fair for everyone.',
        'To generate anonymous aggregate stats like total active users.',
        'We do not sell, rent, or share your personal data with anyone.',
      ],
    },
    {
      title: '3. Data Retention',
      content: [
        'Your data is kept for as long as your account is active.',
        'You can request full deletion of your account and data at any time via Discord.',
        'Execution logs older than 90 days may be purged automatically.',
      ],
    },
    {
      title: '4. Cookies & Storage',
      content: [
        'We use browser storage to remember your theme preference and session.',
        'No advertising or third-party tracking cookies are used.',
      ],
    },
    {
      title: '5. Security',
      content: [
        'Passwords are never stored in plain text — they are securely hashed.',
        'Sensitive data like tokens and hardware IDs are not exposed through public APIs.',
        'Access controls are in place on all data tables.',
      ],
    },
    {
      title: '6. Your Rights',
      content: [
        'You can view, export, or delete your data at any time.',
        'Contact us on Discord for any data requests or privacy concerns.',
        'You can close your account from the Danger Zone in your account settings.',
      ],
    },
    {
      title: '7. Children',
      content: [
        'vhxLUA Hub is intended for users who are at least 13 years old, consistent with Roblox\'s own requirements.',
        'We do not knowingly collect data from children under 13.',
      ],
    },
    {
      title: '8. Changes',
      content: [
        'We may update this policy as the service grows.',
        'Major changes will be announced in the Announcements section and on Discord.',
      ],
    },
    {
      title: '9. Contact',
      content: [
        'Discord: discord.gg/usEnYvqnaJ',
        'Rscripts: rscripts.net/@vhxLUA_',
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="rounded-2xl p-6 border" style={{ borderColor: 'var(--color-border)', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
            style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}>V</div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Privacy Policy</h1>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>vhxLUA Hub · Last updated March 2026</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          This explains what data vhxLUA Hub collects, how we use it, and what rights you have over it. We keep it simple — no legalese.
        </p>
      </div>

      {sections.map(s => (
        <div key={s.title} className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>{s.title}</h2>
          <ul className="space-y-2">
            {s.content.map((line, i) => (
              <li key={i} className="flex gap-2.5 text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-accent)' }} />
                {line}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="text-center text-[11px] pb-4" style={{ color: 'var(--color-muted)' }}>
        © 2026 vhxLUA Hub · All rights reserved
      </p>
    </div>
  );
}
