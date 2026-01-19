'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TraceabilityPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/tools?section=traceability')
  }, [router])

  return null
}
