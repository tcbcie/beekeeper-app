'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { Info, Newspaper, FileEdit, AlertTriangle, Shield } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function AboutPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'about' | 'news' | 'changes' | 'disclaimer' | 'privacy'>('about')
  const router = useRouter()

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
      setLoading(false)
    }
    initUser()
  }, [router])

  if (loading) return <LoadingSpinner text="Loading..." />

  const sections = [
    { id: 'about' as const, label: 'About', icon: Info },
    { id: 'news' as const, label: 'News', icon: Newspaper },
    { id: 'changes' as const, label: 'Changes', icon: FileEdit },
    { id: 'disclaimer' as const, label: 'Disclaimer', icon: AlertTriangle },
    { id: 'privacy' as const, label: 'Privacy Notice', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Info size={32} className="text-gray-700" />
        <h1 className="text-3xl font-bold text-gray-900">About Hive Craic</h1>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap -mb-px">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeSection === section.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {section.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* About Section */}
      {activeSection === 'about' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About Hive Craic</h2>

          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              Hive Craic is a comprehensive beekeeping management application designed to help beekeepers
              of all experience levels track and manage their apiaries, hives, queens, and beekeeping activities.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Features</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Complete apiary and hive management</li>
              <li>Queen tracking with age calculation and lineage records</li>
              <li>Detailed inspection logging with weather data</li>
              <li>Varroa mite monitoring and treatment tracking</li>
              <li>QueenCraft (Queen rearing batch management)</li>
              <li>Harvest and feeding records</li>
              <li>Multi-user support with role-based access control</li>
              <li>Data export capabilities</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Version</h3>
            <p className="text-gray-700">
              <strong>Current Version:</strong> 1.0.0 (October 2025)
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Credits</h3>
            <p className="text-gray-700 leading-relaxed">
              Crafted with honeyed hearts by <strong>tcbc.ie</strong>, alongside the buzzing minds of
              <strong> Tribes Beekeepers Association</strong> and <strong>Tribes QRBG</strong>.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Technology</h3>
            <p className="text-gray-700 leading-relaxed">
              Built with modern web technologies including Next.js, React, TypeScript, Tailwind CSS,
              and Supabase for secure data storage and authentication.
            </p>
          </div>
        </div>
      )}

      {/* News Section */}
      {activeSection === 'news' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Latest News</h2>

          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">Hive Craic Launch</h3>
              <p className="text-sm text-gray-500 mb-2">October 2025</p>
              <p className="text-gray-700">
                We&apos;re excited to announce the official launch of Hive Craic! Our comprehensive
                beekeeping management platform is now available to help beekeepers manage their operations
                more efficiently.
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">QueenCraft Feature Added</h3>
              <p className="text-sm text-gray-500 mb-2">October 2025</p>
              <p className="text-gray-700">
                New queen rearing management feature with Planning and Selection sections to help you
                track your queen breeding programs.
              </p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">Multi-User Support</h3>
              <p className="text-sm text-gray-500 mb-2">October 2025</p>
              <p className="text-gray-700">
                Role-based access control with Admin and User roles enables collaborative beekeeping
                management for clubs and associations.
              </p>
            </div>

            <div className="border-l-4 border-amber-500 pl-4">
              <h3 className="text-lg font-semibold text-gray-900">Right-Sized Broodbox Feature</h3>
              <p className="text-sm text-gray-500 mb-2">October 2025</p>
              <p className="text-gray-700">
                Track right-sized broodbox configurations for your hives with frame count monitoring
                during inspections.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Changes Section */}
      {activeSection === 'changes' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Change Log</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">v1.0.0</span>
                October 2025
              </h3>
              <ul className="mt-3 space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Initial release of Hive Craic</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Apiary and hive management system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Queen tracking with mating location (Eircode) support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Inspection logging with weather integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Varroa check and treatment tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>QueenCraft - Queen rearing batch management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Harvest and feeding record keeping</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Multi-user support with RBAC</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Database export functionality</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Right-sized broodbox tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Responsive design for mobile and desktop</span>
                </li>
              </ul>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming Features</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span>QueenCraft Selection tools for tracking performance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span>Advanced reporting and analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span>Mobile app for iOS and Android</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span>Calendar integration for scheduling</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">→</span>
                  <span>Enhanced data visualization</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer Section */}
      {activeSection === 'disclaimer' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Disclaimer</h2>

          <div className="prose max-w-none space-y-4 text-gray-700">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
              <p className="font-semibold text-amber-900">Important Notice</p>
              <p className="text-amber-800 mt-2">
                Please read this disclaimer carefully before using Hive Craic.
              </p>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">General Information</h3>
            <p>
              Hive Craic is provided as a tool to assist beekeepers in managing their beekeeping operations.
              The information and features provided are for informational and organizational purposes only.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">No Professional Advice</h3>
            <p>
              The content and functionality provided by Hive Craic does not constitute professional beekeeping,
              veterinary, or agricultural advice. Users should consult with qualified beekeeping experts,
              veterinarians, or agricultural extension services for specific advice regarding their beekeeping operations.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Data Accuracy</h3>
            <p>
              While we strive to provide accurate and reliable features, Hive Craic makes no warranties or
              representations regarding the accuracy, completeness, or reliability of any data entered,
              calculated, or displayed within the application. Users are responsible for verifying the
              accuracy of their own data.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Weather Data</h3>
            <p>
              Weather data provided during inspection logging is sourced from third-party services and may
              not be completely accurate for your specific location. Always use your own judgment when
              assessing weather conditions for beekeeping activities.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Treatment and Health Management</h3>
            <p>
              Varroa treatment tracking and health management features are provided as record-keeping tools only.
              Always follow manufacturer instructions for any treatments, consult with veterinary professionals
              when required, and comply with local regulations regarding bee health management and treatments.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Limitation of Liability</h3>
            <p>
              To the fullest extent permitted by law, Hive Craic, its creators, contributors, and associated
              organizations (tcbc.ie, Tribes Beekeepers Association, Tribes QRBG) shall not be liable for any
              direct, indirect, incidental, special, or consequential damages arising from the use or inability
              to use this application, including but not limited to loss of data, loss of colonies, or any
              other losses related to beekeeping operations.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">User Responsibility</h3>
            <p>
              Users are solely responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>The accuracy of data they enter into the system</li>
              <li>Making informed decisions about their beekeeping practices</li>
              <li>Complying with local laws and regulations regarding beekeeping</li>
              <li>Maintaining appropriate backups of their data</li>
              <li>Securing their account credentials</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">No Guarantee of Service</h3>
            <p>
              Hive Craic is provided &quot;as is&quot; without any guarantee of continuous availability,
              functionality, or service. We reserve the right to modify, suspend, or discontinue any aspect
              of the service at any time without notice.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Changes to Disclaimer</h3>
            <p>
              We reserve the right to update or modify this disclaimer at any time. Continued use of Hive Craic
              after any changes constitutes acceptance of the updated disclaimer.
            </p>
          </div>
        </div>
      )}

      {/* Privacy Notice Section */}
      {activeSection === 'privacy' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy Notice</h2>

          <div className="prose max-w-none space-y-4 text-gray-700">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="font-semibold text-blue-900">Your Privacy Matters</p>
              <p className="text-blue-800 mt-2">
                This privacy notice explains how Hive Craic collects, uses, and protects your personal information.
              </p>
            </div>

            <p className="text-sm text-gray-500">Last Updated: October 2025</p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Information We Collect</h3>
            <p>
              Hive Craic collects and stores the following types of information:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Account Information:</strong> Email address, password (encrypted), and user profile data</li>
              <li><strong>Beekeeping Data:</strong> All data you enter about your apiaries, hives, queens, inspections, and related activities</li>
              <li><strong>Usage Data:</strong> Activity timestamps for online user tracking (visible to administrators)</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">How We Use Your Information</h3>
            <p>
              Your information is used solely for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Providing and maintaining the Hive Craic service</li>
              <li>Authenticating your access to the application</li>
              <li>Storing and managing your beekeeping records</li>
              <li>Enabling multi-user collaboration features</li>
              <li>Displaying user activity statistics to administrators</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Data Storage and Security</h3>
            <p>
              Your data is stored securely using Supabase, a secure cloud database platform:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>All passwords are encrypted using industry-standard hashing</li>
              <li>Data is transmitted over secure HTTPS connections</li>
              <li>Row-level security policies ensure users can only access their own data</li>
              <li>Database backups are maintained for disaster recovery</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Data Sharing</h3>
            <p>
              Hive Craic does not sell, trade, or share your personal information with third parties except:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>With your explicit consent</li>
              <li>When required by law or legal process</li>
              <li>To protect the rights, property, or safety of Hive Craic, its users, or the public</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Multi-User Access</h3>
            <p>
              In multi-user environments:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Users can only see and access their own beekeeping data</li>
              <li>Administrators can view system-wide statistics (total users, hives, apiaries)</li>
              <li>Administrators can see which users are currently active</li>
              <li>Administrators cannot access individual user&apos;s detailed beekeeping records</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Third-Party Services</h3>
            <p>
              Hive Craic integrates with the following third-party services:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li><strong>Weather Services:</strong> Weather data for inspection logging</li>
            </ul>
            <p className="mt-2">
              These services have their own privacy policies and terms of service.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Your Rights</h3>
            <p>
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Access your personal data stored in Hive Craic</li>
              <li>Export your data using the database export feature</li>
              <li>Request correction of inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Withdraw consent for data processing</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Data Retention</h3>
            <p>
              Your data is retained as long as your account is active. If you delete your account,
              all associated data will be permanently removed from our systems within 30 days.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Cookies and Tracking</h3>
            <p>
              Hive Craic uses essential cookies for:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Maintaining your logged-in session</li>
              <li>Remembering your preferences</li>
            </ul>
            <p className="mt-2">
              We do not use tracking cookies or analytics for advertising purposes.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Children&apos;s Privacy</h3>
            <p>
              Hive Craic is not intended for use by individuals under the age of 16. We do not knowingly
              collect personal information from children under 16.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Changes to Privacy Notice</h3>
            <p>
              We may update this privacy notice from time to time. We will notify users of any material
              changes by updating the &quot;Last Updated&quot; date and, where appropriate, providing
              additional notice.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">Contact Information</h3>
            <p>
              If you have questions or concerns about this privacy notice or how your data is handled,
              please contact us at:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-2">
              <p className="font-semibold">Hive Craic Support</p>
              <p>Email: support@tcbc.ie</p>
              <p>Website: tcbc.ie</p>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mt-6">GDPR Compliance</h3>
            <p>
              For users in the European Union, Hive Craic is committed to compliance with the General
              Data Protection Regulation (GDPR). You have additional rights under GDPR including the
              right to data portability and the right to lodge a complaint with a supervisory authority.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
