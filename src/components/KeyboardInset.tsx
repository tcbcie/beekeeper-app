'use client'

import { useEffect } from 'react'

/**
 * Publishes the on-screen keyboard's height as --keyboard-inset, so sheets and pinned action bars
 * can sit above it. iOS has no interactive-widget or VirtualKeyboard support, and visualViewport is
 * the one measure that works on both platforms.
 */
export default function KeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const update = () => {
      // Pinch zoom also shrinks the visual viewport, and must not read as a keyboard.
      const inset = viewport.scale > 1.01
        ? 0
        : Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
      document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`)
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])

  return null
}
