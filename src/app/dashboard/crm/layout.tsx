'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCrmEnabled } from '@/hooks/useCrmEnabled'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Gates the entire CRM module to active subscribers who have opted in via their
 * profile. The nav links are already hidden otherwise; this is defence in depth
 * for direct URL access.
 */
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const { crmEnabled, loading } = useCrmEnabled()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !crmEnabled) {
      router.replace('/dashboard')
    }
  }, [loading, crmEnabled, router])

  if (loading) return <LoadingSpinner text="Loading..." />
  if (!crmEnabled) return null

  return <>{children}</>
}
