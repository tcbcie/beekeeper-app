'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { clearInspectionDraft, loadInspectionDraft } from '@/lib/inspection-draft'

/** The deliberate log-out, from the desktop bar and from Profile on a phone. */
export function useLogout(userId: string | null | undefined) {
  const router = useRouter()
  const confirmDialog = useConfirm()

  return useCallback(async () => {
    // Only here, not on every sign-out: an expired session must not cost anyone their work.
    if (userId && await loadInspectionDraft(userId)) {
      const logOutAnyway = await confirmDialog({
        title: 'Log out and lose your unfinished inspection?',
        message: 'It is only on this phone, and logging out removes it. To keep it, stay logged in and save it first.',
        confirmLabel: 'Log out',
        cancelLabel: 'Stay logged in',
        variant: 'warning',
      })
      if (!logOutAnyway) return
      await clearInspectionDraft(userId)
    }

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
