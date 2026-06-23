// Total Brood Removal (TBR) swarm-prevention model — pure, framework-free.
//
// Two responsibilities:
//   1. Simulate the colony's forager force after a brood break (daily cohort model).
//   2. Resolve a crop's bloom date for THIS year using a 3-tier strategy
//      (observed record → averaged GDD projected → general estimate projected).
//
// All dates are YYYY-MM-DD strings (lexicographically sortable). No Date objects
// leak across the API. Functions are defensive: out-of-order or absurd ranges
// return empty/zero rather than looping forever.

import { parseGDDRange } from '@/lib/gdd'
import {
  type TbrConstants,
  type ResolvedCropDate,
  type ForagerPoint,
  type TbrMilestones,
  type TbrPlan,
} from '@/types/tbr'

// Default flow-window lengths (days). Bramble blooms over a long, staggered period;
// the early spring crop (e.g. OSR/dandelion) yields for roughly a month.
export const SPRING_CROP_DURATION_DAYS = 30
export const SUMMER_FLOW_DURATION_DAYS = 35

// Hard cap on simulation length to guarantee bounded loops.
const MAX_SIM_DAYS = 2000

// --- Date helpers (UTC-safe) -------------------------------------------------

// Defensive: never throw on malformed input. A bad/empty string degrades to the
// Unix epoch rather than producing an Invalid Date (whose .toISOString() throws).
export function parseISODate(s: string): Date {
  const parts = (s ?? '').split('-')
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  return new Date(Date.UTC(
    Number.isFinite(y) ? y : 1970,
    (Number.isFinite(m) ? m : 1) - 1,
    Number.isFinite(d) ? d : 1
  ))
}

export function toISODate(d: Date): string {
  return Number.isNaN(d.getTime()) ? '1970-01-01' : d.toISOString().slice(0, 10)
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s)
  d.setUTCDate(d.getUTCDate() + n)
  return toISODate(d)
}

/** Whole-day difference (b - a). */
export function dayDiff(a: string, b: string): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000)
}

function minDate(...ds: string[]): string {
  return ds.slice().sort()[0]
}

function maxDate(...ds: string[]): string {
  return ds.slice().sort().slice(-1)[0]
}

function overlap(aLo: number, aHi: number, bLo: number, bHi: number): number {
  const lo = Math.max(aLo, bLo)
  const hi = Math.min(aHi, bHi)
  return Math.max(0, hi - lo + 1)
}

// --- Forager-force simulation ------------------------------------------------
//
// Emergence rate is L (lay rate) every day EXCEPT during the brood gap that
// follows TBR — from offset 0 (re-lay has not produced brood yet) up to the day
// the first new brood emerges. A bee emerging on day e forages during
// [e + H, e + H + F). So foragers on day d = L × (days in the foraging window
// that fall OUTSIDE the gap), which has a clean closed form.

/** Standing forager force in normal (pre-break) steady state. */
export function steadyStateForagers(c: TbrConstants): number {
  return c.layRate * c.foragerSpanDays
}

/** Relative forager force on a day `t` days after TBR (t may be negative). */
export function foragerForceAtOffset(t: number, c: TbrConstants): number {
  const H = c.emergenceToForagerDays
  const F = c.foragerSpanDays
  // Emergence is zero for offsets [0, gapLen-1] (re-lay delay + development).
  const gapLen = c.reLayDelayDays + c.eggToEmergenceDays
  if (F <= 0) return 0
  // Emergence days contributing to foraging on offset t:
  const winLo = t - H - F + 1
  const winHi = t - H
  const gapOverlap = overlap(winLo, winHi, 0, gapLen - 1)
  const activeDays = F - gapOverlap
  return Math.max(0, c.layRate * activeDays)
}

export function simulateForagerCurve(
  tbrDate: string,
  startDate: string,
  endDate: string,
  c: TbrConstants
): ForagerPoint[] {
  const total = dayDiff(startDate, endDate)
  if (total < 0 || total > MAX_SIM_DAYS) return []
  const out: ForagerPoint[] = []
  for (let i = 0; i <= total; i++) {
    const date = addDays(startDate, i)
    const t = dayDiff(tbrDate, date)
    out.push({ date, foragers: Math.round(foragerForceAtOffset(t, c)) })
  }
  return out
}

export function tbrMilestones(tbrDate: string, c: TbrConstants): TbrMilestones {
  const broodOffset = c.reLayDelayDays + c.eggToEmergenceDays
  return {
    tbrDate,
    reLayDate: addDays(tbrDate, c.reLayDelayDays),
    firstBroodDate: addDays(tbrDate, broodOffset),
    firstForagerDate: addDays(tbrDate, broodOffset + c.emergenceToForagerDays),
  }
}

/** Average forager strength across [flowStart, flowEnd] as a 0..1 fraction of full strength. */
export function flowCoverage(
  tbrDate: string,
  flowStart: string,
  flowEnd: string,
  c: TbrConstants
): number {
  const days = dayDiff(flowStart, flowEnd)
  if (days < 0) return 0
  const steady = steadyStateForagers(c) || 1
  let sum = 0
  for (let i = 0; i <= days; i++) {
    const t = dayDiff(tbrDate, addDays(flowStart, i))
    sum += foragerForceAtOffset(t, c)
  }
  const avg = sum / (days + 1)
  return Math.max(0, Math.min(1, avg / steady))
}

/**
 * Search candidate TBR dates and return the one maximising flow coverage (ties → earliest).
 * Coverage is U-shaped in the TBR date: a very early break lets the colony fully recover before
 * the flow (coverage approaches the 100% ceiling); the worst case is a break whose recovery
 * trough lands mid-flow; and a very late break scores partially because the old foragers ride the
 * early flow before the brood gap reaches foraging age — a false win, as the colony then collapses
 * through the late flow. The earliest feasible date is therefore the true optimum; the scan finds
 * it generally and is bounded by MAX_SIM_DAYS.
 */
export function recommendTbrDate(
  earliest: string,
  latest: string,
  flowStart: string,
  flowEnd: string,
  c: TbrConstants
): string | null {
  const span = dayDiff(earliest, latest)
  if (span < 0 || span > MAX_SIM_DAYS) return null
  let best: string | null = null
  let bestScore = -1
  for (let i = 0; i <= span; i++) {
    const cand = addDays(earliest, i)
    const score = flowCoverage(cand, flowStart, flowEnd, c)
    if (score > bestScore + 1e-9) {
      bestScore = score
      best = cand
    }
  }
  return best
}

// --- 3-tier crop-date resolution --------------------------------------------

export interface GddRecordLite {
  vegetationTypeId: string
  year: number
  startDate: string | null
  gddValue: number | null
}

export interface VegInfoLite {
  vegetationTypeId: string
  name: string
  typicalGddRange: string | null
  bloomPeriod: string | null
}

export interface ProjectionContext {
  /** GDD accumulated so far this year at the location (null if unavailable). */
  accumulatedGdd: number | null
  /** Recent average daily GDD accrual at the location (null if unavailable). */
  dailyGddRate: number | null
  /** Today (YYYY-MM-DD). */
  today: string
  currentYear: number
}

/** Turn a target GDD threshold into a calendar date by projecting this year's accrual forward. */
export function projectDateForGdd(
  target: number,
  ctx: ProjectionContext
): { date: string | null; reached: boolean } {
  const { accumulatedGdd, dailyGddRate, today } = ctx
  if (accumulatedGdd == null || dailyGddRate == null || dailyGddRate <= 0) {
    return { date: null, reached: false }
  }
  if (accumulatedGdd >= target) return { date: today, reached: true }
  const daysAhead = Math.ceil((target - accumulatedGdd) / dailyGddRate)
  return { date: addDays(today, daysAhead), reached: false }
}

export function resolveCropDate(
  vegetationTypeId: string,
  name: string,
  records: GddRecordLite[],
  vegInfo: VegInfoLite | undefined,
  ctx: ProjectionContext
): ResolvedCropDate {
  const mine = records.filter((r) => r.vegetationTypeId === vegetationTypeId)

  // Tier 1 — observed bloom record for this season.
  const thisYear = mine.find((r) => r.year === ctx.currentYear && r.startDate)
  if (thisYear && thisYear.startDate) {
    return {
      vegetationTypeId,
      name,
      date: thisYear.startDate,
      gddTarget: thisYear.gddValue ?? null,
      tier: 'observed',
      note: `Observed bloom on ${thisYear.startDate} (this season).`,
    }
  }

  // Tier 2 — averaged GDD-at-bloom from prior years, projected onto this year's curve.
  const priorGdd = mine
    .filter((r) => typeof r.gddValue === 'number')
    .map((r) => r.gddValue as number)
  if (priorGdd.length > 0) {
    const avg = Math.round(priorGdd.reduce((a, b) => a + b, 0) / priorGdd.length)
    const { date, reached } = projectDateForGdd(avg, ctx)
    return {
      vegetationTypeId,
      name,
      date,
      gddTarget: avg,
      tier: 'projected',
      note: reached
        ? `This season has already reached the historical bloom GDD (~${avg}).`
        : `Projected from your ${priorGdd.length}-record average bloom GDD (~${avg}).`,
    }
  }

  // Tier 3 — general estimate from vegetation reference data.
  const range = vegInfo ? parseGDDRange(vegInfo.typicalGddRange) : null
  if (range) {
    const mid = Math.round((range.min + range.max) / 2)
    const { date, reached } = projectDateForGdd(mid, ctx)
    return {
      vegetationTypeId,
      name,
      date,
      gddTarget: mid,
      tier: 'estimated',
      note: reached
        ? `This season has already reached the typical bloom GDD (~${mid}).`
        : `Estimated from the general typical GDD range (${vegInfo?.typicalGddRange}).`,
    }
  }

  return {
    vegetationTypeId,
    name,
    date: null,
    gddTarget: null,
    tier: 'unknown',
    note: 'No records or general data available to estimate this crop.',
  }
}

// --- Plan assembly -----------------------------------------------------------

export interface TbrBounds {
  springEnd: string | null
  flowStart: string
  flowEnd: string
  earliest: string
  latest: string
}

export interface TbrResult {
  bounds: TbrBounds
  plan: TbrPlan
  /** The TBR date actually used for the curve (override, else recommended, else earliest). */
  effectiveTbrDate: string
}

/**
 * Build the full plan from resolved crop dates. Returns null when there is no
 * summer-flow target to work towards (nothing to optimise).
 */
export function planFromResolved(
  springDate: string | null,
  summerStartDate: string | null,
  summerEndDate: string | null,
  constants: TbrConstants,
  tbrOverride: string | null
): TbrResult | null {
  if (!summerStartDate) return null

  const flowStart = summerStartDate
  const flowEnd = summerEndDate ?? addDays(flowStart, SUMMER_FLOW_DURATION_DAYS)
  // A spring crop only constrains the plan if it genuinely ends before the flow starts;
  // an out-of-order selection is ignored rather than corrupting the bounds.
  const springEndRaw = springDate ? addDays(springDate, SPRING_CROP_DURATION_DAYS) : null
  const springEnd = springEndRaw && springEndRaw < flowStart ? springEndRaw : null

  // Full forager recovery takes this long after a break.
  const recoveryDays =
    constants.reLayDelayDays +
    constants.eggToEmergenceDays +
    constants.emergenceToForagerDays +
    constants.foragerSpanDays

  // Earliest feasible TBR: after the spring crop is off. Without a spring crop,
  // fall back to "one full recovery before the flow".
  const earliest = springEnd ?? addDays(flowStart, -recoveryDays)
  const latest = maxDate(earliest, flowStart)

  const recommended = recommendTbrDate(earliest, latest, flowStart, flowEnd, constants)
  const effectiveTbrDate = tbrOverride ?? recommended ?? earliest

  const milestones = tbrMilestones(effectiveTbrDate, constants)
  const simStart = addDays(minDate(earliest, effectiveTbrDate, springEnd ?? earliest), -21)
  const simEnd = addDays(maxDate(flowEnd, milestones.firstForagerDate), 21)

  const curve = simulateForagerCurve(effectiveTbrDate, simStart, simEnd, constants)
  const score = flowCoverage(effectiveTbrDate, flowStart, flowEnd, constants)

  return {
    bounds: { springEnd, flowStart, flowEnd, earliest, latest },
    plan: { curve, milestones, flowCoverageScore: score, recommendedTbrDate: recommended },
    effectiveTbrDate,
  }
}
