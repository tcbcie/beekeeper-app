'use client'

import { useEffect, useRef, useState, Dispatch, SetStateAction } from 'react'

const NAMESPACE = 'hivecraic:filters'

type Validator<T> = (value: T) => boolean

function buildKey(key: string): string {
  return `${NAMESPACE}:${key}`
}

function readStored<T>(storageKey: string, fallback: T, validate?: Validator<T>): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw) as T
    // Reject corrupt or no-longer-valid stored values (e.g. an enum option
    // that has since been removed) rather than feeding them back into the UI.
    if (validate && !validate(parsed)) return fallback
    return parsed
  } catch {
    return fallback
  }
}

/**
 * Drop-in replacement for `useState` that persists the value to `localStorage`
 * so filter/selection choices survive both navigation AND a full browser/app
 * restart. The return shape matches `useState` exactly.
 *
 * - SSR-safe: returns `defaultValue` on the server and reads storage on the
 *   client. Dashboard filter UIs only mount client-side (behind the auth
 *   loading gate), so there is no hydration mismatch.
 * - `validate` guards against stale/corrupt stored values, falling back to
 *   `defaultValue` when the stored value is no longer acceptable.
 *
 * @param key   Stable, page-scoped key (namespaced internally), e.g. `'tasks:status'`.
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  validate?: Validator<T>
): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = buildKey(key)

  // The validator is only consulted when reading the initial value; keep it in
  // a ref so a fresh inline function on every render does not re-trigger work.
  const validateRef = useRef(validate)
  validateRef.current = validate

  const [value, setValue] = useState<T>(() => readStored(storageKey, defaultValue, validateRef.current))

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      // Storage unavailable or full -- keep the in-memory value and carry on.
    }
  }, [storageKey, value])

  return [value, setValue]
}
