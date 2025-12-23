'use client'

import { useEffect } from 'react'

/**
 * Global Service Worker Registration Component
 *
 * This component registers the service worker on ALL pages (not just dashboard)
 * which is required for the PWA install prompt to appear on mobile devices.
 *
 * The browser requires an active service worker to show the "Add to Home Screen" prompt.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // Register service worker
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        console.log('Service Worker registered globally:', registration.scope)
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })
  }, [])

  // This component doesn't render anything
  return null
}
