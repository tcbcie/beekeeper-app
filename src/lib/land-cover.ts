/**
 * What is on the ground at a point: water, woodland, or woodland close by.
 *
 * Read from Mapbox's own map data (the Tilequery API) with the map key the app already uses,
 * one request per point. Used by the DCA engine for the handful of hotspots it is about to
 * show, never for every candidate.
 */

export interface LandCover {
  /** The point is on a lake, river, reservoir or the sea. */
  onWater: boolean
  /** The point is inside woodland or forestry. */
  inWoodland: boolean
  /** Woodland starts within LAND_COVER_RADIUS_M of the point. */
  nearWoodland: boolean
}

export const LAND_COVER_RADIUS_M = 300

const TILESETS = 'mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2'
const LAYERS = 'water,landuse,landcover'
const REQUEST_TIMEOUT_MS = 8_000

interface TilequeryFeature {
  properties?: {
    class?: unknown
    tilequery?: { layer?: unknown; distance?: unknown }
  }
}

async function fetchOne(latitude: number, longitude: number, token: string): Promise<LandCover | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  try {
    // The time limit stays armed while the body is read below.
    const response = await fetch(
      `https://api.mapbox.com/v4/${TILESETS}/tilequery/${longitude.toFixed(5)},${latitude.toFixed(5)}.json` +
      `?radius=${LAND_COVER_RADIUS_M}&limit=30&layers=${LAYERS}&geometry=polygon&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
    )
    if (!response.ok) return null

    const data: { features?: unknown } | null = await response.json()
    if (!data || !Array.isArray(data.features)) return null

    const result: LandCover = { onWater: false, inWoodland: false, nearWoodland: false }
    for (const feature of data.features as TilequeryFeature[]) {
      const layer = feature.properties?.tilequery?.layer
      const distance = feature.properties?.tilequery?.distance
      if (typeof distance !== 'number') continue
      // A distance of 0 means the point is inside the shape
      const inside = distance === 0

      if (layer === 'water') {
        if (inside) result.onWater = true
      } else if ((layer === 'landuse' || layer === 'landcover') && feature.properties?.class === 'wood') {
        if (inside) result.inWoodland = true
        else result.nearWoodland = true
      }
    }
    return result
  } catch {
    return null
  }
}

/**
 * Land cover for each point, in the same order. A point that could not be looked up (no map
 * key, no signal, service refused) is null, which callers treat as "nothing known".
 */
export async function fetchLandCover(
  points: { latitude: number; longitude: number }[]
): Promise<(LandCover | null)[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  if (!token) return points.map(() => null)
  return Promise.all(points.map(point => fetchOne(point.latitude, point.longitude, token)))
}
