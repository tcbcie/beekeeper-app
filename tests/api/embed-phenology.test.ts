// @vitest-environment node
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

/**
 * The public phenology feed for tcbc.ie (docs/features/tcbc-phenology-feed.md): input bounds, the
 * community-mode merge, GDD sums from the shared formula, cache headers, 502 on upstream failure,
 * and no personal fields in the payload.
 */

const dbResult = vi.hoisted(() => ({ data: [] as unknown[] | null, error: null as unknown }))
vi.mock('@supabase/supabase-js', () => {
  const query = {
    select: () => query,
    in: () => query,
    order: () => query,
    limit: async () => dbResult,
  }
  return { createClient: () => ({ from: () => query }) }
})

vi.mock('@/lib/dublin-date', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/dublin-date')>()),
  todayInDublin: () => '2026-03-15',
}))

const { GET } = await import('@/app/api/embed/phenology/route')
const call = (query: string) => GET(new Request(`https://www.hivecraic.com/api/embed/phenology?${query}`))

/** Every day of a year up to `end`, at a constant mean temperature of `mean` °C. */
function year(y: number, end: string, mean: number) {
  const time: string[] = []
  for (let d = new Date(`${y}-01-01T00:00:00Z`); d.toISOString().slice(0, 10) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    time.push(d.toISOString().slice(0, 10))
  }
  return { time, temperature_2m_max: time.map(() => mean + 2), temperature_2m_min: time.map(() => mean - 2) }
}

function stubArchive(fail = false) {
  const fetchMock = vi.fn(async (url: string) => {
    if (fail) return new Response('busy', { status: 429 })
    const y = Number(/start_date=(\d{4})/.exec(url)![1])
    const end = /end_date=([\d-]+)/.exec(url)![1]
    // 2025 is warmer than 2026, so 2026 totals are reached earlier in 2025
    return new Response(JSON.stringify({ daily: year(y, end, y === 2025 ? 8 : 4) }), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('GET /api/embed/phenology', () => {
  beforeEach(() => {
    dbResult.data = []
    dbResult.error = null
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refuses bad input with 400', async () => {
    stubArchive()
    for (const q of [
      'region=cork&years=2025,2026',
      'region=constructor&years=2025',
      'region=galway',
      'region=galway&years=1999',
      'region=galway&years=2027',
      'region=galway&years=2023,2024,2025,2026',
      'region=galway&years=2025&dates=13-40',
      'region=galway&years=2025&dates=02-30',
      'region=galway&years=2025&dates=' + Array(13).fill('01-01').join(','),
    ]) {
      expect((await call(q)).status, q).toBe(400)
    }
  })

  it('reports an unreadable archive or database as 502', async () => {
    stubArchive(true)
    expect((await call('region=galway&years=2025,2026')).status).toBe(502)
    stubArchive()
    dbResult.error = { message: 'down' }
    expect((await call('region=galway&years=2025,2026')).status).toBe(502)
  })

  it('returns the version 1 feed with merged community observations and GDD sums', async () => {
    const fetchMock = stubArchive()
    dbResult.data = [
      { vegetation_name: 'Snowdrops', year: 2025, start_date: '2025-01-30', end_date: null, gdd_value: 77.3 },
      { vegetation_name: 'Snowdrops', year: 2025, start_date: '2025-01-30', end_date: '2025-03-01', gdd_value: 77 },
      { vegetation_name: 'Snowdrops', year: 2025, start_date: '2025-02-02', end_date: '2025-03-10', gdd_value: 90 },
      { vegetation_name: 'Gorse (Ulex)', year: 2026, start_date: '2025-12-18', end_date: null, gdd_value: null },
      { vegetation_name: 'Pollen in', year: 2026, start_date: '2026-02-10', end_date: null, gdd_value: '120.04' },
    ]

    const res = await call('region=galway&years=2026,2025&dates=03-01,02-01,04-01')
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=21600, stale-while-revalidate=86400')
    // One upstream call per year, including 2024 for "reached in the previous year"
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const feed = await res.json()
    expect(feed.version).toBe(1)
    expect(feed.region).toEqual({ slug: 'galway', label: 'Galway' })
    expect(feed.years).toEqual([2025, 2026])

    expect(feed.events.map((e: { key: string }) => e.key)).toEqual(['gorse-ulex', 'snowdrops', 'pollen-in'])
    const snowdrops = feed.events.find((e: { key: string }) => e.key === 'snowdrops')
    expect(snowdrops.category).toBe('plant')
    expect(snowdrops.observations).toEqual({ '2025': { start: '2025-01-30', end: '2025-03-10', gdd: 77 }, '2026': null })
    const gorse = feed.events.find((e: { key: string }) => e.key === 'gorse-ulex')
    expect(gorse.observations['2026']).toEqual({ start: '2025-12-18', end: null, gdd: null })
    const pollen = feed.events.find((e: { key: string }) => e.key === 'pollen-in')
    expect(pollen.category).toBe('colony')
    expect(pollen.observations['2026'].gdd).toBe(120)

    expect(feed.gdd_sums.map((s: { date: string }) => s.date)).toEqual(['02-01', '03-01', '04-01'])
    // 2025 at 8 °C: 31 days ×4 + 1 day ×6 = 130 on 1 February
    expect(feed.gdd_sums[0].values).toEqual({ '2025': 130, '2026': 65 })
    // 2026's 65 is reached in 2025 on 17 January (17 × 4 = 68); 2025's 130 in 2024 (4 °C) on
    // 23 February (31 × 2 + 23 × 3 = 131)
    expect(feed.gdd_sums[0].reached_previous_year).toEqual({ '2025': '2024-02-23', '2026': '2025-01-17' })
    // 1 April 2026 is after today (15 March 2026)
    expect(feed.gdd_sums[2].values['2026']).toBeNull()
    expect(feed.gdd_sums[2].reached_previous_year['2026']).toBeNull()
  })

  it('caches past years for 30 days and never publishes personal fields', async () => {
    stubArchive()
    dbResult.data = [
      { vegetation_name: 'Hazel', year: 2025, start_date: '2025-02-01', end_date: null, gdd_value: 100, user_id: 'u1', city: 'Mace', latitude: 53.4 },
    ]
    const res = await call('region=galway&years=2025')
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=2592000')
    const text = await res.text()
    for (const field of ['user_id', 'apiary_id', 'city', 'Mace', 'latitude', 'notes', '"id"']) {
      expect(text).not.toContain(field)
    }
  })
})
