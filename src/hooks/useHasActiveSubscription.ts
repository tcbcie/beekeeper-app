'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { SubscriptionStatusResponse } from '@/types/subscription'

/**
 * Single source of truth for gating premium features (e.g. the CRM module).
 * Wraps the existing `get_subscription_status` RPC and exposes a simple boolean.
 *
 * The result is cached at module scope for a short TTL so the multiple nav
 * surfaces that gate on it (Sidebar, MobileDrawer, CRM layout) share one
 * network round-trip rather than each firing their own. Defaults to `false`
 * (locked) on any error so a failed check never leaks access.
 */
const TTL_MS = 5 * 60 * 1000
// The full status is cached so the Navbar's expiry warning shares this one request too (C1-18)
let cache: { status: SubscriptionStatusResponse | null; at: number } | null = null
let inFlight: Promise<SubscriptionStatusResponse | null> | null = null
// Bumped on every change of signed-in user and by clearSubscriptionCache(): a request still running
// for the previous account (or from before a renewal) must not write its answer (C9a-07)
let generation = 0

// Never let one account's cached entitlement bleed into another in the same tab.
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      generation++
      cache = null
      inFlight = null
    }
  })
}

/** The current subscription status, shared and briefly cached; null when it couldn't be read. */
export async function resolveSubscriptionStatus(): Promise<SubscriptionStatusResponse | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.status
  if (inFlight) return inFlight

  const gen = generation
  inFlight = (async () => {
    try {
      const { data, error } = await supabase.rpc('get_subscription_status')
      if (error) throw error
      const status = (data as SubscriptionStatusResponse | null) ?? null
      if (gen === generation) cache = { status, at: Date.now() }
      return status
    } catch (error) {
      console.error('Error checking subscription status:', error)
      // Not cached: one failed check used to lock gated features for 5 minutes
      return null
    } finally {
      if (gen === generation) inFlight = null
    }
  })()

  return inFlight
}

/** Forget the cached status, e.g. straight after a renewal, so every gate re-checks. */
export function clearSubscriptionCache(): void {
  generation++
  cache = null
  inFlight = null
}

export async function resolveActiveSubscription(): Promise<boolean> {
  return (await resolveSubscriptionStatus())?.is_active === true
}

export function useHasActiveSubscription() {
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    resolveActiveSubscription().then((value) => {
      if (cancelled) return
      setHasActiveSubscription(value)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return { hasActiveSubscription, loading }
}
