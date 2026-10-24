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

// Never let one account's cached entitlement bleed into another in the same tab.
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      cache = null
      inFlight = null
    }
  })
}

/** The current subscription status, shared and briefly cached; null when it couldn't be read. */
export async function resolveSubscriptionStatus(): Promise<SubscriptionStatusResponse | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.status
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.rpc('get_subscription_status')
      if (error) throw error
      const status = (data as SubscriptionStatusResponse | null) ?? null
      cache = { status, at: Date.now() }
      return status
    } catch (error) {
      console.error('Error checking subscription status:', error)
      cache = { status: null, at: Date.now() }
      return null
    } finally {
      inFlight = null
    }
  })()

  return inFlight
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
