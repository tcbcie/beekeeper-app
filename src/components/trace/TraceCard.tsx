import Image from 'next/image'
import { Package } from 'lucide-react'
import ApiaryAreaMapWrapper from '@/components/maps/ApiaryAreaMapWrapper'
import type { PublicBatchInfo } from '@/types/traceability'

/**
 * Which sections a scan shows. Batch QR codes (/trace) show everything; jar
 * labels (/j) let the producer decide per printed design, so the same card
 * serves both routes rather than the two drifting apart.
 */
export interface TraceDisplayOptions {
  /** Jar labels print the net weight beside the QR, so they suppress this row. */
  showNetWeight: boolean
  showStory: boolean
  showOriginMap: boolean
  showApiaryImage: boolean
  /** Mention what the bees foraged on — only affects the auto-built story. */
  showFloral: boolean
  /** Bottled date, best before, lot code. */
  showLotDetails: boolean
}

export const ALL_TRACE_DISPLAY: TraceDisplayOptions = {
  showNetWeight: true,
  showStory: true,
  showOriginMap: true,
  showApiaryImage: true,
  showFloral: true,
  showLotDetails: true,
}

interface TraceCardProps {
  batch: PublicBatchInfo
  display?: Partial<TraceDisplayOptions>
  /**
   * Copy from the jar label, which wins over the batch's own when set.
   *
   * A printed label is a product — its name is on the jar in ink, so the page
   * must not contradict it. Leaving one blank falls through to the batch's own
   * wording, which is how a per-harvest story still gets told. Batch QR codes
   * pass none of these, so they resolve exactly as they always did.
   */
  overrideTitle?: string | null
  overrideOrigin?: string | null
  overrideStory?: string | null
  /** Deep-link to one jar size by net weight (grams). */
  selectedWeight?: number | null
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getPrimaryOrigin(origins: PublicBatchInfo['origins']): { city: string | null; country: string } {
  if (!origins || origins.length === 0) return { city: null, country: 'Ireland' }
  const primary = origins[0]
  return { city: primary.city, country: 'Ireland' }
}

function buildStoryText(batchInfo: PublicBatchInfo, includeFloral: boolean): string {
  const parts: string[] = []

  parts.push(`Harvested by ${batchInfo.beekeeper_name}`)

  if (batchInfo.origins && batchInfo.origins.length > 0) {
    const apiaryNames = batchInfo.origins.map((o) => o.apiary_name).slice(0, 2)
    if (apiaryNames.length === 1) parts.push(`from ${apiaryNames[0]}`)
    if (apiaryNames.length === 2) parts.push(`from ${apiaryNames[0]} and ${apiaryNames[1]}`)
  }

  if (includeFloral && batchInfo.floral_sources && batchInfo.floral_sources.length > 0) {
    const sources = batchInfo.floral_sources.slice(0, 3)
    if (sources.length === 1) {
      parts.push(`The bees foraged on ${sources[0].toLowerCase()}.`)
    } else {
      const last = sources.pop()
      parts.push(`The bees foraged on ${sources.map((s) => s.toLowerCase()).join(', ')} and ${last?.toLowerCase()}.`)
    }
  } else {
    parts[parts.length - 1] += '.'
  }

  return parts.join(' ')
}

/** FNV-1a — a small, stable string hash. Not cryptographic; only needs to be repeatable. */
function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function getMapOrigin(origins: PublicBatchInfo['origins']): { lat: number; lon: number; apiaryName: string } | null {
  if (!origins) return null
  const mapOrigin = origins.find((o) => o.show_map && o.latitude && o.longitude)
  if (!mapOrigin || !mapOrigin.latitude || !mapOrigin.longitude) return null

  // The offset is derived from the apiary rather than drawn at random per
  // request, so the pin sits in the same wrong place every time. A fresh random
  // offset on each load leaks the true position to anyone who loads the page
  // repeatedly and averages the results — and this page exists to be scanned
  // many times over. Same ±0.01° magnitude as before, just no longer sampleable.
  const seed = hashSeed(`${mapOrigin.apiary_name}:${mapOrigin.latitude}:${mapOrigin.longitude}`)
  const offset = (shift: number) => (((seed >>> shift) % 2001) / 1000 - 1) * 0.01

  return {
    lat: mapOrigin.latitude + offset(0),
    lon: mapOrigin.longitude + offset(11),
    apiaryName: mapOrigin.apiary_name,
  }
}

/**
 * The consumer-facing provenance card, shared by the per-batch trace page and
 * the jar-label page.
 */
export default function TraceCard({
  batch,
  display,
  overrideTitle,
  overrideOrigin,
  overrideStory,
  selectedWeight = null,
}: TraceCardProps) {
  const opts: TraceDisplayOptions = { ...ALL_TRACE_DISPLAY, ...display }

  const primaryOrigin = getPrimaryOrigin(batch.origins)
  const mapOrigin = opts.showOriginMap ? getMapOrigin(batch.origins) : null

  const displayTitle = overrideTitle || batch.public_title || 'Pure Irish Honey'
  const displayOrigin =
    overrideOrigin ||
    batch.public_origin ||
    (primaryOrigin.city
      ? `Harvested in ${primaryOrigin.city}, ${primaryOrigin.country}`
      : `Harvested in ${primaryOrigin.country}`)
  const storyText = overrideStory || batch.public_story || buildStoryText(batch, opts.showFloral)

  const jarsWithWeight = (batch.jars || []).filter(j => j.jar_weight_g != null)

  return (
    <div className="bg-surface-elevated rounded-2xl shadow-xl border border-amber-100 dark:border-amber-900/40 overflow-hidden">
      <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 px-6 py-8 text-center">
        <Package className="w-10 h-10 mx-auto mb-3 text-white" />
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{displayTitle}</h1>
        <p className="text-amber-100 text-lg">{displayOrigin}</p>
      </div>

      {mapOrigin && <ApiaryAreaMapWrapper lat={mapOrigin.lat} lon={mapOrigin.lon} />}

      {opts.showApiaryImage && batch.apiary_image_url && (
        <div className="px-6 pt-6">
          <div className="relative w-full h-48 sm:h-64">
            <Image
              src={batch.apiary_image_url}
              alt="Apiary"
              fill
              className="object-cover rounded-xl border border-border"
              unoptimized
            />
          </div>
        </div>
      )}

      {opts.showStory && (
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground mb-3">The Story of this Jar</h2>
          <p className="text-text-secondary leading-relaxed">{storyText}</p>
        </div>
      )}

      <div className="p-6 space-y-4">
        {opts.showNetWeight && (() => {
          // Deep-linked to one jar size: show only that net weight as the hero,
          // so a consumer holding that jar sees an unambiguous figure.
          if (selectedWeight != null) {
            const match = jarsWithWeight.find(j => j.jar_weight_g === selectedWeight)
            if (match) {
              return (
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-text-secondary">Net Weight</span>
                  <span className="text-lg font-semibold text-foreground">{match.jar_weight_g}g</span>
                </div>
              )
            }
          }

          if (jarsWithWeight.length > 0) {
            return (
              <div className="flex items-start justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Net Weight</span>
                <div className="text-right">
                  {jarsWithWeight.map((jar, i) => (
                    <div key={i} className="text-lg font-semibold text-foreground">
                      {jar.jar_weight_g}g
                      {jar.jar_count != null && (
                        <span className="text-sm font-normal text-text-secondary"> (×{jar.jar_count})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          if (batch.jar_weight_g) {
            return (
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Net Weight</span>
                <span className="text-lg font-semibold text-foreground">{batch.jar_weight_g}g</span>
              </div>
            )
          }
          return null
        })()}

        {opts.showLotDetails && (
          <>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-text-secondary">Bottled</span>
              <span className="font-medium text-foreground">{formatDate(batch.batch_date)}</span>
            </div>

            {batch.best_before_date && (
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-text-secondary">Best Before</span>
                <span className="font-medium text-foreground">{formatDate(batch.best_before_date)}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-2">
              <span className="text-text-secondary">Batch</span>
              <span className="font-mono text-sm text-text-secondary">{batch.batch_code}</span>
            </div>
          </>
        )}
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 px-6 py-4 border-t border-amber-100 dark:border-amber-900/40">
        <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Traced from hive to jar</span>
        </div>
      </div>
    </div>
  )
}
