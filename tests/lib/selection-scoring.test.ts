import { describe, it, expect } from 'vitest'
import { averageRated, honeyStoresRating, scoreHives } from '@/lib/selection-scoring'
import type { HiveWithInspections } from '@/hooks/useBatchesList'

/**
 * Selection scoring must ignore ratings that were never filled in (C5b-16). An unrated field is
 * stored as 0, and counting it made unrated swarming score as perfect.
 */

const weights = {
  brood_pattern: 3, population: 3, temperament: 3, swarming: 3, honey_yield: 3,
  calmness: 3, recapping: 3, vsh: 3, smr: 3, chalkbrood: 3,
}
const optionalColumns = { calmness: false, recapping: false, vsh: false, smr: false, chalkbrood: false }

const inspection = (swarming: number, brood = 4) => ({
  inspection_date: '2026-06-01',
  brood_pattern_rating: brood,
  population_strength: 4,
  temperament_rating: 4,
  swarming_tendency: swarming,
  honey_stores: 'Good',
  calmness: 0, recapping: 0, vsh: 0, smr: 0, chalkbrood_disease: 0,
})

const hive = (id: string, swarming: number[]): HiveWithInspections => ({
  id, hive_number: id, apiary_id: 'a', apiaries: { name: 'Home' },
  inspections: swarming.map(s => inspection(s)),
})

describe('averageRated', () => {
  it('ignores unrated (0 or null) values', () => {
    expect(averageRated([0, 4, null, 2])).toBe(3)
  })
  it('is null when nothing was rated', () => {
    expect(averageRated([0, 0, null])).toBeNull()
  })
})

describe('honeyStoresRating', () => {
  it('treats empty stores as unrated, not the worst', () => {
    expect(honeyStoresRating('')).toBeNull()
    expect(honeyStoresRating('Full')).toBe(5)
  })
})

describe('scoreHives', () => {
  const opts = { startDate: null, endDate: null, weights, optionalColumns }

  it('does not rank an unrated swarming hive above one rated low', () => {
    // Unrated swarming used to count as 0 and invert to a perfect 6
    const [first] = scoreHives([hive('unrated', [0, 0, 0]), hive('calm', [1, 1, 1])], opts)
    expect(first.hive_id).toBe('calm')
  })

  it('shows unrated averages as null', () => {
    const [scored] = scoreHives([hive('h', [0, 0, 0])], opts)
    expect(scored.averages.swarming).toBeNull()
    expect(scored.averages.calmness).toBeNull()
  })

  it('needs at least 3 inspections in the period', () => {
    expect(scoreHives([hive('h', [1, 1])], opts)).toHaveLength(0)
  })
})
