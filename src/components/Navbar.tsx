'use client'
import { ArrowLeft, LogOut, AlertCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { SubscriptionStatusResponse } from '@/types/subscription'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import { getScreenInfo } from '@/lib/screen-title'
import { useBackNavigation } from '@/hooks/useBackNavigation'
import { useLogout } from '@/hooks/useLogout'
import { resolveSubscriptionStatus } from '@/hooks/useHasActiveSubscription'
interface NavbarProps {
  currentUser: User | null
}

export default function Navbar({ currentUser }: NavbarProps) {
  const pathname = usePathname()
  const screen = getScreenInfo(pathname)
  const goBack = useBackNavigation(screen.parentHref)
  const handleLogout = useLogout(currentUser?.id)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusResponse | null>(null)
  const [hasProfileName, setHasProfileName] = useState<boolean>(true)

  // Fetch subscription status and profile completeness on mount
  useEffect(() => {
    // Through the shared getter, which the CRM and nav gates already use: one request, not two
    const fetchSubscriptionStatus = async () => {
      setSubscriptionStatus(await resolveSubscriptionStatus())
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

  const subscriptionMessage = !subscriptionStatus ? ''
    : subscriptionStatus.status === 'no_subscription'
      ? 'Support the app and the Irish beekeeping community by getting a valid subscription via the profile section.'
      : subscriptionStatus.status === 'expiring_soon'
        ? `Your subscription expires in ${subscriptionStatus.days_remaining} days. Consider renewing to continue enjoying all features.`
        : subscriptionStatus.status === 'expiring_very_soon'
          ? `Your subscription expires in ${subscriptionStatus.days_remaining} days! Renew now to avoid interruption.`
          : 'Your subscription has expired. Renew now to continue using the app.'

  return (
    <nav className="bg-surface border-b border-border sticky top-0 z-30 pt-[env(safe-area-inset-top)]">
      {/* Room on the right for Mel, which sits in this bar on a phone (ChatButton) */}
      <div className="max-w-7xl mx-auto pl-2 pr-14 py-1 md:px-4 md:py-4">
        <div className="flex justify-between items-center gap-2 md:gap-4">
          {/* On a phone the bar names the screen and offers Back, like a native app. Neither is
              the page's heading: each page has its own h1. */}
          <div className="flex min-h-[48px] min-w-0 items-center gap-1 md:hidden">
            {screen.parentHref ? (
              <IconButton onClick={goBack} aria-label="Back" className="flex-shrink-0">
                <ArrowLeft size={24} />
              </IconButton>
            ) : pathname === '/dashboard' ? (
              <Image src="/logo.png" alt="" width={32} height={32} className="ml-1 w-7 h-7 flex-shrink-0" />
            ) : null}
            <p className={`truncate text-xl font-bold ${screen.parentHref ? 'text-foreground' : 'pl-2 text-forest-800 dark:text-forest-400'}`}>
              {pathname === '/dashboard' ? 'HiveCraic' : screen.title}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <p className="text-2xl font-bold text-forest-800 dark:text-forest-400 whitespace-nowrap flex items-center gap-2">
              <Image src="/logo.png" alt="" width={32} height={32} className="w-8 h-8" />
              HiveCraic
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-text-secondary truncate max-w-[150px] lg:max-w-none">
                {currentUser?.email}
              </span>
              {/* Profile incompleteness indicator */}
              {!hasProfileName && (
                <div className="relative group">
                  {/* A 48px link to the profile, so a tap does something; the tooltip stays for hover */}
                  <Link
                    href="/dashboard/profile"
                    className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center"
                    aria-label="Profile incomplete: add your name in your profile"
                    aria-describedby="navbar-profile-incomplete-tooltip"
                  >
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </Link>
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
                {/* The warning was a 20px dot whose text only showed on hover, which a phone can't
                    do. It's now a 48px link to the profile's subscription card (C1-19). */}
                <Link
                  href="/dashboard/profile"
                  className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center"
                  aria-label={`${subscriptionMessage} Open your profile.`}
                  aria-describedby="navbar-subscription-status-tooltip"
                >
                  <AlertCircle
                    className={`w-5 h-5 ${
                      subscriptionStatus.status === 'no_subscription'
                        ? 'text-amber-700 dark:text-amber-400'
                        : subscriptionStatus.status === 'expiring_soon'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : subscriptionStatus.status === 'expiring_very_soon'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  />
                </Link>
                {/* Tooltip */}
                <div
                  id="navbar-subscription-status-tooltip"
                  role="tooltip"
                  className="pointer-events-none absolute right-0 top-full mt-2 w-72 p-3 bg-surface-elevated border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50"
                >
                  <p className="text-sm text-text-primary">{subscriptionMessage}</p>
                </div>
              </div>
            )}
            {/* Logging out is routine, so a plain button: red is kept for what is dangerous.
                A phone has little room for chrome, so there it lives on the Profile screen. */}
            <div className="hidden md:block">
              <Button
                onClick={handleLogout}
                tone="neutral"
                size="sm"
                className="min-h-[48px] px-4 touch-manipulation"
                aria-label="Log out"
              >
                <LogOut size={16} />
                <span>Log out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
