'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserId } from '@/lib/auth'
import { SkeletonScreen } from '@/components/ui/Skeleton'
import HiveModelManager from '@/components/hive/HiveModelManager'

/** My hive models: the kinds of hive a user owns, each picked per hive. */
export default function HiveModelsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCurrentUserId().then((id) => {
      if (cancelled) return
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
    })
    return () => { cancelled = true }
  }, [router])

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-responsive-3xl font-bold text-foreground">My hive models</h1>
      {userId ? <HiveModelManager userId={userId} /> : <SkeletonScreen label="Loading hive models" rows={3} />}
    </div>
  )
}
