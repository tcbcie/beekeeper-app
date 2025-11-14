'use client'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isAccountActive } from '@/lib/auth'
import { User } from '@supabase/supabase-js'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
import MobileDrawer from '@/components/MobileDrawer'
import SubscriptionWarningBanner from '@/components/SubscriptionWarningBanner'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const hasShownDisabledAlert = useRef(false)

  const checkUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Check if account is active
        const accountActive = await isAccountActive()
        if (!accountActive) {
          // Account is disabled - sign out and redirect
          if (!hasShownDisabledAlert.current) {
            hasShownDisabledAlert.current = true
            await supabase.auth.signOut()
            alert('Your account has been deactivated. You can request account reactivation from the login page.')
            router.push('/login')
          }
          return
        }
        setCurrentUser(session.user)
        setLoading(false)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setLoading(false)
      router.push('/login')
    }
    // Router is stable from Next.js, safe to not include in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip the initial INITIAL_SESSION event since checkUser() already handles it
      if (event === 'INITIAL_SESSION') {
        return
      }

      if (session) {
        // Check if account is active on auth state change
        const accountActive = await isAccountActive()
        if (!accountActive) {
          if (!hasShownDisabledAlert.current) {
            hasShownDisabledAlert.current = true
            await supabase.auth.signOut()
            alert('Your account has been deactivated. You can request account reactivation from the login page.')
            router.push('/login')
          }
          return
        }
        setCurrentUser(session.user)
        setLoading(false)
      } else {
        router.push('/login')
      }
    })

    // Periodically check if account is still active (every 30 seconds)
    const accountCheckInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const accountActive = await isAccountActive()
        if (!accountActive) {
          if (!hasShownDisabledAlert.current) {
            hasShownDisabledAlert.current = true
            await supabase.auth.signOut()
            alert('Your account has been deactivated. You can request account reactivation from the login page.')
            router.push('/login')
          }
        }
      }
    }, 30000) // Check every 30 seconds

    return () => {
      authListener.subscription.unsubscribe()
      clearInterval(accountCheckInterval)
    }
    // Router is stable from Next.js, safe to not include in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkUser])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        currentUser={currentUser}
        onMenuClick={() => {
          console.log('Setting mobile menu open to true')
          setIsMobileMenuOpen(true)
        }}
      />
      <SubscriptionWarningBanner />
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => {
          console.log('Closing mobile menu')
          setIsMobileMenuOpen(false)
        }}
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex gap-4 md:gap-6">
          <Sidebar />
          <main className="flex-1 w-full min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
      }
    >
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}