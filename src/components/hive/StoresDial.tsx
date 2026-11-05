'use client'

import { formatStoresDate, STORES_BAND_TEXT_CLASSES, storesBand, storesWord } from '@/lib/stores-level'

interface StoresDialProps {
  /** Stores level, 0-100, or null when there is no reading for this winter. */
  level: number | null
  /** Date of the reading. */
  date?: string | null
}

// Half-circle dial for the hive card: the arcs end at the 40 and 80 band boundaries. The % and a
// word sit beside it, so it never relies on colour alone. Purely presentational.
export default function StoresDial({ level, date }: StoresDialProps) {
  if (level === null) {
    return (
      <div className="flex items-center gap-2">
        <svg width="72" height="44" viewBox="0 0 100 60" className="shrink-0" aria-hidden="true">
          <path d="M10 50 A40 40 0 0 1 90 50" fill="none" strokeWidth="10" className="stroke-text-tertiary opacity-40" />
        </svg>
        <span className="text-sm">
          <span className="block font-semibold text-text-secondary">Stores not checked</span>
          <span className="block text-text-tertiary">No reading since 1 August</span>
        </span>
      </div>
    )
  }

  const clamped = Math.min(100, Math.max(0, level))
  const word = storesWord(clamped)
  const angle = Math.PI * (1 - clamped / 100)
  const needleX = (50 + 30 * Math.cos(angle)).toFixed(2)
  const needleY = (50 - 30 * Math.sin(angle)).toFixed(2)
  // A beekeeper's estimate on the day of the inspection, not a live reading
  const estimated = formatStoresDate(date)
  const estimatedText = estimated ? `Estimated ${estimated}` : 'Estimated at inspection'

  return (
    <div className="flex items-center gap-2">
      <svg
        width="72"
        height="44"
        viewBox="0 0 100 60"
        className="shrink-0"
        role="img"
        aria-label={`Stores ${clamped} percent, ${word}. ${estimatedText}`}
      >
        <path d="M10 50 A40 40 0 0 1 37.64 11.96" fill="none" strokeWidth="10" className="stroke-red-600 dark:stroke-red-500" />
        <path d="M37.64 11.96 A40 40 0 0 1 82.36 26.49" fill="none" strokeWidth="10" className="stroke-amber-600 dark:stroke-amber-500" />
        <path d="M82.36 26.49 A40 40 0 0 1 90 50" fill="none" strokeWidth="10" className="stroke-green-600 dark:stroke-green-500" />
        <line x1="50" y1="50" x2={needleX} y2={needleY} strokeWidth="4" strokeLinecap="round" className="stroke-text-primary" />
        <circle cx="50" cy="50" r="5" className="fill-text-primary" />
      </svg>
      <span className="text-sm">
        <span className={`block font-bold tabular-nums ${STORES_BAND_TEXT_CLASSES[storesBand(clamped)]}`}>
          {clamped}% &middot; {word}
        </span>
        <span className="block text-text-tertiary">Stores · {estimatedText}</span>
      </span>
    </div>
  )
}
