'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { AlertTriangle, Bug, Calendar, Clock3, Egg } from 'lucide-react'

import Button from '@/components/ui/Button'

type PlannerSourceMode = 'graft' | 'emergence'
type PlannerTone = 'blue' | 'violet' | 'emerald' | 'amber' | 'sky' | 'cyan' | 'teal'

interface TimelineMilestone {
  id: string
  label: string
  startDate: string
  endDate?: string
  offsetLabel: string
  note: string
  tone: PlannerTone
}

interface PlannerTimeline {
  graftDate: string
  emergenceDate: string
  queenMatingStart: string
  queenMatingEnd: string
  queenLayingStart: string
  queenLayingEnd: string
  droneBroodStart: string
  droneEmergence: string
  droneReadyStart: string
  droneReadyEnd: string
  queenMilestones: TimelineMilestone[]
  droneMilestones: TimelineMilestone[]
}

interface SummaryDateParts {
  calendarDate: string
  weekday: string
}

const TIMELINE_OFFSETS = {
  emergenceFromGraft: 12,
  matingStartFromEmergence: 5,
  matingEndFromEmergence: 8,
  layingStartFromEmergence: 10,
  layingEndFromEmergence: 14,
  droneBroodLeadFromMatingStart: 36,
  droneEmergenceFromBroodStart: 24,
  droneReadyStartFromEmergence: 10,
  droneReadyEndFromEmergence: 12,
} as const

const plannerShellClass = 'relative overflow-hidden rounded-[32px] border border-border bg-surface-elevated shadow-[0_28px_60px_-36px_rgba(15,23,42,0.55)]'
const plannerPanelClass = 'rounded-[28px] border border-border bg-surface/90 p-4 shadow-sm sm:p-5'
const plannerSummaryCardClass = 'rounded-2xl border border-border bg-surface-secondary/80 p-4 shadow-sm'
const snapshotInsetSurfaceClass = 'rounded-xl border border-border bg-surface px-3 py-3 shadow-sm'
const snapshotInsetBadgeBaseClass = 'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]'

const PLANNER_TONES: Record<PlannerTone, { accentBorderClass: string; badgeClass: string; markerClass: string }> = {
  blue: {
    accentBorderClass: 'border-l-[3px] border-l-blue-500/70',
    badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    markerClass: 'bg-blue-500',
  },
  violet: {
    accentBorderClass: 'border-l-[3px] border-l-violet-500/70',
    badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    markerClass: 'bg-violet-500',
  },
  emerald: {
    accentBorderClass: 'border-l-[3px] border-l-emerald-500/70',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    markerClass: 'bg-emerald-500',
  },
  amber: {
    accentBorderClass: 'border-l-[3px] border-l-amber-500/70',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    markerClass: 'bg-amber-500',
  },
  sky: {
    accentBorderClass: 'border-l-[3px] border-l-sky-500/70',
    badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    markerClass: 'bg-sky-500',
  },
  cyan: {
    accentBorderClass: 'border-l-[3px] border-l-cyan-500/70',
    badgeClass: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    markerClass: 'bg-cyan-500',
  },
  teal: {
    accentBorderClass: 'border-l-[3px] border-l-teal-500/70',
    badgeClass: 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300',
    markerClass: 'bg-teal-500',
  },
}

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseLocalDate = (dateString: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null

  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  date.setHours(0, 0, 0, 0)
  return date
}

const addDaysToDate = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  result.setHours(0, 0, 0, 0)
  return result
}

const addDays = (dateString: string, days: number): string => {
  const parsed = parseLocalDate(dateString)
  if (!parsed) return ''
  return toLocalDateString(addDaysToDate(parsed, days))
}

const formatDateIrish = (dateString: string): string => {
  const parsed = parseLocalDate(dateString)
  if (!parsed) return '-'
  const day = parsed.getDate().toString().padStart(2, '0')
  const month = (parsed.getMonth() + 1).toString().padStart(2, '0')
  const year = parsed.getFullYear()
  return `${day}/${month}/${year}`
}

const getDayName = (dateString: string): string => {
  const parsed = parseLocalDate(dateString)
  if (!parsed) return ''
  return parsed.toLocaleDateString('en-GB', { weekday: 'short' })
}

const formatSingleDate = (dateString: string): string => {
  return `${formatDateIrish(dateString)} | ${getDayName(dateString)}`
}

const formatRange = (startDate: string, endDate: string): string => {
  return `${formatDateIrish(startDate)} | ${getDayName(startDate)} to ${formatDateIrish(endDate)} | ${getDayName(endDate)}`
}

const getSummaryDateParts = (dateString: string): SummaryDateParts => ({
  calendarDate: formatDateIrish(dateString),
  weekday: getDayName(dateString),
})

const getWeekendSummary = (startDate: string, endDate?: string): string | null => {
  const start = parseLocalDate(startDate)
  const finish = parseLocalDate(endDate || startDate)

  if (!start || !finish || finish < start) return null

  const weekendDays = new Set<string>()
  const cursor = new Date(start)

  while (cursor <= finish) {
    const day = cursor.getDay()
    if (day === 0 || day === 6) {
      weekendDays.add(cursor.toLocaleDateString('en-GB', { weekday: 'short' }))
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  if (weekendDays.size === 0) return null
  return `Includes ${Array.from(weekendDays).join(' and ')}`
}

const buildPlannerTimeline = (sourceMode: PlannerSourceMode, sourceDate: string): PlannerTimeline | null => {
  const parsedSource = parseLocalDate(sourceDate)
  if (!parsedSource) return null

  const graftDate = sourceMode === 'graft'
    ? sourceDate
    : toLocalDateString(addDaysToDate(parsedSource, -TIMELINE_OFFSETS.emergenceFromGraft))

  const emergenceDate = sourceMode === 'graft'
    ? toLocalDateString(addDaysToDate(parsedSource, TIMELINE_OFFSETS.emergenceFromGraft))
    : sourceDate

  const queenMatingStart = addDays(emergenceDate, TIMELINE_OFFSETS.matingStartFromEmergence)
  const queenMatingEnd = addDays(emergenceDate, TIMELINE_OFFSETS.matingEndFromEmergence)
  const queenLayingStart = addDays(emergenceDate, TIMELINE_OFFSETS.layingStartFromEmergence)
  const queenLayingEnd = addDays(emergenceDate, TIMELINE_OFFSETS.layingEndFromEmergence)

  const droneBroodStart = addDays(queenMatingStart, -TIMELINE_OFFSETS.droneBroodLeadFromMatingStart)
  const droneEmergence = addDays(droneBroodStart, TIMELINE_OFFSETS.droneEmergenceFromBroodStart)
  const droneReadyStart = addDays(droneEmergence, TIMELINE_OFFSETS.droneReadyStartFromEmergence)
  const droneReadyEnd = addDays(droneEmergence, TIMELINE_OFFSETS.droneReadyEndFromEmergence)

  const queenMilestones: TimelineMilestone[] = [
    {
      id: 'graft',
      label: sourceMode === 'graft' ? 'Chosen graft date' : 'Calculated graft date',
      startDate: graftDate,
      offsetLabel: sourceMode === 'graft' ? 'Selected date' : 'Emergence - 12 days',
      note: sourceMode === 'graft'
        ? 'This is the date you are planning from directly.'
        : 'This graft date is calculated from the target virgin emergence day.',
      tone: 'blue',
    },
    {
      id: 'emergence',
      label: sourceMode === 'emergence' ? 'Chosen virgin emergence day' : 'Virgin queen emerges',
      startDate: emergenceDate,
      offsetLabel: sourceMode === 'emergence' ? 'Selected date' : 'Graft + 12 days',
      note: sourceMode === 'emergence'
        ? 'This is the emergence day you are targeting directly.'
        : 'Matches the current batch timeline used elsewhere on the Queen Rearing page.',
      tone: 'violet',
    },
    {
      id: 'mating',
      label: 'Likely mating-flight window',
      startDate: queenMatingStart,
      endDate: queenMatingEnd,
      offsetLabel: 'Emergence + 5 to 8 days',
      note: 'Assumes the virgin queen matures for several days before flights. Weather can still push mating later than this window.',
      tone: 'emerald',
    },
    {
      id: 'laying',
      label: 'Likely laying window',
      startDate: queenLayingStart,
      endDate: queenLayingEnd,
      offsetLabel: 'Emergence + 10 to 14 days',
      note: 'Shows a practical planning range for the first eggs after successful mating and settling.',
      tone: 'amber',
    },
  ]

  const droneMilestones: TimelineMilestone[] = [
    {
      id: 'drone-start',
      label: 'Start raising drones by',
      startDate: droneBroodStart,
      offsetLabel: '36 days before first likely mating flight',
      note: 'Aim to have drone brood underway by this date so mature drones are available when the first virgins are ready.',
      tone: 'sky',
    },
    {
      id: 'drone-emergence',
      label: 'Drone emergence',
      startDate: droneEmergence,
      offsetLabel: 'Drone brood start + 24 days',
      note: 'This is when that drone cohort should begin emerging from capped drone brood.',
      tone: 'cyan',
    },
    {
      id: 'drone-ready',
      label: 'Drones ready to mate',
      startDate: droneReadyStart,
      endDate: droneReadyEnd,
      offsetLabel: 'Drone emergence + 10 to 12 days',
      note: 'This readiness window is set to land around the start of the likely queen mating flights.',
      tone: 'teal',
    },
  ]

  return {
    graftDate,
    emergenceDate,
    queenMatingStart,
    queenMatingEnd,
    queenLayingStart,
    queenLayingEnd,
    droneBroodStart,
    droneEmergence,
    droneReadyStart,
    droneReadyEnd,
    queenMilestones,
    droneMilestones,
  }
}

function SnapshotPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className={plannerPanelClass}>
      <div className="border-b border-border/80 pb-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">{eyebrow}</p>
          <h4 className="mt-2 text-lg font-semibold text-foreground">{title}</h4>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function SnapshotAnchorCard({
  title,
  label,
  dateString,
  tone,
}: {
  title: string
  label: string
  dateString: string
  tone: PlannerTone
}) {
  const { calendarDate, weekday } = getSummaryDateParts(dateString)
  const toneStyles = PLANNER_TONES[tone]

  return (
    <div className={`${plannerSummaryCardClass} ${toneStyles.accentBorderClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${toneStyles.markerClass}`} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{title}</p>
          </div>
          <p className="mt-2 text-sm text-text-secondary">{label}</p>
        </div>
        <span className={`${snapshotInsetBadgeBaseClass} ${toneStyles.badgeClass}`}>
          {weekday}
        </span>
      </div>
      <p className="mt-5 text-[clamp(1.85rem,3vw,2.35rem)] font-semibold leading-none tracking-tight text-foreground tabular-nums">
        {calendarDate}
      </p>
    </div>
  )
}

function SnapshotWindowCard({
  title,
  note,
  startDate,
  endDate,
  tone,
}: {
  title: string
  note: string
  startDate: string
  endDate: string
  tone: PlannerTone
}) {
  const start = getSummaryDateParts(startDate)
  const end = getSummaryDateParts(endDate)
  const weekendSummary = getWeekendSummary(startDate, endDate)
  const toneStyles = PLANNER_TONES[tone]

  return (
    <div className={`${plannerSummaryCardClass} ${toneStyles.accentBorderClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${toneStyles.markerClass}`} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{title}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{note}</p>
        </div>
        {weekendSummary && (
          <span className={`${snapshotInsetBadgeBaseClass} ${toneStyles.badgeClass}`}>
            {weekendSummary}
          </span>
        )}
      </div>
      <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))]">
        <div className={snapshotInsetSurfaceClass}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">From</p>
            <span className={`${snapshotInsetBadgeBaseClass} ${toneStyles.badgeClass}`}>
              {start.weekday}
            </span>
          </div>
          <p className="mt-3 text-lg font-semibold leading-tight tracking-tight text-foreground tabular-nums sm:text-xl">{start.calendarDate}</p>
        </div>
        <div className={snapshotInsetSurfaceClass}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Until</p>
            <span className={`${snapshotInsetBadgeBaseClass} ${toneStyles.badgeClass}`}>
              {end.weekday}
            </span>
          </div>
          <p className="mt-3 text-lg font-semibold leading-tight tracking-tight text-foreground tabular-nums sm:text-xl">{end.calendarDate}</p>
        </div>
      </div>
    </div>
  )
}

function SnapshotSupportStrip({
  title,
  note,
  dateString,
  tone,
}: {
  title: string
  note: string
  dateString: string
  tone: PlannerTone
}) {
  const { calendarDate, weekday } = getSummaryDateParts(dateString)
  const toneStyles = PLANNER_TONES[tone]

  return (
    <div className={`${plannerSummaryCardClass} ${toneStyles.accentBorderClass}`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${toneStyles.markerClass}`} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{title}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{note}</p>
        </div>
        <div className="justify-self-start xl:justify-self-end">
          <div className={snapshotInsetSurfaceClass}>
            <div className="flex items-center gap-3">
              <span className={`${snapshotInsetBadgeBaseClass} ${toneStyles.badgeClass}`}>
                {weekday}
              </span>
              <p className="text-xl font-semibold leading-tight tracking-tight text-foreground tabular-nums">{calendarDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MilestoneCard({ milestone }: { milestone: TimelineMilestone }) {
  const weekendSummary = getWeekendSummary(milestone.startDate, milestone.endDate)
  const toneStyles = PLANNER_TONES[milestone.tone]

  return (
    <div className={`${plannerSummaryCardClass} ${toneStyles.accentBorderClass} sm:p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${toneStyles.markerClass}`} />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">{milestone.offsetLabel}</p>
          </div>
          <h4 className="mt-2 text-lg font-semibold text-foreground">{milestone.label}</h4>
        </div>
        {weekendSummary && (
          <span className={`${snapshotInsetBadgeBaseClass} ${toneStyles.badgeClass}`}>
            {weekendSummary}
          </span>
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">
        {milestone.endDate ? formatRange(milestone.startDate, milestone.endDate) : formatSingleDate(milestone.startDate)}
      </p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{milestone.note}</p>
    </div>
  )
}

function PlannerInfoBlock({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-secondary/80 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{label}</p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{value}</p>
    </div>
  )
}

export default function QueenRearingPlanningTab() {
  const today = useMemo(() => toLocalDateString(new Date()), [])
  const [sourceMode, setSourceMode] = useState<PlannerSourceMode>('graft')
  const [sourceDate, setSourceDate] = useState(today)

  const planner = useMemo(() => buildPlannerTimeline(sourceMode, sourceDate), [sourceMode, sourceDate])

  const activeDateLabel = sourceMode === 'graft' ? 'Planned graft date' : 'Target virgin emergence day'
  const activeModeTitle = sourceMode === 'graft' ? 'Choose a graft date' : 'Choose a virgin emergence day'
  const counterpartLabel = sourceMode === 'graft' ? 'Derived emergence day' : 'Derived graft date'
  const snapshotModeLabel = sourceMode === 'graft' ? 'Graft-led scenario' : 'Emergence-led scenario'
  const selectedWeekdayValue = planner
    ? getDayName(sourceDate)
    : 'Select a valid date to start planning.'
  const counterpartValue = planner
    ? sourceMode === 'graft'
      ? formatSingleDate(planner.emergenceDate)
      : formatSingleDate(planner.graftDate)
    : 'Unavailable until the date is valid.'

  const handleModeChange = (nextMode: PlannerSourceMode) => {
    if (nextMode === sourceMode) return

    if (planner) {
      setSourceDate(nextMode === 'graft' ? planner.graftDate : planner.emergenceDate)
    }

    setSourceMode(nextMode)
  }

  const shiftSourceDate = (days: number) => {
    const parsed = parseLocalDate(sourceDate)
    if (!parsed) return
    setSourceDate(toLocalDateString(addDaysToDate(parsed, days)))
  }

  return (
    <div className="space-y-6">
      <div className={plannerShellClass}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.06),transparent_32%)]" />
        <div className="relative grid items-start gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 shadow-sm dark:text-blue-300">
              <Calendar size={14} />
              Timeline Sandbox
            </div>
            <div>
              <h3 className="text-3xl font-semibold tracking-tight text-foreground">Planning</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
                Start from either a graft date or a target virgin emergence day, then inspect how the queen and drone timelines move across the week. The dates below are planning ranges, not guarantees, so weather and local conditions still matter.
              </p>
            </div>
            {planner ? (
              <SnapshotPanel
                description="Use this snapshot to judge whether the chosen anchor date creates workable mating and laying windows, then confirm drone timing underneath."
                eyebrow="Planning Snapshot"
                title={snapshotModeLabel}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <SnapshotAnchorCard
                    dateString={sourceMode === 'graft' ? planner.graftDate : planner.emergenceDate}
                    label={activeDateLabel}
                    title="Anchor Date"
                    tone="blue"
                  />
                  <SnapshotAnchorCard
                    dateString={sourceMode === 'graft' ? planner.emergenceDate : planner.graftDate}
                    label={counterpartLabel}
                    title="Counterpart"
                    tone="violet"
                  />
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  <SnapshotWindowCard
                    endDate={planner.queenMatingEnd}
                    note="Expected queen-flight window once the virgin has had a few days to mature."
                    startDate={planner.queenMatingStart}
                    title="Mating Flights"
                    tone="emerald"
                  />
                  <SnapshotWindowCard
                    endDate={planner.queenLayingEnd}
                    note="Practical window for the first eggs after successful mating and settling."
                    startDate={planner.queenLayingStart}
                    title="Laying Window"
                    tone="amber"
                  />
                </div>
                <SnapshotSupportStrip
                  dateString={planner.droneBroodStart}
                  note="Have drone brood underway by this point so mature drones overlap the first likely mating flights."
                  title="Drone Start"
                  tone="sky"
                />
              </SnapshotPanel>
            ) : (
              <div className="rounded-2xl border border-red-500/30 bg-surface px-4 py-4 text-sm text-red-700 shadow-sm dark:text-red-300">
                Enter a valid calendar date to restore the planning timeline.
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-border bg-surface/95 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-foreground">
              <Clock3 size={18} className="text-blue-600 dark:text-blue-400" />
              <h4 className="text-lg font-semibold">{activeModeTitle}</h4>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                tone={sourceMode === 'graft' ? 'blue' : 'neutral'}
                onClick={() => handleModeChange('graft')}
              >
                Graft Date
              </Button>
              <Button
                size="sm"
                tone={sourceMode === 'emergence' ? 'blue' : 'neutral'}
                onClick={() => handleModeChange('emergence')}
              >
                Emergence Day
              </Button>
            </div>
            <label className="mt-4 block text-sm font-medium text-text-secondary" htmlFor="planning-source-date">
              {activeDateLabel}
            </label>
            <input
              id="planning-source-date"
              type="date"
              value={sourceDate}
              onChange={(e) => setSourceDate(e.target.value)}
              aria-invalid={sourceDate !== '' && planner === null}
              className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-foreground dark:bg-surface-elevated"
            />
            <div className="mt-4 space-y-3">
              <PlannerInfoBlock
                label="Selected Weekday"
                value={selectedWeekdayValue}
              />
              <PlannerInfoBlock
                label={counterpartLabel}
                value={counterpartValue}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" tone="neutral" onClick={() => shiftSourceDate(-7)}>
                -7 days
              </Button>
              <Button size="sm" tone="neutral" onClick={() => shiftSourceDate(-1)}>
                -1 day
              </Button>
              <Button size="sm" tone="blue" onClick={() => setSourceDate(today)}>
                Today
              </Button>
              <Button size="sm" tone="neutral" onClick={() => shiftSourceDate(1)}>
                +1 day
              </Button>
              <Button size="sm" tone="neutral" onClick={() => shiftSourceDate(7)}>
                +7 days
              </Button>
            </div>
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-surface-secondary/80 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 text-amber-700 dark:text-amber-300" />
                <p className="text-sm leading-6 text-text-secondary">
                  This planner treats mating and laying as windows. If your area often has poor flying weather, start drone brood earlier and expect the queen timeline to slide later.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {planner && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border bg-surface p-2 shadow-sm">
                <Egg size={18} className="text-violet-700 dark:text-violet-300" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-foreground">Queen timeline</h4>
                <p className="text-sm text-text-secondary">Use this to see whether grafting, emergence, flights, and laying land on workable weekdays.</p>
              </div>
            </div>
            {planner.queenMilestones.map((milestone) => (
              <MilestoneCard key={milestone.id} milestone={milestone} />
            ))}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border bg-surface p-2 shadow-sm">
                <Bug size={18} className="text-sky-700 dark:text-sky-300" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-foreground">Drone planning</h4>
                <p className="text-sm text-text-secondary">Work backwards from the resolved queen mating window so drones are already mature when virgins are ready.</p>
              </div>
            </div>
            {planner.droneMilestones.map((milestone) => (
              <MilestoneCard key={milestone.id} milestone={milestone} />
            ))}
          </section>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm dark:bg-surface-elevated">
          <h4 className="text-lg font-semibold text-foreground">Assumptions used here</h4>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
            <li>You can plan from either graft date or target virgin emergence day; the counterpart date is derived automatically.</li>
            <li>Queen emergence is treated as 12 days after grafting, matching the existing batch workflow.</li>
            <li>Likely mating flights are shown as 5 to 8 days after emergence. Poor weather can push this later.</li>
            <li>Likely laying is shown as 10 to 14 days after emergence to keep the planner practical rather than over-precise.</li>
            <li>Drone timing assumes roughly 24 days from egg to emergence and another 10 to 12 days to sexual maturity.</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm dark:bg-surface-elevated">
          <h4 className="text-lg font-semibold text-foreground">How to use it</h4>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
            <li>Choose the mode that matches how you plan: either start from grafting or start from the emergence weekday you want.</li>
            <li>Move the selected source date until the emergence and mating windows land on weekdays that suit your inspections and mating-nuc work.</li>
            <li>Check whether the mating-flight window overlaps a weekend if you prefer to watch virgins or plan apiary visits then.</li>
            <li>Use the drone start date as a minimum. Starting drone brood earlier gives you better overlap if mating is weather-delayed.</li>
            <li>Once you like the timing, switch back to Grafting Batch to create the real batch entry.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
