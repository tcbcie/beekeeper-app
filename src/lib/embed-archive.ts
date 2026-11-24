import type { EmbedRegion } from '@/lib/embed-regions'
import type { OpenMeteoDaily } from '@/lib/gdd'
import { todayInDublin } from '@/lib/dublin-date'

/**
 * Daily max/min temperatures for one embed region and year from the Open-Meteo archive, fetched on
 * the server through Next's fetch cache, so every route that needs them (gdd-archive, phenology)
 * shares one upstream call per region and year rather than one per visitor.
 *
 * The current year is cached for 6 hours (the archive lags a few days anyway), past years for 30 days.
 * Returns null when the archive can't be read. Callers validate the region and year first.
 */

const CURRENT_YEAR_SECONDS = 6 * 60 * 60
const PAST_YEAR_SECONDS = 30 * 24 * 60 * 60

export interface EmbedArchive {
  daily: OpenMeteoDaily
  maxAge: number
}

export async function fetchEmbedArchive(region: EmbedRegion, year: number): Promise<EmbedArchive | null> {
  const today = todayInDublin()
  const isCurrentYear = year === Number(today.slice(0, 4))
  const maxAge = isCurrentYear ? CURRENT_YEAR_SECONDS : PAST_YEAR_SECONDS
  const endDate = isCurrentYear ? today : `${year}-12-31`
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${region.latitude}&longitude=${region.longitude}&start_date=${year}-01-01&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min&timezone=Europe/Dublin`

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    // The time limit races the request rather than passing an abort signal, which can stop Next.js
    // caching the response. It races reading the body too, so a slow reply can't hang the route.
    const data = await Promise.race([
      fetch(url, { next: { revalidate: maxAge } }).then(upstream => (upstream.ok ? upstream.json() : null)),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Weather archive timed out')), 15_000) }),
    ])
    if (!data?.daily?.temperature_2m_max || !data?.daily?.temperature_2m_min || !data?.daily?.time) return null
    return { daily: data.daily, maxAge }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
