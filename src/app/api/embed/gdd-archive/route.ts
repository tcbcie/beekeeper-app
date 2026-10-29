import { NextResponse } from 'next/server'
import { EMBED_FIRST_YEAR, EMBED_REGIONS } from '@/lib/embed-regions'
import { todayInDublin } from '@/lib/dublin-date'

/**
 * Daily max/min temperatures for one embed region and year, fetched from the Open-Meteo archive on
 * the server and cached, so the public tcbc.ie embed no longer calls Open-Meteo from every visitor's
 * browser (C7b-07). Only listed regions and years from EMBED_FIRST_YEAR to this year are served,
 * and the dates and coordinates are worked out here, so the route can't be used as an open relay.
 *
 * The current year is cached for 6 hours (the archive lags a few days anyway), past years for 30 days.
 */

const CURRENT_YEAR_SECONDS = 6 * 60 * 60
const PAST_YEAR_SECONDS = 30 * 24 * 60 * 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const region = EMBED_REGIONS[searchParams.get('region') ?? '']
  const today = todayInDublin()
  const currentYear = Number(today.slice(0, 4))
  const year = Number(searchParams.get('year'))

  if (!region || !Number.isInteger(year) || year < EMBED_FIRST_YEAR || year > currentYear) {
    return NextResponse.json({ error: 'Unknown region or year' }, { status: 400 })
  }

  const isCurrentYear = year === currentYear
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
    if (!data?.daily?.temperature_2m_max || !data?.daily?.time) {
      return NextResponse.json({ error: 'Weather archive unavailable' }, { status: 502 })
    }
    return NextResponse.json(
      { daily: data.daily },
      { headers: { 'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}` } }
    )
  } catch {
    return NextResponse.json({ error: 'Weather archive unavailable' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
