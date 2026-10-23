'use client'
import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isOfflineAuthError, readLastUser } from '@/lib/last-user'

export default function Home() {
  const router = useRouter()

  const checkUser = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    // Offline with a token that can't be renewed: not signed out, so open the dashboard (C1-03)
    if (session || (error && isOfflineAuthError(error) && readLastUser())) {
      router.push('/dashboard')
    } else {
      router.push('/login')
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