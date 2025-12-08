'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { syncManager } from '@/lib/sync-manager'
import { useAuth } from '@/contexts/AuthContext'

export default function PendingSyncIndicator() {
  const { userId } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: number; failed: number } | null>(null)
  const [showResult, setShowResult] = useState(false)
  const syncingRef = useRef(false) // Ref to prevent race conditions

  const checkPendingCount = useCallback(async () => {
    if (!userId) return
    const count = await syncManager.getPendingSyncCount(userId)
    setPendingCount(count)
  }, [userId])

  const handleManualSync = useCallback(async () => {
    // Use ref for immediate check to prevent race conditions
    if (!navigator.onLine || syncingRef.current || !userId) return

    syncingRef.current = true
    setSyncing(true)
    setSyncResult(null)
    setShowResult(false)

    try {
      const result = await syncManager.syncPendingActions()
      setSyncResult(result)
      setShowResult(true)

      // Refresh pending count
      await checkPendingCount()

      // Hide result after 5 seconds
      setTimeout(() => setShowResult(false), 5000)
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [userId, checkPendingCount])

  useEffect(() => {
    checkPendingCount()

    // Check every 5 seconds
    const interval = setInterval(checkPendingCount, 5000)

    // Listen for online event
    const handleOnline = () => {
      checkPendingCount()
    }

    // Listen for background sync requests
    const handleBackgroundSync = () => {
      handleManualSync()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('background-sync-requested', handleBackgroundSync)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('background-sync-requested', handleBackgroundSync)
    }
  }, [checkPendingCount, handleManualSync])

  if (pendingCount === 0 && !showResult) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {showResult && syncResult ? (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all ${
            syncResult.failed === 0
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-600 text-white'
          }`}
        >
          {syncResult.failed === 0 ? (
            <>
              <CheckCircle size={20} />
              <div>
                <p className="font-medium">Sync Complete</p>
                <p className="text-sm opacity-90">{syncResult.success} changes synced</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle size={20} />
              <div>
                <p className="font-medium">Partial Sync</p>
                <p className="text-sm opacity-90">
                  {syncResult.success} synced, {syncResult.failed} failed
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-amber-600 text-white flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg">
          <CloudOff size={20} />
          <div className="flex-1">
            <p className="font-medium">Pending Changes</p>
            <p className="text-sm opacity-90">
              {pendingCount} {pendingCount === 1 ? 'change' : 'changes'} waiting to sync
            </p>
          </div>
          <button
            onClick={handleManualSync}
            disabled={syncing || !navigator.onLine}
            className="p-2 hover:bg-amber-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={!navigator.onLine ? 'Cannot sync while offline' : 'Sync now'}
          >
            <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
          </button>
        </div>
      )}
    </div>
  )
}
