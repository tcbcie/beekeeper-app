'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'

type Arrival = 'forward' | 'back' | 'tab'

const SLIDE_PX: Record<Arrival, number> = { forward: 16, back: -16, tab: 0 }
const DURATION_MS = 180
const PHONE_QUERY = '(max-width: 767.98px)'

let arrival: Arrival = 'forward'

/** A bottom-bar tab is a sideways move rather than a step deeper, so it only fades. */
export function markTabNavigation() {
  arrival = 'tab'
}

/**
 * Shows which way the user moved on a phone: a new screen arrives from the right, Back from the
 * left. Animates the existing element, so pages are not remounted, and animates `left`, not
 * `transform`: a transform would make this element the frame for everything `position: fixed`
 * inside it, so pinned bars and sheets would jump for the length of the animation.
 */
export function useScreenTransition<T extends HTMLElement>(pathname: string) {
  const ref = useRef<T>(null)
  const lastPathname = useRef(pathname)

  useEffect(() => {
    const onPopState = () => { arrival = 'back' }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useLayoutEffect(() => {
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname
    const from = SLIDE_PX[arrival]
    arrival = 'forward'

    const element = ref.current
    if (!element?.animate || !window.matchMedia?.(PHONE_QUERY).matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    element.style.position = 'relative'
    const animation = element.animate(
      [{ opacity: 0.4, left: `${from}px` }, { opacity: 1, left: '0px' }],
      { duration: DURATION_MS, easing: 'ease-out' }
    )
    const finish = () => { element.style.position = '' }
    animation.onfinish = finish
    animation.oncancel = finish
    return () => animation.cancel()
  }, [pathname])

  return ref
}
