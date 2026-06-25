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
  type InterventionMethod,
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

/** Biological floor for age at first foraging, even under precocious conditions (days). */
const MIN_FORAGE_AGE_DAYS = 7

/** Days a worker cell stays capped (sealed brood) before emergence — the varroa-reachable phase. */
const CAPPED_PHASE_DAYS = 12

function countIntegers(lo: number, hi: number): number {
  return Math.max(0, hi - lo + 1)
}

// --- Brood break: the single zero-emergence window ---------------------------
//
// Both interventions stop new bees emerging for one contiguous window, differing
// only in WHEN it opens (offsets are measured from the intervention day T):
//   • TBR    — all brood removed at T, so emergence stops immediately:
//              gap starts at 0, length = re-lay delay + egg→emergence.
//   • Caging — the queen is caged at T but the existing brood pipeline keeps
//              emerging for one egg→emergence span, THEN the gap opens until the
//              released queen's first brood emerges:
//              gap starts at egg→emergence, length = cage duration + release re-lay.

/** The zero-emergence window {start, len} (offsets from T) for the chosen method. */
export function broodGap(c: TbrConstants, method: InterventionMethod): { start: number; len: number } {
  if (method === 'caging') {
    return { start: c.eggToEmergenceDays, len: c.cageDurationDays + c.cageReleaseRelayDays }
  }
  return { start: 0, len: c.reLayDelayDays + c.eggToEmergenceDays }
}

// --- Forager-force simulation ------------------------------------------------
//
// Emergence rate is L (lay rate) every day EXCEPT during the brood gap
// [gapStart, gapEnd). A bee emerging on day e forages during [e + H, e + H + F).
//
// Two cohorts are summed so precocious foraging can be modelled:
//   • normal-age bees (emerged at offset < gapStart) forage at the normal age Hpre;
//   • post-gap bees (emerged at offset >= gapEnd) forage at age Hpost, which is
//     reduced by `accelDays` when the colony forages precociously after the break.
// With gapStart = 0 and accelDays = 0 this is identical to the original TBR closed form.

/** Total adult lifespan (days) = pre-foraging house-bee phase + foraging career. */
export function totalAdultLifespanDays(c: TbrConstants): number {
  return c.emergenceToForagerDays + c.foragingCareerDays
}

/** Standing forager force in normal (pre-break) steady state (= peak foragers). */
export function steadyStateForagers(c: TbrConstants): number {
  return c.layRate * c.foragingCareerDays
}

/** Peak total adult population at full strength (all ages) = lay rate × adult lifespan. */
export function peakAdultPopulation(c: TbrConstants): number {
  return c.layRate * totalAdultLifespanDays(c)
}

// --- Rebuild food budget -----------------------------------------------------
//
// Honey (carbohydrate) is funded from stores → the starvation risk. Pollen
// (protein) is mostly foraged fresh; stored beebread covers only a small part.
// Comb is always costed from foundation (worst case).

export const CELLS_PER_DADANT_DEEP = 9500

const HONEY_PER_WAX_KG = 7           // kg honey per kg wax (Whitcomb 1946: 6.6–8.8)
const WAX_PER_DADANT_FRAME_KG = 0.12 // ~120 g wax in a drawn deep comb
const LARVAL_CARB_MG = 59.4          // carbohydrate fed per worker larva
const ADULT_SUGAR_MG_PER_DAY = 4     // utilisable sugar per adult bee per day
const POLLEN_PER_BEE_MG = 150        // pollen to rear one worker (125–187.5 mg)
const STORED_BEEBREAD_KG = 0.75      // typical colony beebread reserve
const THERMO_OVERHEAD_FACTOR = 0.5   // thermoregulation + nurse processing, on top of basal upkeep
const AVG_ADULT_FRACTION = 0.7       // mean adult population through the dip + recovery, vs full strength

export interface FoodBudget {
  framesToDraw: number
  combHoneyKg: number
  broodHoneyKg: number
  upkeepHoneyKg: number
  totalHoneyKg: number
  pollenKg: number
  storedBeebreadKg: number
  pollenToForageKg: number
}

/** Coerce to a finite, non-negative number so malformed constants cannot poison the budget. */
function nonNeg(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Estimate the honey and pollen needed to rebuild after a break, over `rebuildDays`. */
export function rebuildFoodBudget(
  c: TbrConstants,
  rebuildDays: number,
  method: InterventionMethod = 'tbr'
): FoodBudget {
  const days = nonNeg(rebuildDays)
  const layRate = nonNeg(c.layRate)
  const standingBroodCells = layRate * nonNeg(c.eggToEmergenceDays)
  // Caging retains the drawn comb, so there is no foundation to draw.
  const framesToDraw =
    method === 'caging' ? 0 : Math.max(1, Math.round(standingBroodCells / CELLS_PER_DADANT_DEEP))
  // Days the queen lays nothing: TBR until comb is redrawn; caging for the whole cage period.
  const noLayDays =
    method === 'caging' ? nonNeg(c.cageDurationDays) + nonNeg(c.cageReleaseRelayDays) : nonNeg(c.reLayDelayDays)
  const beesFed = layRate * Math.max(0, days - noLayDays)
  const avgAdults =
    layRate * (nonNeg(c.emergenceToForagerDays) + nonNeg(c.foragingCareerDays)) * AVG_ADULT_FRACTION

  const combHoneyKg = framesToDraw * WAX_PER_DADANT_FRAME_KG * HONEY_PER_WAX_KG
  const broodHoneyKg = (beesFed * LARVAL_CARB_MG) / 1e6
  const upkeepHoneyKg = ((avgAdults * ADULT_SUGAR_MG_PER_DAY * days) / 1e6) * (1 + THERMO_OVERHEAD_FACTOR)
  const totalHoneyKg = combHoneyKg + broodHoneyKg + upkeepHoneyKg

  const pollenKg = (beesFed * POLLEN_PER_BEE_MG) / 1e6
  const pollenToForageKg = Math.max(0, pollenKg - STORED_BEEBREAD_KG)

  return {
    framesToDraw,
    combHoneyKg,
    broodHoneyKg,
    upkeepHoneyKg,
    totalHoneyKg,
    pollenKg,
    storedBeebreadKg: STORED_BEEBREAD_KG,
    pollenToForageKg,
  }
}

/** Age at first foraging for the post-break cohort (precocious when accelDays > 0). */
function postBreakForageAge(c: TbrConstants, accelDays: number): number {
  return Math.max(MIN_FORAGE_AGE_DAYS, c.emergenceToForagerDays - Math.max(0, accelDays))
}

/** Forager force on a day `t` days after the intervention (t may be negative). */
export function foragerForceAtOffset(
  t: number,
  c: TbrConstants,
  method: InterventionMethod = 'tbr',
  accelDays = 0
): number {
  const F = c.foragingCareerDays
  if (F <= 0) return 0
  const hPre = c.emergenceToForagerDays
  const hPost = postBreakForageAge(c, accelDays)
  const { start: gapStart, len: gapLen } = broodGap(c, method)
  const gapEnd = gapStart + gapLen

  // Normal-age cohort: emergence days e < gapStart contributing to foraging on offset t.
  const pre = countIntegers(t - hPre - F + 1, Math.min(t - hPre, gapStart - 1))
  // Post-gap cohort: emergence days e >= gapEnd contributing on offset t.
  const post = countIntegers(Math.max(t - hPost - F + 1, gapEnd), t - hPost)

  return Math.max(0, c.layRate * (pre + post))
}

/** Overall adult population on a day `t` days after the intervention (all ages, t may be negative). */
export function populationAtOffset(t: number, c: TbrConstants, method: InterventionMethod = 'tbr'): number {
  const A = totalAdultLifespanDays(c)
  if (A <= 0) return 0
  const { start: gapStart, len: gapLen } = broodGap(c, method)
  const gapEnd = gapStart + gapLen

  // Adults alive at t emerged on days e in [t - A + 1, t]; subtract the zero-emergence gap.
  const lo = t - A + 1
  const total = countIntegers(lo, t)
  const inGap = countIntegers(Math.max(lo, gapStart), Math.min(t, gapEnd - 1))

  return Math.max(0, c.layRate * (total - inGap))
}

export function simulateForagerCurve(
  tbrDate: string,
  startDate: string,
  endDate: string,
  c: TbrConstants,
  method: InterventionMethod = 'tbr',
  accelDays = 0
): ForagerPoint[] {
  const total = dayDiff(startDate, endDate)
  if (total < 0 || total > MAX_SIM_DAYS) return []
  const out: ForagerPoint[] = []
  for (let i = 0; i <= total; i++) {
    const date = addDays(startDate, i)
    const t = dayDiff(tbrDate, date)
    out.push({
      date,
      foragers: Math.round(foragerForceAtOffset(t, c, method, accelDays)),
      population: Math.round(populationAtOffset(t, c, method)),
    })
  }
  return out
}

export function tbrMilestones(
  tbrDate: string,
  c: TbrConstants,
  method: InterventionMethod = 'tbr',
  accelDays = 0
): TbrMilestones {
  const { start: gapStart, len: gapLen } = broodGap(c, method)
  const gapEnd = gapStart + gapLen
  // First new egg after the break: TBR after the re-lay delay; caging after release.
  const reLayOffset = method === 'caging' ? c.cageDurationDays + c.cageReleaseRelayDays : c.reLayDelayDays
  return {
    tbrDate,
    reLayDate: addDays(tbrDate, reLayOffset),
    firstBroodDate: addDays(tbrDate, gapEnd),
    firstForagerDate: addDays(tbrDate, gapEnd + postBreakForageAge(c, accelDays)),
    releaseDate: addDays(tbrDate, c.cageDurationDays),
    // No capped brood between the gap opening and the new brood being capped.
    broodlessStartDate: addDays(tbrDate, gapStart),
    broodlessEndDate: addDays(tbrDate, gapEnd - CAPPED_PHASE_DAYS),
  }
}

/** Average forager strength across [flowStart, flowEnd] as a 0..1 fraction of full strength. */
export function flowCoverage(
  tbrDate: string,
  flowStart: string,
  flowEnd: string,
  c: TbrConstants,
  method: InterventionMethod = 'tbr',
  accelDays = 0
): number {
  const days = dayDiff(flowStart, flowEnd)
  if (days < 0) return 0
  const steady = steadyStateForagers(c) || 1
  let sum = 0
  for (let i = 0; i <= days; i++) {
    const t = dayDiff(tbrDate, addDays(flowStart, i))
    sum += foragerForceAtOffset(t, c, method, accelDays)
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
  c: TbrConstants,
  method: InterventionMethod = 'tbr',
  accelDays = 0
): string | null {
  const span = dayDiff(earliest, latest)
  if (span < 0 || span > MAX_SIM_DAYS) return null
  let best: string | null = null
  let bestScore = -1
  for (let i = 0; i <= span; i++) {
    const cand = addDays(earliest, i)
    const score = flowCoverage(cand, flowStart, flowEnd, c, method, accelDays)
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
  nectarValue: number | null
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
  tbrOverride: string | null,
  method: InterventionMethod = 'tbr',
  accelDays = 0
): TbrResult | null {
  if (!summerStartDate) return null

  const flowStart = summerStartDate
  const flowEnd = summerEndDate ?? addDays(flowStart, SUMMER_FLOW_DURATION_DAYS)
  // A spring crop only constrains the plan if it genuinely ends before the flow starts;
  // an out-of-order selection is ignored rather than corrupting the bounds.
  const springEndRaw = springDate ? addDays(springDate, SPRING_CROP_DURATION_DAYS) : null
  const springEnd = springEndRaw && springEndRaw < flowStart ? springEndRaw : null

  // Full forager recovery takes this long after a break: the gap must close, then a
  // new bee must age into foraging and serve its career.
  const { start: gapStart, len: gapLen } = broodGap(constants, method)
  const recoveryDays =
    gapStart + gapLen + constants.emergenceToForagerDays + constants.foragingCareerDays

  // Earliest feasible break: after the spring crop is off. Without a spring crop,
  // fall back to "one full recovery before the flow".
  const earliest = springEnd ?? addDays(flowStart, -recoveryDays)
  const latest = maxDate(earliest, flowStart)

  const recommended = recommendTbrDate(earliest, latest, flowStart, flowEnd, constants, method, accelDays)
  const effectiveTbrDate = tbrOverride ?? recommended ?? earliest

  const milestones = tbrMilestones(effectiveTbrDate, constants, method, accelDays)
  const simStart = addDays(minDate(earliest, effectiveTbrDate, springEnd ?? earliest), -21)
  const simEnd = addDays(maxDate(flowEnd, milestones.firstForagerDate), 21)

  const curve = simulateForagerCurve(effectiveTbrDate, simStart, simEnd, constants, method, accelDays)
  const score = flowCoverage(effectiveTbrDate, flowStart, flowEnd, constants, method, accelDays)
  const recoveryAfterFlowStart = milestones.firstForagerDate > flowStart

  return {
    bounds: { springEnd, flowStart, flowEnd, earliest, latest },
    plan: {
      curve,
      milestones,
      flowCoverageScore: score,
      recommendedTbrDate: recommended,
      recoveryAfterFlowStart,
    },
    effectiveTbrDate,
  }
}
