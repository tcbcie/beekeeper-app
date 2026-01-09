import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Notice - HiveCraic',
  description: 'Privacy notice for HiveCraic beekeeping management application',
}

export default function PrivacyPage() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <h1>Privacy Notice</h1>

      <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4 mb-6 not-prose">
        <p className="font-semibold text-blue-900 dark:text-blue-300">Your Privacy Matters</p>
        <p className="text-blue-800 dark:text-blue-400 mt-2">
          This privacy notice explains how HiveCraic collects, uses, and protects your personal information.
        </p>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated: December 2025</p>

      <h2>Information We Collect</h2>
      <p>
        HiveCraic collects and stores the following types of information:
      </p>
      <ul>
        <li><strong>Account Information:</strong> Email address, password (encrypted), and user profile data</li>
        <li><strong>Beekeeping Data:</strong> All data you enter about your apiaries, hives, queens, inspections, and related activities</li>
        <li><strong>Usage Data:</strong> Activity timestamps for online user tracking (visible to administrators)</li>
        <li><strong>Subscription Information:</strong> Subscription status, payment dates, and subscription tier information</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <p>
        Your information is used solely for:
      </p>
      <ul>
        <li>Providing and maintaining the HiveCraic service</li>
        <li>Authenticating your access to the application</li>
        <li>Storing and managing your beekeeping records</li>
        <li>Enabling multi-user collaboration features</li>
        <li>Displaying user activity statistics to administrators</li>
        <li>Processing subscription payments and managing billing</li>
        <li>Providing access to subscription-based features</li>
      </ul>

      <h2>Data Storage and Security</h2>
      <p>
        Your data is stored securely using Supabase, a secure cloud database platform:
      </p>
      <ul>
        <li>All passwords are encrypted using industry-standard hashing</li>
        <li>Data is transmitted over secure HTTPS connections</li>
        <li>Row-level security policies ensure users can only access their own data</li>
        <li>Database backups are maintained for disaster recovery</li>
      </ul>

      <h2>Data Sharing</h2>
      <p>
        HiveCraic does not sell, trade, or share your personal information with third parties except:
      </p>
      <ul>
        <li>With your explicit consent</li>
        <li>When required by law or legal process</li>
        <li>To protect the rights, property, or safety of HiveCraic, its users, or the public</li>
      </ul>

      <h2>Multi-User Access</h2>
      <p>
        In multi-user environments:
      </p>
      <ul>
        <li>Users can only see and access their own beekeeping data</li>
        <li>Administrators can view system-wide statistics (total users, hives, apiaries)</li>
        <li>Administrators can see which users are currently active</li>
        <li>Administrators cannot access individual user&apos;s detailed beekeeping records</li>
      </ul>

      <h2>Third-Party Services</h2>
      <p>
        HiveCraic integrates with the following third-party services:
      </p>
      <ul>
        <li><strong>Supabase:</strong> Database and authentication services</li>
        <li><strong>Stripe:</strong> Payment processing for subscriptions</li>
        <li><strong>Weather Services:</strong> Weather data for inspection logging</li>
      </ul>
      <p>
        These services have their own privacy policies and terms of service.
      </p>

      <h2>Payment Processing</h2>
      <p>
        Subscription payments are processed securely through Stripe, a PCI-compliant payment processor:
      </p>
      <ul>
        <li>HiveCraic does not store or have access to your full credit card details</li>
        <li>Payment information is encrypted and processed directly by Stripe</li>
        <li>We only store subscription status and payment confirmation details</li>
        <li>Stripe may collect billing address and payment method information according to their privacy policy</li>
        <li>You can manage your payment methods and billing information through your profile settings</li>
      </ul>
      <p>
        For more information about how Stripe handles your payment data, please visit{' '}
        <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700">
          Stripe&apos;s Privacy Policy
        </a>.
      </p>

      <h2>Your Rights</h2>
      <p>
        You have the right to:
      </p>
      <ul>
        <li>Access your personal data stored in HiveCraic</li>
        <li>Export your data using the database export feature</li>
        <li>Request correction of inaccurate data</li>
        <li>Delete your account and associated data</li>
        <li>Withdraw consent for data processing</li>
      </ul>

      <h2>Data Retention</h2>
      <p>
        Your data is retained as long as your account is active. If you delete your account,
        all associated data will be permanently removed from our systems within 30 days.
      </p>

      <h2>Cookies and Tracking</h2>
      <p>
        HiveCraic uses essential cookies for:
      </p>
      <ul>
        <li>Maintaining your logged-in session</li>
        <li>Remembering your preferences</li>
      </ul>
      <p>
        We do not use tracking cookies or analytics for advertising purposes.
      </p>

      <h2>Children&apos;s Privacy</h2>
      <p>
        HiveCraic is not intended for use by individuals under the age of 16. We do not knowingly
        collect personal information from children under 16.
      </p>

      <h2>Changes to Privacy Notice</h2>
      <p>
        We may update this privacy notice from time to time. We will notify users of any material
        changes by updating the &quot;Last Updated&quot; date and, where appropriate, providing
        additional notice.
      </p>

      <h2>Contact Information</h2>
      <p>
        If you have questions or concerns about this privacy notice or how your data is handled,
        please contact us at:
      </p>
      <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg mt-2 not-prose border border-gray-200 dark:border-slate-700">
        <p className="font-semibold text-gray-900 dark:text-gray-100">HiveCraic Support</p>
        <p className="text-gray-700 dark:text-gray-300">Email: support@tcbc.ie</p>
        <p className="text-gray-700 dark:text-gray-300">Website: tcbc.ie</p>
      </div>

      <h2>GDPR Compliance</h2>
      <p>
        For users in the European Union, HiveCraic is committed to compliance with the General
        Data Protection Regulation (GDPR). You have additional rights under GDPR including the
        right to data portability and the right to lodge a complaint with a supervisory authority.
      </p>
    </div>
  )
}
