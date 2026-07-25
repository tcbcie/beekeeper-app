'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePersistentState, writePersistedValue } from './usePersistentState'

/**
 * Remembers which list item the user was last working on, so returning from that item's detail
 * page (or closing its inline edit form) puts them back on it instead of at the top of the list.
 *
 * The marker is deliberately *consume-once* and short-lived: a position is only restored when the
 * user is coming back from that item, never on a fresh visit to the list from the navigation.
 */
const RESTORE_TTL_MS = 30 * 60 * 1000
const HIGHLIGHT_MS = 2500

interface PendingRestore {
  id: string
  ts: number
}

function isPendingRestore(value: PendingRestore | null): boolean {
  if (value === null) return true
  return typeof value === 'object'
    && typeof value.id === 'string'
    && value.id.length > 0
    && typeof value.ts === 'number'
    && Number.isFinite(value.ts)
}

/** Scroll a list item into view on the next frame, once it has been painted. */
export function scrollToListItem(elementId: string): void {
  if (typeof window === 'undefined') return
  requestAnimationFrame(() => {
    const element = document.getElementById(elementId)
    if (!element) return
    // Honour the OS reduced-motion preference — animated scrolling can be disorientating, and
    // this audience skews towards accessibility needs.
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' })
  })
}

interface UseListPositionMemoryOptions {
  /** Persistence scope, e.g. 'hives'. Stored under `hivecraic:filters:<scope>:pendingRestore`. */
  scope: string
  /** The items currently rendered *after* filtering — restore waits until the target is among them. */
  items: { id: string }[]
  /** False while the list is loading; restoring before the cards exist would find nothing. */
  ready: boolean
  /** DOM id prefix used by the cards, e.g. 'hive-card-'. */
  elementIdPrefix: string
}

export function useListPositionMemory({ scope, items, ready, elementIdPrefix }: UseListPositionMemoryOptions) {
  const storageKey = `${scope}:pendingRestore`
  const [pending, setPending] = usePersistentState<PendingRestore | null>(
    storageKey,
    null,
    isPendingRestore
  )
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  // Keyed on the marker's timestamp rather than a once-per-mount flag, so a second edit on the
  // same mount still restores, while a duplicate effect run (StrictMode) cannot double-fire.
  const handledRef = useRef<number | null>(null)

  /** Record the item the user is leaving for / has just finished with. */
  const remember = useCallback((id: string) => {
    if (typeof id !== 'string' || id.length === 0) return
    const marker: PendingRestore = { id, ts: Date.now() }
    // Persisted synchronously because callers navigate away in the same tick: waiting for the
    // state-driven effect to flush before unmount would silently lose the position.
    writePersistedValue(storageKey, marker)
    setPending(marker)
  }, [setPending, storageKey])

  useEffect(() => {
    if (!ready || !pending || handledRef.current === pending.ts) return

    // A marker left over from an earlier session must never jump the list.
    if (Date.now() - pending.ts > RESTORE_TTL_MS) {
      handledRef.current = pending.ts
      setPending(null)
      return
    }

    // Wait until the target is actually in the rendered list. When the current filters exclude
    // it we do nothing rather than silently widening them — quietly unhiding records to reveal a
    // target caused a past deep-link regression.
    if (!items.some((item) => item.id === pending.id)) return

    handledRef.current = pending.ts
    const targetId = pending.id
    setPending(null)
    setHighlightedId(targetId)
    scrollToListItem(`${elementIdPrefix}${targetId}`)
  }, [ready, pending, items, setPending, elementIdPrefix])

  // Kept in its own effect so unrelated re-renders (a new `items` array each render) cannot
  // cancel the highlight timer before it fires.
  useEffect(() => {
    if (!highlightedId) return
    const timer = setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [highlightedId])

  return { remember, highlightedId }
}
