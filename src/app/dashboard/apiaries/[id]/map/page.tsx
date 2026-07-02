'use client'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft } from 'lucide-react'
import IconButton from '@/components/ui/IconButton'

// The canvas pulls in @dnd-kit; load it client-side only so it stays out of
// the server bundle and off the initial shared bundle.
const YardMap = dynamic(() => import('@/components/apiaries/YardMap'), {
  ssr: false,
  loading: () => <p className="text-text-secondary py-8 text-center">Loading yard map…</p>,
})

export default function ApiaryMapPage() {
  const params = useParams()
  const router = useRouter()
  const apiaryId = params.id as string

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <IconButton
          onClick={() => router.push(`/dashboard/apiaries/${apiaryId}`)}
          aria-label="Back to apiary"
        >
          <ArrowLeft className="w-5 h-5" />
        </IconButton>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Yard Map</h1>
          <p className="text-sm text-text-secondary">Drag hives to match their real position in the yard.</p>
        </div>
      </div>

      <YardMap apiaryId={apiaryId} />
    </div>
  )
}
