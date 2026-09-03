'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Keyboard and focus behaviour shared by modal surfaces.
 *
 * Provides the four things a modal needs and that nothing in this codebase
 * previously implemented together: Escape to close, Tab cycling contained
 * within the surface, initial focus placed inside it, and focus restored to
 * whatever opened it.
 *
 * The container is expected to carry `inert` while closed. Initial focus is
 * therefore deferred by one animation frame, because focus cannot enter an
 * inert subtree and the attempt fails silently: if focus were requested in
 * the same commit that removes the attribute, the surface would open with
 * focus still stranded on the page behind it and nothing to indicate it.
 *
 * Dialogs stack. A confirmation opened from inside a modal leaves both open at
 * once, and both would otherwise listen for Escape on `document` — closing the
 * confirmation *and* the form behind it from one keypress, discarding work the
 * user never chose to discard. `stopPropagation` cannot prevent that: listeners
 * on the same node still all run. So each open surface registers on a stack and
 * only the topmost acts on a key, which also stops two focus traps fighting over
 * Tab.
 */

/**
 * Open dialog surfaces, oldest first. Module-level because the stack is a
 * property of the page, not of any one dialog.
 */
const dialogStack: symbol[] = []

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface UseDialogA11yOptions {
  isOpen: boolean
  onClose: () => void
  containerRef: RefObject<HTMLElement | null>
}

export function useDialogA11y({ isOpen, onClose, containerRef }: UseDialogA11yOptions) {
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const stackTokenRef = useRef<symbol | null>(null)

  // Join the stack while open, and leave it on close. Registered before the key
  // handler below so the handler always has a token to compare.
  useEffect(() => {
    if (!isOpen) return

    const token = Symbol('dialog')
    stackTokenRef.current = token
    dialogStack.push(token)

    return () => {
      const index = dialogStack.indexOf(token)
      if (index !== -1) dialogStack.splice(index, 1)
      stackTokenRef.current = null
    }
  }, [isOpen])

  // Remember what had focus, and give it back on close.
  useEffect(() => {
    if (!isOpen) return

    restoreFocusRef.current = document.activeElement as HTMLElement | null

    return () => {
      const trigger = restoreFocusRef.current
      restoreFocusRef.current = null
      // The trigger can be gone if the surface closed because of a route
      // change that unmounted it; focusing a detached node would throw away
      // focus entirely, so only restore when it is still in the document.
      if (trigger && document.contains(trigger)) {
        trigger.focus()
      }
    }
  }, [isOpen])

  // Place initial focus inside the surface, after `inert` has been removed.
  useEffect(() => {
    if (!isOpen) return

    const frame = requestAnimationFrame(() => {
      const container = containerRef.current
      if (!container) return
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      // Falls back to the container itself, which carries tabIndex={-1}, so
      // focus is never left outside an open modal.
      ;(first ?? container).focus()
    })

    return () => cancelAnimationFrame(frame)
  }, [isOpen, containerRef])

  // Escape to close, and keep Tab inside the surface.
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only the topmost surface responds; anything underneath stays put.
      if (dialogStack[dialogStack.length - 1] !== stackTokenRef.current) return

      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const container = containerRef.current
      if (!container) return

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      )

      if (focusable.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      const activeIsInside = active !== null && container.contains(active)

      if (event.shiftKey) {
        if (active === first || !activeIsInside) {
          event.preventDefault()
          last.focus()
        }
        return
      }

      if (active === last || !activeIsInside) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, containerRef])
}

export default useDialogA11y
