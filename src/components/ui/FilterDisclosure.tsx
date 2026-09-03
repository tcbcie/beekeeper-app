'use client'

import { useId, type ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import Button from '@/components/ui/Button'
import { usePersistentState } from '@/hooks/usePersistentState'

interface FilterDisclosureProps {
  /**
   * How many controls inside differ from their default. Shown as a badge while
   * closed, so the panel can report that it is doing something without being
   * opened — otherwise a hidden filter silently explains a short list.
   */
  activeCount: number
  /** Stable key for remembering open/closed, e.g. 'hives:filtersOpen'. */
  storageKey: string
  /** Offered only while something is active. */
  onClear?: () => void
  children: ReactNode
}

/**
 * Secondary list filters, collapsed behind one control.
 *
 * Deliberately separate from CollapsibleSection, which is a titled section for
 * settings pages: an h2 at text-xl inside a Panel. On a list screen that would
 * make "Filters" visually louder than the page heading, and adding a size
 * variant to CollapsibleSection would put every settings page at risk for the
 * sake of one new caller.
 *
 * What is copied deliberately is its behaviour, which is the considered part:
 * children are unmounted rather than CSS-hidden, so collapsed selects leave the
 * tab order; aria-controls is set only while open, because it must reference an
 * element that exists; and the open state persists like the filters it holds.
 */
export default function FilterDisclosure({
  activeCount,
  storageKey,
  onClear,
  children,
}: FilterDisclosureProps) {
  const [open, setOpen] = usePersistentState<boolean>(
    storageKey,
    false,
    (v) => typeof v === 'boolean',
  )
  const contentId = useId()

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <Button
          unstyled
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={open ? contentId : undefined}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 dark:bg-surface-elevated"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span>Filters</span>
          {activeCount > 0 && (
            // Counted in the accessible name too: a badge that only renders a
            // numeral tells a screen-reader user nothing about what it counts.
            <span
              className="fj-badge fj-badge-blue"
              aria-label={`${activeCount} ${activeCount === 1 ? 'filter' : 'filters'} active`}
            >
              {activeCount}
            </span>
          )}
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </Button>

        {activeCount > 0 && onClear && (
          <Button
            unstyled
            onClick={onClear}
            className="min-h-[48px] rounded-lg px-3 py-2 text-sm font-medium text-text-secondary underline underline-offset-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
          >
            Clear filters
          </Button>
        )}
      </div>

      {open && (
        <div id={contentId} className="mt-3">
          {children}
        </div>
      )}
    </div>
  )
}
