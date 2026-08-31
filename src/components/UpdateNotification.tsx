'use client'

import { useEffect, useState } from 'react'
import { updateManager, UpdateState } from '@/lib/update-manager'
import Button from '@/components/ui/Button'
import { useBottomSurfaceSlot } from '@/contexts/BottomSurfaceContext'

export default function UpdateNotification() {
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'no-update' })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Subscribe to update state changes
    const unsubscribe = updateManager.subscribe((state) => {
      setUpdateState(state)
      // Show notification when update is ready
      if (state.status === 'ready') {
        setIsVisible(true)
      } else if (state.status === 'no-update') {
        setIsVisible(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const handleUpdate = () => {
    updateManager.applyUpdate()
    setIsVisible(false)
  }

  const handleDismiss = () => {
    updateManager.dismissUpdate()
    setIsVisible(false)
  }

  // Highest precedence of the three banners, but still deferred while a form
  // is in progress; the claim is retained so it returns afterwards.
  const mayShow = useBottomSurfaceSlot('update', isVisible && updateState.status === 'ready')

  if (!mayShow) {
    return null
  }

  return (
    <div className="fixed above-bottom-nav md:bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-surface dark:bg-surface-elevated rounded-lg shadow-2xl border-2 border-amber-500 max-w-md mx-4">
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-foreground">
                Update Available
              </h3>
              <div className="mt-2 text-sm text-text-secondary">
                <p>A new version of HiveCraic is ready. Update now for the latest features and improvements.</p>
              </div>
              <div className="mt-4 flex space-x-3">
                <Button
                  onClick={handleUpdate}
                  tone="amber"
                  className="shadow-sm"
                >
                  Update Now
                </Button>
                <Button
                  onClick={handleDismiss}
                  tone="neutral"
                >
                  Later
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Manual update checker button component
 * Can be placed in settings or menu
 */
export function UpdateCheckButton() {
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'no-update' })

  useEffect(() => {
    const unsubscribe = updateManager.subscribe(setUpdateState)
    return () => unsubscribe()
  }, [])

  const handleCheckForUpdates = () => {
    updateManager.checkForUpdates()
  }

  const isChecking = updateState.status === 'checking'

  return (
    <Button
      onClick={handleCheckForUpdates}
      disabled={isChecking}
      tone="neutral"
      size="sm"
      className="shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <svg
        className={`-ml-0.5 mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
      {isChecking ? 'Checking...' : 'Check for Updates'}
    </Button>
  )
}
