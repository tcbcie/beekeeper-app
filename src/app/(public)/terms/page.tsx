import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Disclaimer - HiveCraic',
  description: 'Terms of service and disclaimer for HiveCraic beekeeping management application',
}

export default function TermsPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1>Disclaimer</h1>

      <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 mb-6 not-prose">
        <p className="font-semibold text-amber-900 dark:text-amber-300">Important Notice</p>
        <p className="text-amber-800 dark:text-amber-400 mt-2">
          Please read this disclaimer carefully before using HiveCraic.
        </p>
      </div>

      <h2>General Information</h2>
      <p>
        HiveCraic is provided as a tool to assist beekeepers in managing their beekeeping operations.
        The information and features provided are for informational and organizational purposes only.
      </p>

      <h2>No Professional Advice</h2>
      <p>
        The content and functionality provided by HiveCraic does not constitute professional beekeeping,
        veterinary, or agricultural advice. Users should consult with qualified beekeeping experts,
        veterinarians, or agricultural extension services for specific advice regarding their beekeeping operations.
      </p>

      <h2>Data Accuracy</h2>
      <p>
        While we strive to provide accurate and reliable features, HiveCraic makes no warranties or
        representations regarding the accuracy, completeness, or reliability of any data entered,
        calculated, or displayed within the application. Users are responsible for verifying the
        accuracy of their own data.
      </p>

      <h2>Weather Data</h2>
      <p>
        Weather data provided during inspection logging is sourced from third-party services and may
        not be completely accurate for your specific location. Always use your own judgment when
        assessing weather conditions for beekeeping activities.
      </p>

      <h2>Treatment and Health Management</h2>
      <p>
        Varroa treatment tracking and health management features are provided as record-keeping tools only.
        Always follow manufacturer instructions for any treatments, consult with veterinary professionals
        when required, and comply with local regulations regarding bee health management and treatments.
      </p>

      <h2>Subscription and Payment Terms</h2>
      <p>
        Subscription services are provided on a recurring billing basis:
      </p>
      <ul>
        <li>All subscriptions are non-refundable unless required by law</li>
        <li>You may cancel your subscription at any time through your profile settings</li>
        <li>Cancellation will take effect at the end of your current billing period</li>
        <li>Payment processing is handled by Stripe; HiveCraic is not responsible for payment processing errors or issues</li>
        <li>Subscription fees are subject to change with advance notice</li>
        <li>Access to subscription features may be restricted or removed if payment fails</li>
      </ul>

      <h2>Data Backup and Loss</h2>
      <p>
        Users are solely responsible for maintaining backups of their data:
      </p>
      <ul>
        <li>HiveCraic is not responsible for any data loss, corruption, or deletion for any reason</li>
        <li>While we maintain database backups for disaster recovery, we do not guarantee data recovery</li>
        <li>Users should regularly export their data using the database export feature</li>
        <li>Data loss may occur due to technical issues, user error, account deletion, or service interruptions</li>
      </ul>

      <h2>Third-Party Service Dependencies</h2>
      <p>
        HiveCraic relies on third-party services for certain functionality:
      </p>
      <ul>
        <li>Service interruptions, outages, or errors from third-party providers (Supabase, Stripe, Weather APIs) may affect HiveCraic functionality</li>
        <li>We are not responsible for issues, delays, or data loss caused by third-party service providers</li>
        <li>Third-party services have their own terms of service and limitations</li>
        <li>Weather data accuracy is dependent on third-party API providers and may be incomplete or incorrect</li>
      </ul>

      <h2>Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, HiveCraic, its creators, contributors, and associated
        organizations (tcbc.ie, Tribes Beekeepers Association, Tribes QRBG) shall not be liable for any
        direct, indirect, incidental, special, or consequential damages arising from the use or inability
        to use this application, including but not limited to loss of data, loss of colonies, or any
        other losses related to beekeeping operations.
      </p>

      <h2>User Responsibility</h2>
      <p>
        Users are solely responsible for:
      </p>
      <ul>
        <li>The accuracy of data they enter into the system</li>
        <li>Making informed decisions about their beekeeping practices</li>
        <li>Complying with local laws and regulations regarding beekeeping</li>
        <li>Regularly exporting and maintaining backups of their data</li>
        <li>Securing their account credentials and payment information</li>
        <li>Managing their subscription and ensuring payment methods remain valid</li>
      </ul>

      <h2>No Guarantee of Service</h2>
      <p>
        HiveCraic is provided &quot;as is&quot; without any guarantee of continuous availability,
        functionality, or service. We reserve the right to modify, suspend, or discontinue any aspect
        of the service at any time without notice.
      </p>

      <h2>Changes to Disclaimer</h2>
      <p>
        We reserve the right to update or modify this disclaimer at any time. Continued use of HiveCraic
        after any changes constitutes acceptance of the updated disclaimer.
      </p>
    </div>
  )
}
