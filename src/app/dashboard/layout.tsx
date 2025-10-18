'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const checkUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setCurrentUser(session.user)
      setLoading(false)
    } else {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setCurrentUser(session.user)
      } else {
        router.push('/login')
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router, checkUser])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentUser={currentUser} />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <Sidebar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}