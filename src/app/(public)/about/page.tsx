import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About - HiveCraic',
  description: 'About HiveCraic - A comprehensive beekeeping management application',
}

const features = [
  {
    icon: '🏠',
    title: 'Apiary Management',
    description: 'Track all your bee yards and hives in one place with detailed records.',
  },
  {
    icon: '👑',
    title: 'Queen Tracking',
    description: 'Monitor queen age, lineage, performance, and breeding records.',
  },
  {
    icon: '📋',
    title: 'Inspection Logging',
    description: 'Record detailed inspections with automatic weather data integration.',
  },
  {
    icon: '🔬',
    title: 'Varroa Monitoring',
    description: 'Track mite counts, treatment schedules, and colony health.',
  },
  {
    icon: '🐣',
    title: 'Queen Rearing',
    description: 'Manage breeding batches with timeline tracking and mating nucs.',
  },
  {
    icon: '🤖',
    title: 'AI Assistant',
    description: 'Get intelligent help from Mel with access to your hive data.',
  },
  {
    icon: '📚',
    title: 'Knowledge Base',
    description: 'AI-powered answers sourced from beekeeping literature.',
  },
  {
    icon: '📱',
    title: 'Mobile App',
    description: 'Install as a PWA on your phone for easy field access.',
  },
]

const techStack = [
  { name: 'Next.js & React', description: 'Fast, modern web experience' },
  { name: 'TypeScript', description: 'Reliable, maintainable code' },
  { name: 'Supabase', description: 'Secure cloud database' },
  { name: 'OpenAI GPT-4', description: 'AI-powered assistance' },
  { name: 'YOLOv8', description: 'Varroa mite detection' },
  { name: 'PWA', description: 'Works offline on any device' },
]

export default function AboutPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-700 dark:text-amber-300 text-sm font-medium mb-6">
              <span>🍯</span>
              <span>Modern Beekeeping Management</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                HiveCraic
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10">
              A comprehensive beekeeping management application designed to help beekeepers
              of all experience levels track and manage their apiaries, hives, queens, and beekeeping activities.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full hover:from-amber-600 hover:to-amber-700 transition-all font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 text-lg"
              >
                Get Started Free
              </Link>
              <Link
                href="#features"
                className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-all font-semibold border border-slate-200 dark:border-slate-700 text-lg"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Powerful features to help you manage your beekeeping operation efficiently.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Technology Section */}
      <section className="bg-slate-50 dark:bg-slate-800/50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Built with Modern Technology
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Fast, reliable, and secure experience powered by cutting-edge tech.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {techStack.map((tech, index) => (
              <div
                key={index}
                className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center"
              >
                <p className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                  {tech.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tech.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credits Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Crafted with Honeyed Hearts
          </h2>
          <p className="text-amber-100 text-lg mb-6 max-w-2xl mx-auto">
            Built by <strong>tcbc.ie</strong>, alongside the buzzing minds of{' '}
            <strong>Tribes Beekeepers Association</strong> and <strong>Tribes QRBG</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 bg-white text-amber-600 rounded-full hover:bg-amber-50 transition-all font-semibold"
            >
              Start Managing Your Hives
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Questions or Feedback?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            We&apos;d love to hear from you. Reach out anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="mailto:support@tcbc.ie"
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
            >
              <span>📧</span>
              <span>support@tcbc.ie</span>
            </a>
            <a
              href="https://tcbc.ie"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
            >
              <span>🌐</span>
              <span>tcbc.ie</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
