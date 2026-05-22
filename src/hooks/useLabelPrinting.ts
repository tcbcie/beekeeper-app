'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'

interface UseLabelPrintingResult {
  enabled: boolean
  loading: boolean
}

// Reads `profiles.enable_label_printing` for the current user.
// Callers that already hold a userId may pass it in to skip the auth re-fetch.
// Failures fail closed (enabled stays false) but are logged so a flag silently
// stuck off in production is diagnosable from the console.
export function useLabelPrinting(userId?: string | null): UseLabelPrintingResult {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const uid = userId ?? (await getCurrentUserId())
      if (!uid) {
        if (!cancelled) {
          setEnabled(false)
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('enable_label_printing')
        .eq('id', uid)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('useLabelPrinting: failed to read profile flag', error)
        setEnabled(false)
      } else {
        setEnabled(data?.enable_label_printing === true)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  return { enabled, loading }
}
