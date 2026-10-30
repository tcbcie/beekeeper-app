'use client'

import { useEffect, useState } from 'react'
import { strongestGust } from '@/lib/wind-warning'
import type { GustForecast, StrongestGust } from '@/lib/wind-warning'
import type { DashboardApiary } from '@/types/dashboard'

export interface WindWarning extends StrongestGust {
  apiaryId: string
  apiaryName: string
}

// One forecast per set of locations, kept for 30 minutes; a failure is not kept, so the next visit retries
const CACHE_TTL_MS = 30 * 60 * 1000
const forecastCache = new Map<string, { forecasts: GustForecast[]; at: number }>()

// One bad coordinate would make Open-Meteo refuse the whole request
const validCoordinates = (a: DashboardApiary) =>
  typeof a.latitude === 'number' && Math.abs(a.latitude) <= 90 &&
  typeof a.longitude === 'number' && Math.abs(a.longitude) <= 180

/** The forecasts come back in the order of `coordinates`, "latitude,longitude" */
async function fetchGusts(coordinates: string[]): Promise<GustForecast[]> {
  const key = coordinates.join('|')
  const cached = forecastCache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.forecasts

  const latitudes = coordinates.map(c => c.split(',')[0]).join(',')
  const longitudes = coordinates.map(c => c.split(',')[1]).join(',')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    // Four days, as 72 hours from this evening runs into the fourth
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&hourly=wind_gusts_10m&timezone=Europe/Dublin&forecast_days=4`,
      { signal: controller.signal }
    )
    if (!res.ok) throw new Error('Forecast request failed')
    const json = await res.json()
    // One location comes back as an object, several as an array
    const locations: unknown[] = Array.isArray(json) ? json : [json]
    if (locations.length !== coordinates.length) throw new Error('Unexpected forecast response')
    const forecasts = locations.map(location => {
      const hourly = (location as { hourly?: { time?: unknown; wind_gusts_10m?: unknown } } | null)?.hourly
      if (!Array.isArray(hourly?.time) || !Array.isArray(hourly?.wind_gusts_10m)) {
        throw new Error('Unexpected forecast response')
      }
      return { times: hourly.time as string[], gusts: hourly.wind_gusts_10m as (number | null)[] }
    })
    forecastCache.set(key, { forecasts, at: Date.now() })
    return forecasts
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Apiaries with gusts of 90 km/h or more forecast in the next 72 hours, strongest first. Checked again
 * when the user comes back to the page, as an installed app can stay open for days.
 */
export function useWindWarnings(apiaries: DashboardApiary[]): WindWarning[] {
  const [warnings, setWarnings] = useState<WindWarning[]>([])

  useEffect(() => {
    const located = apiaries.filter(validCoordinates)
    if (located.length === 0) {
      setWarnings([])
      return
    }
    const coordinateOf = (a: DashboardApiary) => `${a.latitude},${a.longitude}`
    // Sorted and unique, so the nearest-first reorder after GPS arrives costs no second request
    const coordinates = Array.from(new Set(located.map(coordinateOf))).sort()
    let cancelled = false

    const check = () => {
      fetchGusts(coordinates)
        .then(forecasts => {
          if (cancelled) return
          const next: WindWarning[] = []
          for (const apiary of located) {
            const strongest = strongestGust(forecasts[coordinates.indexOf(coordinateOf(apiary))])
            if (strongest) next.push({ ...strongest, apiaryId: apiary.id, apiaryName: apiary.name })
          }
          setWarnings(next.sort((a, b) => b.gust - a.gust))
        })
        // Supplementary: on a failure whatever is showing stays, and the next check tries again
        .catch(() => {})
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }

    check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [apiaries])

  return warnings
}
