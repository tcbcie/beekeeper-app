import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - HiveCraic',
  description: 'Privacy policy for HiveCraic beekeeping management application',
}

const sections = [
  {
    icon: '📊',
    title: 'Information We Collect',
    items: [
      { label: 'Account Information', desc: 'Email address, password (encrypted), and user profile data' },
      { label: 'Beekeeping Data', desc: 'All data you enter about your apiaries, hives, queens, inspections, and related activities' },
      { label: 'Usage Data', desc: 'Activity timestamps for online user tracking (visible to administrators)' },
      { label: 'Subscription Info', desc: 'Subscription status, payment dates, and tier information' },
    ],
  },
  {
    icon: '🎯',
    title: 'How We Use Your Information',
    items: [
      { label: 'Service Provision', desc: 'Providing and maintaining the HiveCraic service' },
      { label: 'Authentication', desc: 'Authenticating your access to the application' },
      { label: 'Data Management', desc: 'Storing and managing your beekeeping records' },
      { label: 'Collaboration', desc: 'Enabling multi-user collaboration features' },
      { label: 'Billing', desc: 'Processing subscription payments and managing billing' },
    ],
  },
  {
    icon: '🔒',
    title: 'Data Storage & Security',
    items: [
      { label: 'Encryption', desc: 'All passwords are encrypted using industry-standard hashing' },
      { label: 'Secure Transfer', desc: 'Data is transmitted over secure HTTPS connections' },
      { label: 'Row-Level Security', desc: 'Policies ensure users can only access their own data' },
      { label: 'Backups', desc: 'Database backups are maintained for disaster recovery' },
    ],
  },
  {
    icon: '🤝',
    title: 'Data Sharing',
    items: [
      { label: 'No Selling', desc: 'We do not sell, trade, or share your personal information' },
      { label: 'Consent Only', desc: 'Data shared only with your explicit consent' },
      { label: 'Legal Requirements', desc: 'When required by law or legal process' },
      { label: 'Safety', desc: 'To protect rights, property, or safety of users' },
    ],
  },
  {
    icon: '💳',
    title: 'Payment Processing',
    items: [
      { label: 'Stripe', desc: 'Payments processed securely through PCI-compliant Stripe' },
      { label: 'No Card Storage', desc: 'We do not store or have access to your full credit card details' },
      { label: 'Encrypted', desc: 'Payment information is encrypted and processed directly by Stripe' },
    ],
  },
  {
    icon: '⚖️',
    title: 'Your Rights',
    items: [
      { label: 'Access', desc: 'Access your personal data stored in HiveCraic' },
      { label: 'Export', desc: 'Export your data using the database export feature' },
      { label: 'Correction', desc: 'Request correction of inaccurate data' },
      { label: 'Deletion', desc: 'Delete your account and associated data' },
      { label: 'Withdraw Consent', desc: 'Withdraw consent for data processing' },
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
          <span>🔐</span>
          <span>Your Privacy Matters</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
          Privacy Policy
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Last Updated: January 2026
        </p>
      </div>

      {/* Introduction */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 sm:p-8 mb-8 border border-blue-100 dark:border-blue-800">
        <p className="text-slate-700 dark:text-slate-300 text-lg">
          This privacy policy explains how HiveCraic collects, uses, and protects your personal information.
          We are committed to ensuring your data is handled securely and transparently.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sections.map((section, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3">
                <span className="text-2xl">{section.icon}</span>
                {section.title}
              </h2>
            </div>
            <div className="p-6">
              <ul className="space-y-4">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white">{item.label}:</span>{' '}
                      <span className="text-slate-600 dark:text-slate-400">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Sections */}
      <div className="mt-8 space-y-6">
        {/* Multi-User Access */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
            <span className="text-2xl">👥</span>
            Multi-User Access
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            In multi-user environments, users can only see and access their own beekeeping data.
            Administrators can view system-wide statistics but cannot access individual user&apos;s detailed records.
          </p>
        </div>

        {/* Cookies */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
            <span className="text-2xl">🍪</span>
            Cookies & Tracking
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            HiveCraic uses essential cookies for maintaining your logged-in session and remembering your preferences.
            We do not use tracking cookies or analytics for advertising purposes.
          </p>
        </div>

        {/* Data Retention */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
            <span className="text-2xl">📅</span>
            Data Retention
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Your data is retained as long as your account is active. If you delete your account,
            all associated data will be permanently removed from our systems within 30 days.
          </p>
        </div>

        {/* GDPR */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
            <span className="text-2xl">🇪🇺</span>
            GDPR Compliance
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            For users in the European Union, HiveCraic is committed to compliance with the General
            Data Protection Regulation (GDPR). You have additional rights including data portability
            and the right to lodge a complaint with a supervisory authority.
          </p>
        </div>
      </div>

      {/* Contact */}
      <div className="mt-12 bg-slate-900 dark:bg-slate-800 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-semibold text-white mb-4">
          Questions About Your Privacy?
        </h2>
        <p className="text-slate-400 mb-6">
          If you have questions or concerns about this privacy policy, please contact us.
        </p>
        <a
          href="mailto:support@tcbc.ie"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors font-medium"
        >
          <span>📧</span>
          <span>support@tcbc.ie</span>
        </a>
      </div>
    </div>
  )
}
