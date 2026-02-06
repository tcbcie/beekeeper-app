import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - HiveCraic',
  description: 'Terms of service and disclaimer for HiveCraic beekeeping management application',
}

const sections = [
  {
    icon: '📋',
    title: 'General Information',
    content: 'HiveCraic is provided as a tool to assist beekeepers in managing their beekeeping operations. The information and features provided are for informational and organizational purposes only.',
  },
  {
    icon: '⚕️',
    title: 'No Professional Advice',
    content: 'The content and functionality provided by HiveCraic does not constitute professional beekeeping, veterinary, or agricultural advice. Users should consult with qualified beekeeping experts, veterinarians, or agricultural extension services for specific advice regarding their beekeeping operations.',
  },
  {
    icon: '📊',
    title: 'Data Accuracy',
    content: 'While we strive to provide accurate and reliable features, HiveCraic makes no warranties or representations regarding the accuracy, completeness, or reliability of any data entered, calculated, or displayed within the application. Users are responsible for verifying the accuracy of their own data.',
  },
  {
    icon: '🌤️',
    title: 'Weather Data',
    content: 'Weather data provided during inspection logging is sourced from third-party services and may not be completely accurate for your specific location. Always use your own judgment when assessing weather conditions for beekeeping activities.',
  },
  {
    icon: '💊',
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

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-900 dark:text-amber-300 text-sm font-medium mb-4">
          <span>📜</span>
          <span>Legal Information</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
          Terms of Service
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Please read these terms carefully before using HiveCraic
        </p>
      </div>

      {/* Important Notice */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 sm:p-8 mb-8 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-4">
          <span className="text-3xl">⚠️</span>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Important Notice
            </h2>
            <p className="text-slate-700 dark:text-slate-300">
              By using HiveCraic, you agree to these terms of service. If you do not agree,
              please do not use the application.
            </p>
          </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="space-y-6">
        {sections.map((section, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6"
          >
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
              <span className="text-2xl">{section.icon}</span>
              {section.title}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      {/* Subscription Terms */}
      <div className="mt-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-2xl">💳</span>
            Subscription & Payment Terms
          </h2>
        </div>
        <div className="p-6">
          <ul className="space-y-3">
            {subscriptionTerms.map((term, index) => (
              <li key={index} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2.5 flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">{term}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Data Backup */}
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-2xl">💾</span>
            Data Backup & Loss
          </h2>
        </div>
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Users are solely responsible for maintaining backups of their data:
          </p>
          <ul className="space-y-3">
            {dataBackup.map((item, index) => (
              <li key={index} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2.5 flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* User Responsibilities */}
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="text-2xl">👤</span>
            User Responsibilities
          </h2>
        </div>
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Users are solely responsible for:
          </p>
          <ul className="space-y-3">
            {userResponsibilities.map((item, index) => (
              <li key={index} className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Limitation of Liability */}
      <div className="mt-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
          <span className="text-2xl">⚖️</span>
          Limitation of Liability
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          To the fullest extent permitted by law, HiveCraic, its creators, contributors, and associated
          organizations (tcbc.ie, Tribes Beekeepers Association, Tribes QRBG) shall not be liable for any
          direct, indirect, incidental, special, or consequential damages arising from the use or inability
          to use this application, including but not limited to loss of data, loss of colonies, or any
          other losses related to beekeeping operations.
        </p>
      </div>

      {/* No Guarantee */}
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
          <span className="text-2xl">🔧</span>
          No Guarantee of Service
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          HiveCraic is provided &quot;as is&quot; without any guarantee of continuous availability,
          functionality, or service. We reserve the right to modify, suspend, or discontinue any aspect
          of the service at any time without notice.
        </p>
      </div>

      {/* Changes Notice */}
      <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-3 mb-4">
          <span className="text-2xl">📝</span>
          Changes to Terms
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          We reserve the right to update or modify these terms at any time. Continued use of HiveCraic
          after any changes constitutes acceptance of the updated terms.
        </p>
      </div>

      {/* Contact */}
      <div className="mt-12 bg-slate-900 dark:bg-slate-800 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-semibold text-white mb-4">
          Questions About These Terms?
        </h2>
        <p className="text-slate-400 mb-6">
          If you have questions about these terms of service, please contact us.
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
