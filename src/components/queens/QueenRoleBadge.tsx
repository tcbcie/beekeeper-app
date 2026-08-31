import { isProductionQueen, queenRoleLabel } from '@/types/queen'

// Amber badge marking a non-production (breeder/reference/drone-source) queen. Renders
// nothing for production queens. Single source of truth for the role badge styling.
export default function QueenRoleBadge({ role, className = '' }: { role?: string | null; className?: string }) {
  if (isProductionQueen(role)) return null
  return (
    <span className={`px-2 py-0.5 text-sm font-medium rounded border border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ${className}`}>
      {queenRoleLabel(role)}
    </span>
  )
}
