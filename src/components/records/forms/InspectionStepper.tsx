'use client'

import { Check } from 'lucide-react'

/**
 * Presentational chrome for the stepped inspection flow.
 *
 * Deliberately holds no form state. Every field, effect and handler stays in
 * InspectionForm, because hive selection alone drives six effects that write
 * into other steps' fields; moving state down here would break them.
 */

export interface InspectionStep {
  id: number
  title: string
  /** Shown to the user, so a common inspection can be finished without these. */
  optional?: boolean
}

export const INSPECTION_STEPS: InspectionStep[] = [
  { id: 1, title: 'Hive and visit' },
  { id: 2, title: 'Queen and colony' },
  { id: 3, title: 'Health and behaviour', optional: true },
  { id: 4, title: 'Notes and follow-up', optional: true },
  { id: 5, title: 'Review and save' },
]

interface InspectionStepperProps {
  steps: InspectionStep[]
  current: number
  /** Jump straight to a step. Used by the review summary's edit links. */
  onSelect: (step: number) => void
  /** Steps the user has already moved past, shown as complete. */
  furthest: number
}

export default function InspectionStepper({
  steps,
  current,
  onSelect,
  furthest,
}: InspectionStepperProps) {
  const active = steps.find(step => step.id === current)

  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h4 className="text-base font-semibold text-foreground">
          {active?.title}
          {active?.optional && (
            <span className="ml-2 text-sm font-normal text-text-muted">(optional)</span>
          )}
        </h4>
        <p className="text-sm text-text-secondary whitespace-nowrap">
          Step {current} of {steps.length}
        </p>
      </div>

      {/* Each step is a button so the flow can be navigated directly, not only
          with Previous and Next. aria-current marks the active one for screen
          readers, matching the navigation elsewhere in the app. */}
      <ol className="flex items-stretch gap-1" aria-label="Inspection progress">
        {steps.map(step => {
          const isActive = step.id === current
          // current is never beyond furthest, so this single test is sufficient.
          const isComplete = step.id < furthest
          const reachable = step.id <= furthest

          return (
            <li key={step.id} className="flex-1">
              <button
                type="button"
                onClick={() => reachable && onSelect(step.id)}
                disabled={!reachable}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${step.id}: ${step.title}${step.optional ? ' (optional)' : ''}`}
                className={`flex min-h-[44px] w-full flex-col items-center justify-center gap-1 rounded-md border px-1 py-2 text-sm transition-colors touch-manipulation disabled:cursor-not-allowed ${
                  isActive
                    ? 'border-forest-800 bg-forest-800 text-white'
                    : isComplete
                      ? 'border-border bg-surface-secondary text-text-primary'
                      : 'border-border bg-surface text-text-muted'
                }`}
              >
                <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center">
                  {isComplete && !isActive ? <Check size={16} /> : step.id}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
