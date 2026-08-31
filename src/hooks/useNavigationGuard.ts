'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Asks before an in-app link navigates away from unsaved work.
 *
 * Phase 1 guarded six exit paths and left this one open, because the App Router
 * offers no supported way to intercept a navigation once it has begun. It still
 * does not. So rather than intercept the router, this intercepts the click that
 * would start the navigation, which is the last moment the decision is still
 * the user's to make.
 *
 * The listener runs in the capture phase so it sees the click before the
 * router's own handler, and it navigates itself once the user has agreed.
 *
 * It deliberately does NOT touch the browser's back and forward buttons.
 * Guarding those means pushing entries onto the history stack and unwinding
 * them, which goes wrong in exactly the situation that matters — a user who has
 * already left — and risks trapping someone in a page they are trying to
 * escape. That vector is documented as still open rather than half-closed.
 */
export function useNavigationGuard(
  active: boolean,
  confirmLeave: () => Promise<boolean>
): void {
  const router = useRouter()

  useEffect(() => {
    if (!active) return

    const handleClick = (event: MouseEvent) => {
      // Someone else has already dealt with this click.
      if (event.defaultPrevented) return
      // Left button only, and never when a modifier means "open elsewhere":
      // those do not navigate this tab, so there is nothing to lose.
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      if (anchor.hasAttribute('download')) return
      if (anchor.target && anchor.target !== '_self') return

      let destination: URL
      try {
        destination = new URL(anchor.href, window.location.href)
      } catch {
        return
      }

      // Leaving the site entirely is the browser's business, and beforeunload
      // already covers it.
      if (destination.origin !== window.location.origin) return
      // Going nowhere is not leaving.
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      void confirmLeave().then(mayLeave => {
        if (mayLeave) {
          router.push(`${destination.pathname}${destination.search}${destination.hash}`)
        }
      })
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [active, confirmLeave, router])
}

export default useNavigationGuard
