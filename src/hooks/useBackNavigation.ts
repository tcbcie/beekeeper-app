'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Back returns to wherever the user came from. If they arrived directly, such as from a QR code,
 * there is nothing in the app to return to, and the browser's Back would leave it, so it goes up
 * to the parent screen instead.
 */
export function useBackNavigation(parentHref: string | null) {
  const router = useRouter()
  const pathname = usePathname()
  const screensInApp = useRef(0)
  const lastPathname = useRef(pathname)
  const cameBack = useRef(false)

  useEffect(() => {
    const onPopState = () => { cameBack.current = true }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname
    screensInApp.current = cameBack.current ? Math.max(0, screensInApp.current - 1) : screensInApp.current + 1
    cameBack.current = false
  }, [pathname])

  return useCallback(() => {
    if (screensInApp.current > 0) router.back()
    else if (parentHref) router.push(parentHref)
  }, [parentHref, router])
}
