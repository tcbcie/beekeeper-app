import Link from 'next/link'
import Image from 'next/image'
import PageShell from '@/components/ui/PageShell'
import Panel from '@/components/ui/Panel'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PageShell className="min-h-screen" innerClassName="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 px-4 pt-3 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Panel padding="sm" className="bg-background/70">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="group flex items-center gap-3">
                <Image src="/logo.png" alt="HiveCraic" width={40} height={40} className="h-10 w-10" />
                <div className="leading-tight">
                  <span className="block font-serif text-xl text-foreground">HiveCraic</span>
                  <span className="block text-xs uppercase tracking-[0.14em] text-text-tertiary">
                    Field Journal
                  </span>
                </div>
              </Link>

              <nav className="flex items-center gap-2">
                <Link
                  href="/about"
                  className="fj-chip fj-chip-sm fj-chip-neutral"
                >
                  About
                </Link>
                <Link
                  href="/login"
                  className="fj-btn fj-btn-sm bg-forest-600 text-white hover:bg-forest-700"
                >
                  Login
                </Link>
              </nav>
            </div>
          </Panel>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>

      <footer className="px-4 pb-6 sm:px-6 sm:pb-8">
        <div className="mx-auto max-w-6xl">
          <Panel padding="lg" className="bg-surface/80">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Image src="/logo_trans.png" alt="HiveCraic" width={32} height={32} className="h-8 w-8" />
                  <span className="font-serif text-lg text-foreground">HiveCraic</span>
                </div>
                <p className="text-sm text-text-secondary">
                  Modern beekeeping management for beekeepers of all levels.
                </p>
              </div>

              <div>
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-text-tertiary">Quick Links</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/about" className="text-text-secondary hover:text-forest-700 dark:hover:text-forest-300 transition-colors">
                      About Us
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-text-tertiary">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/privacy" className="text-text-secondary hover:text-forest-700 dark:hover:text-forest-300 transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-text-secondary hover:text-forest-700 dark:hover:text-forest-300 transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms#licence" className="text-text-secondary hover:text-forest-700 dark:hover:text-forest-300 transition-colors">
                      Licence (EULA)
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
              <p className="text-sm text-text-tertiary">
                &copy; {new Date().getFullYear()} HiveCraic. All rights reserved.
              </p>
              <p className="text-sm text-text-tertiary">
                Crafted by <span className="font-medium text-amber-700 dark:text-amber-300">tcbc.ie</span>
              </p>
            </div>
          </Panel>
        </div>
      </footer>
    </PageShell>
  )
}
