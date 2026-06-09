'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useHasActiveSubscription } from '@/hooks/useHasActiveSubscription'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Gates the entire CRM module to active subscribers. The nav links are already
 * hidden for non-subscribers; this is defence in depth for direct URL access.
 */
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const { hasActiveSubscription, loading } = useHasActiveSubscription()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !hasActiveSubscription) {
      router.replace('/dashboard')
    }
  }, [loading, hasActiveSubscription, router])

  if (loading) return <LoadingSpinner text="Loading..." />
  if (!hasActiveSubscription) return null

  return <>{children}</>
}
