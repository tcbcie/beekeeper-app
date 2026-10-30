'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DashboardApiary, DashboardApiaryScale, DashboardScaleSummary } from '@/types/dashboard'

// One summary per scale, kept for 5 minutes (as the apiary rows did); a failure is not kept,
// so the next visit tries again
const CACHE_TTL_MS = 5 * 60 * 1000
const summaryCache = new Map<string, { data: DashboardScaleSummary; at: number }>()
// A request already on its way is shared: when GPS arrives the apiaries re-sort and the effect
// runs again before the first answers, which would otherwise repeat every vendor call
const summaryInflight = new Map<string, Promise<DashboardScaleSummary | null>>()

const keyOf = (scale: DashboardApiaryScale) => `${scale.type}:${scale.deviceId}:${scale.hiveId}`

const finiteOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

async function fetchSummary(scale: DashboardApiaryScale, accessToken: string): Promise<DashboardScaleSummary | null> {
  try {
    const endpoint = scale.type === 'beep'
      ? `/api/beep/data?deviceId=${encodeURIComponent(scale.deviceId)}&hiveId=${scale.hiveId}`
      : `/api/wolf-waagen/data?scaleId=${encodeURIComponent(scale.deviceId)}&hiveId=${scale.hiveId}`
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) return null
    const json = await res.json()
    const drop = json?.largestDrop3h
    return {
      hiveId: scale.hiveId,
      hiveNumber: scale.hiveNumber ?? null,
      change24h: finiteOrNull(json?.weightChange24h),
      change7d: finiteOrNull(json?.weightChange7d),
      change30d: finiteOrNull(json?.weightChange30d),
      largestDrop3h: drop && finiteOrNull(drop.kg) !== null && finiteOrNull(drop.stillDownKg) !== null && typeof drop.at === 'string'
        ? { kg: drop.kg, at: drop.at, stillDownKg: drop.stillDownKg }
        : null,
    }
  } catch {
    // Scale data is supplementary: the hive simply has no figures or alerts
    return null
  }
}

/**
 * Every scale summary on the dashboard, loaded once when it opens and shared by the To do list
 * (scale alerts) and the apiary rows (weekly change). Keyed by apiary id. Same requests as the
 * rows made before, just not waiting for each row to scroll into view.
 */
export function useScaleSummaries(apiaries: DashboardApiary[]): {
  scalesByApiary: Record<string, DashboardScaleSummary[]>
  /** True until the first answers are in, so nothing is judged on figures that have not arrived */
  scalesLoading: boolean
} {
  const scales = useMemo(
    () => apiaries.flatMap(apiary => (Array.isArray(apiary.scales) ? apiary.scales : []).map(scale => ({ apiaryId: apiary.id, scale }))),
    [apiaries]
  )
  const [byKey, setByKey] = useState<Record<string, DashboardScaleSummary>>({})
  const [scalesLoading, setScalesLoading] = useState(true)

  useEffect(() => {
    if (scales.length === 0) {
      setScalesLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) {
        setScalesLoading(false)
        return
      }
      const entries = await Promise.all(scales.map(async ({ scale }) => {
        const key = keyOf(scale)
        const cached = summaryCache.get(key)
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) return [key, cached.data] as const
        let request = summaryInflight.get(key)
        if (!request) {
          request = fetchSummary(scale, session.access_token).then(data => {
            if (data) summaryCache.set(key, { data, at: Date.now() })
            return data
          }).finally(() => summaryInflight.delete(key))
          summaryInflight.set(key, request)
        }
        return [key, await request] as const
      }))
      if (cancelled) return
      const next: Record<string, DashboardScaleSummary> = {}
      for (const [key, data] of entries) if (data) next[key] = data
      setByKey(next)
      setScalesLoading(false)
    })().catch(() => {
      // Without this a failed session check would leave the top card "Checking" for good
      if (!cancelled) setScalesLoading(false)
    })
    return () => { cancelled = true }
  }, [scales])

  const scalesByApiary = useMemo(() => {
    const byApiary: Record<string, DashboardScaleSummary[]> = {}
    for (const { apiaryId, scale } of scales) {
      const summary = byKey[keyOf(scale)]
      if (summary) (byApiary[apiaryId] ??= []).push(summary)
    }
    return byApiary
  }, [scales, byKey])

  return { scalesByApiary, scalesLoading }
}
