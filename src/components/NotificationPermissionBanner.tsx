'use client'
import { useState, useEffect } from 'react'
import { Bell, X, Check } from 'lucide-react'
import { initializeNotifications } from '@/lib/notifications'

export default function NotificationPermissionBanner() {
  const [show, setShow] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

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

  // Don't show if permission is already granted or permanently dismissed
  if (!show || permission === 'granted' || localStorage.getItem('notification-banner-dismissed') === 'true') {
    return null
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 rounded-lg shadow-2xl p-4 text-white border-2 border-amber-400 dark:border-amber-500">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Enable Notifications</h3>
            <p className="text-sm text-amber-50 mb-3">
              Get notified about important queen rearing dates: acceptance checks, caging dates, and hatch days!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                className="px-4 py-2 bg-white text-amber-600 rounded-lg font-semibold hover:bg-amber-50 transition-colors flex items-center gap-2 shadow-md"
              >
                <Check size={16} />
                Enable
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
              >
                Later
              </button>
            </div>
            {permission === 'denied' && (
              <p className="text-xs text-amber-100 mt-2 bg-red-600/30 p-2 rounded">
                Notifications are blocked. Please enable them in your browser settings to receive alerts.
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white flex-shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
