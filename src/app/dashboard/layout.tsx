'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isAccountActive } from '@/lib/auth'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
import MobileDrawer from '@/components/MobileDrawer'
import SubscriptionWarningBanner from '@/components/SubscriptionWarningBanner'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [checkingAccount, setCheckingAccount] = useState(true)
  const router = useRouter()
  const hasShownDisabledAlert = useRef(false)

  useEffect(() => {
    const checkAccount = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      // Check if account is active
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

      setCheckingAccount(false)
    }

    checkAccount()
  }, [user, authLoading, router])

  // Periodically check if account is still active (every 30 seconds)
  useEffect(() => {
    if (!user) return

    const accountCheckInterval = setInterval(async () => {
      const accountActive = await isAccountActive()
      if (!accountActive) {
        if (!hasShownDisabledAlert.current) {
          hasShownDisabledAlert.current = true
          await supabase.auth.signOut()
          alert('Your account has been deactivated. You can request account reactivation from the login page.')
          router.push('/login')
        }
      }
    }, 30000) // Check every 30 seconds

    return () => {
      clearInterval(accountCheckInterval)
    }
  }, [user, router])

  if (authLoading || checkingAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        currentUser={user}
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

export default function DashboardLayout({ children }: { children: React.ReactNode}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
      }
    >
      <AuthProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </AuthProvider>
    </Suspense>
  )
}