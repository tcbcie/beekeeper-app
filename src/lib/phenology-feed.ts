import { EMBED_FIRST_YEAR } from '@/lib/embed-regions'
import { calculateGDDFromDaily, type OpenMeteoDaily } from '@/lib/gdd'
import { isIsoDate } from '@/lib/dublin-date'

/**
 * Builds the public phenology feed (version 1) served by /api/embed/phenology for tcbc.ie.
 * Contract: /opt/projects/tcbcie/docs/hivecraic-phenology-api-brief.md, docs/features/tcbc-phenology-feed.md.
 * All GDD values come from calculateGDDFromDaily, so the formula has one owner (src/lib/gdd.ts).
 */

export const DEFAULT_SUM_DATES = ['02-01', '03-01', '04-01', '05-01']
const MAX_YEARS = 3
const MAX_DATES = 12
const MAX_EVENTS = 100

/** One row of a public_<region>_gdd view, only the columns the feed needs. */
export interface PublicGddRow {
  vegetation_name: string | null
  year: number
  start_date: string
  end_date: string | null
  gdd_value: number | string | null
}

export interface PhenologyObservation {
  start: string
  end: string | null
  gdd: number | null
}

export interface PhenologyEvent {
  key: string
  name: string
  category: 'plant' | 'colony'
  observations: Record<string, PhenologyObservation | null>
}

export interface GddSum {
  date: string
  values: Record<string, number | null>
  reached_previous_year: Record<string, string | null>
}

/** "2025,2026" → [2025, 2026]: 1–3 distinct years from EMBED_FIRST_YEAR to this year, ascending; else null. */
export function parseYears(raw: string | null, currentYear: number): number[] | null {
  if (!raw) return null
  const parts = raw.split(',')
  if (!parts.every(p => /^\d{4}$/.test(p))) return null
  const years = [...new Set(parts.map(Number))].sort((a, b) => a - b)
  if (years.length < 1 || years.length > MAX_YEARS) return null
  return years.every(y => y >= EMBED_FIRST_YEAR && y <= currentYear) ? years : null
}

/** "02-01,03-01" → distinct real MM-DD days (29 February allowed) in calendar order, up to 12; else null. */
export function parseDates(raw: string | null): string[] | null {
  if (raw === null || raw === '') return DEFAULT_SUM_DATES
  const parts = raw.split(',')
  if (parts.length > MAX_DATES || !parts.every(p => /^\d{2}-\d{2}$/.test(p) && isIsoDate(`2024-${p}`))) return null
  return [...new Set(parts)].sort()
}

/** Stable slug of the full vegetation name: "Cherry plum (Prunus cerasifera)" → "cherry-plum-prunus-cerasifera". */
export function eventKey(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function sliceDaily(daily: OpenMeteoDaily, count: number): OpenMeteoDaily {
  return {
    time: daily.time.slice(0, count),
    temperature_2m_max: daily.temperature_2m_max.slice(0, count),
    temperature_2m_min: daily.temperature_2m_min.slice(0, count),
  }
}

/**
 * GDD accumulated from 1 January to `date` inclusive, or null when the date is after `today`, is not
 * a real date, or the archive has no temperatures for it yet.
 */
export function gddOnDate(daily: OpenMeteoDaily | undefined, date: string, today: string): number | null {
  if (!daily || !isIsoDate(date) || date > today) return null
  const index = daily.time.indexOf(date)
  if (index < 0 || daily.temperature_2m_max[index] === null || daily.temperature_2m_min[index] === null) return null
  return calculateGDDFromDaily(sliceDaily(daily, index + 1))
}

/** The first date whose running GDD total reached `target`, or null when it never did. */
export function dateReached(daily: OpenMeteoDaily | undefined, target: number): string | null {
  if (!daily) return null
  for (let i = 0; i < daily.time.length; i++) {
    if (calculateGDDFromDaily(sliceDaily(daily, i + 1)) >= target) return daily.time[i]
  }
  return null
}

const toGdd = (value: number | string | null): number | null => {
  const n = value === null ? NaN : Number(value)
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null
}

const latestOf = (a: string | null, b: string | null) => (a && b ? (a > b ? a : b) : a ?? b)

/** Days from 1 January of the season to the start (negative for a December start), for season order. */
const seasonDay = (year: string, start: string) => (Date.parse(start) - Date.parse(`${year}-01-01`)) / 86_400_000

/**
 * Community mode: one row per event, keyed by name. When several people recorded an event in a year,
 * the earliest start wins with that record's GDD (on a tie, the lower GDD), and the latest end is kept.
 * A record without a GDD value falls back to the GDD accumulated on its start date.
 * Events are ordered by when they started in the latest year they were seen, and capped at 100.
 */
export function buildEvents(
  rows: PublicGddRow[],
  years: number[],
  dailyByYear: Map<number, OpenMeteoDaily>,
  today: string
): PhenologyEvent[] {
  const events = new Map<string, PhenologyEvent>()
  for (const row of rows) {
    const name = row.vegetation_name?.trim()
    const key = name ? eventKey(name) : ''
    if (!name || !key || !years.includes(row.year) || !isIsoDate(row.start_date)) continue

    let event = events.get(key)
    if (!event) {
      event = {
        key,
        name,
        category: /^(brood|pollen)\b/i.test(name) ? 'colony' : 'plant',
        observations: Object.fromEntries(years.map(y => [String(y), null])),
      }
      events.set(key, event)
    }

    const end = row.end_date && isIsoDate(row.end_date) ? row.end_date : null
    const gdd = toGdd(row.gdd_value) ?? gddOnDate(dailyByYear.get(row.year), row.start_date, today)
    const year = String(row.year)
    const current = event.observations[year]
    if (!current) {
      event.observations[year] = { start: row.start_date, end, gdd }
      continue
    }
    const isEarlier =
      row.start_date < current.start ||
      (row.start_date === current.start && gdd !== null && (current.gdd === null || gdd < current.gdd))
    event.observations[year] = isEarlier
      ? { start: row.start_date, end: latestOf(current.end, end), gdd }
      : { ...current, end: latestOf(current.end, end) }
  }

  const order = (event: PhenologyEvent) => {
    const year = [...years].reverse().map(String).find(y => event.observations[y])
    return year ? seasonDay(year, event.observations[year]!.start) : Infinity
  }
  return [...events.values()]
    .sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name))
    .slice(0, MAX_EVENTS)
}

/**
 * For each MM-DD date: the GDD accumulated to that date in each year, and the date in the year before
 * on which that total was reached.
 */
export function buildGddSums(
  dates: string[],
  years: number[],
  dailyByYear: Map<number, OpenMeteoDaily>,
  today: string
): GddSum[] {
  return dates.map(date => {
    const values: Record<string, number | null> = {}
    const reached: Record<string, string | null> = {}
    for (const year of years) {
      const value = gddOnDate(dailyByYear.get(year), `${year}-${date}`, today)
      values[String(year)] = value
      reached[String(year)] = value === null ? null : dateReached(dailyByYear.get(year - 1), value)
    }
    return { date, values, reached_previous_year: reached }
  })
}
