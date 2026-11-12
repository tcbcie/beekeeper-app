import { supabase } from '@/lib/supabase'
import { ELEVATION_MAX_POINTS } from '@/lib/elevation-limits'

const REQUEST_TIMEOUT_MS = 30_000

/**
 * Fetch elevation (height above sea level) for given coordinates.
 *
 * Returns elevation in metres, or null on failure.
 */
export async function fetchElevation(
  latitude: number,
  longitude: number
): Promise<number | null> {
  const [elevation] = await fetchElevationBatch([{ latitude, longitude }])
  return elevation ?? null
}

/**
 * Fetch elevations for multiple points through our own server route (/api/elevation), which
 * looks them up, caches them and keeps apiary positions from going straight from the phone to
 * an outside service. Larger arrays are sent in several requests.
 *
 * Returns array of elevations in metres (or null per point on failure),
 * matching the input order.
 */
export async function fetchElevationBatch(
  points: { latitude: number; longitude: number }[]
): Promise<(number | null)[]> {
  const results: (number | null)[] = new Array(points.length).fill(null)

  // Points that are not real coordinates stay null and are never sent.
  const valid: number[] = []
  points.forEach((point, index) => {
    if (
      Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 &&
      Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180
    ) valid.push(index)
  })
  if (valid.length === 0) return results

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return results

    for (let i = 0; i < valid.length; i += ELEVATION_MAX_POINTS) {
      const indices = valid.slice(i, i + ELEVATION_MAX_POINTS)
      try {
        // The time limit stays armed while the body is read below.
        const response = await fetch('/api/elevation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ points: indices.map(index => [points[index].latitude, points[index].longitude]) }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        if (!response.ok) continue

        const data: { elevations?: unknown } | null = await response.json()
        const elevations = data?.elevations
        if (!Array.isArray(elevations)) continue

        indices.forEach((index, j) => {
          const value: unknown = elevations[j]
          results[index] = typeof value === 'number' && Number.isFinite(value) ? value : null
        })
      } catch {
        // Leave nulls for this request (timeout, network error, etc.)
      }
    }
  } catch {
    // No session could be read: every point stays null
  }

  return results
}
