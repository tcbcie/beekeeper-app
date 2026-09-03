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
  /**
   * One word, because five labels have to share the 256px a 320px phone leaves
   * once the page and panel padding is taken. The full title stays in the
   * button's accessible name, so nothing is lost to assistive technology.
   */
  shortTitle: string
  /**
   * What the step collects. Shown for the active step so a beekeeper can judge
   * a step's worth before working through it, rather than discovering its
   * contents by walking into it. Worded from the review summary's groups; the
   * two are kept aligned by hand, so a field moved between steps must be
   * reflected here.
   */
  contents: string
  /** Named in the note below the stepper, so it is visible from step one. */
  optional?: boolean
}

export const INSPECTION_STEPS: InspectionStep[] = [
  {
    id: 1,
    title: 'Hive and visit',
    shortTitle: 'Hive',
    contents: 'Hive, apiary, date, time and weight.',
  },
  {
    id: 2,
    title: 'Queen and colony',
    shortTitle: 'Queen',
    contents:
      'Queen sighting, eggs, brood frames, colony strength, queen cells and super fullness.',
  },
  {
    id: 3,
    title: 'Health and behaviour',
    shortTitle: 'Health',
    contents:
      'Temperament, brood pattern, swarming, drones, propolis, disease indicators and hygienic traits.',
    optional: true,
  },
  {
    id: 4,
    title: 'Notes and follow-up',
    shortTitle: 'Notes',
    contents: 'Frames given or taken, notes, a photograph and follow-up tasks.',
    optional: true,
  },
  {
    id: 5,
    title: 'Review and save',
    shortTitle: 'Review',
    contents: 'Everything recorded on this visit, before it is saved.',
  },
]

/**
 * States which steps can be skipped, in plain words and derived from the steps
 * themselves so it cannot fall out of step with them.
 *
 * A per-button marker was tried first and abandoned on measurement: "optional"
 * needs about 52px at the 14px floor, and a fifth of a 320px phone is 45px, so
 * it would have clipped mid-word on the narrowest devices. One full-width
 * sentence reads better at every size.
 */
function describeOptionalSteps(steps: InspectionStep[]): string | null {
  const ids = steps.filter(step => step.optional).map(step => step.id)
  if (ids.length === 0) return null
  if (ids.length === 1) return `Step ${ids[0]} is optional, and can be skipped.`
  const list = `${ids.slice(0, -1).join(', ')} and ${ids[ids.length - 1]}`
  return `Steps ${list} are optional, and can be skipped.`
}

interface InspectionStepperProps {
  steps: InspectionStep[]
  current: number
  /** Jump straight to a step. Used by the review summary's edit links. */
  onSelect: (step: number) => void
  /**
   * Steps the user has actually opened, shown with a tick. Membership rather
   * than a high-water mark, because a jump forward must not claim the steps it
   * passed over were completed.
   */
  visited: Set<number>
  /**
   * Whether steps ahead of `furthest` can be reached directly. True once the
   * only required fields in the flow — hive, date and time on step one — are
   * filled, since no later step requires anything at all.
   */
  canJumpAhead: boolean
}

export default function InspectionStepper({
  steps,
  current,
  onSelect,
  visited,
  canJumpAhead,
}: InspectionStepperProps) {
  const active = steps.find(step => step.id === current)
  const optionalNote = describeOptionalSteps(steps)

  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-1">
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

      {active?.contents && (
        <p className="mb-2 text-sm text-text-secondary">{active.contents}</p>
      )}

      {/* Each step is a button so the flow can be navigated directly, not only
          with Previous and Next. aria-current marks the active one for screen
          readers, matching the navigation elsewhere in the app. */}
      <ol className="flex items-stretch gap-0.5 sm:gap-1" aria-label="Inspection progress">
        {steps.map(step => {
          const isActive = step.id === current
          const isComplete = visited.has(step.id) && !isActive
          const reachable = visited.has(step.id) || canJumpAhead

          return (
            // min-w-0 keeps the five columns equal: without it a long label
            // widens its own column and the row stops being a progress bar.
            <li key={step.id} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => reachable && onSelect(step.id)}
                disabled={!reachable}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${step.id}: ${step.title}${
                  step.optional ? ' (optional)' : ''
                }${isComplete ? ', already visited' : ''}`}
                // Muting is tied to reachability, not to whether the step has
                // been opened. The two used to coincide; now that a step ahead
                // can be tapped, dressing it as greyed-out would tell this
                // audience the control is dead when it works.
                className={`flex h-full min-h-[44px] w-full flex-col items-center justify-center gap-1 rounded-md border px-0.5 py-2 sm:px-1 transition-colors touch-manipulation disabled:cursor-not-allowed ${
                  isActive
                    ? 'border-forest-800 bg-forest-800 text-white'
                    : isComplete
                      ? 'border-border bg-surface-secondary text-text-primary'
                      : reachable
                        ? 'border-border bg-surface text-text-primary'
                        : 'border-border bg-surface text-text-muted'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-5 w-5 items-center justify-center text-sm"
                >
                  {isComplete ? <Check size={16} /> : step.id}
                </span>
                {/* break-words so a label that outgrows its fifth of the row
                    wraps inside the button instead of painting over the one
                    beside it. At 320px "Review" clears the space by about 2px,
                    which a wider system font or a text-only enlargement would
                    swallow. */}
                <span
                  aria-hidden="true"
                  className="text-sm font-medium leading-tight break-words"
                >
                  {step.shortTitle}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {optionalNote && <p className="mt-2 text-sm text-text-secondary">{optionalNote}</p>}
    </div>
  )
}
