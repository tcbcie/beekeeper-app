import { describe, it, expect } from 'vitest'

/**
 * Tests for HiveConfigurationHistory component change comparison logic
 *
 * This test suite covers:
 * 1. Only showing changed attributes between configurations
 * 2. Not showing unchanged attributes (e.g., "Queen mated: No → No")
 * 3. Correctly identifying initial configuration entries
 * 4. Filtering out default values in initial entries
 */

describe('HiveConfigurationHistory - Change Comparison', () => {
  interface HiveConfiguration {
    brood_boxes?: number
    brood_boxes_full?: number
    brood_boxes_half?: number
    honey_supers?: number
    queen_excluder?: boolean
    feeder?: boolean
    feeder_type?: string
    entrance_reducer?: boolean
    varroa_mesh_floor?: string
    right_sized_broodbox?: boolean
    frame_orientation?: string | null
    hive_size?: 'full' | 'nuc'
  }

  interface ConfigurationHistoryEntry {
    id: string
    hive_id: string
    changed_at: string
    changed_by: string
    configuration: HiveConfiguration
    apiary_id?: string | null
    row_in_apiary?: number | null
    order_in_apiary?: number | null
    queen_id?: string | null
    queen_marked?: boolean | null
    queen_marking_color?: string | null
    queen_mated?: boolean | null
    queen_clipped?: boolean | null
  }

  const compareQueenInfo = (current: ConfigurationHistoryEntry, previous?: ConfigurationHistoryEntry): Array<{field: string, before: string, after: string}> => {
    const changes: Array<{field: string, before: string, after: string}> = []

    if (!previous) {
      // Initial entry - show queen info ONLY if set to meaningful values
      if (current.queen_id) {
        changes.push({
          field: 'Queen',
          before: '-',
          after: 'Queen assigned'
        })
      }

      // Show manual queen status flags ONLY if they are true (when no specific queen assigned)
      // Don't show "No" values for initial entry as they're just defaults
      if (!current.queen_id) {
        if (current.queen_marked) {
          changes.push({
            field: 'Queen marked',
            before: '-',
            after: current.queen_marking_color || 'Yes'
          })
        }
        if (current.queen_mated) {
          changes.push({
            field: 'Queen mated',
            before: '-',
            after: 'Yes'
          })
        }
        if (current.queen_clipped) {
          changes.push({
            field: 'Queen clipped',
            before: '-',
            after: 'Yes'
          })
        }
      }
      return changes
    }

    // Check manual queen status flags (only when no specific queen assigned)
    // Only show changes if values actually differ
    if (!current.queen_id && !previous.queen_id) {
      if (current.queen_marked !== previous.queen_marked || current.queen_marking_color !== previous.queen_marking_color) {
        const previousStatus = previous.queen_marked ? (previous.queen_marking_color || 'Marked') : 'Not marked'
        const currentStatus = current.queen_marked ? (current.queen_marking_color || 'Marked') : 'Not marked'

        // Only add if there's an actual change
        if (previousStatus !== currentStatus) {
          changes.push({
            field: 'Queen marked',
            before: previousStatus,
            after: currentStatus
          })
        }
      }

      if (current.queen_mated !== previous.queen_mated) {
        changes.push({
          field: 'Queen mated',
          before: previous.queen_mated ? 'Yes' : 'No',
          after: current.queen_mated ? 'Yes' : 'No'
        })
      }

      if (current.queen_clipped !== previous.queen_clipped) {
        changes.push({
          field: 'Queen clipped',
          before: previous.queen_clipped ? 'Yes' : 'No',
          after: current.queen_clipped ? 'Yes' : 'No'
        })
      }
    }

    return changes
  }

  describe('Initial Entry Behavior', () => {
    it('should not show queen status flags when they are false (default values)', () => {
      const initialEntry: ConfigurationHistoryEntry = {
        id: 'entry-1',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T10:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: false,
        queen_mated: false,
        queen_clipped: false,
        queen_id: null
      }

      const changes = compareQueenInfo(initialEntry)

      expect(changes).toHaveLength(0)
    })

    it('should show queen marked status when true in initial entry', () => {
      const initialEntry: ConfigurationHistoryEntry = {
        id: 'entry-1',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T10:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: true,
        queen_marking_color: 'Red',
        queen_mated: false,
        queen_clipped: false,
        queen_id: null
      }

      const changes = compareQueenInfo(initialEntry)

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({
        field: 'Queen marked',
        before: '-',
        after: 'Red'
      })
    })

    it('should show all queen status flags when true in initial entry', () => {
      const initialEntry: ConfigurationHistoryEntry = {
        id: 'entry-1',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T10:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: true,
        queen_marking_color: 'Blue',
        queen_mated: true,
        queen_clipped: true,
        queen_id: null
      }

      const changes = compareQueenInfo(initialEntry)

      expect(changes).toHaveLength(3)
      expect(changes.map(c => c.field)).toEqual([
        'Queen marked',
        'Queen mated',
        'Queen clipped'
      ])
    })
  })

  describe('Unchanged Values', () => {
    it('should NOT show unchanged queen mated status (No → No)', () => {
      const current: ConfigurationHistoryEntry = {
        id: 'entry-2',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T11:00:00Z',
        changed_by: 'user-1',
        configuration: { brood_boxes: 2 }, // Some other change
        queen_marked: false,
        queen_mated: false,
        queen_clipped: false,
        queen_id: null
      }

      const previous: ConfigurationHistoryEntry = {
        id: 'entry-1',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T10:00:00Z',
        changed_by: 'user-1',
        configuration: { brood_boxes: 1 },
        queen_marked: false,
        queen_mated: false,
        queen_clipped: false,
        queen_id: null
      }

      const changes = compareQueenInfo(current, previous)

      // Should not show any queen changes since all values are the same
      expect(changes).toHaveLength(0)
    })

    it('should NOT show unchanged queen clipped status (No → No)', () => {
      const current: ConfigurationHistoryEntry = {
        id: 'entry-2',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T11:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: true,
        queen_marking_color: 'Red',
        queen_mated: true,
        queen_clipped: false, // Unchanged
        queen_id: null
      }

      const previous: ConfigurationHistoryEntry = {
        id: 'entry-1',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T10:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: true,
        queen_marking_color: 'Red',
        queen_mated: true,
        queen_clipped: false, // Unchanged
        queen_id: null
      }

      const changes = compareQueenInfo(current, previous)

      expect(changes).toHaveLength(0)
    })

    it('should NOT show unchanged queen marked status when both marked with same color', () => {
      const current: ConfigurationHistoryEntry = {
        id: 'entry-2',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T11:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: true,
        queen_marking_color: 'Yellow',
        queen_mated: false,
        queen_clipped: false,
        queen_id: null
      }

      const previous: ConfigurationHistoryEntry = {
        id: 'entry-1',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T10:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: true,
        queen_marking_color: 'Yellow',
        queen_mated: false,
        queen_clipped: false,
        queen_id: null
      }

      const changes = compareQueenInfo(current, previous)

      expect(changes).toHaveLength(0)
    })
  })

  describe('Actual Changes', () => {
    it('should show queen mated status change from No to Yes', () => {
      const current: ConfigurationHistoryEntry = {
        id: 'entry-2',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T11:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: false,
        queen_mated: true, // Changed
        queen_clipped: false,
        queen_id: null
      }

      const previous: ConfigurationHistoryEntry = {
        id: 'entry-1',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T10:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: false,
        queen_mated: false, // Was false
        queen_clipped: false,
        queen_id: null
      }

      const changes = compareQueenInfo(current, previous)

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({
        field: 'Queen mated',
        before: 'No',
        after: 'Yes'
      })
    })

    it('should show queen clipped status change from No to Yes', () => {
      const current: ConfigurationHistoryEntry = {
        id: 'entry-2',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T11:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: false,
        queen_mated: false,
        queen_clipped: true, // Changed
        queen_id: null
      }

      const previous: ConfigurationHistoryEntry = {
        id: 'entry-1',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T10:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: false,
        queen_mated: false,
        queen_clipped: false, // Was false
        queen_id: null
      }

      const changes = compareQueenInfo(current, previous)

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({
        field: 'Queen clipped',
        before: 'No',
        after: 'Yes'
      })
    })

    it('should show queen marked color change', () => {
      const current: ConfigurationHistoryEntry = {
        id: 'entry-2',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T11:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: true,
        queen_marking_color: 'Blue', // Changed color
        queen_mated: false,
        queen_clipped: false,
        queen_id: null
      }

      const previous: ConfigurationHistoryEntry = {
        id: 'entry-1',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T10:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: true,
        queen_marking_color: 'Red', // Was red
        queen_mated: false,
        queen_clipped: false,
        queen_id: null
      }

      const changes = compareQueenInfo(current, previous)

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({
        field: 'Queen marked',
        before: 'Red',
        after: 'Blue'
      })
    })

    it('should show queen marked status change from Not marked to Marked', () => {
      const current: ConfigurationHistoryEntry = {
        id: 'entry-2',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T11:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: true,
        queen_marking_color: 'Green',
        queen_mated: false,
        queen_clipped: false,
        queen_id: null
      }

      const previous: ConfigurationHistoryEntry = {
        id: 'entry-1',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T10:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: false,
        queen_marking_color: null,
        queen_mated: false,
        queen_clipped: false,
        queen_id: null
      }

      const changes = compareQueenInfo(current, previous)

      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({
        field: 'Queen marked',
        before: 'Not marked',
        after: 'Green'
      })
    })

    it('should show multiple changes when several attributes change', () => {
      const current: ConfigurationHistoryEntry = {
        id: 'entry-2',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T11:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: true,
        queen_marking_color: 'White',
        queen_mated: true,
        queen_clipped: true,
        queen_id: null
      }

      const previous: ConfigurationHistoryEntry = {
        id: 'entry-1',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T10:00:00Z',
        changed_by: 'user-1',
        configuration: {},
        queen_marked: false,
        queen_marking_color: null,
        queen_mated: false,
        queen_clipped: false,
        queen_id: null
      }

      const changes = compareQueenInfo(current, previous)

      expect(changes).toHaveLength(3)
      expect(changes.map(c => c.field)).toEqual([
        'Queen marked',
        'Queen mated',
        'Queen clipped'
      ])
    })
  })

  describe('Real-world Scenario from Bug Report', () => {
    it('should NOT show "Queen mated: No → No" or "Queen clipped: No → No"', () => {
      // This is the actual bug scenario - a configuration was saved without
      // changing queen status, but the history showed "No → No" for these fields
      const current: ConfigurationHistoryEntry = {
        id: 'entry-2',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T11:00:00Z',
        changed_by: 'user-1',
        configuration: {
          brood_boxes: 2, // This changed
          honey_supers: 1  // This changed
        },
        queen_marked: false, // Unchanged
        queen_mated: false,  // Unchanged - was showing "No → No"
        queen_clipped: false, // Unchanged - was showing "No → No"
        queen_id: null
      }

      const previous: ConfigurationHistoryEntry = {
        id: 'entry-1',
        hive_id: 'hive-1',
        changed_at: '2025-11-25T10:00:00Z',
        changed_by: 'user-1',
        configuration: {
          brood_boxes: 1,
          honey_supers: 0
        },
        queen_marked: false, // Unchanged
        queen_mated: false,  // Unchanged
        queen_clipped: false, // Unchanged
        queen_id: null
      }

      const changes = compareQueenInfo(current, previous)

      // Should not show any queen changes since all values are the same
      expect(changes).toHaveLength(0)

      // Explicitly verify that "No → No" changes are NOT present
      const hasMatedChange = changes.some(c =>
        c.field === 'Queen mated' && c.before === 'No' && c.after === 'No'
      )
      const hasClippedChange = changes.some(c =>
        c.field === 'Queen clipped' && c.before === 'No' && c.after === 'No'
      )

      expect(hasMatedChange).toBe(false)
      expect(hasClippedChange).toBe(false)
    })
  })
})
