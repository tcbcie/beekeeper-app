// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { GET } from '@/app/api/embed/gdd-archive/route'

/**
 * The public embed's weather route (C7b-07) must only serve listed regions and sensible years, so
 * it can't be used to relay arbitrary Open-Meteo requests, and it must pass through a valid archive.
 */

const call = (query: string) => GET(new Request(`https://www.hivecraic.com/api/embed/gdd-archive?${query}`))

describe('GET /api/embed/gdd-archive', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refuses an unknown region', async () => {
    const res = await call('region=nowhere&year=2024')
    expect(res.status).toBe(400)
  })

  it('refuses a year outside the served range', async () => {
    expect((await call('region=galway&year=1990')).status).toBe(400)
    expect((await call('region=galway&year=2999')).status).toBe(400)
    expect((await call('region=galway&year=abc')).status).toBe(400)
  })

  it('returns the archive for a listed region and year, with a cache header', async () => {
    const daily = { time: ['2024-01-01'], temperature_2m_max: [8], temperature_2m_min: [2] }
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ daily }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await call('region=galway&year=2024')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ daily })
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=')
    // The coordinates come from the region list, never from the request
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('latitude=53.2707')
  })

  it('reports an upstream failure as 502', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('busy', { status: 429 })))
    expect((await call('region=galway&year=2024')).status).toBe(502)
  })
})
