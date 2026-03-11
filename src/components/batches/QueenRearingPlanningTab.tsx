'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Bug, Calendar, Clock3, Egg } from 'lucide-react'

import Button from '@/components/ui/Button'

interface TimelineMilestone {
  id: string
  label: string
  startDate: string
  endDate?: string
  offsetLabel: string
  note: string
  accentClass: string
}

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseLocalDate = (dateString: string): Date | null => {
  if (!dateString) return null
  const date = new Date(dateString + 'T00:00:00')
  return Number.isNaN(date.getTime()) ? null : date
}

const addDays = (dateString: string, days: number): string => {
  const parsed = parseLocalDate(dateString)
  if (!parsed) return ''
  const result = new Date(parsed)
  result.setDate(result.getDate() + days)
  return toLocalDateString(result)
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

const isWeekend = (dateString: string): boolean => {
  const parsed = parseLocalDate(dateString)
  if (!parsed) return false
  const day = parsed.getDay()
  return day === 0 || day === 6
}

const formatSingleDate = (dateString: string): string => {
  return `${formatDateIrish(dateString)} | ${getDayName(dateString)}`
}

const formatRange = (startDate: string, endDate: string): string => {
  return `${formatDateIrish(startDate)} | ${getDayName(startDate)} to ${formatDateIrish(endDate)} | ${getDayName(endDate)}`
}

const getWeekendSummary = (startDate: string, endDate?: string): string | null => {
  if (!endDate) return isWeekend(startDate) ? 'Weekend' : null
  const weekendTouches = [startDate, endDate].filter(isWeekend)
  if (weekendTouches.length === 0) return null
  if (weekendTouches.length === 2) return 'Includes weekend both ends'
  return `Includes ${getDayName(weekendTouches[0])}`
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
  const [graftDate, setGraftDate] = useState(today)

  const planner = useMemo(() => {
    if (!parseLocalDate(graftDate)) return null

    const queenEmergence = addDays(graftDate, 12)
    const queenMatingStart = addDays(queenEmergence, 5)
    const queenMatingEnd = addDays(queenEmergence, 8)
    const queenLayingStart = addDays(queenEmergence, 10)
    const queenLayingEnd = addDays(queenEmergence, 14)

    const droneBroodStart = addDays(queenMatingStart, -36)
    const droneEmergence = addDays(droneBroodStart, 24)
    const droneReadyStart = addDays(droneEmergence, 10)
    const droneReadyEnd = addDays(droneEmergence, 12)

    const queenMilestones: TimelineMilestone[] = [
      {
        id: 'graft',
        label: 'Planned graft date',
        startDate: graftDate,
        offsetLabel: 'Day 0',
        note: 'Use this to compare how the rest of the queen cycle shifts across weekdays and weekends.',
        accentClass: 'border-blue-200 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/30',
      },
      {
        id: 'emergence',
        label: 'Virgin queen emerges',
        startDate: queenEmergence,
        offsetLabel: 'Graft + 12 days',
        note: 'Matches the current batch timeline used elsewhere on the Queen Rearing page.',
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
      queenEmergence,
      queenMatingStart,
      queenMatingEnd,
      queenLayingStart,
      queenLayingEnd,
      droneBroodStart,
      queenMilestones,
      droneMilestones,
    }
  }, [graftDate])

  const shiftGraftDate = (days: number) => {
    const parsed = parseLocalDate(graftDate)
    if (!parsed) return
    const next = new Date(parsed)
    next.setDate(next.getDate() + days)
    setGraftDate(toLocalDateString(next))
  }

  if (!planner) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        Please choose a valid graft date to build the planning timeline.
      </div>
    )
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
                Try a graft date, then inspect how the queen and drone timelines move across the week. The dates below are planning ranges, not guarantees, so weather and local conditions still matter.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-violet-200 bg-white/85 p-4 shadow-sm dark:border-violet-900 dark:bg-slate-950/50">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Emergence</p>
                <p className="mt-2 text-base font-semibold text-foreground">{formatSingleDate(planner.queenEmergence)}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-white/85 p-4 shadow-sm dark:border-emerald-900 dark:bg-slate-950/50">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Mating Flights</p>
                <p className="mt-2 text-base font-semibold text-foreground">{formatRange(planner.queenMatingStart, planner.queenMatingEnd)}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white/85 p-4 shadow-sm dark:border-amber-900 dark:bg-slate-950/50">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Laying Window</p>
                <p className="mt-2 text-base font-semibold text-foreground">{formatRange(planner.queenLayingStart, planner.queenLayingEnd)}</p>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-white/85 p-4 shadow-sm dark:border-sky-900 dark:bg-slate-950/50">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Drone Start</p>
                <p className="mt-2 text-base font-semibold text-foreground">{formatSingleDate(planner.droneBroodStart)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface/90 p-5 shadow-sm dark:bg-slate-950/70">
            <div className="flex items-center gap-2 text-foreground">
              <Clock3 size={18} className="text-blue-600 dark:text-blue-400" />
              <h4 className="text-lg font-semibold">Choose a graft date</h4>
            </div>
            <label className="mt-4 block text-sm font-medium text-text-secondary" htmlFor="planning-graft-date">
              Planned graft date
            </label>
            <input
              id="planning-graft-date"
              type="date"
              value={graftDate}
              onChange={(e) => setGraftDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-foreground"
            />
            <p className="mt-2 text-sm text-text-secondary">
              {graftDate ? `Selected weekday: ${getDayName(graftDate)}` : 'Select a date to start planning.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" tone="neutral" onClick={() => shiftGraftDate(-7)}>
                -7 days
              </Button>
              <Button size="sm" tone="neutral" onClick={() => shiftGraftDate(-1)}>
                -1 day
              </Button>
              <Button size="sm" tone="blue" onClick={() => setGraftDate(today)}>
                Today
              </Button>
              <Button size="sm" tone="neutral" onClick={() => shiftGraftDate(1)}>
                +1 day
              </Button>
              <Button size="sm" tone="neutral" onClick={() => shiftGraftDate(7)}>
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

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-violet-200 bg-violet-100 p-2 dark:border-violet-900 dark:bg-violet-950/40">
              <Egg size={18} className="text-violet-700 dark:text-violet-300" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground">Queen timeline</h4>
              <p className="text-sm text-text-secondary">Use this to see whether emergence, flights, and laying land on workable weekdays.</p>
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
              <p className="text-sm text-text-secondary">Work backwards from the queen mating window so drones are already mature when virgins are ready.</p>
            </div>
          </div>
          {planner.droneMilestones.map((milestone) => (
            <MilestoneCard key={milestone.id} milestone={milestone} />
          ))}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <h4 className="text-lg font-semibold text-foreground">Assumptions used here</h4>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
            <li>Queen emergence is shown as graft date + 12 days, matching the existing batch workflow.</li>
            <li>Likely mating flights are shown as 5 to 8 days after emergence. Poor weather can push this later.</li>
            <li>Likely laying is shown as 10 to 14 days after emergence to keep the planner practical rather than over-precise.</li>
            <li>Drone timing assumes roughly 24 days from egg to emergence and another 10 to 12 days to sexual maturity.</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
          <h4 className="text-lg font-semibold text-foreground">How to use it</h4>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
            <li>Move the graft date until the emergence and mating windows land on weekdays that suit your inspections and mating-nuc work.</li>
            <li>Check whether the mating-flight window overlaps a weekend if you prefer to watch virgins or plan apiary visits then.</li>
            <li>Use the drone start date as a minimum. Starting drone brood earlier gives you better overlap if mating is weather-delayed.</li>
            <li>Once you like the timing, switch back to Grafting Batch to create the real batch entry.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
