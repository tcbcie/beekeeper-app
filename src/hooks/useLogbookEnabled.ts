'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Gates the Logbook nav item on the user's opt-in `profiles.enable_logbook`
 * preference (default off). Unlike the CRM gate this is preference-only — no
 * subscription requirement — mirroring the label-printing toggle.
 *
 * The preference is cached at module scope (deduped across nav surfaces) and
 * refreshed live when the profile toggle fires `notifyLogbookPrefChanged()`.
 */
const PREF_EVENT = 'logbook-pref-changed'
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

async function resolveLogbookPref(): Promise<boolean> {
  if (prefCache && Date.now() - prefCache.at < TTL_MS) return prefCache.value
  if (prefInFlight) return prefInFlight

  prefInFlight = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return false
      const { data, error } = await supabase
        .from('profiles').select('enable_logbook').eq('id', uid).maybeSingle()
      if (error) throw error
      const value = data?.enable_logbook === true
      prefCache = { value, at: Date.now() }
      return value
    } catch (error) {
      console.error('Error checking Logbook preference:', error)
      prefCache = { value: false, at: Date.now() }
      return false
    } finally {
      prefInFlight = null
    }
  })()

  return prefInFlight
}

/** Call after writing `profiles.enable_logbook` so gated UI refreshes immediately. */
export function notifyLogbookPrefChanged(enabled: boolean) {
  prefCache = { value: enabled, at: Date.now() }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PREF_EVENT))
}

export function useLogbookEnabled() {
  const [logbookEnabled, setLogbookEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const pref = await resolveLogbookPref()
      if (cancelled) return
      setLogbookEnabled(pref)
      setLoading(false)
    }

    run()
    if (typeof window !== 'undefined') window.addEventListener(PREF_EVENT, run)
    return () => {
      cancelled = true
      if (typeof window !== 'undefined') window.removeEventListener(PREF_EVENT, run)
    }
  }, [])

  return { logbookEnabled, loading }
}
