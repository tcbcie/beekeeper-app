'use client'
import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowNotification(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showNotification && isOnline) {
    return null
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg transition-all ${
        isOnline
          ? 'bg-emerald-600 text-white'
          : 'bg-red-600 text-white'
      }`}
      role="alert"
    >
      {isOnline ? (
        <>
          <Wifi size={20} />
          <span className="font-medium">Back Online</span>
        </>
      ) : (
        <>
          <WifiOff size={20} />
          <div>
            <p className="font-medium">You&apos;re Offline</p>
            <p className="text-sm opacity-90">Changes won&apos;t be saved until you reconnect.</p>
          </div>
        </>
      )}
    </div>
  )
}
