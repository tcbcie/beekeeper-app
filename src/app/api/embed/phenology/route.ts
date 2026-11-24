import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EMBED_FIRST_YEAR, EMBED_REGIONS, type EmbedRegion } from '@/lib/embed-regions'
import { todayInDublin } from '@/lib/dublin-date'
import { fetchEmbedArchive } from '@/lib/embed-archive'
import type { OpenMeteoDaily } from '@/lib/gdd'
import { buildEvents, buildGddSums, parseDates, parseYears, type PublicGddRow } from '@/lib/phenology-feed'

/**
 * Public, read-only phenology feed (contract version 1) for the tcbc.ie homepage tables, fetched
 * server-to-server by tcbc.ie: shared observations per event and year from the anon-readable
 * public_<region>_gdd view (no user ids or coordinates), and GDD sums worked out from the region's
 * cached Open-Meteo archive with the HiveCraic formula. See docs/features/tcbc-phenology-feed.md.
 *
 *   GET /api/embed/phenology?region=galway&years=2025,2026[&dates=02-01,03-01,04-01,05-01]
 *
 * Bad input → 400. Observations or temperatures that can't be read → 502, never a partial answer.
 */

const CURRENT_YEAR_CACHE = 'public, s-maxage=21600, stale-while-revalidate=86400'
const PAST_YEARS_CACHE = 'public, s-maxage=2592000'

async function loadRows(region: EmbedRegion, years: number[]): Promise<PublicGddRow[] | null> {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase
      .from(region.viewName)
      .select('vegetation_name, year, start_date, end_date, gdd_value')
      .in('year', years)
      .order('start_date')
      .limit(2000)
    return error || !data ? null : (data as PublicGddRow[])
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('region') ?? ''
  const region = Object.hasOwn(EMBED_REGIONS, slug) ? EMBED_REGIONS[slug] : undefined
  const today = todayInDublin()
  const currentYear = Number(today.slice(0, 4))
  const years = parseYears(searchParams.get('years'), currentYear)
  const dates = parseDates(searchParams.get('dates'))

  if (!region) return NextResponse.json({ error: 'Unknown region' }, { status: 400 })
  if (!years) return NextResponse.json({ error: `years must be 1 to 3 years from ${EMBED_FIRST_YEAR} to ${currentYear}` }, { status: 400 })
  if (!dates) return NextResponse.json({ error: 'dates must be up to 12 MM-DD days' }, { status: 400 })

  // Each year's temperatures, plus the year before for "reached in the previous year"
  const archiveYears = [...new Set(years.flatMap(y => [y - 1, y]))].filter(y => y >= EMBED_FIRST_YEAR)
  const [rows, archives] = await Promise.all([
    loadRows(region, years),
    Promise.all(archiveYears.map(y => fetchEmbedArchive(region, y))),
  ])
  if (!rows) return NextResponse.json({ error: 'Observations unavailable' }, { status: 502 })
  if (archives.some(a => !a)) return NextResponse.json({ error: 'Weather archive unavailable' }, { status: 502 })

  const dailyByYear = new Map<number, OpenMeteoDaily>(archiveYears.map((y, i) => [y, archives[i]!.daily]))

  return NextResponse.json(
    {
      version: 1,
      region: { slug, label: region.label },
      generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      years,
      events: buildEvents(rows, years, dailyByYear, today),
      gdd_sums: buildGddSums(dates, years, dailyByYear, today),
      source: {
        observations: `Shared HiveCraic observations, County ${region.label}`,
        temperatures: `Open-Meteo archive, ${region.latitude}, ${region.longitude}`,
        formula: 'Daily mean temperature above 0 °C; January ×0.5, February ×0.75',
      },
    },
    { headers: { 'Cache-Control': years.includes(currentYear) ? CURRENT_YEAR_CACHE : PAST_YEARS_CACHE } }
  )
}
