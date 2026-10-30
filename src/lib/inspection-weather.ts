/**
 * "Can I open my hives today?" — the dashboard's inspection-weather rule.
 *
 * A beekeeper's rule of thumb (agreed with the owner, 29 October 2026): bees can be inspected in an
 * hour that is 15°C or warmer, dry and calm, between 10:00 and 17:00.
 */

export const INSPECTION_RULE = {
  minTemperature: 15, // °C
  maxRainChance: 30, // % chance of rain in the hour
  maxRain: 0.1, // mm in the hour
  maxWind: 20, // km/h: a light breeze
  firstHour: 10, // the 10:00–11:00 hour is the first
  lastHour: 17, // the 16:00–17:00 hour is the last
} as const

export interface HourForecast {
  /** Local date, YYYY-MM-DD */
  date: string
  /** Local hour, 0–23 */
  hour: number
  temperature: number
  rainChance: number
  rain: number
  wind: number
}

export type NoGoReason = 'cool' | 'rain' | 'wind' | 'late'

export interface DayVerdict {
  date: string
  /** Warmest hour between 10:00 and 17:00 */
  maxTemperature: number | null
  /** The longest run of good hours: start hour and end hour (exclusive), or null */
  window: { start: number; end: number } | null
  /** Why there is no window, when there is none */
  reason: NoGoReason | null
}

function failures(h: HourForecast): NoGoReason[] {
  const out: NoGoReason[] = []
  if (h.rainChance > INSPECTION_RULE.maxRainChance || h.rain > INSPECTION_RULE.maxRain) out.push('rain')
  if (h.temperature < INSPECTION_RULE.minTemperature) out.push('cool')
  if (h.wind > INSPECTION_RULE.maxWind) out.push('wind')
  return out
}

/**
 * Judge one day's daytime hours. `fromHour` skips hours already past (for today); a day with no
 * daytime hours left is 'late'.
 */
export function judgeDay(date: string, hours: HourForecast[], fromHour: number = INSPECTION_RULE.firstHour): DayVerdict {
  const daytime = hours.filter(h =>
    h.date === date && h.hour >= INSPECTION_RULE.firstHour && h.hour < INSPECTION_RULE.lastHour
  )
  const temps = daytime.map(h => h.temperature).filter(t => Number.isFinite(t))
  const maxTemperature = temps.length > 0 ? Math.round(Math.max(...temps)) : null

  const remaining = daytime.filter(h => h.hour >= fromHour)
  if (remaining.length === 0) return { date, maxTemperature, window: null, reason: 'late' }

  // Longest run of consecutive good hours
  let best: { start: number; end: number } | null = null
  let runStart: number | null = null
  for (const h of remaining) {
    if (failures(h).length === 0) {
      if (runStart === null) runStart = h.hour
      const run = { start: runStart, end: h.hour + 1 }
      if (!best || run.end - run.start > best.end - best.start) best = run
    } else {
      runStart = null
    }
  }
  if (best) return { date, maxTemperature, window: best, reason: null }

  // No good hour: name the commonest problem, rain before cold before wind on a tie
  const counts: Record<'rain' | 'cool' | 'wind', number> = { rain: 0, cool: 0, wind: 0 }
  for (const h of remaining) for (const f of failures(h)) if (f !== 'late') counts[f]++
  const reason = (['rain', 'cool', 'wind'] as const).reduce((a, b) => (counts[b] > counts[a] ? b : a))
  return { date, maxTemperature, window: null, reason }
}

/** A good day has at least two good hours in a row; one hour is only a brief chance */
export const isGoodDay = (day: DayVerdict) => day.window !== null && day.window.end - day.window.start >= 2

export function weekdayName(date: string, style: 'short' | 'long'): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-IE', { weekday: style })
}

/** "12:00–15:00" */
export function formatWindow(window: { start: number; end: number }): string {
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`
  return `${hh(window.start)}–${hh(window.end)}`
}
