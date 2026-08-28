'use client'

import { useId, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import Panel from '@/components/ui/Panel'
import { usePersistentState } from '@/hooks/usePersistentState'

interface CollapsibleSectionProps {
  title: string
  /**
   * Shown beneath the title while closed, so a section can report its state
   * without being opened — "Revolut connected", "3 of 4 on".
   */
  summary?: ReactNode
  /** Stable key for remembering open/closed, e.g. 'profile:selling'. */
  storageKey: string
  defaultOpen?: boolean
  /** Red framing, for destructive sections. */
  danger?: boolean
  children: ReactNode
}

/**
 * A titled section that collapses, remembering its state across navigation and
 * browser restarts.
 *
 * Children are unmounted while closed rather than hidden with CSS: it keeps the
 * DOM small on long settings pages, and stops collapsed form fields staying
 * reachable by keyboard.
 */
export default function CollapsibleSection({
  title,
  summary,
  storageKey,
  defaultOpen = false,
  danger = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = usePersistentState<boolean>(
    `profile:section:${storageKey}`,
    defaultOpen,
    (v) => typeof v === 'boolean',
  )
  const contentId = useId()

  return (
    <Panel
      padding="none"
      className={danger ? 'border border-red-300 dark:border-red-800' : ''}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        // Only while open: the content is unmounted when closed, and
        // aria-controls must reference an element that actually exists.
        aria-controls={open ? contentId : undefined}
        className={`flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-surface-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-600 ${
          open ? 'rounded-t-xl' : 'rounded-xl'
        }`}
      >
        <span className="min-w-0">
          <span
            className={`block text-xl font-semibold ${
              danger ? 'text-red-900 dark:text-red-100' : 'text-foreground'
            }`}
          >
            {title}
          </span>
          {/* text-secondary, not tertiary: this reports real state ("Revolut
              connected", "Active") and is what people scan for, so it must not
              sit at the weakest contrast on the row. */}
          {!open && summary && (
            <span className="mt-1 block text-sm text-text-secondary">{summary}</span>
          )}
        </span>
        <ChevronDown
          size={22}
          className={`flex-shrink-0 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={contentId} className="px-6 pb-6">
          {children}
        </div>
      )}
    </Panel>
  )
}
