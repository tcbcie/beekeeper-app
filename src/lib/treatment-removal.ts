import {
  parseLocalDate,
  toLocalDateString,
  differenceInCalendarDays,
  formatLocalDate,
} from '@/lib/date-utils'

/**
 * One definition of when a varroa treatment is still on a hive.
 *
 * Four surfaces ask this question — the treatment form, the records page, the
 * hives list and the hive detail page — and they must not drift apart, so the
 * rule lives here rather than being re-expressed at each call site.
 *
 * A treatment row carries two nullable dates. `planned_removal_date` is when it
 * is due to come out; NULL means there is nothing to remove, which is the
 * correct state for a single-application oxalic dribble and for every treatment
 * recorded before this feature existed. `removed_date` is when it actually came
 * out.
 *
 * That NULL default is load-bearing: it is why the 158 treatments already in the
 * database read as "nothing on" rather than lighting up every hive at once.
 */
export type TreatmentRemovalState = 'none' | 'on' | 'overdue'

export interface TreatmentRemovalDates {
  planned_removal_date?: string | null
  removed_date?: string | null
}

/**
 * Adds whole days to a `YYYY-MM-DD` string, staying in local time.
 *
 * `new Date('2026-09-03')` parses as midnight UTC, which is the previous day for
 * anyone behind it, so the date helpers are used rather than the constructor.
 */
export function addDays(dateString: string, days: number): string {
  if (!dateString || !Number.isFinite(days)) return ''
  const date = parseLocalDate(dateString)
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + days)
  return toLocalDateString(date)
}

/**
 * The date a treatment should come off, or '' when the product has nothing to
 * remove. Never throws on the free-text products that match no product row —
 * `removalAfterDays` is simply null for those and the user sets the date by hand.
 */
export function computePlannedRemovalDate(
  treatmentDate: string,
  removalAfterDays: number | null | undefined
): string {
  if (!treatmentDate || removalAfterDays == null || removalAfterDays <= 0) return ''
  return addDays(treatmentDate, removalAfterDays)
}

/**
 * Whether a treatment is still on the hive, and whether it is past due.
 *
 * `today` is injectable so callers can derive a whole list against one value
 * rather than re-reading the clock per row, and so the behaviour is testable.
 */
export function getTreatmentRemovalState(
  treatment: TreatmentRemovalDates,
  today: string = toLocalDateString(new Date())
): TreatmentRemovalState {
  const planned = treatment.planned_removal_date
  if (!planned) return 'none'
  if (treatment.removed_date) return 'none'
  return daysUntilRemoval(planned, today) < 0 ? 'overdue' : 'on'
}

/** Days from `today` to the removal date. Negative once overdue. */
export function daysUntilRemoval(
  plannedRemovalDate: string,
  today: string = toLocalDateString(new Date())
): number {
  return differenceInCalendarDays(parseLocalDate(today), parseLocalDate(plannedRemovalDate))
}

/**
 * Short label for the hive card and detail page, e.g. "Apivar — remove by 12 Oct"
 * or "Apivar — removal overdue". Returns '' when there is nothing to show, so a
 * caller can render on truthiness alone.
 */
export function formatRemovalLabel(
  treatmentType: string,
  treatment: TreatmentRemovalDates,
  today?: string
): string {
  const state = getTreatmentRemovalState(treatment, today)
  if (state === 'none') return ''

  const product = treatmentType?.trim() || 'Treatment'
  if (state === 'overdue') return `${product} — removal overdue`

  const formatted = formatLocalDate(treatment.planned_removal_date as string, 'en-IE', {
    day: 'numeric',
    month: 'short',
  })
  return `${product} — remove by ${formatted}`
}
