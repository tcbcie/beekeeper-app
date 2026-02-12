/**
 * Skeleton loading primitives for content placeholders.
 * Uses the existing animate-shimmer animation from globals.css.
 */

interface SkeletonProps {
  className?: string
}

/** Base skeleton primitive — a rounded rectangle with shimmer animation */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-sage-100 dark:bg-slate-800 rounded animate-shimmer ${className}`}
      aria-hidden="true"
    />
  )
}

/** Matches the StatCard layout: icon circle on the right + two text lines on the left */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
      </div>
    </div>
  )
}

/** Table/list row placeholder */
export function SkeletonRow({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 ${className}`}
      aria-hidden="true"
    >
      <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full flex-shrink-0" />
    </div>
  )
}
