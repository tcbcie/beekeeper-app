import { Metadata } from 'next'
import {
  BarChart3,
  BadgeCheck,
  Calendar,
  CreditCard,
  Cookie,
  Handshake,
  Lock,
  Mail,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AppIcon from '@/components/icons/AppIcon'
import Panel from '@/components/ui/Panel'
import PageHeader from '@/components/ui/PageHeader'

export const metadata: Metadata = {
  title: 'Privacy Policy - HiveCraic',
  description: 'Privacy policy for HiveCraic beekeeping management application',
}

type PrivacySection = {
  icon: LucideIcon
  title: string
  items: { label: string; desc: string }[]
}

const sections: PrivacySection[] = [
  {
    icon: BarChart3,
    title: 'Information We Collect',
    items: [
      { label: 'Account Information', desc: 'Email address, password (encrypted), and user profile data' },
      { label: 'Beekeeping Data', desc: 'All data you enter about your apiaries, hives, queens, inspections, and related activities' },
      { label: 'Usage Data', desc: 'Activity timestamps for online user tracking (visible to administrators)' },
      { label: 'Subscription Info', desc: 'Subscription status, payment dates, and tier information' },
    ],
  },
  {
    icon: BadgeCheck,
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
    icon: Lock,
    title: 'Data Storage & Security',
    items: [
      { label: 'Encryption', desc: 'All passwords are encrypted using industry-standard hashing' },
      { label: 'Secure Transfer', desc: 'Data is transmitted over secure HTTPS connections' },
      { label: 'Row-Level Security', desc: 'Policies ensure users can only access their own data' },
      { label: 'Backups', desc: 'Database backups are maintained for disaster recovery' },
    ],
  },
  {
    icon: Handshake,
    title: 'Data Sharing',
    items: [
      { label: 'No Selling', desc: 'We do not sell, trade, or share your personal information' },
      { label: 'Consent Only', desc: 'Data shared only with your explicit consent' },
      { label: 'Legal Requirements', desc: 'When required by law or legal process' },
      { label: 'Safety', desc: 'To protect rights, property, or safety of users' },
    ],
  },
  {
    icon: CreditCard,
    title: 'Payment Processing',
    items: [
      { label: 'Stripe', desc: 'Payments processed securely through PCI-compliant Stripe' },
      { label: 'No Card Storage', desc: 'We do not store or have access to your full credit card details' },
      { label: 'Encrypted', desc: 'Payment information is encrypted and processed directly by Stripe' },
    ],
  },
  {
    icon: Scale,
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

function BulletList({ items, dotClassName }: { items: { label: string; desc: string }[]; dotClassName?: string }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.label} className="flex gap-3">
          <div className={`mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotClassName ?? 'bg-amber-500'}`} />
          <div>
            <span className="font-medium text-foreground">{item.label}:</span>{' '}
            <span className="text-text-secondary">{item.desc}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4 sm:py-6">
      <Panel padding="lg">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-300/70 bg-blue-100/80 px-4 py-2 text-sm font-medium text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
            <ShieldCheck className="h-4 w-4" />
            <span>Your Privacy Matters</span>
          </div>
          <PageHeader
            title="Privacy Policy"
            eyebrow="Legal"
            description="How HiveCraic collects, uses, and protects your personal information."
            className="justify-center text-center [&>div]:mx-auto [&>div]:max-w-2xl [&_h1]:text-3xl [&_h1]:sm:text-4xl"
          />
          <p className="mt-4 text-sm text-text-tertiary">Last updated: January 2026</p>
        </div>
      </Panel>

      <Panel padding="lg" className="border border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20">
        <p className="text-base sm:text-lg text-blue-900 dark:text-blue-100">
          This privacy policy explains how HiveCraic collects, uses, and protects your personal information.
          We are committed to ensuring your data is handled securely and transparently.
        </p>
      </Panel>

      <div className="space-y-6">
        {sections.map((section) => (
          <Panel key={section.title} padding="none" className="overflow-hidden">
            <div className="border-b border-border bg-surface-elevated/70 px-6 py-4">
              <h2 className="flex items-center gap-3 text-xl font-semibold text-foreground">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <AppIcon icon={section.icon} size="md" />
                </span>
                {section.title}
              </h2>
            </div>
            <div className="p-6">
              <BulletList items={section.items} />
            </div>
          </Panel>
        ))}
      </div>

      <div className="space-y-6">
        <Panel padding="lg">
          <h2 className="mb-4 flex items-center gap-3 text-xl font-semibold text-foreground">
            <Users className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            Multi-User Access
          </h2>
          <p className="text-text-secondary">
            In multi-user environments, users can only see and access their own beekeeping data.
            Administrators can view system-wide statistics but cannot access individual user&apos;s detailed records.
          </p>
        </Panel>

        <Panel padding="lg">
          <h2 className="mb-4 flex items-center gap-3 text-xl font-semibold text-foreground">
            <Cookie className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            Cookies & Tracking
          </h2>
          <p className="text-text-secondary">
            HiveCraic uses essential cookies for maintaining your logged-in session and remembering your preferences.
            We do not use tracking cookies or analytics for advertising purposes.
          </p>
        </Panel>

        <Panel padding="lg">
          <h2 className="mb-4 flex items-center gap-3 text-xl font-semibold text-foreground">
            <Calendar className="h-5 w-5 text-forest-700 dark:text-forest-300" />
            Data Retention
          </h2>
          <p className="text-text-secondary">
            Your data is retained as long as your account is active. If you delete your account,
            all associated data will be permanently removed from our systems within 30 days.
          </p>
        </Panel>

        <Panel padding="lg" className="border border-forest-200 bg-forest-50/50 dark:border-forest-900 dark:bg-forest-950/20">
          <h2 className="mb-4 flex items-center gap-3 text-xl font-semibold text-foreground">
            <BadgeCheck className="h-5 w-5 text-forest-700 dark:text-forest-300" />
            GDPR Compliance
          </h2>
          <p className="text-text-secondary">
            For users in the European Union, HiveCraic is committed to compliance with the General Data Protection Regulation (GDPR).
            You have additional rights including data portability and the right to lodge a complaint with a supervisory authority.
          </p>
        </Panel>
      </div>

      <Panel padding="lg" className="text-center">
        <h2 className="mb-4 font-serif text-2xl text-foreground">Questions About Your Privacy?</h2>
        <p className="mb-6 text-text-secondary">
          If you have questions or concerns about this privacy policy, please contact us.
        </p>
        <a href="mailto:support@tcbc.ie" className="fj-btn bg-forest-600 text-white hover:bg-forest-700">
          <Mail className="h-4 w-4" />
          support@tcbc.ie
        </a>
      </Panel>
    </div>
  )
}
