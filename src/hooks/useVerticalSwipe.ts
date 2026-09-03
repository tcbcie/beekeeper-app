'use client'

import { useRef } from 'react'
import type { TouchEvent } from 'react'

interface UseVerticalSwipeOptions {
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  /** Minimum vertical travel before a drag counts, in pixels. */
  threshold?: number
  /** Longest a gesture may take, in milliseconds. */
  maxDuration?: number
}

/**
 * Detects a deliberate vertical swipe, resolved on `touchend`.
 *
 * Deliberately small, and deliberately not a library: nothing gesture-capable
 * is installed beyond `@dnd-kit`, which is a drag-and-drop toolkit and the
 * wrong tool for a sheet.
 *
 * Three properties matter more than the detection itself:
 *
 * 1. **Nothing is prevented.** No `preventDefault`, no `touch-action` override.
 *    A user zoomed to 200% must still be able to pan the page with a finger
 *    that happens to land on a fixed bar, and pinch-zoom must still work - both
 *    would be lost to a `touch-action: none`, and this audience needs them more
 *    than most. The cost is that the page may scroll a little during a swipe.
 * 2. **Multi-touch is not a swipe.** A gesture is abandoned the moment a second
 *    finger joins, so a pinch never resolves as a drag.
 * 3. **The gesture resolves on release**, so a drag that changes its mind can be
 *    abandoned by returning towards the start - WCAG 2.5.2 Pointer
 *    Cancellation. Every caller must also offer a button that does the same
 *    thing, since a path-based gesture needs a single-pointer alternative under
 *    WCAG 2.5.1.
 *
 * `maxDuration` is generous rather than flick-fast. The audience works in
 * beekeeping gloves, and a gesture tuned for a bare fingertip would exclude
 * them; it exists only so that a slow, exploratory pan does not resolve as a
 * swipe.
 */
export function useVerticalSwipe({
  onSwipeUp,
  onSwipeDown,
  threshold = 45,
  maxDuration = 800,
}: UseVerticalSwipeOptions) {
  const start = useRef<{ x: number; y: number; at: number } | null>(null)

  return {
    onTouchStart: (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        start.current = null
        return
      }
      const touch = event.touches[0]
      start.current = { x: touch.clientX, y: touch.clientY, at: Date.now() }
    },

    onTouchMove: (event: TouchEvent) => {
      // A second finger means a pinch, not a swipe.
      if (event.touches.length > 1) start.current = null
    },

    onTouchEnd: (event: TouchEvent) => {
      const from = start.current
      start.current = null
      // Another finger is still down, so this is not the end of a single drag.
      if (!from || event.touches.length > 0) return

      const touch = event.changedTouches[0]
      if (!touch) return

      if (Date.now() - from.at > maxDuration) return

      const dx = touch.clientX - from.x
      const dy = touch.clientY - from.y
      if (Math.abs(dy) < threshold) return
      // Comfortably vertical, so a diagonal drag across the bar does nothing.
      if (Math.abs(dy) < Math.abs(dx) * 1.5) return

      if (dy < 0) onSwipeUp?.()
      else onSwipeDown?.()
    },

    onTouchCancel: () => {
      start.current = null
    },
  }
}
