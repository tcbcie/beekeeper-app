'use client'

import { useEffect, useRef, useState } from 'react'

interface UseFormDirtyStateOptions<T> {
  /** The form state to watch. Compared by serialisation, not by reference. */
  value: T
  /**
   * Work that is real but does not live in `value` — an attached image, an
   * in-flight voice recording. Counted as dirty on its own.
   */
  extraDirty?: boolean
  /** Reported on every change, and cleared to false on unmount. */
  onDirtyChange?: (dirty: boolean) => void
}

interface UseFormDirtyStateResult {
  isDirty: boolean
  /** Re-baseline, after a save or when the form is handed different data. */
  markPristine: () => void
}

/**
 * Tracks whether a record form holds unsaved work, and reports it upward.
 *
 * Extracted from InspectionForm, which has carried this since Phase 1. Every
 * guard in the records page — in-app navigation, the service-worker reload, the
 * close button, starting another record, opening a different one — asks a single
 * question: is there unsaved work? Until now only the inspection form could
 * answer, so the other four record forms were treated as permanently clean and
 * their contents could be discarded without a prompt.
 *
 * The baseline is taken one macrotask after mount, not on the first committed
 * render. Every one of these forms writes its state again after mounting — from
 * its record prop, and from the hive or apiary preselected by a deep link — and
 * a baseline captured before those settled would report unsaved work on a form
 * the user had not yet touched. Until the baseline exists the form is reported
 * clean, so the window cannot produce a false prompt either.
 *
 * `beforeunload` is registered only while dirty. Browsers ignore the message and
 * show their own wording, so none is set.
 */
export function useFormDirtyState<T>({
  value,
  extraDirty = false,
  onDirtyChange,
}: UseFormDirtyStateOptions<T>): UseFormDirtyStateResult {
  const pristineSnapshotRef = useRef<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Serialising on every render is cheap next to the render itself, and keeps
  // the comparison honest for nested objects that a reference check would miss.
  const snapshot = JSON.stringify(value)

  // The timer and markPristine both need the newest snapshot, not the one
  // closed over when they were created.
  const latestSnapshotRef = useRef(snapshot)
  latestSnapshotRef.current = snapshot

  useEffect(() => {
    // setTimeout, not requestAnimationFrame: rAF does not fire in a background
    // tab, which would leave the form permanently unguarded.
    const settle = setTimeout(() => {
      if (pristineSnapshotRef.current === null) {
        pristineSnapshotRef.current = latestSnapshotRef.current
      }
    }, 0)
    return () => clearTimeout(settle)
    // Baseline is captured once, after the mount-time effects have run.
  }, [])

  useEffect(() => {
    if (pristineSnapshotRef.current === null) return
    setIsDirty(snapshot !== pristineSnapshotRef.current || extraDirty)
  }, [snapshot, extraDirty])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // Clearing on unmount stops a stale flag guarding a form that is already gone.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange])

  useEffect(() => {
    if (!isDirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])

  const markPristine = () => {
    pristineSnapshotRef.current = latestSnapshotRef.current
    setIsDirty(extraDirty)
  }

  return { isDirty, markPristine }
}
