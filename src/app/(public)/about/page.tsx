import { Metadata } from 'next'
import Link from 'next/link'
import { Globe2, Mail } from 'lucide-react'
import AppIcon from '@/components/icons/AppIcon'
import Panel from '@/components/ui/Panel'
import PageHeader from '@/components/ui/PageHeader'
import TextLink from '@/components/ui/TextLink'
import { aboutFeatureIcons } from '@/lib/iconography'

export const metadata: Metadata = {
  title: 'About - HiveCraic',
  description: 'About HiveCraic - A comprehensive beekeeping management application',
}

const features = [
  {
    icon: aboutFeatureIcons.apiaryManagement,
    title: 'Apiary Management',
    description: 'Track all your bee yards and hives in one place with detailed records.',
  },
  {
    icon: aboutFeatureIcons.queenTracking,
    title: 'Queen Tracking',
    description: 'Monitor queen age, lineage, performance, and breeding records.',
  },
  {
    icon: aboutFeatureIcons.inspectionLogging,
    title: 'Inspection Logging',
    description: 'Record detailed inspections with automatic weather data integration.',
  },
  {
    icon: aboutFeatureIcons.varroaMonitoring,
    title: 'Varroa Monitoring',
    description: 'Track mite counts, treatment schedules, and colony health.',
  },
  {
    icon: aboutFeatureIcons.queenRearing,
    title: 'Queen Rearing',
    description: 'Manage breeding batches with timeline tracking and mating nucs.',
  },
  {
    icon: aboutFeatureIcons.aiAssistant,
    title: 'AI Assistant',
    description: 'Get intelligent help from Mel with access to your hive data.',
  },
  {
    icon: aboutFeatureIcons.knowledgeBase,
    title: 'Knowledge Base',
    description: 'AI-powered answers sourced from beekeeping literature.',
  },
  {
    icon: aboutFeatureIcons.mobileApp,
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
    <div className="space-y-8 sm:space-y-10">
      <Panel padding="lg" className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-100/70 via-transparent to-forest-100/40 dark:from-amber-900/15 dark:to-forest-900/10" />
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10" />
        <div className="relative">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            <span aria-hidden="true">Honey Season Tools</span>
          </div>

          <PageHeader
            eyebrow="About HiveCraic"
            title="A Practical Field Journal for Modern Beekeeping"
            description="HiveCraic helps beekeepers track apiaries, hives, queens, inspections, treatments, and team collaboration with a mobile-friendly workflow designed for real field use."
            actions={
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className="fj-btn bg-forest-600 text-white hover:bg-forest-700">
                  Get Started
                </Link>
                <Link href="#features" className="fj-chip fj-chip-sm fj-chip-neutral">
                  Explore Features
                </Link>
              </div>
            }
          />
        </div>
      </Panel>

      <Panel padding="lg" className="scroll-mt-24" >
        <div id="features" className="mb-8">
          <PageHeader
            eyebrow="Capabilities"
            title="Everything You Need"
            description="A single place to record field activity, monitor colony health, and coordinate work across seasons."
            className="[&_h1]:text-2xl [&_h1]:sm:text-3xl"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-surface/70 p-5 transition-all duration-300 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-lg"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20 group-hover:scale-105 transition-transform">
                <AppIcon icon={feature.icon} size="lg" className="text-amber-700 dark:text-amber-300" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-text-secondary">{feature.description}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel padding="lg">
        <div className="mb-8">
          <PageHeader
            eyebrow="Technology"
            title="Built for Reliability"
            description="A modern web stack with offline support, strong typing, and AI-assisted workflows where useful."
            className="[&_h1]:text-2xl [&_h1]:sm:text-3xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {techStack.map((tech) => (
            <div
              key={tech.name}
              className="rounded-xl border border-border bg-surface/70 p-4 text-center"
            >
              <p className="mb-1 text-sm font-semibold text-foreground">{tech.name}</p>
              <p className="text-xs text-text-secondary">{tech.description}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel padding="lg" className="relative overflow-hidden border border-amber-300/70 dark:border-amber-800/70">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/15 via-transparent to-orange-500/10 dark:from-amber-500/10 dark:to-orange-500/10" />
        <div className="relative text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">
            Credits
          </p>
          <h2 className="mb-4 font-serif text-2xl sm:text-3xl text-foreground">
            Crafted with Honeyed Hearts
          </h2>
          <p className="mx-auto mb-6 max-w-2xl text-base text-text-secondary">
            Built by <strong className="text-foreground">tcbc.ie</strong>, alongside the buzzing minds of{' '}
            <strong className="text-foreground">Tribes Beekeepers Association</strong> and{' '}
            <strong className="text-foreground">Tribes QRBG</strong>.
          </p>
          <div className="flex justify-center">
            <Link href="/login" className="fj-btn bg-forest-600 text-white hover:bg-forest-700">
              Start Managing Your Hives
            </Link>
          </div>
        </div>
      </Panel>

      <Panel padding="lg">
        <div className="text-center">
          <PageHeader
            eyebrow="Contact"
            title="Questions or Feedback?"
            description="We’d love to hear from you. Reach out anytime."
            className="justify-center text-center [&>div]:mx-auto [&>div]:max-w-xl [&_h1]:text-2xl"
          />

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TextLink
              href="mailto:support@tcbc.ie"
              className="fj-chip fj-chip-sm fj-chip-neutral"
            >
              <Mail className="h-4 w-4" />
              <span>support@tcbc.ie</span>
            </TextLink>
            <TextLink
              href="https://tcbc.ie"
              external
              className="fj-chip fj-chip-sm fj-chip-neutral"
            >
              <Globe2 className="h-4 w-4" />
              <span>tcbc.ie</span>
            </TextLink>
          </div>
        </div>
      </Panel>
    </div>
  )
}
