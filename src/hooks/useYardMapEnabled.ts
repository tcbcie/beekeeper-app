'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { resolveActiveSubscription } from './useHasActiveSubscription'

/**
 * Gates the Yard Map (2D + 3D) on BOTH an active subscription AND the user's
 * opt-in `profiles.enable_yard_map` preference (default off). Used by the apiary
 * detail entry point and the Yard Map route guard.
 *
 * The preference is cached at module scope (deduped across surfaces) and
 * refreshed live when the profile toggle fires `notifyYardMapPrefChanged()`, so
 * gated UI updates without a full page reload.
 */
const PREF_EVENT = 'yard-map-pref-changed'
const TTL_MS = 5 * 60 * 1000
let prefCache: { value: boolean; at: number } | null = null
let prefInFlight: Promise<boolean> | null = null

// Drop the cached preference whenever the signed-in user changes, so a previous
// account's flag can't surface for the next one in the same tab.
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      prefCache = null
      prefInFlight = null
    }
  })
}

async function resolveYardMapPref(): Promise<boolean> {
  if (prefCache && Date.now() - prefCache.at < TTL_MS) return prefCache.value
  if (prefInFlight) return prefInFlight

  prefInFlight = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return false
      const { data, error } = await supabase
        .from('profiles').select('enable_yard_map').eq('id', uid).maybeSingle()
      if (error) throw error
      const value = data?.enable_yard_map === true
      prefCache = { value, at: Date.now() }
      return value
    } catch (error) {
      console.error('Error checking Yard Map preference:', error)
      prefCache = { value: false, at: Date.now() }
      return false
    } finally {
      prefInFlight = null
    }
  })()

  return prefInFlight
}

/** Call after writing `profiles.enable_yard_map` so gated UI refreshes immediately. */
export function notifyYardMapPrefChanged(enabled: boolean) {
  prefCache = { value: enabled, at: Date.now() }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PREF_EVENT))
}

export function useYardMapEnabled() {
  const [yardMapEnabled, setYardMapEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const [hasSub, pref] = await Promise.all([resolveActiveSubscription(), resolveYardMapPref()])
      if (cancelled) return
      setYardMapEnabled(hasSub && pref)
      setLoading(false)
    }

    run()
    if (typeof window !== 'undefined') window.addEventListener(PREF_EVENT, run)
    return () => {
      cancelled = true
      if (typeof window !== 'undefined') window.removeEventListener(PREF_EVENT, run)
    }
  }, [])

  return { yardMapEnabled, loading }
}
