export function PrivacyPolicy() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">
      <div>
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Privacy Policy</h1>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Last updated: March 2026</p>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        This Privacy Policy applies to our online activities and is valid for visitors to vhxLUA and its dashboard
        regarding information shared or collected here. It does not apply to information collected offline or through
        other channels.
      </p>

      {[
        {
          title: 'Consent',
          body: 'By using our website, you consent to this Privacy Policy and agree to its terms.',
        },
        {
          title: 'Information We Collect',
          body: 'We collect information you provide when registering (username, email address), information you provide when contacting us, IP addresses for security and spam prevention, standard log data (browser type, ISP, timestamps, referring pages), and in-game data such as Roblox username, User ID, hardware identifiers, and execution history for script functionality purposes.',
        },
        {
          title: 'How We Use Your Information',
          body: 'We use collected information to provide, operate, and maintain our platform — to improve and personalize your experience, analyze usage patterns, develop new features, communicate with you about updates and support, and detect and prevent fraud or abuse.',
        },
        {
          title: 'In-Game Data',
          body: 'When you execute our scripts, we collect your Roblox username, User ID, game name, device fingerprint, hardware ID, and IP address. This data is used exclusively for access control, security enforcement, and usage analytics. It is never sold to third parties.',
        },
        {
          title: 'Data Storage',
          body: 'Your data is stored securely using Supabase (PostgreSQL). We retain data only as long as necessary to provide our services. You may request deletion of your data by contacting us.',
        },
        {
          title: 'Third Parties',
          body: 'We do not sell, trade, or transfer your personal information to outside parties. We may use trusted third-party services (such as authentication providers) that agree to keep your information confidential.',
        },
        {
          title: 'Contact',
          body: 'If you have questions about this Privacy Policy, please reach out through our Discord server or the feedback form on this dashboard.',
        },
      ].map(({ title, body }) => (
        <div key={title} className="rounded-xl border p-4 space-y-1.5"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>{body}</p>
        </div>
      ))}
    </div>
  );
}
