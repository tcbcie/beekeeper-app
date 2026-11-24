import { NextResponse } from 'next/server'
import { EMBED_FIRST_YEAR, EMBED_REGIONS } from '@/lib/embed-regions'
import { todayInDublin } from '@/lib/dublin-date'
import { fetchEmbedArchive } from '@/lib/embed-archive'

/**
 * Daily max/min temperatures for one embed region and year, fetched from the Open-Meteo archive on
 * the server and cached, so the public tcbc.ie embed no longer calls Open-Meteo from every visitor's
 * browser (C7b-07). Only listed regions and years from EMBED_FIRST_YEAR to this year are served,
 * and the dates and coordinates are worked out here, so the route can't be used as an open relay.
 *
 * The fetch and its cache (6 hours for the current year, 30 days for past years) live in
 * src/lib/embed-archive.ts, shared with the phenology feed.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const region = EMBED_REGIONS[searchParams.get('region') ?? '']
  const currentYear = Number(todayInDublin().slice(0, 4))
  const year = Number(searchParams.get('year'))

  if (!region || !Number.isInteger(year) || year < EMBED_FIRST_YEAR || year > currentYear) {
    return NextResponse.json({ error: 'Unknown region or year' }, { status: 400 })
  }

  const archive = await fetchEmbedArchive(region, year)
  if (!archive) {
    return NextResponse.json({ error: 'Weather archive unavailable' }, { status: 502 })
  }
  return NextResponse.json(
    { daily: archive.daily },
    { headers: { 'Cache-Control': `public, s-maxage=${archive.maxAge}, stale-while-revalidate=${archive.maxAge}` } }
  )
}
