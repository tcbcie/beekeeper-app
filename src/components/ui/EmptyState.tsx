import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  actionOnClick?: () => void
}

/**
 * Reusable empty state component for pages with no data.
 * Displays a centred icon, heading, description, and optional action button.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
}: EmptyStateProps) {
  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow p-12 text-center border border-border">
      <Icon size={48} className="mx-auto mb-4 text-text-tertiary" />
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-text-tertiary mb-6 max-w-md mx-auto">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-block px-4 py-2 bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 font-medium"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && actionOnClick && !actionHref && (
        <button
          onClick={actionOnClick}
          className="px-4 py-2 bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
