import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Structural placeholder for the dashboard while auth resolves.
 *
 * It deliberately mirrors the real layout's chrome (Navbar wrapper classes +
 * heights, the max-w-7xl content container, the desktop sidebar column) so that
 * when the real layout replaces it the Navbar position and content top stay put
 * -- avoiding the large Cumulative Layout Shift a centred "Loading…" spinner
 * caused when it was swapped for the top-anchored app shell.
 */
export default function DashboardShellSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-hidden="true">
      {/* Navbar placeholder — matches Navbar.tsx wrapper + height */}
      <div className="bg-surface/80 dark:bg-surface/80 border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 !rounded-md" />
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-8 w-8 !rounded-full" />
          </div>
        </div>
      </div>

      {/* Content container — matches the real layout's padding/structure */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-20 md:pb-6">
        <div className="flex gap-4 md:gap-6">
          {/* Sidebar column (desktop only, hidden on mobile like the real one) */}
          <div className="hidden md:block w-56 shrink-0">
            <Skeleton className="h-[60vh] w-full !rounded-lg" />
          </div>
          <main className="flex-1 w-full min-w-0 space-y-4">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-24 w-full !rounded-lg" />
            <Skeleton className="h-40 w-full !rounded-lg" />
          </main>
        </div>
      </div>
    </div>
  )
}
