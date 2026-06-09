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
let cache: { value: boolean; at: number } | null = null
let inFlight: Promise<boolean> | null = null

async function resolveActiveSubscription(): Promise<boolean> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.rpc('get_subscription_status')
      if (error) throw error
      const value = (data as SubscriptionStatusResponse | null)?.is_active === true
      cache = { value, at: Date.now() }
      return value
    } catch (error) {
      console.error('Error checking subscription status:', error)
      cache = { value: false, at: Date.now() }
      return false
    } finally {
      inFlight = null
    }
  })()

  return inFlight
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
