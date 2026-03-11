'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { AlertTriangle, Bug, Calendar, Clock3, Egg } from 'lucide-react'

import Button from '@/components/ui/Button'

type PlannerSourceMode = 'graft' | 'emergence'

interface TimelineMilestone {
  id: string
  label: string
  startDate: string
  endDate?: string
  offsetLabel: string
  note: string
  accentClass: string
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
      accentClass: 'border-blue-200 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/30',
    },
    {
      id: 'emergence',
      label: sourceMode === 'emergence' ? 'Chosen virgin emergence day' : 'Virgin queen emerges',
      startDate: emergenceDate,
      offsetLabel: sourceMode === 'emergence' ? 'Selected date' : 'Graft + 12 days',
      note: sourceMode === 'emergence'
        ? 'This is the emergence day you are targeting directly.'
        : 'Matches the current batch timeline used elsewhere on the Queen Rearing page.',
      accentClass: 'border-violet-200 bg-violet-50/80 dark:border-violet-900 dark:bg-violet-950/30',
    },
    {
      id: 'mating',
      label: 'Likely mating-flight window',
      startDate: queenMatingStart,
      endDate: queenMatingEnd,
      offsetLabel: 'Emergence + 5 to 8 days',
      note: 'Assumes the virgin queen matures for several days before flights. Weather can still push mating later than this window.',
      accentClass: 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30',
    },
    {
      id: 'laying',
      label: 'Likely laying window',
      startDate: queenLayingStart,
      endDate: queenLayingEnd,
      offsetLabel: 'Emergence + 10 to 14 days',
      note: 'Shows a practical planning range for the first eggs after successful mating and settling.',
      accentClass: 'border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30',
    },
  ]

  const droneMilestones: TimelineMilestone[] = [
    {
      id: 'drone-start',
      label: 'Start raising drones by',
      startDate: droneBroodStart,
      offsetLabel: '36 days before first likely mating flight',
      note: 'Aim to have drone brood underway by this date so mature drones are available when the first virgins are ready.',
      accentClass: 'border-sky-200 bg-sky-50/80 dark:border-sky-900 dark:bg-sky-950/30',
    },
    {
      id: 'drone-emergence',
      label: 'Drone emergence',
      startDate: droneEmergence,
      offsetLabel: 'Drone brood start + 24 days',
      note: 'This is when that drone cohort should begin emerging from capped drone brood.',
      accentClass: 'border-cyan-200 bg-cyan-50/80 dark:border-cyan-900 dark:bg-cyan-950/30',
    },
    {
      id: 'drone-ready',
      label: 'Drones ready to mate',
      startDate: droneReadyStart,
      endDate: droneReadyEnd,
      offsetLabel: 'Drone emergence + 10 to 12 days',
      note: 'This readiness window is set to land around the start of the likely queen mating flights.',
      accentClass: 'border-teal-200 bg-teal-50/80 dark:border-teal-900 dark:bg-teal-950/30',
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
    <section className="rounded-[28px] border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/45 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">{eyebrow}</p>
          <h4 className="mt-2 text-lg font-semibold text-foreground">{title}</h4>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  )
}

function SnapshotAnchorCard({
  title,
  label,
  dateString,
  accentClass,
  badgeClass,
}: {
  title: string
  label: string
  dateString: string
  accentClass: string
  badgeClass: string
}) {
  const { calendarDate, weekday } = getSummaryDateParts(dateString)

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accentClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{title}</p>
      <p className="mt-2 text-sm text-text-secondary">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums">{calendarDate}</p>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${badgeClass}`}>
          {weekday}
        </span>
      </div>
    </div>
  )
}

function SnapshotWindowCard({
  title,
  note,
  startDate,
  endDate,
  accentClass,
  badgeClass,
}: {
  title: string
  note: string
  startDate: string
  endDate: string
  accentClass: string
  badgeClass: string
}) {
  const start = getSummaryDateParts(startDate)
  const end = getSummaryDateParts(endDate)
  const weekendSummary = getWeekendSummary(startDate, endDate)

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accentClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{title}</p>
          <p className="mt-2 text-sm text-text-secondary">{note}</p>
        </div>
        {weekendSummary && (
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}>
            {weekendSummary}
          </span>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <div className="rounded-xl border border-white/70 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">From</p>
          <p className="mt-2 text-xl font-semibold leading-tight tracking-tight text-foreground tabular-nums">{start.calendarDate}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">{start.weekday}</p>
        </div>
        <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-border bg-white/75 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary dark:bg-slate-950/55 sm:flex">
          to
        </div>
        <div className="rounded-xl border border-white/70 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Until</p>
          <p className="mt-2 text-xl font-semibold leading-tight tracking-tight text-foreground tabular-nums">{end.calendarDate}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">{end.weekday}</p>
        </div>
      </div>
    </div>
  )
}

function SnapshotSupportStrip({
  title,
  note,
  dateString,
  accentClass,
  badgeClass,
}: {
  title: string
  note: string
  dateString: string
  accentClass: string
  badgeClass: string
}) {
  const { calendarDate, weekday } = getSummaryDateParts(dateString)

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accentClass}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">{title}</p>
          <p className="mt-2 text-sm text-text-secondary">{note}</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${badgeClass}`}>
            {weekday}
          </span>
          <p className="text-xl font-semibold leading-tight tracking-tight text-foreground tabular-nums">{calendarDate}</p>
        </div>
      </div>
    </div>
  )
}

function MilestoneCard({ milestone }: { milestone: TimelineMilestone }) {
  const weekendSummary = getWeekendSummary(milestone.startDate, milestone.endDate)

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${milestone.accentClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-tertiary">{milestone.offsetLabel}</p>
          <h4 className="mt-2 text-lg font-semibold text-foreground">{milestone.label}</h4>
        </div>
        {weekendSummary && (
          <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            {weekendSummary}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">
        {milestone.endDate ? formatRange(milestone.startDate, milestone.endDate) : formatSingleDate(milestone.startDate)}
      </p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{milestone.note}</p>
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
      <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-stone-50 via-white to-sky-50 shadow-sm dark:from-slate-950 dark:via-slate-950 dark:to-sky-950/40">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.9fr)]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
              <Calendar size={14} />
              Timeline Sandbox
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-foreground">Planning</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
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
                    accentClass="border-blue-200 bg-blue-50/85 dark:border-blue-900 dark:bg-blue-950/30"
                    badgeClass="border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                    dateString={sourceMode === 'graft' ? planner.graftDate : planner.emergenceDate}
                    label={activeDateLabel}
                    title="Anchor Date"
                  />
                  <SnapshotAnchorCard
                    accentClass="border-violet-200 bg-violet-50/85 dark:border-violet-900 dark:bg-violet-950/30"
                    badgeClass="border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300"
                    dateString={sourceMode === 'graft' ? planner.emergenceDate : planner.graftDate}
                    label={counterpartLabel}
                    title="Counterpart"
                  />
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  <SnapshotWindowCard
                    accentClass="border-emerald-200 bg-emerald-50/85 dark:border-emerald-900 dark:bg-emerald-950/30"
                    badgeClass="border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    endDate={planner.queenMatingEnd}
                    note="Expected queen-flight window once the virgin has had a few days to mature."
                    startDate={planner.queenMatingStart}
                    title="Mating Flights"
                  />
                  <SnapshotWindowCard
                    accentClass="border-amber-200 bg-amber-50/85 dark:border-amber-900 dark:bg-amber-950/30"
                    badgeClass="border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    endDate={planner.queenLayingEnd}
                    note="Practical window for the first eggs after successful mating and settling."
                    startDate={planner.queenLayingStart}
                    title="Laying Window"
                  />
                </div>
                <SnapshotSupportStrip
                  accentClass="border-sky-200 bg-sky-50/85 dark:border-sky-900 dark:bg-sky-950/30"
                  badgeClass="border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                  dateString={planner.droneBroodStart}
                  note="Have drone brood underway by this point so mature drones overlap the first likely mating flights."
                  title="Drone Start"
                />
              </SnapshotPanel>
            ) : (
              <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                Enter a valid calendar date to restore the planning timeline.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-surface/90 p-5 shadow-sm dark:bg-slate-950/70">
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
              className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-foreground"
            />
            <p className="mt-2 text-sm text-text-secondary">
              {planner
                ? `Selected weekday: ${getDayName(sourceDate)}`
                : 'Select a valid date to start planning.'}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {planner
                ? `${counterpartLabel}: ${sourceMode === 'graft' ? formatSingleDate(planner.emergenceDate) : formatSingleDate(planner.graftDate)}`
                : `${counterpartLabel}: unavailable until the date is valid`}
            </p>
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
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 text-amber-700 dark:text-amber-300" />
                <p className="text-sm leading-6 text-amber-900 dark:text-amber-200">
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
              <div className="rounded-2xl border border-violet-200 bg-violet-100 p-2 dark:border-violet-900 dark:bg-violet-950/40">
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
              <div className="rounded-2xl border border-sky-200 bg-sky-100 p-2 dark:border-sky-900 dark:bg-sky-950/40">
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
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <h4 className="text-lg font-semibold text-foreground">Assumptions used here</h4>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
            <li>You can plan from either graft date or target virgin emergence day; the counterpart date is derived automatically.</li>
            <li>Queen emergence is treated as 12 days after grafting, matching the existing batch workflow.</li>
            <li>Likely mating flights are shown as 5 to 8 days after emergence. Poor weather can push this later.</li>
            <li>Likely laying is shown as 10 to 14 days after emergence to keep the planner practical rather than over-precise.</li>
            <li>Drone timing assumes roughly 24 days from egg to emergence and another 10 to 12 days to sexual maturity.</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
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
