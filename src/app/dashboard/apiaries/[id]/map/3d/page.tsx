'use client'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, Map } from 'lucide-react'
import IconButton from '@/components/ui/IconButton'

// three.js is heavy — load client-side only so it stays off SSR and the shared
// bundle. Kept isolated to this route so it never touches the critical path.
const YardScene3D = dynamic(() => import('@/components/apiaries/YardScene3D'), {
  ssr: false,
  loading: () => <p className="text-text-secondary py-8 text-center">Loading 3D apiary…</p>,
})

export default function ApiaryMap3DPage() {
  const params = useParams()
  const router = useRouter()
  const apiaryId = params.id as string

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <IconButton
          onClick={() => router.push(`/dashboard/apiaries/${apiaryId}/map`)}
          aria-label="Back to apiary map"
        >
          <ArrowLeft className="w-5 h-5" />
        </IconButton>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">3D Apiary View</h1>
          <p className="text-sm text-text-secondary">Spin the apiary around to see your hives in 3D.</p>
        </div>
        <Link
          href={`/dashboard/apiaries/${apiaryId}/map`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-surface border border-border rounded-full hover:border-forest-500 text-text-secondary hover:text-forest-700 dark:hover:text-forest-300 transition-colors"
        >
          <Map size={14} />
          2D map
        </Link>
      </div>

      <YardScene3D apiaryId={apiaryId} />
    </div>
  )
}
