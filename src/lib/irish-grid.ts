/**
 * Convert WGS84 coordinates to an Irish National Grid 10km square reference.
 *
 * Uses proj4 to project lat/lng → Irish Grid (EPSG:29903), then derives
 * the standard letter + 2-digit reference (e.g. "N16").
 *
 * Returns null if the coordinates fall outside the Irish Grid bounds.
 */
import proj4 from 'proj4'

// Irish Grid (EPSG:29903) projection definition
const IRISH_GRID =
  '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=1.000035 +x_0=200000 +y_0=250000 ' +
  '+ellps=airy_mod +towgs84=482.5,-130.6,564.6,-1.042,-0.214,-0.631,8.15 +units=m +no_defs'

// The 25 grid letters in row-major order (no I), bottom-left V to top-right E
// Columns 0-4 (west→east), rows 0-4 (south→north)
const GRID_LETTERS = [
  ['V', 'Q', 'L', 'F', 'A'], // col 0
  ['W', 'R', 'M', 'G', 'B'], // col 1
  ['X', 'S', 'N', 'H', 'C'], // col 2
  ['Y', 'T', 'O', 'J', 'D'], // col 3
  ['Z', 'U', 'P', 'K', 'E'], // col 4 (not used in practice)
]

export function toIrishGridRef(
  latitude: number,
  longitude: number
): string | null {
  try {
    const [easting, northing] = proj4('EPSG:4326', IRISH_GRID, [longitude, latitude])

    // Irish Grid valid range: 0–500km easting, 0–500km northing
    if (easting < 0 || easting >= 500000 || northing < 0 || northing >= 500000) {
      return null
    }

    // Each major grid square is 100km × 100km
    const col = Math.floor(easting / 100000)
    const row = Math.floor(northing / 100000)

    const letter = GRID_LETTERS[col]?.[row]
    if (!letter) return null

    // 10km digits: first digit of remaining easting, first digit of remaining northing
    const e10 = Math.floor((easting % 100000) / 10000)
    const n10 = Math.floor((northing % 100000) / 10000)

    return `${letter}${e10}${n10}`
  } catch {
    return null
  }
}
