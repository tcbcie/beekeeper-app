'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function MatingNucsRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const nucId = searchParams.get('nuc')
    const target = nucId
      ? `/dashboard/batches?tab=manage_nucs&nuc=${nucId}`
      : '/dashboard/batches?tab=manage_nucs'
    router.replace(target)
  }, [router, searchParams])

  return null
}
