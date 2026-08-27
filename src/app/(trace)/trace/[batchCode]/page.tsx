import { createClient } from '@supabase/supabase-js'
import { Metadata } from 'next'
import { SearchX } from 'lucide-react'
import { normaliseStoragePublicUrl } from '@/lib/storage-url'
import FeedbackForm from '@/components/trace/FeedbackForm'
import TraceCard from '@/components/trace/TraceCard'
import type { PublicBatchInfo } from '@/types/traceability'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PageProps {
  params: Promise<{ batchCode: string }>
  searchParams: Promise<{ w?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { batchCode: traceCode } = await params
  return {
    title: `Honey Trace ${traceCode} | HiveCraic`,
    description: 'Trace the origin of this honey. From hive to jar.',
  }
}

async function getBatchInfo(traceCode: string): Promise<PublicBatchInfo | null> {
  if (!/^[A-Z0-9]{8}$/.test(traceCode.toUpperCase())) return null

  const { data, error } = await supabase.rpc('get_public_batch_info', {
    p_trace_code: traceCode.toUpperCase(),
  })

  if (error || !data) return null
  const info = data as PublicBatchInfo
  info.apiary_image_url = normaliseStoragePublicUrl(info.apiary_image_url) ?? null
  return info
}

export default async function TracePage({ params, searchParams }: PageProps) {
  const { batchCode: traceCode } = await params
  const { w } = await searchParams
  // Optional deep-link to a single jar size by its net weight (grams). Keyed on
  // net weight (not the jar row id) because batch_jars rows are re-created on
  // every batch edit, so ids are not stable across edits.
  const selectedWeight = w != null && /^\d+$/.test(w) ? parseInt(w) : null
  const batchInfo = await getBatchInfo(traceCode)

  if (!batchInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-surface-secondary flex items-center justify-center">
            <SearchX className="w-10 h-10 text-text-tertiary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Batch Not Found</h1>
          <p className="text-text-secondary mb-6">
            We could not find a honey batch with this code. Check the QR code or trace code on your jar label and try again.
          </p>
          <p className="text-sm text-text-tertiary">Trace code format: 8 characters (e.g., A1B2C3D4)</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <TraceCard batch={batchInfo} selectedWeight={selectedWeight} />

      {batchInfo.show_feedback !== false && (
        <div className="mt-6">
          <FeedbackForm traceCode={traceCode} />
        </div>
      )}
    </div>
  )
}
