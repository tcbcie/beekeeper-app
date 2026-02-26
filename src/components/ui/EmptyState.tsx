import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import Panel from '@/components/ui/Panel'

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
    <Panel padding="lg" className="text-center">
      <Icon size={48} className="mx-auto mb-4 text-text-tertiary" />
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-text-tertiary mb-6 max-w-md mx-auto">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="fj-btn bg-forest-600 text-white hover:bg-forest-700"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && actionOnClick && !actionHref && (
        <button
          onClick={actionOnClick}
          className="fj-btn bg-forest-600 text-white hover:bg-forest-700"
        >
          {actionLabel}
        </button>
      )}
    </Panel>
  )
}
