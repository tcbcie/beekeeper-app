'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { predictDCAs, ElevationUnavailableError, type DCAPrediction, type DCAFlyway, type DCAResult, type ConfirmedLocation, type NeighbourApiary } from '@/lib/dca-prediction'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'

interface Apiary {
  id: string
  name: string
  latitude: number
  longitude: number
}

export interface DCAConfirmation {
  id: string
  latitude: number
  longitude: number
  confirmed: boolean
  observation_date: string
  notes: string | null
  /** The beekeeper chose to share this sighting with other beekeepers (confirmed sightings only). */
  is_shared: boolean
}

const CACHE_KEY_PREFIX = 'dca-predictions-v8-'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_APIARIES = 10

interface CachedResult {
  predictions: DCAPrediction[]
  flyways: DCAFlyway[]
  timestamp: number
}

type PredictionRunStatus = 'idle' | 'success' | 'fallback' | 'empty'

/** What happened to a sighting the beekeeper tried to save. */
export type SightingSaveStatus = 'saved' | 'duplicate' | 'failed'

const CONFIRMATION_COLUMNS = 'id, latitude, longitude, confirmed, observation_date, notes, is_shared'

/** Saved predictions were worked out from the old sightings, so they go when a sighting changes. */
function clearPredictionCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_KEY_PREFIX))
    keys.forEach(key => localStorage.removeItem(key))
  } catch {
    // Ignore storage access failures.
  }
}

const CONFIRMATION_DUPLICATE_RADIUS_KM = 0.05
const CONFIRMATION_DUPLICATE_WINDOW_DAYS = 7

function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90
}

function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180
}

function isValidCoordinatePair(latitude: number, longitude: number): boolean {
  return isValidLatitude(latitude) && isValidLongitude(longitude)
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusKm = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function daysSince(dateString: string): number | null {
  const parsed = Date.parse(dateString)
  if (Number.isNaN(parsed)) return null
  return Math.max(0, (Date.now() - parsed) / (1000 * 60 * 60 * 24))
}

function isDuplicateRecentConfirmation(
  confirmations: DCAConfirmation[],
  latitude: number,
  longitude: number,
  confirmed: boolean
): boolean {
  return confirmations.some(existing => {
    if (existing.confirmed !== confirmed) return false
    if (!isValidCoordinatePair(existing.latitude, existing.longitude)) return false

    const ageDays = daysSince(existing.observation_date)
    if (ageDays !== null && ageDays > CONFIRMATION_DUPLICATE_WINDOW_DAYS) return false

    return haversineKm(latitude, longitude, existing.latitude, existing.longitude) <= CONFIRMATION_DUPLICATE_RADIUS_KM
  })
}

function isValidPrediction(value: unknown): value is DCAPrediction {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  const latitude = candidate.latitude
  const longitude = candidate.longitude
  const score = candidate.score
  const radiusKm = candidate.radiusKm
  const contributingApiaries = candidate.contributingApiaries
  const reasonFlags = candidate.reasonFlags

  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    isValidCoordinatePair(latitude, longitude) &&
    typeof score === 'number' &&
    Number.isFinite(score) &&
    (candidate.confidence === 'high' || candidate.confidence === 'medium' || candidate.confidence === 'low') &&
    typeof candidate.isFallback === 'boolean' &&
    typeof radiusKm === 'number' &&
    Number.isFinite(radiusKm) &&
    Array.isArray(contributingApiaries) &&
    contributingApiaries.every(item => typeof item === 'string') &&
    typeof candidate.direction === 'string' &&
    typeof candidate.signalSummary === 'string' &&
    Array.isArray(reasonFlags) &&
    reasonFlags.every(item => typeof item === 'string')
  )
}

function isValidFlyway(value: unknown): value is DCAFlyway {
  if (!value || typeof value !== 'object') return false
  const flyway = value as Record<string, unknown>
  const fromLatitude = flyway.fromLatitude
  const fromLongitude = flyway.fromLongitude
  const toLatitude = flyway.toLatitude
  const toLongitude = flyway.toLongitude

  return (
    typeof fromLatitude === 'number' &&
    typeof fromLongitude === 'number' &&
    typeof toLatitude === 'number' &&
    typeof toLongitude === 'number' &&
    isValidCoordinatePair(fromLatitude, fromLongitude) &&
    isValidCoordinatePair(toLatitude, toLongitude) &&
    typeof flyway.apiaryName === 'string'
  )
}

function hashString(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return (hash >>> 0).toString(36)
}

function getConfirmationSignature(confirmations: DCAConfirmation[]): string {
  if (confirmations.length === 0) return 'none'

  const parts = [...confirmations]
    .sort((left, right) => {
      if (left.observation_date !== right.observation_date) {
        return left.observation_date.localeCompare(right.observation_date)
      }
      if (left.latitude !== right.latitude) return left.latitude - right.latitude
      if (left.longitude !== right.longitude) return left.longitude - right.longitude
      return Number(left.confirmed) - Number(right.confirmed)
    })
    .map(confirmation => [
      confirmation.latitude.toFixed(4),
      confirmation.longitude.toFixed(4),
      confirmation.confirmed ? '1' : '0',
      confirmation.observation_date,
    ].join(','))

  return hashString(parts.join('|'))
}

function getNeighbourSignature(neighbours: NeighbourApiary[]): string {
  if (neighbours.length === 0) return 'none'
  const parts = neighbours
    .map(neighbour => `${neighbour.latitude.toFixed(4)},${neighbour.longitude.toFixed(4)},${neighbour.hiveCount}`)
    .sort()
  return hashString(parts.join('|'))
}

function getCacheKey(
  apiaryIds: string[],
  apiaries: Apiary[],
  confirmations: DCAConfirmation[],
  neighbours: NeighbourApiary[]
): string {
  // Include coordinates and confirmation state so cache invalidates cleanly.
  const apiaryParts = [...apiaryIds].sort().map(id => {
    const apiary = apiaries.find(item => item.id === id)
    return apiary ? `${id}:${apiary.latitude.toFixed(4)},${apiary.longitude.toFixed(4)}` : id
  })

  return `${CACHE_KEY_PREFIX}${apiaryParts.join('|')}|c:${getConfirmationSignature(confirmations)}|n:${getNeighbourSignature(neighbours)}`
}

function loadCache(key: string): CachedResult | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (
      !cached ||
      typeof cached.timestamp !== 'number' ||
      !Array.isArray(cached.predictions) ||
      !Array.isArray(cached.flyways) ||
      !cached.predictions.every(isValidPrediction) ||
      !cached.flyways.every(isValidFlyway)
    ) {
      localStorage.removeItem(key)
      return null
    }
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key)
      return null
    }
    return cached as CachedResult
  } catch {
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore storage access failures.
    }
    return null
  }
}

function saveCache(key: string, result: CachedResult): void {
  try {
    localStorage.setItem(key, JSON.stringify(result))
  } catch {
    // Storage full - ignore
  }
}

const NO_NEIGHBOURS: NeighbourApiary[] = []

/** `neighbours` are other beekeepers' apiaries; pass a memoised array. */
export function useDCAPredictions(apiaries: Apiary[], neighbours: NeighbourApiary[] = NO_NEIGHBOURS) {
  const [predictions, setPredictions] = useState<DCAPrediction[]>([])
  const [flyways, setFlyways] = useState<DCAFlyway[]>([])
  const [confirmations, setConfirmations] = useState<DCAConfirmation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasCalculated, setHasCalculated] = useState(false)
  const callIdRef = useRef(0)
  const confirmationsRef = useRef<DCAConfirmation[]>([])
  const pendingConfirmationKeysRef = useRef<Set<string>>(new Set())
  // The apiaries of the prediction on show, so it can be worked out again when a sighting changes
  const lastSelectionRef = useRef<string[]>([])

  useEffect(() => {
    confirmationsRef.current = confirmations
  }, [confirmations])

  // Read when a prediction starts, so a late-loading layer does not restart anything
  const neighboursRef = useRef(neighbours)
  useEffect(() => {
    neighboursRef.current = neighbours
  }, [neighbours])

  useEffect(() => {
    let isActive = true

    async function fetchConfirmations() {
      try {
        const userId = await getCurrentUserId()
        if (!userId) return
        const { data, error: fetchError } = await supabase
          .from('dca_confirmations')
          .select(CONFIRMATION_COLUMNS)
          .eq('user_id', userId)
        if (!isActive || fetchError) return

        if (data) {
          const typed = data as DCAConfirmation[]
          setConfirmations(typed)
          confirmationsRef.current = typed
        }
      } catch {
        // Leave confirmations empty if the initial load fails.
      }
    }

    fetchConfirmations()

    return () => {
      isActive = false
    }
  }, [])

  /** Resolves with the result on show, or null when there is none (nothing selected, failed, superseded). */
  const calculate = useCallback(async (selectedApiaryIds: string[]): Promise<DCAResult | null> => {
    if (selectedApiaryIds.length === 0) {
      callIdRef.current++
      lastSelectionRef.current = []
      setPredictions([])
      setFlyways([])
      setError(null)
      setHasCalculated(false)
      setLoading(false)
      return null
    }

    const ids = selectedApiaryIds.slice(0, MAX_APIARIES)
    const selected = apiaries.filter(apiary => ids.includes(apiary.id))

    if (selected.length === 0) {
      setError('No valid apiaries selected')
      return null
    }

    lastSelectionRef.current = ids
    const currentNeighbours = neighboursRef.current
    const cacheKey = getCacheKey(ids, apiaries, confirmationsRef.current, currentNeighbours)
    const cached = loadCache(cacheKey)
    if (cached) {
      // Supersede any calculation still running, so it cannot overwrite this result when it lands
      callIdRef.current++
      setPredictions(cached.predictions)
      setFlyways(cached.flyways)
      setError(null)
      setHasCalculated(true)
      setLoading(false)
      return { predictions: cached.predictions, flyways: cached.flyways }
    }

    const thisCallId = ++callIdRef.current
    setLoading(true)
    setError(null)

    try {
      const confirmedLocations: ConfirmedLocation[] = confirmationsRef.current
        .filter(confirmation =>
          isValidCoordinatePair(Number(confirmation.latitude), Number(confirmation.longitude)) &&
          typeof confirmation.confirmed === 'boolean'
        )
        .map(confirmation => ({
          latitude: Number(confirmation.latitude),
          longitude: Number(confirmation.longitude),
          confirmed: confirmation.confirmed,
          observationDate: confirmation.observation_date,
        }))

      const result = await predictDCAs(selected, confirmedLocations, currentNeighbours)
      if (callIdRef.current !== thisCallId) return null

      setPredictions(result.predictions)
      setFlyways(result.flyways)
      setHasCalculated(true)
      // An empty result is never saved: it is cheap to work out again and may just be a bad moment
      if (result.predictions.length > 0) saveCache(cacheKey, { ...result, timestamp: Date.now() })
      return result
    } catch (err) {
      if (callIdRef.current === thisCallId) {
        setError(err instanceof ElevationUnavailableError
          ? 'Could not get terrain heights. Check your signal and try again.'
          : 'Could not work out DCA predictions. Please try again.')
        setPredictions([])
        setFlyways([])
        setHasCalculated(false)
      }
      return null
    } finally {
      if (callIdRef.current === thisCallId) setLoading(false)
    }
  }, [apiaries])

  /** After a sighting changes: drop saved predictions and redo the one on show. */
  const refreshAfterSightingChange = useCallback(() => {
    clearPredictionCache()
    if (lastSelectionRef.current.length > 0) void calculate(lastSelectionRef.current)
  }, [calculate])

  const confirmDCA = useCallback(async (
    lat: number,
    lng: number,
    confirmed: boolean,
    notes?: string,
    share = false
  ): Promise<SightingSaveStatus> => {
    if (!isValidCoordinatePair(lat, lng)) return 'failed'

    const pendingKey = `${lat.toFixed(5)}:${lng.toFixed(5)}:${confirmed ? '1' : '0'}`
    if (pendingConfirmationKeysRef.current.has(pendingKey)) return 'duplicate'
    if (isDuplicateRecentConfirmation(confirmationsRef.current, lat, lng, confirmed)) return 'duplicate'

    pendingConfirmationKeysRef.current.add(pendingKey)
    try {
      const userId = await getCurrentUserId()
      if (!userId) return 'failed'

      const trimmedNotes = notes?.trim()
      const { data, error: insertError } = await supabase
        .from('dca_confirmations')
        .insert({ user_id: userId, latitude: lat, longitude: lng, confirmed, notes: trimmedNotes || null, is_shared: confirmed && share })
        .select(CONFIRMATION_COLUMNS)
        .single()

      if (insertError || !data) return 'failed'

      const newConfirmation = data as DCAConfirmation
      setConfirmations(prev => [...prev, newConfirmation])
      confirmationsRef.current = [...confirmationsRef.current, newConfirmation]
      refreshAfterSightingChange()
      return 'saved'
    } catch {
      return 'failed'
    } finally {
      pendingConfirmationKeysRef.current.delete(pendingKey)
    }
  }, [refreshAfterSightingChange])

  /** Removes one of the beekeeper's own sightings. Resolves false when nothing was removed. */
  const removeConfirmation = useCallback(async (id: string): Promise<boolean> => {
    try {
      // A delete the database refuses returns no error and no rows, so the rows are counted
      const { data, error: deleteError } = await supabase
        .from('dca_confirmations')
        .delete()
        .eq('id', id)
        .select('id')

      if (deleteError || !data || data.length === 0) return false

      setConfirmations(prev => prev.filter(confirmation => confirmation.id !== id))
      confirmationsRef.current = confirmationsRef.current.filter(confirmation => confirmation.id !== id)
      refreshAfterSightingChange()
      return true
    } catch {
      return false
    }
  }, [refreshAfterSightingChange])

  /** Starts or stops sharing one of the beekeeper's own sightings. Resolves false when nothing changed. */
  const setSharing = useCallback(async (id: string, share: boolean): Promise<boolean> => {
    try {
      // An update the database refuses returns no error and no rows, so the rows are counted
      const { data, error: updateError } = await supabase
        .from('dca_confirmations')
        .update({ is_shared: share })
        .eq('id', id)
        .select('id')

      if (updateError || !data || data.length === 0) return false

      const apply = (list: DCAConfirmation[]) =>
        list.map(confirmation => (confirmation.id === id ? { ...confirmation, is_shared: share } : confirmation))
      setConfirmations(apply)
      confirmationsRef.current = apply(confirmationsRef.current)
      return true
    } catch {
      return false
    }
  }, [])

  const clear = useCallback(() => {
    callIdRef.current++
    lastSelectionRef.current = []
    setPredictions([])
    setFlyways([])
    setError(null)
    setHasCalculated(false)
    setLoading(false)
  }, [])

  const runStatus: PredictionRunStatus = !hasCalculated
    ? 'idle'
    : predictions.length === 0
      ? 'empty'
      : predictions.every(prediction => prediction.isFallback)
        ? 'fallback'
        : 'success'

  return { predictions, flyways, confirmations, loading, error, calculate, clear, confirmDCA, removeConfirmation, setSharing, hasCalculated, runStatus }
}
