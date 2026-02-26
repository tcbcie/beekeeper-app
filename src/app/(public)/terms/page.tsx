import { Metadata } from 'next'
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  CloudSun,
  CreditCard,
  HardDrive,
  Mail,
  Pill,
  ShieldAlert,
  User,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AppIcon from '@/components/icons/AppIcon'
import Panel from '@/components/ui/Panel'
import PageHeader from '@/components/ui/PageHeader'

export const metadata: Metadata = {
  title: 'Terms of Service - HiveCraic',
  description: 'Terms of service and disclaimer for HiveCraic beekeeping management application',
}

type TermsSection = {
  icon: LucideIcon
  title: string
  content: string
}

const sections: TermsSection[] = [
  {
    icon: ClipboardList,
    title: 'General Information',
    content: 'HiveCraic is provided as a tool to assist beekeepers in managing their beekeeping operations. The information and features provided are for informational and organizational purposes only.',
  },
  {
    icon: ShieldAlert,
    title: 'No Professional Advice',
    content: 'The content and functionality provided by HiveCraic does not constitute professional beekeeping, veterinary, or agricultural advice. Users should consult with qualified beekeeping experts, veterinarians, or agricultural extension services for specific advice regarding their beekeeping operations.',
  },
  {
    icon: BarChart3,
    title: 'Data Accuracy',
    content: 'While we strive to provide accurate and reliable features, HiveCraic makes no warranties or representations regarding the accuracy, completeness, or reliability of any data entered, calculated, or displayed within the application. Users are responsible for verifying the accuracy of their own data.',
  },
  {
    icon: CloudSun,
    title: 'Weather Data',
    content: 'Weather data provided during inspection logging is sourced from third-party services and may not be completely accurate for your specific location. Always use your own judgment when assessing weather conditions for beekeeping activities.',
  },
  {
    icon: Pill,
    title: 'Treatment & Health Management',
    content: 'Varroa treatment tracking and health management features are provided as record-keeping tools only. Always follow manufacturer instructions for any treatments, consult with veterinary professionals when required, and comply with local regulations.',
  },
]

const subscriptionTerms = [
  'All subscriptions are non-refundable unless required by law',
  'You may cancel your subscription at any time through your profile settings',
  'Cancellation will take effect at the end of your current billing period',
  'Payment processing is handled by Stripe',
  'Subscription fees are subject to change with advance notice',
  'Access to subscription features may be restricted if payment fails',
]

const userResponsibilities = [
  'The accuracy of data you enter into the system',
  'Making informed decisions about your beekeeping practices',
  'Complying with local laws and regulations regarding beekeeping',
  'Regularly exporting and maintaining backups of your data',
  'Securing your account credentials and payment information',
  'Managing your subscription and ensuring payment methods remain valid',
]

const dataBackup = [
  'HiveCraic is not responsible for any data loss, corruption, or deletion',
  'While we maintain database backups, we do not guarantee data recovery',
  'Users should regularly export their data using the export feature',
  'Data loss may occur due to technical issues, user error, or service interruptions',
]

function SimpleList({ items, dotClassName }: { items: string[]; dotClassName: string }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <div className={`mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotClassName}`} />
          <span className="text-text-secondary">{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4 sm:py-6">
      <Panel padding="lg">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-100/80 px-4 py-2 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <ClipboardList className="h-4 w-4" />
            <span>Legal Information</span>
          </div>
          <PageHeader
            title="Terms of Service"
            eyebrow="Legal"
            description="Please read these terms carefully before using HiveCraic."
            className="justify-center text-center [&>div]:mx-auto [&>div]:max-w-2xl [&_h1]:text-3xl [&_h1]:sm:text-4xl"
          />
        </div>
      </Panel>

      <Panel padding="lg" className="border border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-1 h-6 w-6 flex-shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">Important Notice</h2>
            <p className="text-text-secondary">
              By using HiveCraic, you agree to these terms of service. If you do not agree, please do not use the application.
            </p>
          </div>
        </div>
      </Panel>

      <div className="space-y-6">
        {sections.map((section) => (
          <Panel key={section.title} padding="lg">
            <h2 className="mb-4 flex items-center gap-3 text-xl font-semibold text-foreground">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <AppIcon icon={section.icon} size="md" />
              </span>
              {section.title}
            </h2>
            <p className="text-text-secondary">{section.content}</p>
          </Panel>
        ))}
      </div>

      <Panel padding="none" className="overflow-hidden">
        <div className="border-b border-border bg-surface-elevated/70 px-6 py-4">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-foreground">
            <CreditCard className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            Subscription & Payment Terms
          </h2>
        </div>
        <div className="p-6">
          <SimpleList items={subscriptionTerms} dotClassName="bg-amber-500" />
        </div>
      </Panel>

      <Panel padding="none" className="overflow-hidden">
        <div className="border-b border-border bg-surface-elevated/70 px-6 py-4">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-foreground">
            <HardDrive className="h-5 w-5 text-red-600 dark:text-red-400" />
            Data Backup & Loss
          </h2>
        </div>
        <div className="p-6">
          <p className="mb-4 text-text-secondary">Users are solely responsible for maintaining backups of their data:</p>
          <SimpleList items={dataBackup} dotClassName="bg-red-500" />
        </div>
      </Panel>

      <Panel padding="none" className="overflow-hidden">
        <div className="border-b border-border bg-surface-elevated/70 px-6 py-4">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-foreground">
            <User className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            User Responsibilities
          </h2>
        </div>
        <div className="p-6">
          <p className="mb-4 text-text-secondary">Users are solely responsible for:</p>
          <SimpleList items={userResponsibilities} dotClassName="bg-blue-500" />
        </div>
      </Panel>

      <Panel padding="lg" className="border border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
        <h2 className="mb-4 flex items-center gap-3 text-xl font-semibold text-foreground">
          <ShieldAlert className="h-5 w-5 text-red-700 dark:text-red-300" />
          Limitation of Liability
        </h2>
        <p className="text-text-secondary">
          To the fullest extent permitted by law, HiveCraic, its creators, contributors, and associated organizations (tcbc.ie, Tribes Beekeepers Association, Tribes QRBG) shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from the use or inability to use this application, including but not limited to loss of data, loss of colonies, or any other losses related to beekeeping operations.
        </p>
      </Panel>

      <Panel padding="lg">
        <h2 className="mb-4 flex items-center gap-3 text-xl font-semibold text-foreground">
          <Wrench className="h-5 w-5 text-text-secondary" />
          No Guarantee of Service
        </h2>
        <p className="text-text-secondary">
          HiveCraic is provided &quot;as is&quot; without any guarantee of continuous availability, functionality, or service.
          We reserve the right to modify, suspend, or discontinue any aspect of the service at any time without notice.
        </p>
      </Panel>

      <Panel padding="lg">
        <h2 className="mb-4 flex items-center gap-3 text-xl font-semibold text-foreground">
          <ClipboardList className="h-5 w-5 text-text-secondary" />
          Changes to Terms
        </h2>
        <p className="text-text-secondary">
          We reserve the right to update or modify these terms at any time. Continued use of HiveCraic
          after any changes constitutes acceptance of the updated terms.
        </p>
      </Panel>

      <Panel padding="lg" className="text-center">
        <h2 className="mb-4 font-serif text-2xl text-foreground">Questions About These Terms?</h2>
        <p className="mb-6 text-text-secondary">
          If you have questions about these terms of service, please contact us.
        </p>
        <a href="mailto:support@tcbc.ie" className="fj-btn bg-forest-600 text-white hover:bg-forest-700">
          <Mail className="h-4 w-4" />
          support@tcbc.ie
        </a>
      </Panel>
    </div>
  )
}
