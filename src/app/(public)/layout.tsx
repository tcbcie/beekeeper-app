import Link from 'next/link'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple header for public pages */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-foreground hover:text-amber-600 transition-colors">
            HiveCraic
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Simple footer */}
      <footer className="border-t border-border bg-surface mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-text-secondary">
          <p>&copy; {new Date().getFullYear()} HiveCraic. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
