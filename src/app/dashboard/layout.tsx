'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAccountStatus } from '@/lib/auth'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SelectionProvider } from '@/contexts/SelectionContext'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
import MobileDrawer from '@/components/MobileDrawer'
import OfflineIndicator from '@/components/OfflineIndicator'
import UpdateNotification from '@/components/UpdateNotification'
import ChatButton from '@/components/chat/ChatButton'
import BottomNavBar from '@/components/BottomNavBar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import ImpersonationBanner from '@/components/ImpersonationBanner'
import DashboardShellSkeleton from '@/components/DashboardShellSkeleton'
import { updateManager } from '@/lib/update-manager'
import { registerServiceWorker } from '@/lib/notifications'
import { useToast } from '@/components/ui/Toast'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const toast = useToast()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const hasShownDisabledAlert = useRef(false)
  const checkingAccountRef = useRef(false)

  // Redirect to /login when auth resolves with no session. The grace period
  // covers a momentary null user (e.g. mid token-refresh on a flaky connection):
  // if the session recovers, `user` becomes truthy and the cleanup cancels it.
  useEffect(() => {
    if (authLoading || user) return
    const redirectTimer = setTimeout(() => router.push('/login'), 1500)
    return () => clearTimeout(redirectTimer)
  }, [authLoading, user, router])

  // Account-status enforcement (deactivation / lockout). Runs immediately once a
  // user is known, then every 30s. It deliberately does NOT gate rendering --
  // the dashboard shows straight away (data is protected by RLS) and we redirect
  // only when the server CONFIRMS the account is no longer active. A transient
  // 'unreachable' result is ignored so flaky connectivity never logs anyone out.
  useEffect(() => {
    if (!user) return
    let cancelled = false

    const checkAccount = async () => {
      if (checkingAccountRef.current) return
      checkingAccountRef.current = true
      try {
        const status = await getAccountStatus()
        if (cancelled) return

        if (status === 'unreachable') return

        if (status !== 'active' && !hasShownDisabledAlert.current) {
          hasShownDisabledAlert.current = true
          try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* redirect regardless */ }
          toast.error(
            status === 'deactivated'
              ? 'Your account has been deactivated. You can request account reactivation from the login page.'
              : 'You have been locked out. Please log on again.',
            8000
          )
          router.push('/login')
        }
      } catch (err) {
        console.error('Account status check failed:', err)
      } finally {
        checkingAccountRef.current = false
      }
    }

    checkAccount()
    const interval = setInterval(checkAccount, 30000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [user, router, toast])

  // Initialize update manager
  useEffect(() => {
    let cancelled = false
    const initUpdateManager = async () => {
      try {
        const registration = await registerServiceWorker()
        if (cancelled) return
        if (registration) {
          updateManager.initialize(registration)
        }
      } catch (err) {
        console.error('Service worker registration failed:', err)
      }
    }

    initUpdateManager()
    return () => { cancelled = true }
  }, [])

  // Pre-auth, or the brief grace window before a no-session redirect: show a
  // structural shell skeleton (not a centred spinner) so the swap to the real
  // chrome doesn't shift layout.
  if (authLoading || !user) {
    return <DashboardShellSkeleton />
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
    <Suspense fallback={<DashboardShellSkeleton />}>
      <AuthProvider>
        <SelectionProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </SelectionProvider>
      </AuthProvider>
    </Suspense>
  )
}