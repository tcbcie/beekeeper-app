'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useYardMapEnabled } from '@/hooks/useYardMapEnabled'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

/**
 * Gates the Yard Map (2D and 3D) to active subscribers who have opted in via
 * their profile. The apiary entry point is already hidden otherwise; this is
 * defence in depth for direct URL access to /map and /map/3d.
 */
export default function YardMapLayout({ children }: { children: React.ReactNode }) {
  const { yardMapEnabled, loading } = useYardMapEnabled()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !yardMapEnabled) {
      router.replace('/dashboard')
    }
  }, [loading, yardMapEnabled, router])

  if (loading) return <LoadingSpinner text="Loading..." />
  if (!yardMapEnabled) return null

  return <>{children}</>
}
