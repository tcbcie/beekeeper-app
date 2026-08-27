import { createClient } from '@supabase/supabase-js'
import { Metadata } from 'next'
import { Package, SearchX } from 'lucide-react'
import { normaliseStoragePublicUrl } from '@/lib/storage-url'
import FeedbackForm from '@/components/trace/FeedbackForm'
import TraceCard from '@/components/trace/TraceCard'
import LotFinder from '@/components/trace/LotFinder'
import type { PublicBatchInfo, PublicJarLabelInfo, PublicLabelLot } from '@/types/traceability'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Matches the CHECK constraint on trace_labels.code: an HJ prefix plus six
// characters from an alphabet with no 0/O or 1/I/L to confuse anyone typing it.
const LABEL_CODE = /^HJ-[ABCDEFGHJKMNPQRSTVWXYZ23456789]{6}$/

interface PageProps {
  params: Promise<{ code: string }>
  searchParams: Promise<{ lot?: string }>
}

export const metadata: Metadata = {
  title: 'Honey Traceability | HiveCraic',
  description: 'Trace the origin of this honey. From hive to jar.',
}

// A label's batch pointer is meant to change — that is the entire feature. Never
// serve this from a cache: a stale pointer would tell someone their jar came
// from a batch it did not, which is the one thing this page must not do.
export const dynamic = 'force-dynamic'

// batch_code is varchar(20), so nothing longer can match a real lot. Bounding it
// here also stops an unbounded ?lot= value being reflected onto a page whose
// whole job is to look authoritative.
const MAX_LOT_LENGTH = 20

async function getLabelInfo(
  code: string,
  lot: string | null
): Promise<PublicJarLabelInfo<PublicBatchInfo> | null> {
  const { data, error } = await supabase.rpc('get_public_jar_label_info', {
    p_code: code,
    p_lot: lot,
  })

  if (error || !data) return null
  const info = data as PublicJarLabelInfo<PublicBatchInfo>
  if (info.batch) {
    info.batch.apiary_image_url = normaliseStoragePublicUrl(info.batch.apiary_image_url) ?? null
  }
  return info
}

async function getLabelLots(code: string): Promise<PublicLabelLot[]> {
  const { data, error } = await supabase.rpc('get_public_label_lots', { p_code: code })
  if (error || !data) return []
  return data as PublicLabelLot[]
}

function LabelNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-surface-secondary flex items-center justify-center">
          <SearchX className="w-10 h-10 text-text-tertiary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Label Not Found</h1>
        <p className="text-text-secondary mb-6">
          We could not find a honey label with this code. Check the code printed beside the QR
          code on your jar and try again.
        </p>
        <p className="text-sm text-text-tertiary">Label code format: HJ- followed by 6 characters</p>
      </div>
    </div>
  )
}

/**
 * The jar-label scan page.
 *
 * A jar label carries a permanent code, so the QR can be printed in bulk long
 * before the batches it will end up on exist. The label points at whichever
 * batch is currently being bottled into that jar size; `?lot=` overrides that
 * with the lot code printed on the jar, which is how an older jar reaches its
 * own batch rather than the current one.
 */
export default async function JarLabelPage({ params, searchParams }: PageProps) {
  const { code } = await params
  const { lot } = await searchParams

  const normalisedCode = code.toUpperCase()
  if (!LABEL_CODE.test(normalisedCode)) return <LabelNotFound />

  const trimmedLot = lot?.trim() ?? ''
  const requestedLot = trimmedLot !== '' ? trimmedLot.slice(0, MAX_LOT_LENGTH) : null

  const [info, lots] = await Promise.all([
    getLabelInfo(normalisedCode, requestedLot),
    getLabelLots(normalisedCode),
  ])

  if (!info) return <LabelNotFound />

  const { label, batch } = info
  // The batch's own feedback setting still applies — the label toggle can only
  // hide the form, never re-enable one the beekeeper switched off for a batch.
  const showFeedback = label.show_feedback && batch?.show_feedback !== false
  // Offer the lot finder whenever there is more than one run to choose between,
  // or whenever the visitor has nothing on screen to check against.
  const showLotFinder = lots.length > 1 || !batch || (requestedLot !== null && !info.lot_found)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {batch ? (
        <TraceCard
          batch={batch}
          overrideTitle={label.public_title}
          overrideOrigin={label.public_origin}
          overrideStory={label.public_story}
          display={{
            // The jar size and net weight are printed beside the QR, so
            // repeating them here would only add noise.
            showNetWeight: false,
            showStory: label.show_story,
            showOriginMap: label.show_origin_map,
            showApiaryImage: label.show_apiary_image,
            showFloral: label.show_floral,
            showLotDetails: label.show_lot_details,
          }}
        />
      ) : (
        /* No batch to show: either the label has not been pointed at one yet,
           the batch is not public, or a requested lot did not resolve. Show the
           product and producer, and claim nothing about a specific batch. */
        <div className="bg-surface-elevated rounded-2xl shadow-xl border border-amber-100 dark:border-amber-900/40 overflow-hidden">
          <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 px-6 py-8 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-white" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {label.public_title || 'Pure Irish Honey'}
            </h1>
            {label.public_origin && <p className="text-amber-100 text-lg">{label.public_origin}</p>}
          </div>

          {label.show_story && label.public_story && (
            <div className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">The Story of this Jar</h2>
              <p className="text-text-secondary leading-relaxed">{label.public_story}</p>
            </div>
          )}
        </div>
      )}

      {showLotFinder && (
        <LotFinder
          code={normalisedCode}
          lots={lots}
          requestedLot={requestedLot}
          lotFound={info.lot_found}
          hasBatch={batch !== null}
        />
      )}

      {showFeedback && batch && <FeedbackForm traceCode={batch.trace_code} />}
    </div>
  )
}
