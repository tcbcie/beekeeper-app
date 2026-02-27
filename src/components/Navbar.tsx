'use client'
import { LogOut, Menu, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { SubscriptionStatusResponse } from '@/types/subscription'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'

interface NavbarProps {
  currentUser: User | null
  onMenuClick?: () => void
}

export default function Navbar({ currentUser, onMenuClick }: NavbarProps) {
  const router = useRouter()
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusResponse | null>(null)
  const [hasProfileName, setHasProfileName] = useState<boolean>(true)

  // Fetch subscription status and profile completeness on mount
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const { data, error } = await supabase.rpc('get_subscription_status')
        if (error) throw error
        setSubscriptionStatus(data as SubscriptionStatusResponse)
      } catch (error) {
        console.error('Error fetching subscription status:', error)
      }
    }

    const checkProfileCompleteness = async () => {
      if (!currentUser?.id) return

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', currentUser.id)
          .single()

        if (error) throw error

        // Check if user has at least first name or last name set
        setHasProfileName(!!(data?.first_name || data?.last_name))
      } catch (error) {
        console.error('Error checking profile completeness:', error)
      }
    }

    fetchSubscriptionStatus()
    checkProfileCompleteness()
  }, [currentUser?.id])

  const handleLogout = async () => {
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
  }

  return (
    <nav className="bg-surface/80 dark:bg-surface/80 backdrop-blur-xl shadow-lg border-b border-border sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Hamburger menu for mobile */}
            <IconButton
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onMenuClick?.()
              }}
              className="hidden touch-manipulation min-h-[48px] min-w-[48px] items-center justify-center"
              aria-label="Open menu"
              type="button"
            >
              <Menu size={24} />
            </IconButton>
            <h1 className="text-xl sm:text-2xl font-bold text-forest-600 dark:text-forest-400 whitespace-nowrap flex items-center gap-2">
              <Image src="/logo.png" alt="HiveCraic" width={32} height={32} className="w-7 h-7 sm:w-8 sm:h-8" />
              HiveCraic
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-text-secondary truncate max-w-[150px] lg:max-w-none">
                {currentUser?.email}
              </span>
              {/* Profile incompleteness indicator */}
              {!hasProfileName && (
                <div className="relative group">
                  <span
                    className="inline-flex"
                    tabIndex={0}
                    role="img"
                    aria-label="Profile incomplete"
                    aria-describedby="navbar-profile-incomplete-tooltip"
                  >
                    <AlertCircle className="w-5 h-5 cursor-pointer text-amber-600 dark:text-amber-400" />
                  </span>
                  {/* Tooltip */}
                  <div
                    id="navbar-profile-incomplete-tooltip"
                    role="tooltip"
                    className="pointer-events-none absolute right-0 top-full mt-2 w-64 p-3 bg-surface-elevated border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50"
                  >
                    <p className="text-sm text-text-primary">
                      Please complete your profile by adding your name. This helps team members identify you when working on shared tasks and hives.
                    </p>
                  </div>
                </div>
              )}
            </div>
            {/* Subscription status indicator */}
            {subscriptionStatus && subscriptionStatus.status !== 'active' && (
              <div className="relative group">
                <span
                  className="inline-flex"
                  tabIndex={0}
                  role="img"
                  aria-label="Subscription status"
                  aria-describedby="navbar-subscription-status-tooltip"
                >
                  <AlertCircle
                    className={`w-5 h-5 cursor-pointer ${
                      subscriptionStatus.status === 'no_subscription'
                        ? 'text-blue-600 dark:text-blue-400'
                        : subscriptionStatus.status === 'expiring_soon'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : subscriptionStatus.status === 'expiring_very_soon'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  />
                </span>
                {/* Tooltip */}
                <div
                  id="navbar-subscription-status-tooltip"
                  role="tooltip"
                  className="pointer-events-none absolute right-0 top-full mt-2 w-72 p-3 bg-surface-elevated border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50"
                >
                  <p className="text-sm text-text-primary">
                    {subscriptionStatus.status === 'no_subscription'
                      ? 'Support the app and the Irish beekeeping community by getting a valid subscription via the profile section.'
                      : subscriptionStatus.status === 'expiring_soon'
                      ? `Your subscription expires in ${subscriptionStatus.days_remaining} days. Consider renewing to continue enjoying all features.`
                      : subscriptionStatus.status === 'expiring_very_soon'
                      ? `Your subscription expires in ${subscriptionStatus.days_remaining} days! Renew now to avoid interruption.`
                      : 'Your subscription has expired. Renew now to continue using the app.'}
                  </p>
                </div>
              </div>
            )}
            <Button
              onClick={handleLogout}
              tone="danger"
              size="sm"
              className="min-h-[48px] px-3 touch-manipulation sm:px-4"
              aria-label="Logout"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
