'use client'
import { useState, useEffect } from 'react'
import { useBottomSurfaceSlot } from '@/contexts/BottomSurfaceContext'
import { Bell, X, Check } from 'lucide-react'
import { initializeNotifications } from '@/lib/notifications'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'

export default function NotificationPermissionBanner() {
  const [show, setShow] = useState(false)
  const [permanentlyDismissed, setPermanentlyDismissed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  // Read in an effect rather than during render: localStorage is unavailable
  // on the server and reading it inline risks a hydration mismatch.
  useEffect(() => {
    setPermanentlyDismissed(localStorage.getItem('notification-banner-dismissed') === 'true')
  }, [])

  useEffect(() => {
    // Check current notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission)

      // Show banner if permission is default (not asked yet)
      if (Notification.permission === 'default') {
        // Wait 2 seconds before showing to not overwhelm user
        const timer = setTimeout(() => setShow(true), 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  const handleEnable = async () => {
    const granted = await initializeNotifications()
    if (granted) {
      setPermission('granted')
      setShow(false)
      // Store in localStorage to not show again
      localStorage.setItem('notification-banner-dismissed', 'true')
    } else {
      setPermission('denied')
      // Keep showing banner if denied, in case they change mind
    }
  }

  const handleDismiss = () => {
    setShow(false)
    // Store dismissal, but allow showing again after 7 days
    const dismissedUntil = Date.now() + (7 * 24 * 60 * 60 * 1000)
    localStorage.setItem('notification-banner-dismissed-until', dismissedUntil.toString())
  }

  // Don't show if already dismissed recently
  useEffect(() => {
    const dismissedUntil = localStorage.getItem('notification-banner-dismissed-until')
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
      setShow(false)
    }
  }, [])

  // Lowest precedence: yields to an update or an install offer, and waits
  // while a form is in progress.
  const mayShow = useBottomSurfaceSlot(
    'notification',
    show && permission !== 'granted' && !permanentlyDismissed
  )

  if (!mayShow) {
    return null
  }

  return (
    <div className="fixed above-bottom-nav md:bottom-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 rounded-lg shadow-2xl p-4 text-white border-2 border-amber-400 dark:border-amber-500">
        <div className="flex items-start gap-3">
          <div className="bg-black/10 p-2 rounded-full flex-shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Enable Notifications</h3>
            <p className="text-sm text-amber-50 mb-3">
              Get notified about important queen rearing dates: acceptance checks, caging dates, and hatch days!
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleEnable}
                tone="neutral"
                className="inline-flex items-center gap-2 bg-surface text-amber-700 hover:bg-surface-elevated shadow-md"
              >
                <Check size={16} />
                Enable
              </Button>
              <Button
                onClick={handleDismiss}
                tone="neutral"
                className="bg-black/10 text-white border-white/30 hover:bg-black/20"
              >
                Later
              </Button>
            </div>
            {permission === 'denied' && (
              <p className="text-sm text-amber-100 mt-2 bg-red-600/30 p-2 rounded">
                Notifications are blocked. Please enable them in your browser settings to receive alerts.
              </p>
            )}
          </div>
          <IconButton
            onClick={handleDismiss}
            className="flex-shrink-0 border-white/30 text-white/80 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </IconButton>
        </div>
      </div>
    </div>
  )
}
