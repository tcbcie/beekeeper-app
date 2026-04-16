'use client'

import { useEffect } from 'react'

/**
 * Posts the document's current content height to the parent window so a
 * cross-origin iframe can auto-size to its content.
 *
 * The parent page must listen for messages with
 * `type: 'hivecraic:embed:resize'` and resize the iframe accordingly. The
 * WordPress snippet in docs/features/tcbc-wordpress-research-widget.md shows
 * the receiver side.
 */
export default function IframeHeightReporter() {
  useEffect(() => {
    if (window.parent === window) return

    let lastHeight = 0
    const send = () => {
      const height = Math.ceil(document.documentElement.scrollHeight)
      if (height === lastHeight) return
      lastHeight = height
      window.parent.postMessage(
        { type: 'hivecraic:embed:resize', height },
        '*'
      )
    }

    send()

    const observer = new ResizeObserver(send)
    observer.observe(document.documentElement)

    window.addEventListener('load', send)

    return () => {
      observer.disconnect()
      window.removeEventListener('load', send)
    }
  }, [])

  return null
}
