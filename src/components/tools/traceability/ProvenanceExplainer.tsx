'use client'

import { useId } from 'react'
import { ArrowRight, ChevronDown, HelpCircle, Milk, Package, Tag, type LucideIcon } from 'lucide-react'
import { usePersistentState } from '@/hooks/usePersistentState'

export type ProvenanceTab = 'containers' | 'batches' | 'labels'

interface ProvenanceExplainerProps {
  activeTab: ProvenanceTab
}

const STEPS: {
  tab: ProvenanceTab
  icon: LucideIcon
  title: string
  what: string
  when: string
}[] = [
  {
    tab: 'containers',
    icon: Package,
    title: 'Bulk Honey',
    what:
      'The bucket, tank or drum your extracted honey sits in. Tick off the harvests that filled it and the apiary origin follows on by itself.',
    when: 'One entry per bucket, on extraction day',
  },
  {
    tab: 'batches',
    icon: Milk,
    title: 'Batches',
    what:
      'One bottling run — honey drawn out of one or more buckets and put into jars. This is what carries your EU lot code and best-before date.',
    when: 'One entry per bottling run',
  },
  {
    tab: 'labels',
    icon: Tag,
    title: 'Jar Labels',
    what:
      'The printed label design itself, one per jar size. Its QR code never changes, so you can order labels in bulk once and simply re-point the design at your newest batch each time you bottle. A design can also carry a payment link, so someone who has taken a jar from an honesty box can pay by scanning it.',
    when: 'One entry per label design, then reused for good',
  },
]

const CHAIN = ['Harvest', 'Bulk Honey', 'Batch', 'Jar Label']

/**
 * Teaches the Bulk Honey → Batch → Jar Label chain, which none of the three
 * tab names explains on its own. Open on a first visit so a newcomer reads it,
 * and shut for good once they close it.
 */
export default function ProvenanceExplainer({ activeTab }: ProvenanceExplainerProps) {
  const [open, setOpen] = usePersistentState<boolean>(
    'traceability:explainer',
    true,
    (v) => typeof v === 'boolean',
  )
  const contentId = useId()

  return (
    <div className="fj-panel-amber overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        // Only while open: the body is unmounted when closed, and aria-controls
        // must point at an element that actually exists.
        aria-controls={open ? contentId : undefined}
        // active: as well as hover: — a phone is the primary device here and
        // gives no hover state, so without it a tap looks like nothing happened.
        className="flex w-full items-center gap-3 px-4 py-3 text-left min-h-[3rem] transition-colors hover:bg-amber-500/10 active:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-600"
      >
        <HelpCircle size={20} className="flex-shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-base font-semibold text-foreground">
          New here? How the three tabs fit together
        </span>
        <ChevronDown
          size={22}
          className={`flex-shrink-0 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={contentId} className="space-y-4 border-t border-amber-500/25 px-4 py-4">
          {/* The chain, in one glance. Wraps rather than scrolls on a phone. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {CHAIN.map((label, i) => (
              <span key={label} className="flex items-center gap-2">
                {i > 0 && (
                  <>
                    {/* The arrow is decorative, so a screen reader would
                        otherwise run the four names together as one phrase. */}
                    <span className="sr-only">then</span>
                    <ArrowRight size={16} className="text-amber-700/70 dark:text-amber-400/70" aria-hidden="true" />
                  </>
                )}
                <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">{label}</span>
              </span>
            ))}
          </div>

          <ol className="space-y-3">
            {STEPS.map((step) => {
              const Icon = step.icon
              const isActive = step.tab === activeTab
              return (
                <li
                  key={step.tab}
                  className={`rounded-lg border p-3 ${
                    isActive
                      ? 'border-amber-500 bg-surface-elevated'
                      : 'border-border bg-surface-elevated/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={18} className="flex-shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                    <span className="text-base font-semibold text-foreground">{step.title}</span>
                    {isActive && (
                      <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white">
                        You are here
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{step.what}</p>
                  <p className="mt-1 text-xs text-text-secondary">{step.when}</p>
                </li>
              )
            })}
          </ol>

          <p className="text-sm text-text-secondary">
            A customer scans the QR code on a jar and types in the lot code printed beside it. That
            is what tells them which batch their honey came from, and which apiaries it was gathered
            in.
          </p>
        </div>
      )}
    </div>
  )
}
