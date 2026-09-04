/**
 * Shared vocabulary for deciding what a beekeeper should do next.
 *
 * "Overdue" and "priority order" both existed twice in this codebase before
 * this file — in `src/lib/ai/tools/tasks.ts` (so Mel could answer the question)
 * and in `src/components/UpcomingEvents.tsx` (so the dashboard could sort) —
 * but never on the Tasks screen itself. Keeping the definitions here means the
 * assistant, the dashboard widget and the list all tell one story.
 */

import { differenceInCalendarDays, parseLocalDate, toLocalDateString } from '@/lib/date-utils'

/**
 * urgent first, then high, normal, low. Unknown values sort last.
 *
 * Readonly because this is now shared across modules rather than private to
 * one: a stray write here would silently reorder the dashboard widget as well
 * as the Tasks list. Prefer `priorityRank`, which handles null and unknowns.
 */
export const PRIORITY_ORDER: Readonly<Record<string, number>> =
  Object.freeze({ urgent: 0, high: 1, normal: 2, low: 3 })

export const priorityRank = (priority: string | null | undefined): number =>
  (priority && PRIORITY_ORDER[priority] !== undefined) ? PRIORITY_ORDER[priority] : 999

/** The date presets on the Tasks screen. */
export type TaskView = 'due' | 'week' | 'later' | 'done' | 'all'

export const TASK_VIEWS: readonly TaskView[] = ['due', 'week', 'later', 'done', 'all'] as const

export const isTaskView = (value: unknown): value is TaskView =>
  typeof value === 'string' && (TASK_VIEWS as readonly string[]).includes(value)

export const TASK_VIEW_LABELS: Record<TaskView, string> = {
  due: 'Due now',
  week: 'This week',
  later: 'Later',
  done: 'Done',
  all: 'All',
}

/**
 * Shown when a preset is selected and matches nothing. The generic "No tasks or
 * events found" would read as data loss on a tidy account, which is the normal
 * case for "Due now".
 */
export const TASK_VIEW_EMPTY_COPY: Record<TaskView, string> = {
  due: 'Nothing due now. The counts above show what is coming.',
  week: 'Nothing due in the next seven days.',
  later: 'Nothing scheduled beyond the next seven days.',
  done: 'Nothing completed yet in this period.',
  all: 'No tasks or events found',
}

/** Today and the end of the seven-day window, as comparable ISO date strings. */
export function taskDateBounds(now: Date = new Date()) {
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)
  return { today: toLocalDateString(now), weekEnd: toLocalDateString(weekEnd) }
}

interface TriageRow {
  completed: boolean
  start_date: string
  priority: string | null
  event_type: string
  batch_id: string | null
}

export function matchesTaskView(
  task: TriageRow,
  view: TaskView,
  today: string,
  weekEnd: string,
): boolean {
  switch (view) {
    case 'due':
      return !task.completed && task.start_date <= today
    case 'week':
      return !task.completed && task.start_date > today && task.start_date <= weekEnd
    case 'later':
      return !task.completed && task.start_date > weekEnd
    case 'done':
      return task.completed
    case 'all':
    default:
      return true
  }
}

/**
 * The rearing-batch trigger (`sync_batch_dates_to_tasks`) writes four calendar
 * milestones per batch — Acceptance Check, 1st/2nd Cage Option, Expected
 * Emergence — as events carrying the batch's id. They have no completion path,
 * so they accumulate for the life of the account and drown the real work.
 *
 * Identified by the foreign key rather than by title, deliberately: the trigger
 * itself matches on `title LIKE 'Acceptance Check: %'`, and that fragility is
 * not worth repeating.
 */
export const isBatchMilestone = (task: TriageRow): boolean =>
  task.event_type === 'event' && task.batch_id !== null

/** Nearest date first; same date, most urgent first. */
export const compareTaskUrgency = (a: TriageRow, b: TriageRow): number =>
  a.start_date === b.start_date
    ? priorityRank(a.priority) - priorityRank(b.priority)
    : a.start_date.localeCompare(b.start_date)

/**
 * The status line under a task's date. Null once completed, or when the task is
 * simply scheduled for a future day and the date already says everything.
 */
export function dueLabel(task: TriageRow, today: string): string | null {
  if (task.completed) return null
  if (task.start_date === today) return 'Today'
  if (task.start_date > today) return null

  // Via the shared helper rather than raw millisecond arithmetic, so this
  // agrees with every other day count in the application.
  const elapsed = differenceInCalendarDays(parseLocalDate(task.start_date), parseLocalDate(today))

  // parseLocalDate returns an Invalid Date for anything that is not a
  // YYYY-MM-DD prefix, and Math.max(1, NaN) is NaN — a floor that does not
  // floor. Rather than render "Overdue — NaN days", fall back to the word that
  // is true whatever the date said.
  if (!Number.isFinite(elapsed)) return 'Overdue'

  const days = Math.max(1, elapsed)
  return `Overdue — ${days} ${days === 1 ? 'day' : 'days'}`
}
