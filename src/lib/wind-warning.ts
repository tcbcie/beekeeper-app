/**
 * The dashboard's strong wind warning: the strongest gust forecast at an apiary in the next 72 hours.
 *
 * Levels agreed with the owner, 30 October 2026: Met Éireann's yellow (90 km/h) and orange (110 km/h)
 * gust levels. This is a forecast from Open-Meteo, not a Met Éireann warning.
 */

import { toLocalDateString } from '@/lib/date-utils'
import { weekdayName } from '@/lib/inspection-weather'

export const WIND_WARNING_GUST = 90 // km/h
export const WIND_SEVERE_GUST = 110 // km/h
const LOOK_AHEAD_HOURS = 72

export interface GustForecast {
  /** Local times, "2026-10-30T14:00" (timezone=Europe/Dublin) */
  times: string[]
  /** km/h; an hour can be missing */
  gusts: (number | null)[]
}

export interface StrongestGust {
  /** Rounded km/h */
  gust: number
  /** "Saturday night" */
  when: string
}

const hourStamp = (date: Date) =>
  `${toLocalDateString(date)}T${String(date.getHours()).padStart(2, '0')}:00`

/** "Saturday night"; the small hours read "early Saturday" */
function describeHour(time: string): string {
  const day = weekdayName(time.slice(0, 10), 'long')
  const hour = Number(time.slice(11, 13))
  if (hour < 6) return `early ${day}`
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night'
  return `${day} ${part}`
}

/** The strongest gust at or over the warning level from this hour on, or null when there is none */
export function strongestGust(forecast: GustForecast, now: Date = new Date()): StrongestGust | null {
  const from = hourStamp(now)
  const to = hourStamp(new Date(now.getTime() + LOOK_AHEAD_HOURS * 60 * 60 * 1000))
  let bestIndex = -1
  let best = -Infinity
  forecast.times.forEach((time, i) => {
    const gust = forecast.gusts[i]
    if (typeof gust !== 'number' || !Number.isFinite(gust) || time < from || time > to) return
    if (gust > best) {
      best = gust
      bestIndex = i
    }
  })
  if (bestIndex < 0 || best < WIND_WARNING_GUST) return null
  return { gust: Math.round(best), when: describeHour(forecast.times[bestIndex]) }
}
