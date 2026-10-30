'use client'

import { useEffect, useState } from 'react'
import { getCurrentDate } from '@/lib/date-utils'
import { INSPECTION_RULE, judgeDay } from '@/lib/inspection-weather'
import type { DayVerdict, HourForecast } from '@/lib/inspection-weather'

// One hourly forecast per location, kept for 30 minutes; a failure is not kept, so the next visit retries
const CACHE_TTL_MS = 30 * 60 * 1000
const forecastCache = new Map<string, { hours: HourForecast[]; at: number }>()

async function fetchHourlyForecast(latitude: number, longitude: number): Promise<HourForecast[]> {
  const key = `${latitude},${longitude}`
  const cached = forecastCache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.hours

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m&timezone=Europe/Dublin&forecast_days=5`,
      { signal: controller.signal }
    )
    if (!res.ok) throw new Error('Forecast request failed')
    const json = await res.json()
    const h = json?.hourly
    if (!h || !Array.isArray(h.time)) throw new Error('Unexpected forecast response')

    const hours: HourForecast[] = (h.time as string[]).map((time, i) => ({
      // Open-Meteo returns local times ("2026-10-29T10:00") because timezone=Europe/Dublin
      date: time.slice(0, 10),
      hour: Number(time.slice(11, 13)),
      temperature: Number(h.temperature_2m?.[i]),
      rainChance: Number(h.precipitation_probability?.[i] ?? 0),
      rain: Number(h.precipitation?.[i] ?? 0),
      wind: Number(h.wind_speed_10m?.[i] ?? 0),
    }))
      // An hour with a missing temperature would pass the 15°C test (NaN < 15 is false) and show
      // as good weather: drop it, along with any hour that did not parse
      .filter(hour => Number.isFinite(hour.temperature) && Number.isFinite(hour.hour) &&
        Number.isFinite(hour.rainChance) && Number.isFinite(hour.rain) && Number.isFinite(hour.wind))
    forecastCache.set(key, { hours, at: Date.now() })
    return hours
  } finally {
    clearTimeout(timer)
  }
}

export interface InspectionForecast {
  /** The next five days, today first; null until loaded */
  days: DayVerdict[] | null
  failed: boolean
}

/**
 * The next five days judged by the inspection-weather rule. `enabled` is false in the seasons when
 * the weather decides nothing, so those seasons make no forecast request.
 */
export function useInspectionForecast(latitude: number | null, longitude: number | null, enabled: boolean): InspectionForecast {
  const [days, setDays] = useState<DayVerdict[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!enabled || latitude === null || longitude === null) return
    let cancelled = false
    fetchHourlyForecast(latitude, longitude)
      .then(hours => {
        if (cancelled) return
        const today = getCurrentDate()
        const dates = Array.from(new Set(hours.map(h => h.date))).filter(d => d >= today).slice(0, 5)
        const nowHour = new Date().getHours()
        setDays(dates.map(date => judgeDay(date, hours, date === today ? nowHour : INSPECTION_RULE.firstHour)))
        setFailed(false)
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [latitude, longitude, enabled])

  // No apiary with coordinates means no forecast is coming, the same as a failure
  return { days, failed: failed || (enabled && (latitude === null || longitude === null)) }
}
