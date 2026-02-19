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
