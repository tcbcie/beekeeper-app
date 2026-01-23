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
  origins: {
    apiary_name: string
    city: string | null
    percentage: number
  }[]
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 mb-4">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
          Honey Traceability
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Traced from hive to jar
        </p>
      </div>

      {/* Batch Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-amber-100 dark:border-slate-700 overflow-hidden">
        {/* Batch Code Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4">
          <p className="text-amber-100 text-sm font-medium mb-1">Batch Code</p>
          <p className="text-white text-2xl font-mono font-bold tracking-wider">
            {batchInfo.batch_code}
          </p>
        </div>

        {/* Details */}
        <div className="p-6 space-y-6">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Bottled
              </p>
              <p className="text-lg font-semibold text-slate-800 dark:text-white">
                {formatDate(batchInfo.batch_date)}
              </p>
            </div>
            {batchInfo.best_before_date && (
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  Best Before
                </p>
                <p className="text-lg font-semibold text-slate-800 dark:text-white">
                  {formatDate(batchInfo.best_before_date)}
                </p>
              </div>
            )}
          </div>

          {/* Jar Size */}
          {batchInfo.jar_size_ml && (
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Jar Size
              </p>
              <p className="text-lg font-semibold text-slate-800 dark:text-white">
                {batchInfo.jar_size_ml}ml
              </p>
            </div>
          )}

          {/* Origins */}
          {batchInfo.origins && batchInfo.origins.length > 0 && (
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Origin
              </p>
              <div className="space-y-3">
                {batchInfo.origins.map((origin, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-amber-50 dark:bg-slate-700/50 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">
                          {origin.apiary_name}
                        </p>
                        {origin.city && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {origin.city}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {origin.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-100 dark:border-slate-700">
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            This honey has been traced through our complete supply chain, from the hive where it was collected to the jar in your hands.
          </p>
        </div>
      </div>

      {/* Powered by */}
      <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-8">
        Powered by HiveCraic Traceability
      </p>
    </div>
  )
}
