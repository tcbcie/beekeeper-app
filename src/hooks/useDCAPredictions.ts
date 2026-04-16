'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { predictDCAs, type DCAPrediction, type DCAFlyway, type ConfirmedLocation } from '@/lib/dca-prediction'
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
}

const CACHE_KEY_PREFIX = 'dca-predictions-v5-'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_APIARIES = 10

interface CachedResult {
  predictions: DCAPrediction[]
  flyways: DCAFlyway[]
  timestamp: number
}

type PredictionRunStatus = 'idle' | 'success' | 'fallback' | 'empty'

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

function getCacheKey(
  apiaryIds: string[],
  apiaries: Apiary[],
  confirmations: DCAConfirmation[]
): string {
  // Include coordinates and confirmation state so cache invalidates cleanly.
  const apiaryParts = [...apiaryIds].sort().map(id => {
    const apiary = apiaries.find(item => item.id === id)
    return apiary ? `${id}:${apiary.latitude.toFixed(4)},${apiary.longitude.toFixed(4)}` : id
  })

  return `${CACHE_KEY_PREFIX}${apiaryParts.join('|')}|c:${getConfirmationSignature(confirmations)}`
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

export function useDCAPredictions(apiaries: Apiary[]) {
  const [predictions, setPredictions] = useState<DCAPrediction[]>([])
  const [flyways, setFlyways] = useState<DCAFlyway[]>([])
  const [confirmations, setConfirmations] = useState<DCAConfirmation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasCalculated, setHasCalculated] = useState(false)
  const callIdRef = useRef(0)
  const confirmationsRef = useRef<DCAConfirmation[]>([])
  const pendingConfirmationKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    confirmationsRef.current = confirmations
  }, [confirmations])

  useEffect(() => {
    let isActive = true

    async function fetchConfirmations() {
      try {
        const userId = await getCurrentUserId()
        if (!userId) return
        const { data, error: fetchError } = await supabase
          .from('dca_confirmations')
          .select('id, latitude, longitude, confirmed, observation_date, notes')
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

  const calculate = useCallback(async (selectedApiaryIds: string[]) => {
    if (selectedApiaryIds.length === 0) {
      setPredictions([])
      setFlyways([])
      setError(null)
      setHasCalculated(false)
      setLoading(false)
      return
    }

    const ids = selectedApiaryIds.slice(0, MAX_APIARIES)
    const selected = apiaries.filter(apiary => ids.includes(apiary.id))

    if (selected.length === 0) {
      setError('No valid apiaries selected')
      return
    }

    const cacheKey = getCacheKey(ids, apiaries, confirmationsRef.current)
    const cached = loadCache(cacheKey)
    if (cached) {
      setPredictions(cached.predictions)
      setFlyways(cached.flyways)
      setError(null)
      setHasCalculated(true)
      return
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

      const result = await predictDCAs(selected, confirmedLocations)
      if (callIdRef.current !== thisCallId) return

      setPredictions(result.predictions)
      setFlyways(result.flyways)
      setHasCalculated(true)
      saveCache(cacheKey, { ...result, timestamp: Date.now() })
    } catch {
      if (callIdRef.current === thisCallId) {
        setError('Failed to calculate DCA predictions. Please try again.')
        setPredictions([])
        setFlyways([])
        setHasCalculated(false)
      }
    } finally {
      if (callIdRef.current === thisCallId) setLoading(false)
    }
  }, [apiaries])

  const confirmDCA = useCallback(async (lat: number, lng: number, confirmed: boolean): Promise<boolean> => {
    if (!isValidCoordinatePair(lat, lng)) return false

    const pendingKey = `${lat.toFixed(5)}:${lng.toFixed(5)}:${confirmed ? '1' : '0'}`
    if (pendingConfirmationKeysRef.current.has(pendingKey)) return true
    if (isDuplicateRecentConfirmation(confirmationsRef.current, lat, lng, confirmed)) return true

    const userId = await getCurrentUserId()
    if (!userId) return false

    try {
      pendingConfirmationKeysRef.current.add(pendingKey)

      const { data, error: insertError } = await supabase
        .from('dca_confirmations')
        .insert({ user_id: userId, latitude: lat, longitude: lng, confirmed })
        .select('id, latitude, longitude, confirmed, observation_date, notes')
        .single()

      if (insertError || !data) return false

      const newConfirmation = data as DCAConfirmation
      setConfirmations(prev => [...prev, newConfirmation])
      confirmationsRef.current = [...confirmationsRef.current, newConfirmation]

      try {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_KEY_PREFIX))
        keys.forEach(key => localStorage.removeItem(key))
      } catch {
        // Ignore storage access failures.
      }

      return true
    } finally {
      pendingConfirmationKeysRef.current.delete(pendingKey)
    }
  }, [])

  const clear = useCallback(() => {
    callIdRef.current++
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

  return { predictions, flyways, confirmations, loading, error, calculate, clear, confirmDCA, hasCalculated, runStatus }
}
