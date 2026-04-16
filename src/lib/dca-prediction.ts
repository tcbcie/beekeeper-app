/**
 * DCA (Drone Congregation Area) prediction engine.
 *
 * Phase 3 redesigns confirmation handling so field evidence behaves like
 * a bounded local prior rather than a late additive score patch.
 */

import { fetchElevationBatch } from './elevation'

export interface DCAPrediction {
  latitude: number
  longitude: number
  score: number
  confidence: 'high' | 'medium' | 'low'
  isFallback: boolean
  radiusKm: number
  contributingApiaries: string[]
  direction: string
  signalSummary: string
  reasonFlags: string[]
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
  observationDate?: string | null
}

interface SamplePoint {
  latitude: number
  longitude: number
  directionIndex: number
  ringIndex: number
}

interface DirectionProfile {
  directionIndex: number
  lowHorizonScore: number
  skylineContrastScore: number
  valleyOpeningScore: number
  directionScore: number
  lowContrast: boolean
}

interface CandidateSeed {
  latitude: number
  longitude: number
  directionIndex: number
  apiaryId: string
  apiaryName: string
  distanceKm: number
  distanceScore: number
  lowHorizonScore: number
  skylineContrastScore: number
  valleyOpeningScore: number
  directionScore: number
  isFlatSource: boolean
  lowContrast: boolean
  injectedByConfirmation: boolean
  confirmationAnchorScore: number
}

interface ScoredCandidate extends CandidateSeed {
  terrainScore: number
  saddleScore: number
  shelterScore: number
  supportScore: number
  confirmationSupportScore: number
  confirmationSuppressionScore: number
  confirmationMixedEvidence: boolean
  recentPositiveEvidence: boolean
  recentNegativeEvidence: boolean
  isFallback: boolean
  score: number
}

interface ConfirmationPrior {
  latitude: number
  longitude: number
  confirmed: boolean
  recencyWeight: number
  radiusKm: number
  sampleCount: number
}

interface ConfirmationInfluence {
  supportScore: number
  suppressionScore: number
  netScore: number
  mixedEvidence: boolean
  recentPositiveEvidence: boolean
  recentNegativeEvidence: boolean
}

const EARTH_RADIUS_KM = 6371
const NUM_DIRECTIONS = 16
const DIRECTION_STEP_DEG = 360 / NUM_DIRECTIONS
const SAMPLE_RINGS_KM = [1, 2.5, 4]
const CANDIDATE_DISTANCE_BAND_KM = [1, 1.8, 2.6, 3.4, 4.2]
const CANDIDATE_CONTEXT_BEARINGS = [0, 45, 90, 135, 180, 225, 270, 315]
const CANDIDATE_CONTEXT_OFFSET_KM = 0.5
const MERGE_RADIUS_KM = 0.5
const SUPPORT_RADIUS_KM = 1.2
const CONFIRMATION_SUPPORT_RADIUS_KM = 1
const CONFIRMATION_SUPPRESSION_RADIUS_KM = 1.2
const CONFIRMATION_CLUSTER_RADIUS_KM = 0.15
const MIN_SCORE = 40
const MAX_RESULTS = 5
const MAX_CONFIRMATION_SUPPORT_SCORE = 10
const MAX_CONFIRMATION_SUPPRESSION_SCORE = 9
const MAX_CONFIRMATION_ANCHOR_SCORE = 6

const DIRECTION_LABELS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90
}

function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0
  const avg = mean(values)
  const variance = mean(values.map(value => (value - avg) ** 2))
  return Math.sqrt(variance)
}

function daysSince(dateString?: string | null): number | null {
  if (!dateString) return null
  const parsed = Date.parse(dateString)
  if (Number.isNaN(parsed)) return null
  return Math.max(0, (Date.now() - parsed) / (1000 * 60 * 60 * 24))
}

function confirmationRecencyWeight(dateString?: string | null): number {
  const ageDays = daysSince(dateString)
  if (ageDays === null) return 0.55
  if (ageDays <= 60) return 1
  if (ageDays <= 180) return 0.85
  if (ageDays <= 365) return 0.7
  if (ageDays <= 730) return 0.5
  return 0.3
}

function buildConfirmationPriors(
  confirmedLocations?: ConfirmedLocation[]
): ConfirmationPrior[] {
  if (!confirmedLocations || confirmedLocations.length === 0) return []

  const sanitised = confirmedLocations
    .filter(location =>
      isValidLatitude(location.latitude) &&
      isValidLongitude(location.longitude) &&
      typeof location.confirmed === 'boolean'
    )
    .map(location => ({
      latitude: location.latitude,
      longitude: location.longitude,
      confirmed: location.confirmed,
      recencyWeight: confirmationRecencyWeight(location.observationDate),
      radiusKm: location.confirmed
        ? CONFIRMATION_SUPPORT_RADIUS_KM
        : CONFIRMATION_SUPPRESSION_RADIUS_KM,
      sampleCount: 1,
    }))

  if (sanitised.length <= 1) return sanitised

  const clustered: ConfirmationPrior[] = []

  for (const prior of sanitised) {
    const existingCluster = clustered.find(cluster =>
      cluster.confirmed === prior.confirmed &&
      haversine(cluster.latitude, cluster.longitude, prior.latitude, prior.longitude) <= CONFIRMATION_CLUSTER_RADIUS_KM
    )

    if (!existingCluster) {
      clustered.push({ ...prior })
      continue
    }

    const nextSampleCount = existingCluster.sampleCount + 1
    existingCluster.latitude =
      (existingCluster.latitude * existingCluster.sampleCount + prior.latitude) / nextSampleCount
    existingCluster.longitude =
      (existingCluster.longitude * existingCluster.sampleCount + prior.longitude) / nextSampleCount
    existingCluster.recencyWeight = Math.max(existingCluster.recencyWeight, prior.recencyWeight)
    existingCluster.sampleCount = nextSampleCount
  }

  return clustered
}

function offsetPoint(
  lat: number,
  lng: number,
  distanceKm: number,
  bearingDeg: number
): { latitude: number; longitude: number } {
  const bearingRad = (bearingDeg * Math.PI) / 180
  const latOffset = (distanceKm / EARTH_RADIUS_KM) * (180 / Math.PI) * Math.cos(bearingRad)
  const cosLat = Math.cos((lat * Math.PI) / 180)
  const lngOffset = cosLat > 1e-6
    ? (distanceKm / EARTH_RADIUS_KM) * (180 / Math.PI) * Math.sin(bearingRad) / cosLat
    : 0
  return { latitude: lat + latOffset, longitude: lng + lngOffset }
}

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

function generateSamplePoints(lat: number, lng: number): SamplePoint[] {
  const points: SamplePoint[] = []
  for (let d = 0; d < NUM_DIRECTIONS; d++) {
    const bearing = d * DIRECTION_STEP_DEG
    for (let r = 0; r < SAMPLE_RINGS_KM.length; r++) {
      const point = offsetPoint(lat, lng, SAMPLE_RINGS_KM[r], bearing)
      points.push({ ...point, directionIndex: d, ringIndex: r })
    }
  }
  return points
}

function distanceSuitabilityScore(distanceKm: number): number {
  if (distanceKm < 0.75 || distanceKm > 5) return 0

  const peakKm = 2.8
  const spreadKm = 1.35
  const delta = distanceKm - peakKm
  const gaussian = Math.exp(-(delta * delta) / (2 * spreadKm * spreadKm))
  return Math.round(gaussian * 24)
}

function buildDirectionProfiles(
  samplePoints: SamplePoint[],
  elevations: (number | null)[]
): { profiles: DirectionProfile[]; isFlat: boolean } {
  const perDirection: (number | null)[][] = Array.from(
    { length: NUM_DIRECTIONS },
    () => Array.from({ length: SAMPLE_RINGS_KM.length }, () => null)
  )

  samplePoints.forEach((samplePoint, index) => {
    perDirection[samplePoint.directionIndex][samplePoint.ringIndex] = elevations[index]
  })

  const averages = perDirection.map(rings => {
    const validValues = rings.filter((value): value is number => value !== null)
    if (validValues.length === 0) return Infinity
    return mean(validValues)
  })

  const validAverages = averages.filter(value => value !== Infinity)
  if (validAverages.length === 0) return { profiles: [], isFlat: false }

  const maxElev = Math.max(...validAverages)
  const minElev = Math.min(...validAverages)
  const range = maxElev - minElev
  const normaliser = Math.max(range, 12)
  const isFlat = range < 5

  const profiles = averages
    .map((averageElevation, directionIndex): DirectionProfile | null => {
      if (averageElevation === Infinity) return null

      const left = averages[(directionIndex + NUM_DIRECTIONS - 1) % NUM_DIRECTIONS]
      const right = averages[(directionIndex + 1) % NUM_DIRECTIONS]
      const farLeft = averages[(directionIndex + NUM_DIRECTIONS - 2) % NUM_DIRECTIONS]
      const farRight = averages[(directionIndex + 2) % NUM_DIRECTIONS]

      const immediateNeighbours = [left, right].filter((value): value is number => value !== Infinity)
      const widerNeighbours = [farLeft, farRight].filter((value): value is number => value !== Infinity)

      const immediateAverage = immediateNeighbours.length > 0 ? mean(immediateNeighbours) : averageElevation
      const widerAverage = widerNeighbours.length > 0 ? mean(widerNeighbours) : immediateAverage

      const rings = perDirection[directionIndex]
      const innerRing = rings[0]
      const middleRing = rings[1]
      const outerRing = rings[rings.length - 1]

      const relativeLow = isFlat
        ? 0.2
        : clamp((maxElev - averageElevation) / normaliser, 0, 1)
      const localContrast = clamp((immediateAverage - averageElevation) / normaliser, 0, 1)
      const skylineContrast = clamp((widerAverage - averageElevation) / normaliser, 0, 1)
      const outwardTrend = innerRing !== null && outerRing !== null
        ? clamp((innerRing - outerRing) / 20, 0, 1)
        : 0

      let valleyOpening = outwardTrend * 0.6 + relativeLow * 0.2
      if (middleRing !== null && outerRing !== null) {
        valleyOpening += clamp((middleRing - outerRing) / 15, 0, 1) * 0.2
      }
      valleyOpening = clamp(valleyOpening, 0, 1)

      const lowHorizonScore = Math.round(relativeLow * 8)
      const skylineContrastScore = Math.round(clamp(localContrast * 0.55 + skylineContrast * 0.45, 0, 1) * 10)
      const valleyOpeningScore = Math.round(valleyOpening * 8)
      const directionScore = lowHorizonScore + skylineContrastScore + valleyOpeningScore

      return {
        directionIndex,
        lowHorizonScore,
        skylineContrastScore,
        valleyOpeningScore,
        directionScore,
        lowContrast: isFlat || (localContrast < 0.2 && skylineContrast < 0.2),
      }
    })
    .filter((profile): profile is DirectionProfile => profile !== null)

  return { profiles, isFlat }
}

function scoreConfirmationInfluence(
  latitude: number,
  longitude: number,
  priors: ConfirmationPrior[]
): ConfirmationInfluence {
  if (priors.length === 0) {
    return {
      supportScore: 0,
      suppressionScore: 0,
      netScore: 0,
      mixedEvidence: false,
      recentPositiveEvidence: false,
      recentNegativeEvidence: false,
    }
  }

  let positiveWeight = 0
  let negativeWeight = 0
  let positiveCount = 0
  let negativeCount = 0
  let recentPositiveEvidence = false
  let recentNegativeEvidence = false

  for (const prior of priors) {
    const distanceKm = haversine(latitude, longitude, prior.latitude, prior.longitude)
    if (distanceKm > prior.radiusKm) continue

    const proximityWeight = clamp(1 - distanceKm / prior.radiusKm, 0, 1)
    const influenceWeight = prior.recencyWeight * (0.4 + proximityWeight * 0.6)

    if (prior.confirmed) {
      positiveWeight += influenceWeight
      positiveCount += prior.sampleCount
      if (prior.recencyWeight >= 0.8) recentPositiveEvidence = true
    } else {
      negativeWeight += influenceWeight
      negativeCount += prior.sampleCount
      if (prior.recencyWeight >= 0.8) recentNegativeEvidence = true
    }
  }

  const supportScore = Math.round(clamp(
    positiveWeight * 4.5 + Math.max(0, positiveCount - 1) * 1.5,
    0,
    MAX_CONFIRMATION_SUPPORT_SCORE
  ))
  const suppressionScore = Math.round(clamp(
    negativeWeight * 5 + Math.max(0, negativeCount - 1) * 1.75,
    0,
    MAX_CONFIRMATION_SUPPRESSION_SCORE
  ))

  return {
    supportScore,
    suppressionScore,
    netScore: supportScore - suppressionScore,
    mixedEvidence: positiveCount > 0 && negativeCount > 0,
    recentPositiveEvidence,
    recentNegativeEvidence,
  }
}

function selectDirectionProfiles(
  profiles: DirectionProfile[],
  isFlat: boolean
): DirectionProfile[] {
  if (profiles.length === 0) return []

  const sorted = [...profiles].sort((a, b) => b.directionScore - a.directionScore)
  const bestScore = sorted[0].directionScore

  if (isFlat) {
    return sorted.slice(0, 2)
  }

  const threshold = Math.max(8, bestScore - 4)
  const selected = sorted.filter(profile => profile.directionScore >= threshold).slice(0, 4)
  return selected.length > 0 ? selected : sorted.slice(0, 1)
}

function projectCandidates(
  apiary: Apiary,
  profiles: DirectionProfile[],
  isFlat: boolean
): CandidateSeed[] {
  const selectedDirections = selectDirectionProfiles(profiles, isFlat)
  const candidates: CandidateSeed[] = []

  for (const profile of selectedDirections) {
    const bearing = profile.directionIndex * DIRECTION_STEP_DEG

    for (const distanceKm of CANDIDATE_DISTANCE_BAND_KM) {
      const point = offsetPoint(apiary.latitude, apiary.longitude, distanceKm, bearing)
      candidates.push({
        ...point,
        directionIndex: profile.directionIndex,
        apiaryId: apiary.id,
        apiaryName: apiary.name,
        distanceKm,
        distanceScore: distanceSuitabilityScore(distanceKm),
        lowHorizonScore: profile.lowHorizonScore,
        skylineContrastScore: profile.skylineContrastScore,
        valleyOpeningScore: profile.valleyOpeningScore,
        directionScore: profile.directionScore,
        isFlatSource: isFlat,
        lowContrast: profile.lowContrast,
        injectedByConfirmation: false,
        confirmationAnchorScore: 0,
      })
    }
  }

  return candidates
}

function candidateContextPoints(
  lat: number,
  lng: number
): { latitude: number; longitude: number }[] {
  return CANDIDATE_CONTEXT_BEARINGS.map(bearing =>
    offsetPoint(lat, lng, CANDIDATE_CONTEXT_OFFSET_KM, bearing)
  )
}

function scoreCandidateLandscape(
  candidateElev: number | null,
  neighbourElevs: (number | null)[],
  isFlatSource: boolean,
  lowContrast: boolean
): { terrainScore: number; saddleScore: number; shelterScore: number } {
  if (candidateElev === null) {
    return { terrainScore: 0, saddleScore: 0, shelterScore: 0 }
  }

  const validNeighbours = neighbourElevs.filter((value): value is number => value !== null)
  if (validNeighbours.length < 4) {
    return { terrainScore: 0, saddleScore: 0, shelterScore: 0 }
  }

  const lowerCount = validNeighbours.filter(value => candidateElev < value).length
  const lowerRatio = lowerCount / validNeighbours.length
  const averageNeighbour = mean(validNeighbours)
  const localRelief = clamp((averageNeighbour - candidateElev) / 18, 0, 1)

  let terrainScore = Math.round((lowerRatio * 0.5 + localRelief * 0.5) * 12)

  const axisPairs: number[][] = [
    [0, 4], // N / S
    [2, 6], // E / W
    [1, 5], // NE / SW
    [3, 7], // SE / NW
  ]

  const axisMetrics = axisPairs
    .map(([first, second]) => {
      const a = neighbourElevs[first]
      const b = neighbourElevs[second]
      if (a === null || b === null) return null
      return {
        mean: (a + b) / 2,
        balance: clamp(1 - Math.abs(a - b) / 15, 0, 1),
      }
    })
    .filter((metric): metric is { mean: number; balance: number } => metric !== null)

  let saddleScore = 0
  if (axisMetrics.length >= 2) {
    const sortedAxes = [...axisMetrics].sort((a, b) => a.mean - b.mean)
    const lowestAxis = sortedAxes[0]
    const highestAxis = sortedAxes[sortedAxes.length - 1]
    const separation = clamp((highestAxis.mean - lowestAxis.mean) / 18, 0, 1)
    saddleScore = Math.round(lowestAxis.balance * separation * 10)
  }

  const reliefDelta = averageNeighbour - candidateElev
  const reliefPreference = clamp(1 - Math.abs(reliefDelta - 10) / 12, 0, 1)
  const variation = standardDeviation(validNeighbours)
  const variationPreference = clamp(1 - Math.abs(variation - 8) / 8, 0, 1)
  let shelterScore = Math.round(reliefPreference * variationPreference * 8)

  if (isFlatSource || lowContrast) {
    terrainScore = Math.min(terrainScore, 8)
    saddleScore = Math.min(saddleScore, 6)
    shelterScore = Math.min(shelterScore, 5)
  }

  return { terrainScore, saddleScore, shelterScore }
}

function addSupportScores(candidates: ScoredCandidate[]): ScoredCandidate[] {
  return candidates.map(candidate => {
    const nearbyApiaryIds = new Set<string>()

    for (const other of candidates) {
      if (other.apiaryId === candidate.apiaryId) continue
      if (haversine(candidate.latitude, candidate.longitude, other.latitude, other.longitude) <= SUPPORT_RADIUS_KM) {
        nearbyApiaryIds.add(other.apiaryId)
      }
    }

    const supportScore = Math.min(nearbyApiaryIds.size * 8, 16)
    return {
      ...candidate,
      supportScore,
      isFallback: candidate.isFallback,
      score: candidate.score + supportScore,
    }
  })
}

function mergePredictions(predictions: ScoredCandidate[]): ScoredCandidate[] {
  const merged: ScoredCandidate[] = []
  const used = new Set<number>()
  const sorted = [...predictions].sort((a, b) => b.score - a.score)

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue

    const group = [sorted[i]]
    used.add(i)

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue
      const distanceKm = haversine(
        sorted[i].latitude,
        sorted[i].longitude,
        sorted[j].latitude,
        sorted[j].longitude
      )
      if (distanceKm < MERGE_RADIUS_KM) {
        group.push(sorted[j])
        used.add(j)
      }
    }

    const best = group[0]
    const allApiaryIds = [...new Set(group.map(candidate => candidate.apiaryId))]
    const allApiaryNames = [...new Set(group.map(candidate => candidate.apiaryName))]

    merged.push({
      ...best,
      apiaryId: allApiaryIds.join(','),
      apiaryName: allApiaryNames.join(', '),
      distanceScore: Math.max(...group.map(candidate => candidate.distanceScore)),
      lowHorizonScore: Math.max(...group.map(candidate => candidate.lowHorizonScore)),
      skylineContrastScore: Math.max(...group.map(candidate => candidate.skylineContrastScore)),
      valleyOpeningScore: Math.max(...group.map(candidate => candidate.valleyOpeningScore)),
      directionScore: Math.max(...group.map(candidate => candidate.directionScore)),
      terrainScore: Math.max(...group.map(candidate => candidate.terrainScore)),
      saddleScore: Math.max(...group.map(candidate => candidate.saddleScore)),
      shelterScore: Math.max(...group.map(candidate => candidate.shelterScore)),
      supportScore: Math.max(...group.map(candidate => candidate.supportScore)),
      confirmationSupportScore: Math.max(...group.map(candidate => candidate.confirmationSupportScore)),
      confirmationSuppressionScore: Math.max(...group.map(candidate => candidate.confirmationSuppressionScore)),
      confirmationMixedEvidence: group.some(candidate => candidate.confirmationMixedEvidence),
      recentPositiveEvidence: group.some(candidate => candidate.recentPositiveEvidence),
      recentNegativeEvidence: group.some(candidate => candidate.recentNegativeEvidence),
      injectedByConfirmation: group.some(candidate => candidate.injectedByConfirmation),
      confirmationAnchorScore: Math.max(...group.map(candidate => candidate.confirmationAnchorScore)),
      isFallback: group.every(candidate => candidate.isFallback),
      isFlatSource: group.every(candidate => candidate.isFlatSource),
      lowContrast: group.every(candidate => candidate.lowContrast),
    })
  }

  return merged
}

function confidenceForCandidate(candidate: ScoredCandidate): DCAPrediction['confidence'] {
  let strongSignalCount = 0
  if (candidate.distanceScore >= 15) strongSignalCount += 1
  if (candidate.skylineContrastScore >= 6) strongSignalCount += 1
  if (candidate.valleyOpeningScore >= 5) strongSignalCount += 1
  if (candidate.terrainScore >= 7) strongSignalCount += 1
  if (candidate.saddleScore >= 5) strongSignalCount += 1
  if (candidate.shelterScore >= 4) strongSignalCount += 1
  if (candidate.supportScore >= 8) strongSignalCount += 1
  if (candidate.confirmationSupportScore >= 4 || candidate.confirmationAnchorScore >= 4) strongSignalCount += 1

  const hasCrossApiarySupport = candidate.apiaryId.includes(',')
  const weakTerrainContext = candidate.isFlatSource || candidate.lowContrast
  const heavySuppression = candidate.confirmationSuppressionScore >= 6 && candidate.confirmationSupportScore === 0

  if (
    candidate.score >= 74 &&
    strongSignalCount >= 4 &&
    hasCrossApiarySupport &&
    !weakTerrainContext &&
    candidate.confirmationSuppressionScore < 5
  ) {
    return 'high'
  }

  if (
    candidate.score >= 52 &&
    strongSignalCount >= 3 &&
    !(weakTerrainContext && candidate.supportScore === 0 && candidate.terrainScore < 5) &&
    !heavySuppression
  ) {
    return 'medium'
  }

  return 'low'
}

function radiusForConfidence(confidence: DCAPrediction['confidence']): number {
  if (confidence === 'high') return 0.5
  if (confidence === 'medium') return 0.75
  return 1
}

function selectFallbackCandidate(candidates: ScoredCandidate[]): ScoredCandidate | null {
  if (candidates.length === 0) return null

  const mergedCandidates = mergePredictions(candidates)
  if (mergedCandidates.length === 0) return null

  const bestCandidate = [...mergedCandidates].sort((left, right) => right.score - left.score)[0]
  return {
    ...bestCandidate,
    isFallback: true,
  }
}

function buildReasonFlags(candidate: ScoredCandidate): string[] {
  const flags: string[] = []
  if (candidate.skylineContrastScore >= 6) flags.push('landscape-supported')
  if (candidate.valleyOpeningScore >= 5 || candidate.saddleScore >= 5) flags.push('terrain-structure')
  if (candidate.shelterScore >= 4) flags.push('sheltered-opening')
  if (candidate.supportScore >= 8) flags.push('multi-apiary')
  if (candidate.confirmationSupportScore >= 4 || candidate.confirmationAnchorScore >= 4) {
    flags.push('confirmation-supported')
  }
  if (candidate.confirmationSuppressionScore >= 4) flags.push('confirmation-suppressed')
  if (candidate.confirmationMixedEvidence) flags.push('mixed-confirmation')
  if (candidate.isFallback) flags.push('fallback-only')
  if (candidate.isFlatSource || candidate.lowContrast) flags.push('fallback-heavy')
  return flags
}

function buildSignalSummary(candidate: ScoredCandidate): string {
  const signals = [
    { label: 'skyline contrast', value: candidate.skylineContrastScore },
    { label: 'valley opening', value: candidate.valleyOpeningScore },
    { label: 'terrain support', value: candidate.terrainScore },
    { label: 'saddle support', value: candidate.saddleScore },
    { label: 'sheltered opening', value: candidate.shelterScore },
    { label: 'multi-apiary support', value: candidate.supportScore },
    { label: 'recent confirmations', value: candidate.confirmationSupportScore },
  ]
    .filter(signal => signal.value > 0)
    .sort((a, b) => b.value - a.value)

  if (candidate.isFallback && signals.length === 0) return 'Fallback local guess'
  if (signals.length === 0) return 'Weak landscape evidence'
  if (signals.length === 1) return signals[0].label
  return `${signals[0].label}, ${signals[1].label}`
}

export async function predictDCAs(
  apiaries: Apiary[],
  confirmedLocations?: ConfirmedLocation[]
): Promise<DCAResult> {
  const validApiaries = apiaries.filter(apiary =>
    Boolean(apiary.id) &&
    isValidLatitude(apiary.latitude) &&
    isValidLongitude(apiary.longitude)
  )
  if (validApiaries.length === 0) return { predictions: [], flyways: [] }

  const confirmationPriors = buildConfirmationPriors(confirmedLocations)

  const apiaryMap = new Map(validApiaries.map(apiary => [apiary.id, apiary]))
  const apiaryData = validApiaries.map(apiary => ({
    apiary,
    samplePoints: generateSamplePoints(apiary.latitude, apiary.longitude),
  }))

  const allSamplePoints = apiaryData.flatMap(item => item.samplePoints)
  const sampleElevations = await fetchElevationBatch(allSamplePoints)

  let offset = 0
  const allCandidates: CandidateSeed[] = []
  const directionProfilesByApiary = new Map<string, DirectionProfile[]>()
  const flatByApiary = new Map<string, boolean>()

  for (const { apiary, samplePoints } of apiaryData) {
    const elevSlice = sampleElevations.slice(offset, offset + samplePoints.length)
    offset += samplePoints.length

    const { profiles, isFlat } = buildDirectionProfiles(samplePoints, elevSlice)
    directionProfilesByApiary.set(apiary.id, profiles)
    flatByApiary.set(apiary.id, isFlat)
    allCandidates.push(...projectCandidates(apiary, profiles, isFlat))
  }

  if (confirmationPriors.length > 0) {
    for (const prior of confirmationPriors) {
      if (!prior.confirmed || prior.recencyWeight < 0.35) continue

      const nearExistingCandidate = allCandidates.some(candidate =>
        haversine(candidate.latitude, candidate.longitude, prior.latitude, prior.longitude) < 1
      )
      if (nearExistingCandidate) continue

      let nearestApiary: Apiary | null = null
      let nearestDistance = Infinity

      for (const apiary of validApiaries) {
        const distanceKm = haversine(apiary.latitude, apiary.longitude, prior.latitude, prior.longitude)
        if (distanceKm < nearestDistance) {
          nearestDistance = distanceKm
          nearestApiary = apiary
        }
      }

      if (!nearestApiary) continue

      const dLng = (prior.longitude - nearestApiary.longitude) * Math.PI / 180
      const lat1 = nearestApiary.latitude * Math.PI / 180
      const lat2 = prior.latitude * Math.PI / 180
      const y = Math.sin(dLng) * Math.cos(lat2)
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
      const bearingDeg = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360
      const directionIndex = Math.round(bearingDeg / DIRECTION_STEP_DEG) % NUM_DIRECTIONS
      const matchingProfile = directionProfilesByApiary
        .get(nearestApiary.id)
        ?.find(profile => profile.directionIndex === directionIndex)

      allCandidates.push({
        latitude: prior.latitude,
        longitude: prior.longitude,
        directionIndex,
        apiaryId: nearestApiary.id,
        apiaryName: nearestApiary.name,
        distanceKm: nearestDistance,
        distanceScore: distanceSuitabilityScore(nearestDistance),
        lowHorizonScore: matchingProfile?.lowHorizonScore ?? 2,
        skylineContrastScore: matchingProfile?.skylineContrastScore ?? 3,
        valleyOpeningScore: matchingProfile?.valleyOpeningScore ?? 2,
        directionScore: matchingProfile?.directionScore ?? 7,
        isFlatSource: flatByApiary.get(nearestApiary.id) ?? false,
        lowContrast: matchingProfile?.lowContrast ?? true,
        injectedByConfirmation: true,
        confirmationAnchorScore: Math.round(clamp(
          1 + prior.recencyWeight * 4,
          0,
          MAX_CONFIRMATION_ANCHOR_SCORE
        )),
      })
    }
  }

  if (allCandidates.length === 0) return { predictions: [], flyways: [] }

  const candidateContextSets = allCandidates.map(candidate => candidateContextPoints(candidate.latitude, candidate.longitude))
  const allContextPoints = [
    ...allCandidates.map(candidate => ({ latitude: candidate.latitude, longitude: candidate.longitude })),
    ...candidateContextSets.flat(),
  ]
  const contextElevations = await fetchElevationBatch(allContextPoints)

  let scored = allCandidates
    .map((candidate, index): ScoredCandidate | null => {
      const candidateElev = contextElevations[index]
      const neighbourStart = allCandidates.length + index * CANDIDATE_CONTEXT_BEARINGS.length
      const neighbourElevs = contextElevations.slice(
        neighbourStart,
        neighbourStart + CANDIDATE_CONTEXT_BEARINGS.length
      )

      const { terrainScore, saddleScore, shelterScore } = scoreCandidateLandscape(
        candidateElev,
        neighbourElevs,
        candidate.isFlatSource,
        candidate.lowContrast
      )

      const sourceApiary = apiaryMap.get(candidate.apiaryId)
      if (!sourceApiary) return null

      const distanceKm = haversine(
        candidate.latitude,
        candidate.longitude,
        sourceApiary.latitude,
        sourceApiary.longitude
      )
      const distanceScore = distanceSuitabilityScore(distanceKm)
      const confirmationInfluence = scoreConfirmationInfluence(
        candidate.latitude,
        candidate.longitude,
        confirmationPriors
      )

      return {
        ...candidate,
        distanceKm,
        distanceScore,
        terrainScore,
        saddleScore,
        shelterScore,
        confirmationSupportScore: confirmationInfluence.supportScore,
        confirmationSuppressionScore: confirmationInfluence.suppressionScore,
        confirmationMixedEvidence: confirmationInfluence.mixedEvidence,
        recentPositiveEvidence: confirmationInfluence.recentPositiveEvidence,
        recentNegativeEvidence: confirmationInfluence.recentNegativeEvidence,
        isFallback: false,
        supportScore: 0,
        score:
          distanceScore +
          candidate.lowHorizonScore +
          candidate.skylineContrastScore +
          candidate.valleyOpeningScore +
          terrainScore +
          saddleScore +
          shelterScore +
          candidate.confirmationAnchorScore +
          confirmationInfluence.netScore,
      }
    })
    .filter((candidate): candidate is ScoredCandidate => candidate !== null)

  scored = addSupportScores(scored)

  const hasPositiveConfirmationEvidence = confirmationPriors.some(
    prior => prior.confirmed && prior.recencyWeight >= 0.35
  )
  const filterThreshold = hasPositiveConfirmationEvidence
    ? MIN_SCORE - MAX_CONFIRMATION_SUPPORT_SCORE
    : MIN_SCORE

  const fallbackCandidate = selectFallbackCandidate(scored)

  scored = scored.filter(candidate => candidate.score >= filterThreshold)
  scored = mergePredictions(scored)
  if (scored.length === 0 && fallbackCandidate) {
    scored = [fallbackCandidate]
  }
  scored = scored.slice(0, MAX_RESULTS)

  const predictions: DCAPrediction[] = scored.map(candidate => {
    const confidence = candidate.isFallback ? 'low' : confidenceForCandidate(candidate)
    return {
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      score: Math.min(Math.round(candidate.score), 100),
      confidence,
      isFallback: candidate.isFallback,
      radiusKm: radiusForConfidence(confidence),
      contributingApiaries: candidate.apiaryId.split(','),
      direction: DIRECTION_LABELS[candidate.directionIndex],
      signalSummary: buildSignalSummary(candidate),
      reasonFlags: buildReasonFlags(candidate),
    }
  })

  const flyways: DCAFlyway[] = []
  for (const candidate of scored) {
    for (const apiaryId of candidate.apiaryId.split(',')) {
      const apiary = apiaryMap.get(apiaryId)
      if (!apiary) continue

      flyways.push({
        fromLatitude: apiary.latitude,
        fromLongitude: apiary.longitude,
        toLatitude: candidate.latitude,
        toLongitude: candidate.longitude,
        apiaryName: apiary.name,
      })
    }
  }

  return { predictions, flyways }
}
