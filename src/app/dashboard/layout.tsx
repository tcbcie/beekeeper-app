'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAccountStatus } from '@/lib/auth'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
import MobileDrawer from '@/components/MobileDrawer'
import OfflineIndicator from '@/components/OfflineIndicator'
import UpdateNotification from '@/components/UpdateNotification'
import ChatButton from '@/components/chat/ChatButton'
import BottomNavBar from '@/components/BottomNavBar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import ImpersonationBanner from '@/components/ImpersonationBanner'
import { updateManager } from '@/lib/update-manager'
import { registerServiceWorker } from '@/lib/notifications'
import { useToast } from '@/components/ui/Toast'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const toast = useToast()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [checkingAccount, setCheckingAccount] = useState(true)
  const router = useRouter()
  const hasShownDisabledAlert = useRef(false)
  const checkingAccountRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const checkAccount = async () => {
      if (authLoading) return

      if (!user) {
        router.push('/login')
        return
      }

      // Check if account is active
      const status = await getAccountStatus()
      if (cancelled) return // User changed during async call

      if (status !== 'active') {
        if (!hasShownDisabledAlert.current) {
          hasShownDisabledAlert.current = true
          try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* proceed to redirect regardless */ }
          if (status === 'deactivated') {
            toast.error('Your account has been deactivated. You can request account reactivation from the login page.', 8000)
          } else {
            toast.error('You have been locked out. Please log on again.', 8000)
          }
          router.push('/login')
        }
        return
      }

      setCheckingAccount(false)
    }

    checkAccount()

    return () => { cancelled = true }
  }, [user, authLoading, router, toast])

  // Initialize update manager
  useEffect(() => {
    const initUpdateManager = async () => {
      const registration = await registerServiceWorker()
      if (registration) {
        updateManager.initialize(registration)
      }
    }

    initUpdateManager()
  }, [])

  // Periodically check if account is still active (every 30 seconds)
  // Only starts after initial check completes (checkingAccount === false)
  useEffect(() => {
    if (!user || checkingAccount) return
    let cancelled = false

    const accountCheckInterval = setInterval(async () => {
      if (checkingAccountRef.current) return
      checkingAccountRef.current = true
      try {
        const status = await getAccountStatus()
        if (cancelled) return // User changed during async call

        if (status !== 'active') {
          if (!hasShownDisabledAlert.current) {
            hasShownDisabledAlert.current = true
            try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* proceed to redirect regardless */ }
            if (status === 'deactivated') {
              toast.error('Your account has been deactivated. You can request account reactivation from the login page.', 8000)
            } else {
              toast.error('You have been locked out. Please log on again.', 8000)
            }
            router.push('/login')
          }
        }
      } catch (err) {
        console.error('Account check failed:', err)
      } finally {
        checkingAccountRef.current = false
      }
    }, 30000)

    return () => {
      cancelled = true
      clearInterval(accountCheckInterval)
    }
  }, [user, checkingAccount, router, toast])

  if (authLoading || checkingAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl text-text-secondary">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <ImpersonationBanner />
      <OfflineIndicator />
      <UpdateNotification />
      <Navbar currentUser={user} />
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-20 md:pb-6">
        <div className="flex gap-4 md:gap-6">
          <Sidebar />
          <main className="flex-1 w-full min-w-0">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
      <ChatButton />
      <BottomNavBar onMoreClick={() => setIsMobileMenuOpen(true)} />
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-xl text-text-secondary">Loading...</div>
        </div>
      }
    >
      <AuthProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </AuthProvider>
    </Suspense>
  )
}