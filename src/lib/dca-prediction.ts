/**
 * DCA (Drone Congregation Area) Prediction Engine
 *
 * Pure functions that analyse terrain elevation around apiaries
 * to predict likely drone congregation areas. Drones fly toward
 * the lowest horizon, follow terrain flyways, and congregate at
 * valley junctions / terrain bowls 1-5km from apiaries.
 */

import { fetchElevationBatch } from './elevation'

// ── Types ────────────────────────────────────────────────────

export interface DCAPrediction {
  latitude: number
  longitude: number
  score: number           // 0-100
  confidence: 'high' | 'medium' | 'low'
  radiusKm: number        // display radius
  contributingApiaries: string[]
  direction: string       // e.g. "SW"
}

export interface DCAFlyway {
  fromLatitude: number
  fromLongitude: number
  toLatitude: number
  toLongitude: number
  apiaryName: string
}

export interface DCAResult {
  predictions: DCAPrediction[]
  flyways: DCAFlyway[]
}

interface Apiary {
  id: string
  name: string
  latitude: number
  longitude: number
}

export interface ConfirmedLocation {
  latitude: number
  longitude: number
  confirmed: boolean
}

interface SamplePoint {
  latitude: number
  longitude: number
  directionIndex: number  // 0-15
  ringIndex: number       // 0-2
}

interface ScoredCandidate {
  latitude: number
  longitude: number
  score: number
  directionIndex: number
  apiaryId: string
  apiaryName: string
}

// ── Constants ────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371
const NUM_DIRECTIONS = 16
const DIRECTION_STEP_DEG = 360 / NUM_DIRECTIONS // 22.5°
const SAMPLE_RINGS_KM = [1, 2.5, 4]
const CANDIDATE_DISTANCES_KM = [2, 3.5]
const BOWL_CHECK_OFFSET_KM = 0.5
const MERGE_RADIUS_KM = 0.5
const MIN_SCORE = 40
const MAX_RESULTS = 5

const DIRECTION_LABELS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
]

// ── Geo Helpers ──────────────────────────────────────────────

/** Offset a point by distance (km) and bearing (degrees) */
function offsetPoint(
  lat: number, lng: number, distanceKm: number, bearingDeg: number
): { latitude: number; longitude: number } {
  const bearingRad = (bearingDeg * Math.PI) / 180
  const latOffset = (distanceKm / EARTH_RADIUS_KM) * (180 / Math.PI) * Math.cos(bearingRad)
  const cosLat = Math.cos((lat * Math.PI) / 180)
  const lngOffset = cosLat > 1e-6
    ? (distanceKm / EARTH_RADIUS_KM) * (180 / Math.PI) * Math.sin(bearingRad) / cosLat
    : 0
  return { latitude: lat + latOffset, longitude: lng + lngOffset }
}

/** Haversine distance in km */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Core Algorithm ───────────────────────────────────────────

/** Generate 48 sample points around an apiary (16 directions × 3 rings) */
function generateSamplePoints(lat: number, lng: number): SamplePoint[] {
  const points: SamplePoint[] = []
  for (let d = 0; d < NUM_DIRECTIONS; d++) {
    const bearing = d * DIRECTION_STEP_DEG
    for (let r = 0; r < SAMPLE_RINGS_KM.length; r++) {
      const p = offsetPoint(lat, lng, SAMPLE_RINGS_KM[r], bearing)
      points.push({ ...p, directionIndex: d, ringIndex: r })
    }
  }
  return points
}

/** Find the direction indices with lowest average elevation (flyways) */
function findFlywayDirections(
  samplePoints: SamplePoint[],
  elevations: (number | null)[]
): number[] {
  // Average elevation per direction
  const dirAvg: { sum: number; count: number }[] = Array.from(
    { length: NUM_DIRECTIONS },
    () => ({ sum: 0, count: 0 })
  )

  samplePoints.forEach((sp, i) => {
    const elev = elevations[i]
    if (elev !== null) {
      dirAvg[sp.directionIndex].sum += elev
      dirAvg[sp.directionIndex].count += 1
    }
  })

  const averages = dirAvg.map(d => (d.count > 0 ? d.sum / d.count : Infinity))
  const minElev = Math.min(...averages.filter(a => a !== Infinity))

  if (minElev === Infinity) return [] // no valid data

  // Check for flat terrain: if range < 5m, treat all directions as potential
  const validAverages = averages.filter(a => a !== Infinity)
  const maxElev = Math.max(...validAverages)
  const isFlat = maxElev - minElev < 5

  if (isFlat) {
    // Return 4 cardinal directions for flat terrain
    return [0, 4, 8, 12]
  }

  // Return directions within 15m of the minimum (allows multiple flyways)
  const threshold = minElev + 15
  return averages
    .map((avg, idx) => ({ avg, idx }))
    .filter(d => d.avg <= threshold)
    .map(d => d.idx)
}

/** Generate candidate DCA points along flyway directions */
function projectCandidates(
  apiary: Apiary,
  flywayDirections: number[]
): { latitude: number; longitude: number; directionIndex: number }[] {
  const candidates: { latitude: number; longitude: number; directionIndex: number }[] = []

  for (const dirIdx of flywayDirections) {
    const bearing = dirIdx * DIRECTION_STEP_DEG
    for (const dist of CANDIDATE_DISTANCES_KM) {
      const p = offsetPoint(apiary.latitude, apiary.longitude, dist, bearing)
      candidates.push({ ...p, directionIndex: dirIdx })
    }
  }

  return candidates
}

/** Generate bowl-check neighbour points (N/S/E/W at 0.5km from candidate) */
function bowlCheckPoints(lat: number, lng: number): { latitude: number; longitude: number }[] {
  return [0, 90, 180, 270].map(b => offsetPoint(lat, lng, BOWL_CHECK_OFFSET_KM, b))
}

/** Score a candidate based on bowl shape + donut distance */
function scoreCandidate(
  candidateElev: number | null,
  neighbourElevs: (number | null)[],
  distFromApiary: number,
  isFlat: boolean
): { bowlScore: number; donutScore: number } {
  // Bowl score (0-40): candidate lower than surrounding neighbours
  let bowlScore = 0
  if (candidateElev !== null) {
    const validNeighbours = neighbourElevs.filter((e): e is number => e !== null)
    if (validNeighbours.length > 0) {
      const lowerCount = validNeighbours.filter(n => candidateElev < n).length
      bowlScore = Math.round((lowerCount / validNeighbours.length) * 40)
    }
  }

  // For flat terrain, give a baseline bowl score
  if (isFlat) bowlScore = Math.max(bowlScore, 15)

  // Donut score (0-20): peak at 2-4km
  let donutScore = 0
  if (distFromApiary >= 1.5 && distFromApiary <= 4.5) {
    // Peak score at 2.5-3.5km
    if (distFromApiary >= 2 && distFromApiary <= 4) {
      donutScore = 20
    } else {
      donutScore = 10
    }
  }

  return { bowlScore, donutScore }
}

/** Add convergence score when multiple apiaries' flyways meet near the same point */
function addConvergenceScores(candidates: ScoredCandidate[]): ScoredCandidate[] {
  return candidates.map(c => {
    // Count other apiaries with candidates within 1km
    const nearbyApiaryIds = new Set<string>()
    for (const other of candidates) {
      if (other.apiaryId === c.apiaryId) continue
      if (haversine(c.latitude, c.longitude, other.latitude, other.longitude) < 1) {
        nearbyApiaryIds.add(other.apiaryId)
      }
    }
    const convergenceScore = Math.min(nearbyApiaryIds.size * 20, 40)
    return { ...c, score: c.score + convergenceScore }
  })
}

/** Merge nearby predictions (within 500m), keeping the highest score */
function mergePredictions(predictions: ScoredCandidate[]): ScoredCandidate[] {
  const merged: ScoredCandidate[] = []
  const used = new Set<number>()

  // Sort by score descending
  const sorted = [...predictions].sort((a, b) => b.score - a.score)

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue
    const group = [sorted[i]]
    used.add(i)

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue
      if (haversine(sorted[i].latitude, sorted[i].longitude, sorted[j].latitude, sorted[j].longitude) < MERGE_RADIUS_KM) {
        group.push(sorted[j])
        used.add(j)
      }
    }

    // Keep highest-scored point, collect all contributing apiaries
    const best = group[0]
    const allApiaryIds = [...new Set(group.map(g => g.apiaryId))]
    const allApiaryNames = [...new Set(group.map(g => g.apiaryName))]
    merged.push({
      ...best,
      apiaryId: allApiaryIds.join(','),
      apiaryName: allApiaryNames.join(', '),
    })
  }

  return merged
}

// ── Main Entry Point ─────────────────────────────────────────

export async function predictDCAs(apiaries: Apiary[], confirmedLocations?: ConfirmedLocation[]): Promise<DCAResult> {
  if (apiaries.length === 0) return { predictions: [], flyways: [] }

  // Build lookup map to avoid repeated O(n) finds
  const apiaryMap = new Map(apiaries.map(a => [a.id, a]))

  // Step 1: Generate all sample points for all apiaries
  const apiaryData = apiaries.map(a => ({
    apiary: a,
    samplePoints: generateSamplePoints(a.latitude, a.longitude),
  }))

  const allSamplePoints = apiaryData.flatMap(d => d.samplePoints)

  // Step 2: Fetch elevations for all sample points
  const sampleElevations = await fetchElevationBatch(allSamplePoints)

  // Step 3: Find flyway directions per apiary and generate candidates
  let offset = 0
  const allCandidates: { latitude: number; longitude: number; directionIndex: number; apiaryId: string; apiaryName: string }[] = []
  const flatByApiary = new Map<string, boolean>()

  for (const { apiary, samplePoints } of apiaryData) {
    const elevSlice = sampleElevations.slice(offset, offset + samplePoints.length)
    offset += samplePoints.length

    // Detect flat terrain per apiary
    const validElevs = elevSlice.filter((e): e is number => e !== null)
    const isFlatApiary = validElevs.length > 1
      ? Math.max(...validElevs) - Math.min(...validElevs) < 5
      : false
    flatByApiary.set(apiary.id, isFlatApiary)

    const flywayDirs = findFlywayDirections(samplePoints, elevSlice)

    const candidates = projectCandidates(apiary, flywayDirs)
    allCandidates.push(
      ...candidates.map(c => ({ ...c, apiaryId: apiary.id, apiaryName: apiary.name }))
    )
  }

  // Step 3b: Inject positive field confirmations not near any terrain candidate
  if (confirmedLocations) {
    for (const loc of confirmedLocations) {
      if (!loc.confirmed) continue

      // Skip if within 1km of an existing terrain candidate
      const nearTerrain = allCandidates.some(
        c => haversine(c.latitude, c.longitude, loc.latitude, loc.longitude) < 1
      )
      if (nearTerrain) continue

      // Find nearest apiary and compute direction index from it
      let nearestApiary: Apiary | null = null
      let nearestDist = Infinity
      for (const a of apiaries) {
        const d = haversine(a.latitude, a.longitude, loc.latitude, loc.longitude)
        if (d < nearestDist) {
          nearestDist = d
          nearestApiary = a
        }
      }
      if (!nearestApiary) continue

      // Compute bearing from apiary to confirmation → direction index
      const dLng = (loc.longitude - nearestApiary.longitude) * Math.PI / 180
      const lat1 = nearestApiary.latitude * Math.PI / 180
      const lat2 = loc.latitude * Math.PI / 180
      const y = Math.sin(dLng) * Math.cos(lat2)
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
      const bearingDeg = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360
      const directionIndex = Math.round(bearingDeg / DIRECTION_STEP_DEG) % NUM_DIRECTIONS

      allCandidates.push({
        latitude: loc.latitude,
        longitude: loc.longitude,
        directionIndex,
        apiaryId: nearestApiary.id,
        apiaryName: nearestApiary.name,
      })
    }
  }

  if (allCandidates.length === 0) return { predictions: [], flyways: [] }

  // Step 4: Fetch elevations for candidates + their bowl-check neighbours
  const bowlNeighbourSets = allCandidates.map(c => bowlCheckPoints(c.latitude, c.longitude))
  const allBowlPoints = [
    ...allCandidates.map(c => ({ latitude: c.latitude, longitude: c.longitude })),
    ...bowlNeighbourSets.flat(),
  ]

  const bowlElevations = await fetchElevationBatch(allBowlPoints)

  // Step 5: Score candidates
  let scored: ScoredCandidate[] = allCandidates.map((c, i) => {
    const candidateElev = bowlElevations[i]
    const neighbourStart = allCandidates.length + i * 4
    const neighbourElevs = bowlElevations.slice(neighbourStart, neighbourStart + 4)

    const sourceApiary = apiaryMap.get(c.apiaryId)
    if (!sourceApiary) return null // defensive: skip orphaned candidate

    const distFromApiary = haversine(
      c.latitude, c.longitude,
      sourceApiary.latitude,
      sourceApiary.longitude
    )

    const { bowlScore, donutScore } = scoreCandidate(candidateElev, neighbourElevs, distFromApiary, flatByApiary.get(c.apiaryId) ?? false)

    return {
      latitude: c.latitude,
      longitude: c.longitude,
      score: bowlScore + donutScore,
      directionIndex: c.directionIndex,
      apiaryId: c.apiaryId,
      apiaryName: c.apiaryName,
    }
  }).filter((c): c is ScoredCandidate => c !== null)

  // Step 6: Add convergence scores
  scored = addConvergenceScores(scored)

  // Step 7: Filter, merge, limit
  // When confirmations are present, use a lower threshold so borderline candidates
  // survive to receive the hook's +15 confirmation bonus in post-processing.
  const filterThreshold = confirmedLocations && confirmedLocations.length > 0
    ? MIN_SCORE - 15
    : MIN_SCORE
  scored = scored.filter(c => c.score >= filterThreshold)
  scored = mergePredictions(scored)
  scored = scored.slice(0, MAX_RESULTS)

  // Step 8: Build output
  const predictions: DCAPrediction[] = scored.map(c => ({
    latitude: c.latitude,
    longitude: c.longitude,
    score: Math.min(c.score, 100),
    confidence: c.score >= 70 ? 'high' : c.score >= 55 ? 'medium' : 'low',
    radiusKm: c.score >= 70 ? 0.5 : c.score >= 55 ? 0.75 : 1,
    contributingApiaries: c.apiaryId.split(','),
    direction: DIRECTION_LABELS[c.directionIndex],
  }))

  // Build flyway lines from each contributing apiary to its predicted DCA
  const flyways: DCAFlyway[] = []
  for (const pred of scored) {
    const apiaryIds = pred.apiaryId.split(',')
    for (const aId of apiaryIds) {
      const apiary = apiaryMap.get(aId)
      if (apiary) {
        flyways.push({
          fromLatitude: apiary.latitude,
          fromLongitude: apiary.longitude,
          toLatitude: pred.latitude,
          toLongitude: pred.longitude,
          apiaryName: apiary.name,
        })
      }
    }
  }

  return { predictions, flyways }
}
