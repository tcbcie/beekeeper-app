'use client'
import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isOfflineAuthError, readLastUser } from '@/lib/last-user'

export default function Home() {
  const router = useRouter()

  const checkUser = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    // Offline with a token that can't be renewed: not signed out, so open the dashboard (C1-03).
    // replace, not push: the installed app opens here, and a history entry for "/" trapped Back
    // between here and the dashboard (C1-13).
    if (session || (error && isOfflineAuthError(error) && readLastUser())) {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [router])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">Loading...</div>
    </div>
  )
}