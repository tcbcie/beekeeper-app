import type { HiveScore, HiveWithInspections } from '@/hooks/useBatchesList'

/** Weight per criterion (1-5 buttons on the Selection tab). */
export type SelectionWeights = Record<keyof HiveScore['averages'], number>
/** Optional criteria the user has switched on. */
export type SelectionOptionalColumns = Pick<Record<keyof HiveScore['averages'], boolean>, 'calmness' | 'recapping' | 'vsh' | 'smr' | 'chalkbrood'>

/** The score a criterion counts as when a hive has no rating for it: the middle of the 1-5 scale. */
const NEUTRAL_RATING = 3

/**
 * Average of the ratings that were given. An unrated field is stored as 0 (the form default), so
 * counting it would make an unrated swarming or chalkbrood score perfect after inversion and drag
 * brood down (C5b-16). Null when nothing was rated.
 */
export function averageRated(values: ReadonlyArray<number | null | undefined>): number | null {
  const rated = values.filter((v): v is number => typeof v === 'number' && v > 0)
  return rated.length ? rated.reduce((sum, v) => sum + v, 0) / rated.length : null
}

/** An average for the table: "–" when nothing was rated, rather than a made-up number. */
export function formatAverage(value: number | null): string {
  return value == null ? '–' : value.toFixed(1)
}

/** Honey stores text as a 1-5 rating; empty or unrecognised text is unrated, not the worst. */
export function honeyStoresRating(stores: string | null | undefined): number | null {
  const s = stores?.toLowerCase() || ''
  if (s.includes('full')) return 5
  if (s.includes('good')) return 4
  if (s.includes('moderate')) return 3
  if (s.includes('low')) return 2
  return null
}

/**
 * Rank hives for selection from already-loaded inspections. Pure, so changing weights or options
 * only recalculates; it never refetches. Hives need at least 3 inspections in the period.
 */
export function scoreHives(
  hives: readonly HiveWithInspections[],
  { startDate, endDate, weights, optionalColumns }: {
    startDate: Date | null
    endDate: Date | null
    weights: SelectionWeights
    optionalColumns: SelectionOptionalColumns
  }
): HiveScore[] {
  const scored: HiveScore[] = []
  for (const hive of hives) {
    const inspections = (hive.inspections || []).filter(i => {
      const date = new Date(i.inspection_date)
      return (!startDate || date >= startDate) && (!endDate || date <= endDate)
    })
    if (inspections.length < 3) continue

    const averages: HiveScore['averages'] = {
      brood_pattern: averageRated(inspections.map(i => i.brood_pattern_rating)),
      population: averageRated(inspections.map(i => i.population_strength)),
      temperament: averageRated(inspections.map(i => i.temperament_rating)),
      swarming: averageRated(inspections.map(i => i.swarming_tendency)),
      honey_yield: averageRated(inspections.map(i => honeyStoresRating(i.honey_stores))),
      calmness: averageRated(inspections.map(i => i.calmness)),
      recapping: averageRated(inspections.map(i => i.recapping)),
      vsh: averageRated(inspections.map(i => i.vsh)),
      smr: averageRated(inspections.map(i => i.smr)),
      chalkbrood: averageRated(inspections.map(i => i.chalkbrood_disease)),
    }
    const r = (v: number | null) => v ?? NEUTRAL_RATING

    // Lower swarming and chalkbrood are better, so they are inverted on the 1-5 scale (6 - value)
    let score =
      r(averages.brood_pattern) * weights.brood_pattern +
      r(averages.population) * weights.population +
      r(averages.temperament) * weights.temperament +
      (6 - r(averages.swarming)) * weights.swarming +
      r(averages.honey_yield) * weights.honey_yield
    if (optionalColumns.calmness) score += r(averages.calmness) * weights.calmness
    if (optionalColumns.recapping) score += r(averages.recapping) * weights.recapping
    if (optionalColumns.vsh) score += r(averages.vsh) * weights.vsh
    if (optionalColumns.smr) score += r(averages.smr) * weights.smr
    if (optionalColumns.chalkbrood) score += (6 - r(averages.chalkbrood)) * weights.chalkbrood

    scored.push({
      hive_id: hive.id,
      hive_number: hive.hive_number,
      apiary_name: hive.apiaries?.name || 'Unknown',
      inspection_count: inspections.length,
      averages,
      score,
    })
  }
  return scored.sort((a, b) => b.score - a.score)
}
