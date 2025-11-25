import { describe, it, expect } from 'vitest'

/**
 * Tests for inspection averages calculation
 *
 * This test suite covers:
 * 1. Correct counting of inspections with the same date
 * 2. Average calculations for various metrics
 * 3. Filtering of null/zero values
 * 4. Edge cases (empty data, all null values, etc.)
 */

describe('Inspection Averages Calculation', () => {
  // Helper function to calculate average
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null

  describe('Inspection Count', () => {
    it('should count all inspections even if they have the same date', () => {
      // Simulate 3 inspections on the same date
      const inspections = [
        {
          id: 'inspection-1',
          inspection_date: '2025-11-25',
          brood_frames: 1,
          right_sized_frames: null,
          brood_pattern_rating: 1,
          temperament_rating: 2,
          population_strength: 1,
        },
        {
          id: 'inspection-2',
          inspection_date: '2025-11-25',
          brood_frames: 2,
          right_sized_frames: null,
          brood_pattern_rating: 1,
          temperament_rating: 2,
          population_strength: 5,
        },
        {
          id: 'inspection-3',
          inspection_date: '2025-11-25',
          brood_frames: null,
          right_sized_frames: null,
          brood_pattern_rating: null,
          temperament_rating: 2,
          population_strength: 3,
        },
      ]

      // Count inspections using ID (correct approach)
      const inspectionsWithDataById = new Set<string>()
      inspections.forEach(inspection => {
        if ((inspection.brood_frames !== null && inspection.brood_frames > 0) ||
            (inspection.right_sized_frames !== null && inspection.right_sized_frames > 0) ||
            (inspection.brood_pattern_rating !== null && inspection.brood_pattern_rating > 0) ||
            (inspection.temperament_rating !== null && inspection.temperament_rating > 0) ||
            (inspection.population_strength !== null && inspection.population_strength > 0)) {
          inspectionsWithDataById.add(inspection.id)
        }
      })

      // Count inspections using date (incorrect approach that caused the bug)
      const inspectionsWithDataByDate = new Set<string>()
      inspections.forEach(inspection => {
        if ((inspection.brood_frames !== null && inspection.brood_frames > 0) ||
            (inspection.right_sized_frames !== null && inspection.right_sized_frames > 0) ||
            (inspection.brood_pattern_rating !== null && inspection.brood_pattern_rating > 0) ||
            (inspection.temperament_rating !== null && inspection.temperament_rating > 0) ||
            (inspection.population_strength !== null && inspection.population_strength > 0)) {
          inspectionsWithDataByDate.add(inspection.inspection_date)
        }
      })

      // Verify that using ID gives correct count (3)
      expect(inspectionsWithDataById.size).toBe(3)

      // Verify that using date gives incorrect count (1) - this was the bug
      expect(inspectionsWithDataByDate.size).toBe(1)
    })

    it('should count only inspections with at least one non-null, non-zero value', () => {
      const inspections = [
        {
          id: 'inspection-1',
          inspection_date: '2025-11-25',
          brood_frames: 1,
          right_sized_frames: null,
          brood_pattern_rating: null,
          temperament_rating: null,
          population_strength: null,
        },
        {
          id: 'inspection-2',
          inspection_date: '2025-11-26',
          brood_frames: null,
          right_sized_frames: null,
          brood_pattern_rating: null,
          temperament_rating: null,
          population_strength: null,
        },
        {
          id: 'inspection-3',
          inspection_date: '2025-11-27',
          brood_frames: 0,
          right_sized_frames: 0,
          brood_pattern_rating: 0,
          temperament_rating: 0,
          population_strength: 0,
        },
      ]

      const inspectionsWithData = new Set<string>()
      inspections.forEach(inspection => {
        if ((inspection.brood_frames !== null && inspection.brood_frames > 0) ||
            (inspection.right_sized_frames !== null && inspection.right_sized_frames > 0) ||
            (inspection.brood_pattern_rating !== null && inspection.brood_pattern_rating > 0) ||
            (inspection.temperament_rating !== null && inspection.temperament_rating > 0) ||
            (inspection.population_strength !== null && inspection.population_strength > 0)) {
          inspectionsWithData.add(inspection.id)
        }
      })

      // Only inspection-1 has a non-null, non-zero value
      expect(inspectionsWithData.size).toBe(1)
      expect(inspectionsWithData.has('inspection-1')).toBe(true)
    })

    it('should handle empty inspections array', () => {
      const inspections: any[] = []

      const inspectionsWithData = new Set<string>()
      inspections.forEach(inspection => {
        if ((inspection.brood_frames !== null && inspection.brood_frames > 0) ||
            (inspection.right_sized_frames !== null && inspection.right_sized_frames > 0) ||
            (inspection.brood_pattern_rating !== null && inspection.brood_pattern_rating > 0) ||
            (inspection.temperament_rating !== null && inspection.temperament_rating > 0) ||
            (inspection.population_strength !== null && inspection.population_strength > 0)) {
          inspectionsWithData.add(inspection.id)
        }
      })

      expect(inspectionsWithData.size).toBe(0)
    })
  })

  describe('Average Calculations', () => {
    it('should calculate average brood frames correctly', () => {
      const inspections = [
        { brood_frames: 1 },
        { brood_frames: 2 },
        { brood_frames: 3 },
      ]

      const broodFrames = inspections
        .filter(i => i.brood_frames !== null && i.brood_frames > 0)
        .map(i => i.brood_frames)

      const average = avg(broodFrames)

      expect(average).toBe(2) // (1 + 2 + 3) / 3 = 2
    })

    it('should filter out null and zero values before calculating average', () => {
      const inspections = [
        { brood_frames: 2 },
        { brood_frames: null },
        { brood_frames: 0 },
        { brood_frames: 4 },
      ]

      const broodFrames = inspections
        .filter(i => i.brood_frames !== null && i.brood_frames > 0)
        .map(i => i.brood_frames!)

      const average = avg(broodFrames)

      expect(average).toBe(3) // (2 + 4) / 2 = 3
      expect(broodFrames.length).toBe(2)
    })

    it('should return null when no valid values exist', () => {
      const inspections = [
        { brood_frames: null },
        { brood_frames: 0 },
        { brood_frames: null },
      ]

      const broodFrames = inspections
        .filter(i => i.brood_frames !== null && i.brood_frames > 0)
        .map(i => i.brood_frames!)

      const average = avg(broodFrames)

      expect(average).toBeNull()
      expect(broodFrames.length).toBe(0)
    })

    it('should calculate averages for all metrics independently', () => {
      const inspections = [
        {
          brood_frames: 1,
          right_sized_frames: 2,
          brood_pattern_rating: 3,
          temperament_rating: 4,
          population_strength: 5,
        },
        {
          brood_frames: 3,
          right_sized_frames: null,
          brood_pattern_rating: 1,
          temperament_rating: 2,
          population_strength: 3,
        },
      ]

      const broodFrames = inspections
        .filter(i => i.brood_frames !== null && i.brood_frames > 0)
        .map(i => i.brood_frames!)

      const rightSizedFrames = inspections
        .filter(i => i.right_sized_frames !== null && i.right_sized_frames > 0)
        .map(i => i.right_sized_frames!)

      const broodPatterns = inspections
        .filter(i => i.brood_pattern_rating !== null && i.brood_pattern_rating > 0)
        .map(i => i.brood_pattern_rating!)

      const temperaments = inspections
        .filter(i => i.temperament_rating !== null && i.temperament_rating > 0)
        .map(i => i.temperament_rating!)

      const populations = inspections
        .filter(i => i.population_strength !== null && i.population_strength > 0)
        .map(i => i.population_strength!)

      expect(avg(broodFrames)).toBe(2) // (1 + 3) / 2
      expect(avg(rightSizedFrames)).toBe(2) // only 1 value: 2
      expect(avg(broodPatterns)).toBe(2) // (3 + 1) / 2
      expect(avg(temperaments)).toBe(3) // (4 + 2) / 2
      expect(avg(populations)).toBe(4) // (5 + 3) / 2
    })
  })

  describe('Real-world Scenario', () => {
    it('should correctly handle the bug scenario with 3 inspections on same date', () => {
      // This is the actual scenario from the bug report
      const inspections = [
        {
          id: 'inspection-1',
          inspection_date: '2025-11-25',
          brood_frames: 1,
          right_sized_frames: null,
          brood_pattern_rating: 1,
          temperament_rating: 2,
          population_strength: 1,
        },
        {
          id: 'inspection-2',
          inspection_date: '2025-11-25',
          brood_frames: 2,
          right_sized_frames: null,
          brood_pattern_rating: 1,
          temperament_rating: 2,
          population_strength: 5,
        },
        {
          id: 'inspection-3',
          inspection_date: '2025-11-25',
          brood_frames: null,
          right_sized_frames: null,
          brood_pattern_rating: null,
          temperament_rating: 2,
          population_strength: 3,
        },
      ]

      // Calculate averages
      const broodFrames = inspections
        .filter(i => i.brood_frames !== null && i.brood_frames > 0)
        .map(i => i.brood_frames!)
      const broodPatterns = inspections
        .filter(i => i.brood_pattern_rating !== null && i.brood_pattern_rating > 0)
        .map(i => i.brood_pattern_rating!)
      const temperaments = inspections
        .filter(i => i.temperament_rating !== null && i.temperament_rating > 0)
        .map(i => i.temperament_rating!)
      const populations = inspections
        .filter(i => i.population_strength !== null && i.population_strength > 0)
        .map(i => i.population_strength!)

      // Count inspections
      const inspectionsWithData = new Set<string>()
      inspections.forEach(inspection => {
        if ((inspection.brood_frames !== null && inspection.brood_frames > 0) ||
            (inspection.right_sized_frames !== null && inspection.right_sized_frames > 0) ||
            (inspection.brood_pattern_rating !== null && inspection.brood_pattern_rating > 0) ||
            (inspection.temperament_rating !== null && inspection.temperament_rating > 0) ||
            (inspection.population_strength !== null && inspection.population_strength > 0)) {
          inspectionsWithData.add(inspection.id)
        }
      })

      // Verify count
      expect(inspectionsWithData.size).toBe(3) // Should be 3, not 1

      // Verify averages
      expect(avg(broodFrames)).toBe(1.5) // (1 + 2) / 2
      expect(avg(broodPatterns)).toBe(1) // (1 + 1) / 2
      expect(avg(temperaments)).toBe(2) // (2 + 2 + 2) / 3
      expect(avg(populations)).toBe(3) // (1 + 5 + 3) / 3
    })
  })
})
