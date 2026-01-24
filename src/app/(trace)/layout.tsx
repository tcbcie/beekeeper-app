export default function TraceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-slate-900 dark:to-slate-950 flex flex-col">
      {/* Trust-focused header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-amber-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              Honey Traceability
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        {children}
      </main>

      {/* Minimal footer */}
      <footer className="pb-6">
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Powered by <span className="text-amber-600 dark:text-amber-400">HiveCraic</span>
        </p>
      </footer>
    </div>
  )
}
