'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLogbookEnabled } from '@/hooks/useLogbookEnabled'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Gates the Logbook to users who have opted in via their profile. The nav link
 * is already hidden otherwise; this is defence in depth for direct URL access.
 */
export default function LogbookLayout({ children }: { children: React.ReactNode }) {
  const { logbookEnabled, loading } = useLogbookEnabled()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !logbookEnabled) {
      router.replace('/dashboard')
    }
  }, [loading, logbookEnabled, router])

  if (loading) return <LoadingSpinner text="Loading..." />
  if (!logbookEnabled) return null

  return <>{children}</>
}
