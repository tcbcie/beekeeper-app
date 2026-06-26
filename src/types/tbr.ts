// Total Brood Removal (TBR) swarm-prevention planner — type definitions.
//
// TBR removes all brood and replaces it with foundation so the colony behaves as
// if it had swarmed, triggering a brood break that controls swarming. This planner
// works out WHEN to do it so the colony's forager force rebuilds to peak across the
// next nectar flow (e.g. bramble/blackberry).

/**
 * How the brood break is induced:
 *   • 'tbr'    — Total Brood Removal: all brood removed at T, comb redrawn.
 *   • 'caging' — queen caged at T: existing brood emerges, then a gap until she re-lays.
 */
export type InterventionMethod = 'tbr' | 'caging'

export interface TbrConstants {
  /** Days to draw enough comb before the queen resumes laying (TBR only). */
  reLayDelayDays: number
  /** Worker egg → emergence development time. */
  eggToEmergenceDays: number
  /** House-bee phase: emergence → first foraging flight (age at first foraging). */
  emergenceToForagerDays: number
  /** Queen lay rate (eggs/day) once re-laying. */
  layRate: number
  /**
   * Foraging career — days a bee actively forages before dying (~7 d median;
   * Visscher & Dukas 1997). Total adult lifespan is this plus emergenceToForagerDays.
   */
  foragingCareerDays: number
  /** Days the queen stays caged (caging only): 21 clears worker brood, 24 also clears drone brood. */
  cageDurationDays: number
  /** Small delay after release before the freed queen lays again — comb is already drawn (caging only). */
  cageReleaseRelayDays: number
}

export const DEFAULT_TBR_CONSTANTS: TbrConstants = {
  reLayDelayDays: 4,
  eggToEmergenceDays: 21,
  emergenceToForagerDays: 21,
  layRate: 1200,
  foragingCareerDays: 8,
  cageDurationDays: 21,
  cageReleaseRelayDays: 1,
}

/** How confident a resolved crop date is — see the 3-tier resolution model. */
export type CropDateTier = 'observed' | 'projected' | 'estimated' | 'unknown'

export interface ResolvedCropDate {
  vegetationTypeId: string | null
  name: string
  /** Predicted bloom-start date (~10% in bloom), or null if it cannot be resolved. */
  date: string | null
  /** Predicted bloom-end date (under 5% still worth foraging), or null if start is unknown. */
  endDate: string | null
  /** GDD threshold used to derive the date (for transparency). */
  gddTarget: number | null
  tier: CropDateTier
  /** Human-readable explanation of how the date was derived. */
  note: string
}

export interface ForagerPoint {
  date: string
  foragers: number
  /** Overall adult population (all ages) on that day. */
  population: number
}

export interface TbrMilestones {
  /** The intervention day T (brood removed, or queen caged). */
  tbrDate: string
  /** When the queen resumes laying (TBR: T + re-lay delay; caging: release + release-relay). */
  reLayDate: string
  /** First NEW brood emerges after the gap. */
  firstBroodDate: string
  firstForagerDate: string
  /** Caging only: the day the queen is released from the cage. */
  releaseDate: string
  /** Start of the broodless (no capped brood) window — earliest oxalic-acid treatment day. */
  broodlessStartDate: string
  /** End of the broodless window — treat before this. */
  broodlessEndDate: string
}

export interface TbrPlan {
  curve: ForagerPoint[]
  milestones: TbrMilestones
  /** 0..1 — average forager strength across the flow window, as a fraction of full strength. */
  flowCoverageScore: number
  /** 0..1 — average forager strength across the (weather-trimmed) spring window at the chosen date. */
  springCoverageScore: number
  /** The date the model recommends, or null if it could not be computed. */
  recommendedTbrDate: string | null
  /**
   * True when the first new foragers arrive only AFTER the flow has started — i.e. the brood-break
   * dip lands during/after the flow. The early flow then rides existing foragers (a misleadingly
   * decent score) before strength collapses, leaving the colony weak for the late flow and autumn.
   */
  recoveryAfterFlowStart: boolean
}
