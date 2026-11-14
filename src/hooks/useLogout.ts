'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { clearInspectionDraft, loadInspectionDraft } from '@/lib/inspection-draft'
import { discardAllQueuedInspections, listQueuedInspections } from '@/lib/inspection-outbox'
import { removePushOnSignOut } from '@/lib/push'

/** The deliberate log-out, from the desktop bar and from Profile on a phone. */
export function useLogout(userId: string | null | undefined) {
  const router = useRouter()
  const confirmDialog = useConfirm()

  return useCallback(async () => {
    // Only here, not on every sign-out: an expired session must not cost anyone their work.
    const [draft, waiting] = userId
      ? await Promise.all([loadInspectionDraft(userId), listQueuedInspections(userId)])
      : [null, []]
    if (userId && (draft || waiting.length > 0)) {
      const logOutAnyway = await confirmDialog({
        title: 'Log out and lose inspections on this device?',
        message: 'You have an unfinished inspection, or one not sent yet. It is only on this device, and logging out removes it. To keep it, stay logged in until it has sent.',
        confirmLabel: 'Log out',
        cancelLabel: 'Stay logged in',
        variant: 'warning',
      })
      if (!logOutAnyway) return
      await clearInspectionDraft(userId)
      await discardAllQueuedInspections(userId)
    }

    // While still signed in: this phone stops getting the account's reminders.
    await removePushOnSignOut()

    try {
      // Sign out from Supabase - use local scope to avoid 403 errors
      // 'local' scope only removes the session from this device/browser
      await supabase.auth.signOut({ scope: 'local' })

      // Clear any remaining auth data from storage
      if (typeof window !== 'undefined') {
        // Remove all Supabase auth keys from localStorage
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))

        // Also clear sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key))
      }

      // Redirect to login
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Force redirect to login even if logout fails
      router.push('/login')
    }
  }, [confirmDialog, router, userId])
}
