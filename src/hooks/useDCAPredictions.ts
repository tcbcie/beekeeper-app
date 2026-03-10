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

const CACHE_KEY_PREFIX = 'dca-predictions-'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_APIARIES = 10

interface CachedResult {
  predictions: DCAPrediction[]
  flyways: DCAFlyway[]
  timestamp: number
}

function getCacheKey(apiaryIds: string[], apiaries: Apiary[]): string {
  // Include coordinates in key so cache invalidates if apiary moves
  const parts = [...apiaryIds].sort().map(id => {
    const a = apiaries.find(ap => ap.id === id)
    return a ? `${id}:${a.latitude.toFixed(4)},${a.longitude.toFixed(4)}` : id
  })
  return CACHE_KEY_PREFIX + parts.join('|')
}

function loadCache(key: string): CachedResult | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const cached = JSON.parse(raw)
    // Validate structure before trusting
    if (
      !cached ||
      typeof cached.timestamp !== 'number' ||
      !Array.isArray(cached.predictions) ||
      !Array.isArray(cached.flyways)
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
    return null
  }
}

function saveCache(key: string, result: CachedResult): void {
  try {
    localStorage.setItem(key, JSON.stringify(result))
  } catch {
    // Storage full — ignore
  }
}

// Haversine distance in km between two lat/lng points
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function applyConfirmationAdjustments(
  preds: DCAPrediction[],
  confirmations: DCAConfirmation[]
): DCAPrediction[] {
  if (confirmations.length === 0) return preds

  return preds
    .map(pred => {
      // Find nearest confirmation within 1km
      let nearest: DCAConfirmation | null = null
      let nearestDist = Infinity
      for (const c of confirmations) {
        const d = haversineKm(pred.latitude, pred.longitude, c.latitude, c.longitude)
        if (d <= 1 && d < nearestDist) {
          nearest = c
          nearestDist = d
        }
      }
      if (!nearest) return pred

      const adjusted = Math.max(0, Math.min(100, pred.score + (nearest.confirmed ? 15 : -15)))
      const confidence: 'high' | 'medium' | 'low' = adjusted >= 70 ? 'high' : adjusted >= 55 ? 'medium' : 'low'
      const radiusKm = confidence === 'high' ? 0.5 : confidence === 'medium' ? 0.75 : 1
      return { ...pred, score: adjusted, confidence, radiusKm }
    })
    .filter(pred => pred.score >= 40)
}

export function useDCAPredictions(apiaries: Apiary[]) {
  const [predictions, setPredictions] = useState<DCAPrediction[]>([])
  const [flyways, setFlyways] = useState<DCAFlyway[]>([])
  const [confirmations, setConfirmations] = useState<DCAConfirmation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const callIdRef = useRef(0)
  const confirmationsRef = useRef<DCAConfirmation[]>([])

  // Keep ref in sync for use inside calculate callback
  useEffect(() => {
    confirmationsRef.current = confirmations
  }, [confirmations])

  // Fetch confirmations on mount
  useEffect(() => {
    async function fetchConfirmations() {
      const userId = await getCurrentUserId()
      if (!userId) return
      const { data } = await supabase
        .from('dca_confirmations')
        .select('id, latitude, longitude, confirmed, observation_date, notes')
        .eq('user_id', userId)
      if (data) {
        const typed = data as DCAConfirmation[]
        setConfirmations(typed)
        confirmationsRef.current = typed
      }
    }
    fetchConfirmations()
  }, [])

  const calculate = useCallback(async (selectedApiaryIds: string[]) => {
    if (selectedApiaryIds.length === 0) {
      setPredictions([])
      setFlyways([])
      return
    }

    const ids = selectedApiaryIds.slice(0, MAX_APIARIES)
    const selected = apiaries.filter(a => ids.includes(a.id))

    if (selected.length === 0) {
      setError('No valid apiaries selected')
      return
    }

    // Check cache
    const cacheKey = getCacheKey(ids, apiaries)
    const cached = loadCache(cacheKey)
    if (cached) {
      setPredictions(applyConfirmationAdjustments(cached.predictions, confirmationsRef.current))
      setFlyways(cached.flyways)
      setError(null)
      return
    }

    // Monotonic ID: only the latest call's results are applied
    const thisCallId = ++callIdRef.current

    setLoading(true)
    setError(null)

    try {
      const confirmedLocations: ConfirmedLocation[] = confirmationsRef.current
        .filter(c => isFinite(Number(c.latitude)) && isFinite(Number(c.longitude)))
        .map(c => ({
          latitude: Number(c.latitude),
          longitude: Number(c.longitude),
          confirmed: c.confirmed,
        }))
      const result = await predictDCAs(selected, confirmedLocations)

      if (callIdRef.current !== thisCallId) return // superseded by newer call

      const adjusted = applyConfirmationAdjustments(result.predictions, confirmationsRef.current)
      setPredictions(adjusted)
      setFlyways(result.flyways)
      saveCache(cacheKey, { ...result, timestamp: Date.now() })
    } catch {
      if (callIdRef.current === thisCallId) {
        setError('Failed to calculate DCA predictions. Please try again.')
        setPredictions([])
        setFlyways([])
      }
    } finally {
      if (callIdRef.current === thisCallId) setLoading(false)
    }
  }, [apiaries])

  const confirmDCA = useCallback(async (lat: number, lng: number, confirmed: boolean): Promise<boolean> => {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { data, error: insertError } = await supabase
      .from('dca_confirmations')
      .insert({ user_id: userId, latitude: lat, longitude: lng, confirmed })
      .select('id, latitude, longitude, confirmed, observation_date, notes')
      .single()

    if (insertError || !data) return false

    const newConfirmation = data as DCAConfirmation
    setConfirmations(prev => [...prev, newConfirmation])
    confirmationsRef.current = [...confirmationsRef.current, newConfirmation]

    // Clear prediction cache so next calculation incorporates confirmations
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX))
      keys.forEach(k => localStorage.removeItem(k))
    } catch { /* ignore */ }

    return true
  }, [])

  const clear = useCallback(() => {
    callIdRef.current++ // invalidate any in-flight calculation
    setPredictions([])
    setFlyways([])
    setError(null)
    setLoading(false)
  }, [])

  return { predictions, flyways, confirmations, loading, error, calculate, clear, confirmDCA }
}
