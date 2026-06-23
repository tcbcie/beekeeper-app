// Total Brood Removal (TBR) swarm-prevention planner — type definitions.
//
// TBR removes all brood and replaces it with foundation so the colony behaves as
// if it had swarmed, triggering a brood break that controls swarming. This planner
// works out WHEN to do it so the colony's forager force rebuilds to peak across the
// next nectar flow (e.g. bramble/blackberry).

export interface TbrConstants {
  /** Days to draw enough comb before the queen resumes laying. */
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
}

export const DEFAULT_TBR_CONSTANTS: TbrConstants = {
  reLayDelayDays: 4,
  eggToEmergenceDays: 21,
  emergenceToForagerDays: 21,
  layRate: 1200,
  foragingCareerDays: 8,
}

/** How confident a resolved crop date is — see the 3-tier resolution model. */
export type CropDateTier = 'observed' | 'projected' | 'estimated' | 'unknown'

export interface ResolvedCropDate {
  vegetationTypeId: string | null
  name: string
  /** Predicted bloom-start date (YYYY-MM-DD), or null if it cannot be resolved. */
  date: string | null
  /** GDD threshold used to derive the date (for transparency). */
  gddTarget: number | null
  tier: CropDateTier
  /** Human-readable explanation of how the date was derived. */
  note: string
}

export interface ForagerPoint {
  date: string
  foragers: number
}

export interface TbrMilestones {
  tbrDate: string
  reLayDate: string
  firstBroodDate: string
  firstForagerDate: string
}

export interface TbrPlan {
  curve: ForagerPoint[]
  milestones: TbrMilestones
  /** 0..1 — average forager strength across the flow window, as a fraction of full strength. */
  flowCoverageScore: number
  /** The date the model recommends, or null if it could not be computed. */
  recommendedTbrDate: string | null
  /**
   * True when the first new foragers arrive only AFTER the flow has started — i.e. the brood-break
   * dip lands during/after the flow. The early flow then rides existing foragers (a misleadingly
   * decent score) before strength collapses, leaving the colony weak for the late flow and autumn.
   */
  recoveryAfterFlowStart: boolean
}
