'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { resolveActiveSubscription } from './useHasActiveSubscription'

/**
 * Gates the CRM module on BOTH an active subscription AND the user's opt-in
 * `profiles.enable_crm` preference (default off). Used by the nav surfaces and
 * the CRM route guard.
 *
 * The preference is cached at module scope (deduped across nav surfaces) and
 * refreshed live when the profile toggle fires `notifyCrmPrefChanged()`, so the
 * persistent sidebar updates without a full page reload.
 */
const PREF_EVENT = 'crm-pref-changed'
const TTL_MS = 5 * 60 * 1000
let prefCache: { value: boolean; at: number } | null = null
let prefInFlight: Promise<boolean> | null = null

// Drop the cached preference whenever the signed-in user changes, so a previous
// account's CRM flag can't surface for the next one in the same tab.
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      prefCache = null
      prefInFlight = null
    }
  })
}

async function resolveCrmPref(): Promise<boolean> {
  if (prefCache && Date.now() - prefCache.at < TTL_MS) return prefCache.value
  if (prefInFlight) return prefInFlight

  prefInFlight = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return false
      const { data, error } = await supabase
        .from('profiles').select('enable_crm').eq('id', uid).maybeSingle()
      if (error) throw error
      const value = data?.enable_crm === true
      prefCache = { value, at: Date.now() }
      return value
    } catch (error) {
      console.error('Error checking CRM preference:', error)
      prefCache = { value: false, at: Date.now() }
      return false
    } finally {
      prefInFlight = null
    }
  })()

  return prefInFlight
}

/** Call after writing `profiles.enable_crm` so gated UI refreshes immediately. */
export function notifyCrmPrefChanged(enabled: boolean) {
  prefCache = { value: enabled, at: Date.now() }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PREF_EVENT))
}

export function useCrmEnabled() {
  const [crmEnabled, setCrmEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const [hasSub, pref] = await Promise.all([resolveActiveSubscription(), resolveCrmPref()])
      if (cancelled) return
      setCrmEnabled(hasSub && pref)
      setLoading(false)
    }

    run()
    if (typeof window !== 'undefined') window.addEventListener(PREF_EVENT, run)
    return () => {
      cancelled = true
      if (typeof window !== 'undefined') window.removeEventListener(PREF_EVENT, run)
    }
  }, [])

  return { crmEnabled, loading }
}
