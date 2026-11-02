'use client'

import { useSyncExternalStore } from 'react'

const PHONE_QUERY = '(max-width: 767.98px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(PHONE_QUERY)
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

function isPhoneNow(): boolean {
  return window.matchMedia?.(PHONE_QUERY).matches ?? false
}

/**
 * Below the `md` breakpoint, where the bottom bar shows. For layouts that differ too much for CSS
 * alone, so a list isn't rendered twice with one copy hidden. False during server rendering, and
 * wherever matchMedia is unavailable, which gets the layout that has always existed.
 */
export function useIsPhone(): boolean {
  return useSyncExternalStore(subscribe, isPhoneNow, () => false)
}
