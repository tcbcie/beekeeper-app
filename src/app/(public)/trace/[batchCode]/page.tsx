import { createClient } from '@supabase/supabase-js'
import { isValidBatchCode } from '@/lib/batch-code'
import { Metadata } from 'next'

// Create a public supabase client (anon key only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface BatchInfo {
  batch_code: string
  batch_date: string
  best_before_date: string | null
  jar_size_ml: number | null
  jar_weight_g: number | null
  beekeeper_name: string
  floral_sources: string[]
  origins: {
    apiary_name: string
    city: string | null
    percentage: number
    latitude: number | null
    longitude: number | null
    show_map: boolean
  }[]
  public_title: string | null
  public_origin: string | null
  public_story: string | null
}

interface PageProps {
  params: Promise<{ batchCode: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { batchCode } = await params
  return {
    title: `Batch ${batchCode} | HiveCraic Honey Traceability`,
    description: `Trace the origin of honey batch ${batchCode}. From hive to jar.`,
  }
}

async function getBatchInfo(batchCode: string): Promise<BatchInfo | null> {
  // Validate format first to avoid unnecessary DB calls
  if (!isValidBatchCode(batchCode)) {
    return null
  }

  const { data, error } = await supabase.rpc('get_public_batch_info', {
    p_batch_code: batchCode,
  })

  if (error || !data) {
    return null
  }

  return data as BatchInfo
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Helper to get primary origin location for display
function getPrimaryOrigin(origins: BatchInfo['origins']): { city: string | null; country: string } {
  if (!origins || origins.length === 0) return { city: null, country: 'Ireland' }
  // Get the origin with highest percentage
  const primary = origins[0]
  return { city: primary.city, country: 'Ireland' }
}

// Helper to build story text
function buildStoryText(batchInfo: BatchInfo): string {
  const parts: string[] = []

  parts.push(`Harvested by ${batchInfo.beekeeper_name}`)

  if (batchInfo.origins && batchInfo.origins.length > 0) {
    const apiaryNames = batchInfo.origins.map(o => o.apiary_name).slice(0, 2)
    if (apiaryNames.length === 1) {
      parts.push(`from ${apiaryNames[0]}`)
    } else if (apiaryNames.length === 2) {
      parts.push(`from ${apiaryNames[0]} and ${apiaryNames[1]}`)
    }
  }

  if (batchInfo.floral_sources && batchInfo.floral_sources.length > 0) {
    const sources = batchInfo.floral_sources.slice(0, 3)
    if (sources.length === 1) {
      parts.push(`The bees foraged on ${sources[0].toLowerCase()}.`)
    } else {
      const last = sources.pop()
      parts.push(`The bees foraged on ${sources.map(s => s.toLowerCase()).join(', ')} and ${last?.toLowerCase()}.`)
    }
  } else {
    parts[parts.length - 1] += '.'
  }

  return parts.join(' ')
}

// Helper to get map origin (first with share_location=true)
function getMapOrigin(origins: BatchInfo['origins']): { lat: number; lon: number } | null {
  if (!origins) return null
  const mapOrigin = origins.find(o => o.show_map && o.latitude && o.longitude)
  if (!mapOrigin || !mapOrigin.latitude || !mapOrigin.longitude) return null
  // Fuzz coordinates by ±0.01° for privacy
  const fuzz = () => (Math.random() - 0.5) * 0.02
  return {
    lat: mapOrigin.latitude + fuzz(),
    lon: mapOrigin.longitude + fuzz()
  }
}

export default async function TracePage({ params }: PageProps) {
  const { batchCode } = await params
  const batchInfo = await getBatchInfo(batchCode)

  if (!batchInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Batch Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            We couldn&apos;t find a honey batch with this code. Please check the code on your jar label and try again.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Batch code format: L-YYYY-MM-NNN
          </p>
        </div>
      </div>
    )
  }

  const primaryOrigin = getPrimaryOrigin(batchInfo.origins)
  const storyText = batchInfo.public_story || buildStoryText(batchInfo)
  const mapOrigin = getMapOrigin(batchInfo.origins)

  // Use custom values if set, otherwise fall back to generated
  const displayTitle = batchInfo.public_title || 'Pure Irish Honey'
  const displayOrigin = batchInfo.public_origin || (primaryOrigin.city
    ? `Harvested in Co. ${primaryOrigin.city}, ${primaryOrigin.country}`
    : `Harvested in ${primaryOrigin.country}`)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-amber-100 dark:border-slate-700 overflow-hidden">
        {/* Hero Header */}
        <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 px-6 py-8 text-center">
          <div className="text-4xl mb-3">🍯</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {displayTitle}
          </h1>
          <p className="text-amber-100 text-lg">
            {displayOrigin}
          </p>
        </div>

        {/* Map Thumbnail (if available) */}
        {mapOrigin && (
          <div className="h-40 bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapOrigin.lon - 0.08},${mapOrigin.lat - 0.04},${mapOrigin.lon + 0.08},${mapOrigin.lat + 0.04}&layer=mapnik&marker=${mapOrigin.lat},${mapOrigin.lon}`}
              className="w-full h-full border-0"
              title="Apiary location"
              loading="lazy"
            />
          </div>
        )}

        {/* Story Section */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
            The Story of this Jar
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {storyText}
          </p>
        </div>

        {/* Details Grid */}
        <div className="p-6 space-y-4">
          {/* Net Weight */}
          {batchInfo.jar_weight_g && (
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">Net Weight</span>
              <span className="text-lg font-semibold text-slate-800 dark:text-white">
                {batchInfo.jar_weight_g}g
              </span>
            </div>
          )}

          {/* Bottled Date */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Bottled</span>
            <span className="font-medium text-slate-800 dark:text-white">
              {formatDate(batchInfo.batch_date)}
            </span>
          </div>

          {/* Best Before */}
          {batchInfo.best_before_date && (
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">Best Before</span>
              <span className="font-medium text-slate-800 dark:text-white">
                {formatDate(batchInfo.best_before_date)}
              </span>
            </div>
          )}

          {/* Batch Code (de-emphasized) */}
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500 dark:text-slate-400">Batch</span>
            <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
              {batchInfo.batch_code}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-amber-50 dark:bg-slate-900/50 px-6 py-4 border-t border-amber-100 dark:border-slate-700">
          <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Traced from hive to jar</span>
          </div>
        </div>
      </div>

      {/* Powered by */}
      <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-6">
        Powered by HiveCraic Traceability
      </p>
    </div>
  )
}
