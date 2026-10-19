'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Stops a save from running twice when the button is tapped twice.
 *
 * A state flag (`if (saving) return`) is not enough: two taps can both land before React
 * re-renders, so both see `saving === false` and both insert. The ref here changes at once,
 * so the second call returns straight away. `submitting` is only for `disabled` and
 * "Saving…" labels. The lock is released in `finally`, so an error or early return inside
 * `fn` can never leave it stuck.
 *
 * In a form handler, call `e.preventDefault()` before `run()`, never inside it: a second
 * submit while locked skips `fn`, and the browser would otherwise reload the page.
 */
export function useSubmitLock() {
  const lockedRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lockedRef.current) return undefined
    lockedRef.current = true
    setSubmitting(true)
    try {
      return await fn()
    } finally {
      lockedRef.current = false
      setSubmitting(false)
    }
  }, [])

  return { submitting, run }
}
