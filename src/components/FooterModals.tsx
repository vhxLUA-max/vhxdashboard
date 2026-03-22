import { X } from 'lucide-react';

interface Props { onClose: () => void; }

export function TermsModal({ onClose }: Props) {
  return (
    <Modal title="Terms of Service" onClose={onClose}>
      <Section title="Acceptance">
        By accessing or using vhxLUA scripts and dashboard, you agree to be bound by these Terms. If you disagree, do not use our services.
      </Section>
      <Section title="Use of Service">
        vhxLUA scripts are provided for personal, non-commercial use only. You may not redistribute, resell, or claim ownership of our scripts. We reserve the right to terminate access at any time for any reason.
      </Section>
      <Section title="User Conduct">
        You agree not to use our scripts to exploit, harass, or harm other players. Any abuse of the service including ban evasion, HWID spoofing, or unauthorized access will result in permanent removal.
      </Section>
      <Section title="Intellectual Property">
        All scripts, code, and content on vhxLUA are owned by vhxLUA. You may not copy, modify, or distribute our code without explicit written permission.
      </Section>
      <Section title="Disclaimer">
        Our scripts are provided "as is" without warranty. We are not responsible for any account bans, data loss, or damages resulting from use of our scripts. Use at your own risk.
      </Section>
      <Section title="Changes">
        We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of updated terms.
      </Section>
    </Modal>
  );
}

export function RefundsModal({ onClose }: Props) {
  return (
    <Modal title="Refund Policy" onClose={onClose}>
      <Section title="Digital Products">
        Due to the nature of digital goods, all purchases are final. We do not offer refunds once Pro access has been granted.
      </Section>
      <Section title="Exceptions">
        Refunds may be considered in the following cases: duplicate charges, technical failure preventing access, or unauthorized charges. Contact us within 7 days of purchase.
      </Section>
      <Section title="How to Request">
        To request a refund under an eligible exception, contact us through Discord or the feedback form with your payment receipt and reason.
      </Section>
      <Section title="Chargebacks">
        Initiating a chargeback without contacting us first will result in a permanent ban from all vhxLUA services.
      </Section>
    </Modal>
  );
}

export function LegalModal({ onClose }: Props) {
  return (
    <Modal title="Legal" onClose={onClose}>
      <Section title="Disclaimer">
        vhxLUA is an independent project and is not affiliated with, endorsed by, or connected to Roblox Corporation in any way. "Roblox" is a trademark of Roblox Corporation.
      </Section>
      <Section title="Third-Party Services">
        We use third-party services including Supabase for data storage and Vercel for hosting. Use of these services is governed by their respective terms and privacy policies.
      </Section>
      <Section title="Limitation of Liability">
        To the fullest extent permitted by law, vhxLUA shall not be liable for any indirect, incidental, or consequential damages arising from your use of our services.
      </Section>
      <Section title="Governing Law">
        These terms are governed by the laws of the Republic of the Philippines. Any disputes shall be resolved in the appropriate courts of jurisdiction.
      </Section>
    </Modal>
  );
}

export function ContactModal({ onClose }: Props) {
  return (
    <Modal title="Contact Us" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Have questions, issues, or feedback? Reach out through any of the channels below.
        </p>
        {[
          { label: 'Discord Server', value: 'discord.gg/usEnYvqnaJ', href: 'https://discord.gg/usEnYvqnaJ', icon: '💬' },
          { label: 'YouTube',        value: '@vhxlua',               href: 'https://youtube.com/@vhxlua',   icon: '▶️' },
          { label: 'Feedback Form',  value: 'Use the Feedback tab on the dashboard', href: null, icon: '📝' },
        ].map(c => (
          <div key={c.label} className="flex items-center gap-3 p-3 rounded-xl border"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
            <span className="text-xl">{c.icon}</span>
            <div className="flex-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{c.label}</p>
              {c.href
                ? <a href={c.href} target="_blank" rel="noreferrer"
                    className="text-xs hover:underline" style={{ color: 'var(--color-accent)' }}>{c.value}</a>
                : <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{c.value}</p>
              }
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0 sticky top-0"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4 space-y-1.5"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)' }}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h3>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>{children}</p>
    </div>
  );
}
