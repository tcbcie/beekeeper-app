import { isVisitSeason, VISIT_DUE_AFTER_DAYS } from '@/lib/dashboard-todo'

/**
 * How long since a hive was inspected, for the Hives badge and its "Need inspection" count. One
 * rule with the dashboard: more than 14 local calendar days, and nothing is overdue from November
 * to February, when beekeepers rightly leave hives closed (owner decision 2, 04/11/2026). Inspections
 * only: a feed or treatment must not hide an overdue inspection.
 */

export type InspectionAgeTone = 'recent' | 'due-soon' | 'overdue' | 'neutral'

/** True when a hive with this many days since inspection (null = never) needs one now */
export function isInspectionOverdue(days: number | null, now: Date = new Date()): boolean {
  if (!isVisitSeason(now)) return false
  return days === null || days > VISIT_DUE_AFTER_DAYS
}

/** Badge colour: green under 7 days, amber up to 14, red after; grey in winter or when never inspected */
export function inspectionAgeTone(days: number | null, now: Date = new Date()): InspectionAgeTone {
  if (days === null || !isVisitSeason(now)) return 'neutral'
  if (days < 7) return 'recent'
  if (days <= VISIT_DUE_AFTER_DAYS) return 'due-soon'
  return 'overdue'
}

/** Badge fill, text and border for each tone (hive and apiary cards) */
export const INSPECTION_BADGE_CLASSES: Record<InspectionAgeTone, string> = {
  recent: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
  'due-soon': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
  overdue: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
  neutral: 'bg-surface-secondary text-text-secondary border-border',
}

/** "Inspected today", "Inspected 1 day ago", "Inspected 23 days ago" or "Never inspected" */
export function inspectedAgoText(days: number | null): string {
  if (days === null) return 'Never inspected'
  if (days === 0) return 'Inspected today'
  return `Inspected ${days} ${days === 1 ? 'day' : 'days'} ago`
}
