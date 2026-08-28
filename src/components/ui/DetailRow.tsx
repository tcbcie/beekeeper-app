import type { ReactNode } from 'react'

interface DetailRowProps {
  label: string
  /** Rendered as "Not set" when null/undefined/empty. */
  value?: ReactNode
  /** Monospace the value — breeder codes and the like. */
  mono?: boolean
}

/**
 * One read-only label/value pair in a details list.
 *
 * Divider-separated rather than boxed: eight short values do not need eight
 * bordered cards, and on a phone that framing cost more vertical space than the
 * values themselves. Label above value on phones; from `sm:` the pair shares a
 * line as two left-aligned grid columns.
 */
export default function DetailRow({ label, value, mono = false }: DetailRowProps) {
  const isEmpty = value === null || value === undefined || value === ''

  return (
    <div className="flex flex-col gap-0.5 border-t border-border py-3 first:border-t-0 sm:grid sm:grid-cols-[minmax(0,10rem)_1fr] sm:items-baseline sm:gap-4">
      <dt className="text-sm font-medium text-text-secondary">{label}</dt>
      <dd
        // break-words, not truncate: a producer address or a long association
        // name must stay readable, and an unbroken string would otherwise push
        // past the panel and widen the whole column. Left-aligned in its own
        // grid column rather than right-aligned against the label — a wrapped
        // value that is ragged down its left edge is markedly harder to read.
        className={`min-w-0 break-words text-base text-foreground ${
          mono && !isEmpty ? 'font-mono' : ''
        }`}
      >
        {isEmpty ? <span className="italic text-text-tertiary">Not set</span> : value}
      </dd>
    </div>
  )
}
