'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Wraps the embed content in a measured div and posts its height to the
 * parent window so a cross-origin iframe can auto-size to its content.
 *
 * Measuring a specific wrapper (not document.documentElement) avoids phantom
 * height from app-wide chrome rendered by the root layout (InstallPrompt,
 * providers, etc.) that lives outside the embed content.
 *
 * Parent page must listen for `type: 'hivecraic:embed:resize'`. See the
 * WordPress snippet in docs/features/tcbc-wordpress-research-widget.md.
 */
export default function IframeHeightReporter({
  children,
}: {
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.parent === window) return
    const el = ref.current
    if (!el) return

    let lastHeight = 0
    const send = () => {
      const height = Math.ceil(el.getBoundingClientRect().height)
      if (height === lastHeight || height === 0) return
      lastHeight = height
      window.parent.postMessage(
        { type: 'hivecraic:embed:resize', height },
        '*'
      )
    }

    send()

    const observer = new ResizeObserver(send)
    observer.observe(el)

    window.addEventListener('load', send)

    return () => {
      observer.disconnect()
      window.removeEventListener('load', send)
    }
  }, [])

  return <div ref={ref}>{children}</div>
}
