'use client'

import { useCallback, useEffect, useRef, type MouseEvent } from 'react'
import { markTabNavigation } from './useScreenTransition'

const RESTORE_WAIT_MS = 3000

/** Where each bottom-bar tab was left. Lasts as long as the app is open. */
const tabPositions = new Map<string, number>()

function scrollToTop() {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
}

/**
 * Each bottom-bar tab keeps its place, as in a native app, and tapping the tab you are on returns
 * to the top. Its links must set scroll={false}, because this decides where they land.
 */
export function useTabScrollMemory(pathname: string, tabHrefs: string[]) {
  const arrivingAt = useRef<string | null>(null)

  const onTabClick = useCallback((href: string, event: MouseEvent) => {
    if (pathname === href) {
      event.preventDefault()
      scrollToTop()
      return
    }
    if (tabHrefs.includes(pathname)) tabPositions.set(pathname, window.scrollY)
    arrivingAt.current = href
    markTabNavigation()
  }, [pathname, tabHrefs])

  useEffect(() => {
    if (arrivingAt.current !== pathname) return
    arrivingAt.current = null

    const target = tabPositions.get(pathname) ?? 0
    // 'instant', because the app scrolls smoothly by default and returning to a tab should land
    // in place, not visibly travel there.
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (target === 0) return

    // The page loads its data after it appears, so wait until it is tall enough to reach the old
    // place. Stop as soon as the user touches the screen: they have moved on.
    const stop = () => {
      observer.disconnect()
      clearTimeout(timer)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('wheel', stop)
    }
    const tryRestore = () => {
      if (document.documentElement.scrollHeight - window.innerHeight < target) return
      window.scrollTo({ top: target, behavior: 'instant' })
      stop()
    }
    const observer = new ResizeObserver(tryRestore)
    const timer = setTimeout(stop, RESTORE_WAIT_MS)
    observer.observe(document.body)
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('wheel', stop, { passive: true })
    tryRestore()
    return stop
  }, [pathname])

  return onTabClick
}
