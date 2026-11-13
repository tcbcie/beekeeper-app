// What the apiary map colours its hives by. One "view" at a time (queens,
// inspections, stores, or tasks and treatments), each reducing a hive to a
// tone, a short second line for the hive square, and a sentence for its details.
// The rules are the app's existing ones (inspection-age, stores-level,
// treatment removal), so the map never disagrees with the hive list.

import { daysSince } from '@/lib/date-utils'
import { inspectionAgeTone, isInspectionOverdue, inspectedAgoText } from '@/lib/inspection-age'
import { storesBand, storesWord, storesSeasonStart, formatStoresDate } from '@/lib/stores-level'
import { formatQueenlessLabel } from '@/lib/queenless'
import type { MapHive } from '@/hooks/useApiaryMap'

export type MapView = 'queens' | 'inspections' | 'stores' | 'tasks'

/** good = green, warn = amber with "!", bad = red with "!!", neutral = grey. */
export type MapTone = 'good' | 'warn' | 'bad' | 'neutral'

export interface HiveMark {
  tone: MapTone
  /** Short second line under the hive number (null = none). */
  line: string | null
  /** One sentence for the details panel and screen readers. */
  detail: string
}

export const MAP_VIEW_LABELS: Record<MapView, string> = {
  queens: 'Queens',
  inspections: 'Last inspection',
  stores: 'Winter stores',
  tasks: 'Tasks and treatments',
}

/** The views on offer today: stores is hidden from May to July, like the stores dial. */
export function availableMapViews(today: string): MapView[] {
  const views: MapView[] = ['queens', 'inspections']
  if (storesSeasonStart(today)) views.push('stores')
  views.push('tasks')
  return views
}

/** What each tone means in a view, for the legend (in the order shown). */
export const MAP_VIEW_LEGEND: Record<MapView, { tone: MapTone; label: string }[]> = {
  queens: [
    { tone: 'good', label: 'Has a queen' },
    { tone: 'warn', label: 'No queen recorded' },
    { tone: 'bad', label: 'Queenless' },
    { tone: 'neutral', label: 'Not an active hive' },
  ],
  inspections: [
    { tone: 'good', label: 'Inspected in the last week' },
    { tone: 'warn', label: 'Due soon' },
    { tone: 'bad', label: 'Overdue (over 14 days)' },
    { tone: 'neutral', label: 'Winter, or not known' },
  ],
  stores: [
    { tone: 'good', label: 'Enough' },
    { tone: 'warn', label: 'Top up' },
    { tone: 'bad', label: 'Low' },
    { tone: 'neutral', label: 'Not checked' },
  ],
  tasks: [
    { tone: 'warn', label: 'Open tasks or a treatment on' },
    { tone: 'bad', label: 'Treatment removal overdue' },
    { tone: 'neutral', label: 'Nothing to do' },
  ],
}

const NOT_KNOWN = 'Could not be loaded'

function queenMark(hive: MapHive): HiveMark {
  const queen = hive.queens?.[0]
  if (hive.is_queenless) return { tone: 'bad', line: null, detail: formatQueenlessLabel(hive.queenless_reason) }
  if (hive.status !== 'active') {
    return { tone: 'neutral', line: queen ? `Q${queen.queen_number}` : null, detail: queen ? `Queen ${queen.queen_number}` : 'No queen recorded' }
  }
  if (!queen) return { tone: 'warn', line: null, detail: 'No queen recorded' }
  return { tone: 'good', line: `Q${queen.queen_number}`, detail: `Queen ${queen.queen_number}` }
}

function inspectionMark(hive: MapHive, now: Date): HiveMark {
  if (hive.last_inspection_date === undefined) return { tone: 'neutral', line: null, detail: NOT_KNOWN }
  const days = daysSince(hive.last_inspection_date)
  if (days === null) {
    // Nothing in the last year: overdue in the season, like a hive never inspected.
    return { tone: isInspectionOverdue(null, now) ? 'bad' : 'neutral', line: 'None', detail: 'Not inspected in the last year' }
  }
  const tone = ({ recent: 'good', 'due-soon': 'warn', overdue: 'bad', neutral: 'neutral' } as const)[inspectionAgeTone(days, now)]
  return { tone, line: `${days} d`, detail: inspectedAgoText(days) }
}

function storesMark(hive: MapHive, today: string): HiveMark {
  if (hive.last_stores_level === undefined) return { tone: 'neutral', line: null, detail: NOT_KNOWN }
  const seasonStart = storesSeasonStart(today)
  const level = hive.last_stores_level
  const date = hive.last_stores_date ?? null
  // Only a reading taken for the coming winter counts; anything else is "not checked", never red.
  if (level == null || !date || !seasonStart || date < seasonStart) {
    return { tone: 'neutral', line: null, detail: 'Stores not checked this season' }
  }
  const tone = ({ enough: 'good', top_up: 'warn', low: 'bad' } as const)[storesBand(level)]
  const when = formatStoresDate(date, today)
  return { tone, line: `${Math.round(level)}%`, detail: `Stores ${storesWord(level).toLowerCase()} (${Math.round(level)}%)${when ? `, checked ${when}` : ''}` }
}

function tasksMark(hive: MapHive): HiveMark {
  if (hive.active_tasks_count === undefined && hive.active_treatment === undefined) {
    return { tone: 'neutral', line: null, detail: NOT_KNOWN }
  }
  const tasks = hive.active_tasks_count ?? 0
  const treatment = hive.active_treatment ?? null
  const parts: string[] = []
  if (tasks > 0) parts.push(`${tasks} open ${tasks === 1 ? 'task' : 'tasks'}`)
  if (treatment) parts.push(`${treatment.treatment_type} on${treatment.overdue ? ', removal overdue' : ''}`)
  if (parts.length === 0) return { tone: 'neutral', line: null, detail: 'No open tasks or treatments' }
  return {
    tone: treatment?.overdue ? 'bad' : 'warn',
    line: tasks > 0 ? `${tasks} to do` : 'Treated',
    detail: parts.join(' · '),
  }
}

/** A hive's tone, second line and sentence in the given view. */
export function hiveMark(hive: MapHive, view: MapView, today: string, now: Date = new Date()): HiveMark {
  switch (view) {
    case 'inspections': return inspectionMark(hive, now)
    case 'stores': return storesMark(hive, today)
    case 'tasks': return tasksMark(hive)
    default: return queenMark(hive)
  }
}

/** Border colour for each tone (hive squares and legend swatches). */
export const MAP_TONE_BORDER: Record<MapTone, string> = {
  good: 'border-forest-600',
  warn: 'border-amber-500',
  bad: 'border-red-500',
  neutral: 'border-border',
}

/**
 * The sign shown with amber and red, so the meaning never rests on colour
 * alone: "!" for attention, "!!" for urgent.
 */
export const MAP_TONE_SIGN: Record<MapTone, { text: string; className: string } | null> = {
  good: null,
  neutral: null,
  warn: { text: '!', className: 'bg-amber-500 text-black' },
  bad: { text: '!!', className: 'bg-red-600 text-white' },
}
