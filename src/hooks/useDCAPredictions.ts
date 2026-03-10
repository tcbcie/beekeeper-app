'use client'

import { useState, useCallback, useRef } from 'react'
import { predictDCAs, type DCAPrediction, type DCAFlyway } from '@/lib/dca-prediction'

interface Apiary {
  id: string
  name: string
  latitude: number
  longitude: number
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

export function useDCAPredictions(apiaries: Apiary[]) {
  const [predictions, setPredictions] = useState<DCAPrediction[]>([])
  const [flyways, setFlyways] = useState<DCAFlyway[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const callIdRef = useRef(0)

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
      setPredictions(cached.predictions)
      setFlyways(cached.flyways)
      setError(null)
      return
    }

    // Monotonic ID: only the latest call's results are applied
    const thisCallId = ++callIdRef.current

    setLoading(true)
    setError(null)

    try {
      const result = await predictDCAs(selected)

      if (callIdRef.current !== thisCallId) return // superseded by newer call

      setPredictions(result.predictions)
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

  const clear = useCallback(() => {
    callIdRef.current++ // invalidate any in-flight calculation
    setPredictions([])
    setFlyways([])
    setError(null)
    setLoading(false)
  }, [])

  return { predictions, flyways, loading, error, calculate, clear }
}
