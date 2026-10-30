import { differenceInCalendarDays, parseLocalDate } from '@/lib/date-utils'
import { formatQueenlessShortLabel } from '@/lib/queenless'
import { isGettingLight, isPossibleSwarm, SWARM_DROP_WINDOW_HOURS } from '@/lib/scale-alerts'
import { getSeason } from '@/lib/seasons'
import type { DashboardApiary, DashboardScaleSummary } from '@/types/dashboard'

/**
 * The dashboard's To do list, built from the hive lists get_dashboard_overview returns per apiary.
 * One place decides what counts as a job, so the To do list and each apiary row's "N jobs" pill
 * always agree.
 */

export type TodoTone = 'red' | 'amber' | 'blue'

export interface TodoItem {
  key: string
  /** Also shown in the seasonal top card, so the To do list leaves it out; the apiary's pill counts it */
  inLead?: boolean
  tone: TodoTone
  title: string
  detail: string
  action: { label: string; href: string }
}

const TONE_ORDER: Record<TodoTone, number> = { red: 0, amber: 1, blue: 2 }

/** "28 August" */
export function formatDayMonth(date: string | null | undefined): string | null {
  if (!date) return null
  const parsed = parseLocalDate(date)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-IE', { day: 'numeric', month: 'long' })
}

// The RPC payload is jsonb at the wire boundary: a stale or partial payload must not crash the list
function listOf<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

/** An apiary is due a visit after more than 14 days with no record of any kind */
export const VISIT_DUE_AFTER_DAYS = 14

/** Days since the apiary's latest record of any kind (a feed or treatment is a visit too), or null */
export function daysSinceLastVisit(apiary: DashboardApiary): number | null {
  const date = apiary.lastVisitDate ?? apiary.lastInspectionDate
  if (!date) return null
  const last = parseLocalDate(date)
  if (Number.isNaN(last.getTime())) return null
  return Math.max(differenceInCalendarDays(last, new Date()), 0)
}

/** March to October: from November to February beekeepers rightly stay away for weeks (owner, 30 October 2026) */
export function isVisitSeason(now: Date = new Date()): boolean {
  const month = now.getMonth() + 1
  return month >= 3 && month <= 10
}

export function isVisitOverdue(apiary: DashboardApiary): boolean {
  if (apiary.hiveCount <= 0 || !isVisitSeason()) return false
  const days = daysSinceLastVisit(apiary)
  return days === null || days > VISIT_DUE_AFTER_DAYS
}

/** "Tuesday afternoon" */
function describeWhen(iso: string): string {
  const date = new Date(iso)
  const hour = date.getHours()
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  return `${date.toLocaleDateString('en-IE', { weekday: 'long' })} ${part}`
}

const inspectHiveHref = (hiveId: string) => `/dashboard/records?hive=${hiveId}&type=inspection`
const openHiveHref = (hiveId: string) => `/dashboard/hives/${hiveId}`

/**
 * The jobs at one apiary, most pressing first (red, then amber, then blue). `scales` adds the
 * scale alerts once the summaries have loaded (src/hooks/useScaleSummaries.ts).
 */
export function buildApiaryTodos(apiary: DashboardApiary, scales?: DashboardScaleSummary[]): TodoItem[] {
  const items: TodoItem[] = []

  // The apiary, not each hive: a beekeeper who visits and leaves a hive closed does so on purpose,
  // so only an apiary with no record at all for more than 14 days is a job (owner, 29 October 2026)
  if (isVisitOverdue(apiary)) {
    const days = daysSinceLastVisit(apiary)
    items.push({
      key: `${apiary.id}:visit`,
      tone: 'red',
      title: `Visit ${apiary.name}`,
      detail: days === null ? 'no visit recorded yet' : `last visit ${days} days ago`,
      action: { label: 'Inspect', href: `/dashboard/records?create=inspection&apiary=${apiary.id}` },
    })
  }

  for (const hive of listOf(apiary.queenlessHives)) {
    const reason = formatQueenlessShortLabel(hive.reason)
    items.push({
      key: `${apiary.id}:queenless:${hive.id}`,
      tone: 'red',
      title: `Hive ${hive.number} is queenless`,
      detail: reason ? `marked queenless: ${reason.toLowerCase()}` : 'marked queenless',
      action: { label: 'Open', href: openHiveHref(hive.id) },
    })
  }

  for (const hive of listOf(apiary.queenCheckHives)) {
    const broodless = formatDayMonth(hive.broodlessSince)
    const lastQueen = formatDayMonth(hive.lastQueenDate)
    items.push({
      key: `${apiary.id}:queen:${hive.id}`,
      tone: 'amber',
      title: `Hive ${hive.number}: check the queen`,
      detail: broodless
        ? `no brood seen since ${broodless}`
        : lastQueen ? `no queen or eggs seen since ${lastQueen}` : 'no queen or eggs recorded yet',
      action: { label: 'Inspect', href: inspectHiveHref(hive.id) },
    })
  }

  for (const hive of listOf(apiary.highVarroaHives)) {
    items.push({
      key: `${apiary.id}:varroa:${hive.id}`,
      tone: 'amber',
      title: `Hive ${hive.number}: high varroa`,
      detail: typeof hive.rate === 'number' ? `${hive.rate}% at a check in the last 30 days` : 'over 3% in the last 30 days',
      action: { label: 'Open', href: openHiveHref(hive.id) },
    })
  }

  const season = getSeason()
  for (const scale of listOf(scales)) {
    const hive = scale.hiveNumber ? `Hive ${scale.hiveNumber}` : 'A hive with a scale'
    if (isPossibleSwarm(scale.largestDrop3h)) {
      items.push({
        key: `${apiary.id}:swarm:${scale.hiveId}`,
        inLead: season === 'swarm',
        tone: 'red',
        title: `${hive}: possible swarm`,
        detail: `lost ${scale.largestDrop3h.kg.toFixed(1)} kg within ${SWARM_DROP_WINDOW_HOURS} hours, ${describeWhen(scale.largestDrop3h.at)}`,
        action: { label: 'Inspect', href: inspectHiveHref(scale.hiveId) },
      })
    }
    if (isGettingLight(scale.change7d)) {
      items.push({
        key: `${apiary.id}:light:${scale.hiveId}`,
        inLead: season === 'autumn' || season === 'winter',
        tone: 'amber',
        title: `${hive} getting light`,
        detail: `${scale.change7d.toFixed(1)} kg in 7 days, check stores`,
        action: { label: 'Open', href: openHiveHref(scale.hiveId) },
      })
    }
  }

  const dueTasks = listOf(apiary.dueTasks)
  const dueCount = Math.max(apiary.dueTaskCount ?? 0, dueTasks.length)
  if (dueCount > 0) {
    const others = dueCount - 1
    items.push({
      key: `${apiary.id}:tasks`,
      tone: 'blue',
      title: dueTasks[0]?.title || `${dueCount} tasks due`,
      detail: others > 0 ? `task due, and ${others} more` : 'task due',
      // The count is the Tasks page "Due" view, so the link opens that view for this apiary
      action: { label: 'Tasks', href: `/dashboard/tasks?apiary=${apiary.id}&view=due` },
    })
  }

  return items.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone])
}
