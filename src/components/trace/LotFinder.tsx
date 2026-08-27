import Link from 'next/link'
import { SearchX } from 'lucide-react'
import type { PublicLabelLot } from '@/types/traceability'

interface LotFinderProps {
  /** The jar label code, e.g. HJ-A3K9M2. */
  code: string
  lots: PublicLabelLot[]
  /** The lot the visitor asked for, if any. */
  requestedLot: string | null
  lotFound: boolean
  /** Whether a batch is currently on screen above this panel. */
  hasBatch: boolean
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Lets a visitor reach the batch that is actually in their jar.
 *
 * A printed jar label is reused across many bottling runs, so scanning it shows
 * the run currently being bottled — right for a jar bought this week, wrong for
 * one bought months ago. The lot code is printed on every jar (it has to be), so
 * this panel is the way back to the truth.
 *
 * Deliberately a plain GET form: it works with JavaScript disabled, and the
 * result is a shareable URL.
 */
export default function LotFinder({ code, lots, requestedLot, lotFound, hasBatch }: LotFinderProps) {
  const notFound = requestedLot !== null && !lotFound

  return (
    <section className="bg-surface-elevated rounded-2xl border border-border p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground mb-2">
        {hasBatch ? 'Is this the honey in your jar?' : 'Which lot is in your jar?'}
      </h2>
      <p className="text-text-secondary mb-4">
        {hasBatch
          ? 'This label is used across several bottling runs. If you bought your jar a while ago, it may hold an earlier one — check the lot code printed on the jar.'
          : 'Enter the lot code printed on your jar to see exactly where that honey came from.'}
      </p>

      {notFound && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-4">
          <SearchX className="w-5 h-5 flex-shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
          <p className="text-amber-800 dark:text-amber-300">
            We could not find lot <span className="font-mono font-semibold">{requestedLot}</span>.
            Check the code on your jar, or pick one from the list below.
          </p>
        </div>
      )}

      <form action={`/j/${code}`} method="get" className="mb-5">
        <label htmlFor="lot" className="block font-medium text-text-secondary mb-2">
          Lot code from your jar
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="lot"
            name="lot"
            type="text"
            defaultValue={requestedLot ?? ''}
            placeholder="L-2026-08-001"
            autoComplete="off"
            spellCheck={false}
            className="fj-control flex-1 font-mono"
          />
          <button
            type="submit"
            className="fj-btn bg-amber-600 text-white hover:bg-amber-700 sm:w-auto"
          >
            Find my lot
          </button>
        </div>
      </form>

      {lots.length > 0 && (
        <div>
          <h3 className="font-medium text-text-secondary mb-2">Or choose a bottling run</h3>
          <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {lots.map(lot => {
              const isCurrent = requestedLot !== null
                && lot.batch_code.toUpperCase() === requestedLot.toUpperCase()
              return (
                <li key={lot.batch_code}>
                  <Link
                    href={`/j/${code}?lot=${encodeURIComponent(lot.batch_code)}`}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-secondary ${
                      isCurrent ? 'bg-amber-50 dark:bg-amber-900/20' : ''
                    }`}
                  >
                    <span className="font-mono font-semibold text-foreground">{lot.batch_code}</span>
                    <span className="text-text-secondary">
                      Bottled {formatDate(lot.batch_date)}
                      {lot.best_before_date && ` · best before ${formatDate(lot.best_before_date)}`}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
