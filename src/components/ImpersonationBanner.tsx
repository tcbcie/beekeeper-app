'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserX } from 'lucide-react'
import Button from '@/components/ui/Button'

const IMPERSONATION_KEY = 'hivecraic_impersonation'

interface ImpersonationData {
  originalSession: {
    access_token: string
    refresh_token: string
  }
  targetUserEmail: string
  targetDisplayName: string
  startedAt: string
}

export function getImpersonationData(): ImpersonationData | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(IMPERSONATION_KEY)
  return data ? JSON.parse(data) : null
}

export function setImpersonationData(data: ImpersonationData): void {
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(data))
}

export function clearImpersonationData(): void {
  localStorage.removeItem(IMPERSONATION_KEY)
}

export default function ImpersonationBanner() {
  const [impersonationData, setImpersonationDataState] = useState<ImpersonationData | null>(null)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    setImpersonationDataState(getImpersonationData())
  }, [])

  const handleExit = async () => {
    if (!impersonationData) return

    setExiting(true)
    try {
      // Sign out of impersonated session
      await supabase.auth.signOut({ scope: 'local' })

      // Restore original admin session
      const { error } = await supabase.auth.setSession({
        access_token: impersonationData.originalSession.access_token,
        refresh_token: impersonationData.originalSession.refresh_token
      })

      if (error) {
        console.error('Error restoring session:', error)
        // If restore fails, redirect to login
        clearImpersonationData()
        window.location.href = '/login'
        return
      }

      // Clear impersonation data
      clearImpersonationData()

      // Full page reload to clear banner and refresh auth state
      window.location.href = '/dashboard/settings'
    } catch (error) {
      console.error('Error exiting impersonation:', error)
      clearImpersonationData()
      window.location.href = '/login'
    }
  }

  if (!impersonationData) return null

  return (
    <div className="bg-red-600 text-white px-4 py-2 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserX size={18} />
          <span className="text-sm font-medium">
            Impersonating: <strong>{impersonationData.targetDisplayName}</strong>
            {impersonationData.targetDisplayName !== impersonationData.targetUserEmail && (
              <span className="opacity-75 ml-1">({impersonationData.targetUserEmail})</span>
            )}
          </span>
        </div>
        <Button
          onClick={handleExit}
          disabled={exiting}
          tone="neutral"
          size="sm"
          className="bg-surface text-red-700 hover:bg-surface-elevated disabled:opacity-50"
        >
          {exiting ? 'Exiting...' : 'Exit Impersonation'}
        </Button>
      </div>
    </div>
  )
}
