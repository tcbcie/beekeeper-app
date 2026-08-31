'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import { useBottomSurfaceSlot } from '@/contexts/BottomSurfaceContext'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

/**
 * PWA Install Prompt Component
 *
 * Captures the browser's beforeinstallprompt event and shows a custom
 * install banner to users on Android devices. This is required because
 * browsers don't always show the native install prompt automatically.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed as PWA
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppiOS = ('standalone' in window.navigator) && (window.navigator as Navigator & { standalone: boolean }).standalone

      if (isStandalone || isInWebAppiOS) {
        setIsInstalled(true)
        return
      }
    }

    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10)
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show our custom install banner
      setShowBanner(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowBanner(false)
      setDeferredPrompt(null)
      localStorage.removeItem('pwa-install-dismissed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) {
      return
    }

    // Show the install prompt
    await deferredPrompt.prompt()

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
    }

    // Clear the deferred prompt
    setDeferredPrompt(null)
    setShowBanner(false)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShowBanner(false)
    // Remember dismissal for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }, [])

  // Yields to an available update, and waits while a form is in progress.
  const mayShow = useBottomSurfaceSlot('install', !isInstalled && showBanner)

  if (!mayShow) {
    return null
  }

  return (
    <div className="fixed above-bottom-nav md:bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg animate-slide-up">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-black/10 rounded-xl flex items-center justify-center">
          <Smartphone size={24} className="text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm">
            Install HiveCraic
          </h3>
          <p className="text-white/80 text-sm">
            Add to your home screen for quick access
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleInstallClick}
            tone="neutral"
            size="sm"
            className="touch-manipulation inline-flex items-center gap-1.5 bg-surface text-amber-700 hover:bg-surface-elevated active:bg-surface-elevated"
          >
            <Download size={16} />
            Install
          </Button>

          <IconButton
            onClick={handleDismiss}
            className="touch-manipulation text-white/80 hover:text-white hover:bg-black/10 border-white/20"
            aria-label="Dismiss"
          >
            <X size={20} />
          </IconButton>
        </div>
      </div>
    </div>
  )
}
