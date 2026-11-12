import { NextRequest, NextResponse } from 'next/server'
import { MALFORMED_BODY, readJsonBody, requireUser } from '@/lib/server/api-auth'
import { consumeRateLimits, RATE_LIMITED_MESSAGE, RATE_LIMITS } from '@/lib/rate-limit'
import { ELEVATION_MAX_POINTS } from '@/lib/elevation-limits'

/**
 * Heights above sea level for a list of points, looked up on the server.
 *
 * The browser used to call the elevation service itself, one request of 100 points after
 * another, sending apiary positions straight from the beekeeper's phone. Here the lookups run
 * side by side, are cached (terrain does not change), and the provider can be swapped in one
 * place: only `fetchChunk` knows which service is used.
 *
 * Body: `{ points: [latitude, longitude][] }`. Reply: `{ elevations: (number | null)[] }` in the
 * same order, with null where a height could not be found.
 */

const UPSTREAM_CHUNK_SIZE = 100 // the most points the service takes in one request
const UPSTREAM_TIMEOUT_MS = 10_000
const CACHE_SECONDS = 30 * 24 * 60 * 60

type Point = [number, number]

function isPoint(value: unknown): value is Point {
  return Array.isArray(value) && value.length === 2 &&
    typeof value[0] === 'number' && Number.isFinite(value[0]) && Math.abs(value[0]) <= 90 &&
    typeof value[1] === 'number' && Number.isFinite(value[1]) && Math.abs(value[1]) <= 180
}

async function fetchChunk(chunk: Point[]): Promise<(number | null)[]> {
  const unknown = (): null[] => chunk.map(() => null)
  // Five decimal places is about a metre, far finer than the terrain data, and keeps the
  // address the same for the same point so the cached answer is found again.
  const latitudes = chunk.map(point => point[0].toFixed(5)).join(',')
  const longitudes = chunk.map(point => point[1].toFixed(5)).join(',')
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${latitudes}&longitude=${longitudes}`

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    // The time limit races the request rather than passing an abort signal, which can stop
    // Next.js caching the response. Only successful replies are cached.
    const data: unknown = await Promise.race([
      fetch(url, { next: { revalidate: CACHE_SECONDS } }).then(upstream => (upstream.ok ? upstream.json() : null)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Elevation service timed out')), UPSTREAM_TIMEOUT_MS)
      }),
    ])
    const elevations = (data as { elevation?: unknown } | null)?.elevation
    if (!Array.isArray(elevations) || elevations.length !== chunk.length) {
      console.error('Elevation service gave no usable answer for a chunk of', chunk.length, 'points')
      return unknown()
    }
    return elevations.map(value => (typeof value === 'number' && Number.isFinite(value) ? value : null))
  } catch (error) {
    console.error('Elevation lookup failed:', error)
    return unknown()
  } finally {
    clearTimeout(timer)
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, { requireActive: true })
  if ('response' in auth) return auth.response
  const { user, supabaseAdmin } = auth

  const body = await readJsonBody<{ points?: unknown }>(request)
  if (!body) return NextResponse.json({ error: MALFORMED_BODY }, { status: 400 })

  const points = body.points
  if (!Array.isArray(points) || points.length === 0 || points.length > ELEVATION_MAX_POINTS || !points.every(isPoint)) {
    return NextResponse.json(
      { error: `Send between 1 and ${ELEVATION_MAX_POINTS} points as [latitude, longitude] pairs` },
      { status: 400 }
    )
  }

  if (!(await consumeRateLimits(supabaseAdmin, user.id, [RATE_LIMITS.elevation]))) {
    return NextResponse.json({ error: RATE_LIMITED_MESSAGE }, { status: 429 })
  }

  const chunks: Point[][] = []
  for (let i = 0; i < points.length; i += UPSTREAM_CHUNK_SIZE) {
    chunks.push(points.slice(i, i + UPSTREAM_CHUNK_SIZE))
  }
  const elevations = (await Promise.all(chunks.map(fetchChunk))).flat()

  return NextResponse.json({ elevations })
}
