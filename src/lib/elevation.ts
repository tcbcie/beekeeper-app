/**
 * Fetch elevation (height above sea level) for given coordinates
 * using the free Open-Meteo Elevation API.
 *
 * Returns elevation in metres, or null on failure.
 */
export async function fetchElevation(
  latitude: number,
  longitude: number
): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${latitude}&longitude=${longitude}`
    )
    if (!response.ok) return null

    const data = await response.json()
    const elevation = data?.elevation?.[0]
    return typeof elevation === 'number' ? elevation : null
  } catch {
    return null
  }
}

/**
 * Fetch elevations for multiple points in a single request.
 * Open-Meteo supports comma-separated coordinates (up to 100 per request).
 * Chunks larger arrays automatically.
 *
 * Returns array of elevations in metres (or null per point on failure),
 * matching the input order.
 */
export async function fetchElevationBatch(
  points: { latitude: number; longitude: number }[]
): Promise<(number | null)[]> {
  if (points.length === 0) return []

  // Guard against NaN/Infinity coords producing malformed URLs
  const sanitised = points.map(p => ({
    latitude: isFinite(p.latitude) ? p.latitude : 0,
    longitude: isFinite(p.longitude) ? p.longitude : 0,
    valid: isFinite(p.latitude) && isFinite(p.longitude),
  }))

  const CHUNK_SIZE = 100
  const TIMEOUT_MS = 10_000
  const results: (number | null)[] = new Array(points.length).fill(null)

  for (let i = 0; i < sanitised.length; i += CHUNK_SIZE) {
    const chunk = sanitised.slice(i, i + CHUNK_SIZE)
    const lats = chunk.map(p => p.latitude).join(',')
    const lngs = chunk.map(p => p.longitude).join(',')

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(
        `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`,
        { signal: controller.signal }
      )
      clearTimeout(timeoutId)

      if (!response.ok) continue

      const data = await response.json()
      const elevations: number[] = data?.elevation ?? []

      for (let j = 0; j < chunk.length; j++) {
        if (!chunk[j].valid) continue // invalid input coord → leave null
        const val = elevations[j]
        results[i + j] = typeof val === 'number' && isFinite(val) ? val : null
      }
    } catch {
      // Leave nulls for this chunk (timeout, network error, etc.)
    }
  }

  return results
}
