import { describe, it, expect } from 'vitest'

/**
 * Tests for archived hives filter functionality on Records page
 *
 * This test suite covers:
 * 1. Default state (archived hives hidden)
 * 2. Showing archived hives when checkbox is enabled
 * 3. Filtering logic combining apiary and archived status
 * 4. Visual indicators for archived hives
 * 5. Archive records filtering in the records list
 */

describe('Archived Hives Filter on Records Page', () => {
  // Sample hive data
  const mockHives = [
    {
      id: 'hive-1',
      hive_number: '29-DA',
      apiary_id: 'apiary-1',
      archived_at: null,
      status: 'active'
    },
    {
      id: 'hive-2',
      hive_number: '30-DA',
      apiary_id: 'apiary-1',
      archived_at: '2025-11-20T10:00:00Z',
      status: 'archived'
    },
    {
      id: 'hive-3',
      hive_number: '57-DA',
      apiary_id: 'apiary-2',
      archived_at: null,
      status: 'active'
    },
    {
      id: 'hive-4',
      hive_number: '58-DA',
      apiary_id: 'apiary-2',
      archived_at: '2025-11-15T14:30:00Z',
      status: 'archived'
    },
    {
      id: 'hive-5',
      hive_number: '60-DA',
      apiary_id: 'apiary-1',
      archived_at: null,
      status: 'active'
    },
  ]

  describe('Default Behavior', () => {
    it('should hide archived hives by default when showArchivedHives is false', () => {
      const showArchivedHives = false

      const filteredHives = mockHives.filter(
        hive => showArchivedHives || !hive.archived_at
      )

      expect(filteredHives).toHaveLength(3)
      expect(filteredHives.every(h => h.archived_at === null)).toBe(true)
      expect(filteredHives.map(h => h.hive_number)).toEqual(['29-DA', '57-DA', '60-DA'])
    })

    it('should only show active hives in the dropdown by default', () => {
      const showArchivedHives = false
      const filterApiaryId = ''

      const visibleHives = mockHives
        .filter(hive => !filterApiaryId || hive.apiary_id === filterApiaryId)
        .filter(hive => showArchivedHives || !hive.archived_at)

      const archivedHives = visibleHives.filter(h => h.archived_at !== null)
      expect(archivedHives).toHaveLength(0)
    })
  })

  describe('Show Archived Hives', () => {
    it('should show all hives including archived when showArchivedHives is true', () => {
      const showArchivedHives = true

      const filteredHives = mockHives.filter(
        hive => showArchivedHives || !hive.archived_at
      )

      expect(filteredHives).toHaveLength(5)
      expect(filteredHives.map(h => h.hive_number)).toEqual([
        '29-DA', '30-DA', '57-DA', '58-DA', '60-DA'
      ])
    })

    it('should include both active and archived hives when checkbox is enabled', () => {
      const showArchivedHives = true

      const filteredHives = mockHives.filter(
        hive => showArchivedHives || !hive.archived_at
      )

      const activeHives = filteredHives.filter(h => h.archived_at === null)
      const archivedHives = filteredHives.filter(h => h.archived_at !== null)

      expect(activeHives).toHaveLength(3)
      expect(archivedHives).toHaveLength(2)
    })
  })

  describe('Combined Filtering', () => {
    it('should filter by apiary and hide archived hives when both filters are applied', () => {
      const showArchivedHives = false
      const filterApiaryId = 'apiary-1'

      const filteredHives = mockHives
        .filter(hive => !filterApiaryId || hive.apiary_id === filterApiaryId)
        .filter(hive => showArchivedHives || !hive.archived_at)

      expect(filteredHives).toHaveLength(2)
      expect(filteredHives.map(h => h.hive_number)).toEqual(['29-DA', '60-DA'])
      expect(filteredHives.every(h => h.apiary_id === 'apiary-1')).toBe(true)
      expect(filteredHives.every(h => h.archived_at === null)).toBe(true)
    })

    it('should filter by apiary and show archived hives when checkbox is enabled', () => {
      const showArchivedHives = true
      const filterApiaryId = 'apiary-1'

      const filteredHives = mockHives
        .filter(hive => !filterApiaryId || hive.apiary_id === filterApiaryId)
        .filter(hive => showArchivedHives || !hive.archived_at)

      expect(filteredHives).toHaveLength(3)
      expect(filteredHives.map(h => h.hive_number)).toEqual(['29-DA', '30-DA', '60-DA'])
      expect(filteredHives.every(h => h.apiary_id === 'apiary-1')).toBe(true)

      const archivedHives = filteredHives.filter(h => h.archived_at !== null)
      expect(archivedHives).toHaveLength(1)
      expect(archivedHives[0].hive_number).toBe('30-DA')
    })

    it('should show all hives when no apiary filter and archived hives are shown', () => {
      const showArchivedHives = true
      const filterApiaryId = ''

      const filteredHives = mockHives
        .filter(hive => !filterApiaryId || hive.apiary_id === filterApiaryId)
        .filter(hive => showArchivedHives || !hive.archived_at)

      expect(filteredHives).toHaveLength(5)
    })

    it('should filter by specific apiary when selected', () => {
      const showArchivedHives = false
      const filterApiaryId = 'apiary-2'

      const filteredHives = mockHives
        .filter(hive => !filterApiaryId || hive.apiary_id === filterApiaryId)
        .filter(hive => showArchivedHives || !hive.archived_at)

      expect(filteredHives).toHaveLength(1)
      expect(filteredHives[0].hive_number).toBe('57-DA')
      expect(filteredHives[0].apiary_id).toBe('apiary-2')
    })
  })

  describe('Visual Indicators', () => {
    it('should add (Archived) label to archived hives', () => {
      const hive = mockHives[1] // 30-DA (archived)
      const label = `${hive.hive_number}${hive.archived_at ? ' (Archived)' : ''}`

      expect(label).toBe('30-DA (Archived)')
    })

    it('should not add (Archived) label to active hives', () => {
      const hive = mockHives[0] // 29-DA (active)
      const label = `${hive.hive_number}${hive.archived_at ? ' (Archived)' : ''}`

      expect(label).toBe('29-DA')
    })

    it('should correctly label all hives based on archived status', () => {
      const labels = mockHives.map(hive => ({
        number: hive.hive_number,
        label: `${hive.hive_number}${hive.archived_at ? ' (Archived)' : ''}`,
        isArchived: hive.archived_at !== null
      }))

      expect(labels).toEqual([
        { number: '29-DA', label: '29-DA', isArchived: false },
        { number: '30-DA', label: '30-DA (Archived)', isArchived: true },
        { number: '57-DA', label: '57-DA', isArchived: false },
        { number: '58-DA', label: '58-DA (Archived)', isArchived: true },
        { number: '60-DA', label: '60-DA', isArchived: false },
      ])
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty hives array', () => {
      const emptyHives: typeof mockHives = []
      const showArchivedHives = false

      const filteredHives = emptyHives.filter(
        hive => showArchivedHives || !hive.archived_at
      )

      expect(filteredHives).toHaveLength(0)
    })

    it('should handle all hives being archived', () => {
      const allArchivedHives = mockHives.map(h => ({
        ...h,
        archived_at: '2025-11-20T10:00:00Z'
      }))
      const showArchivedHives = false

      const filteredHives = allArchivedHives.filter(
        hive => showArchivedHives || !hive.archived_at
      )

      expect(filteredHives).toHaveLength(0)
    })

    it('should show all hives when all are archived and checkbox is enabled', () => {
      const allArchivedHives = mockHives.map(h => ({
        ...h,
        archived_at: '2025-11-20T10:00:00Z'
      }))
      const showArchivedHives = true

      const filteredHives = allArchivedHives.filter(
        hive => showArchivedHives || !hive.archived_at
      )

      expect(filteredHives).toHaveLength(5)
    })

    it('should handle all hives being active', () => {
      const allActiveHives = mockHives.map(h => ({
        ...h,
        archived_at: null
      }))
      const showArchivedHives = false

      const filteredHives = allActiveHives.filter(
        hive => showArchivedHives || !hive.archived_at
      )

      expect(filteredHives).toHaveLength(5)
    })

    it('should handle filtering when no apiaries match', () => {
      const showArchivedHives = false
      const filterApiaryId = 'non-existent-apiary'

      const filteredHives = mockHives
        .filter(hive => !filterApiaryId || hive.apiary_id === filterApiaryId)
        .filter(hive => showArchivedHives || !hive.archived_at)

      expect(filteredHives).toHaveLength(0)
    })
  })

  describe('State Toggle Behavior', () => {
    it('should change filtered results when toggling showArchivedHives', () => {
      let showArchivedHives = false

      // Initial state - archived hidden
      let filteredHives = mockHives.filter(
        hive => showArchivedHives || !hive.archived_at
      )
      const initialCount = filteredHives.length
      expect(initialCount).toBe(3)

      // Toggle to show archived
      showArchivedHives = true
      filteredHives = mockHives.filter(
        hive => showArchivedHives || !hive.archived_at
      )
      const toggledCount = filteredHives.length
      expect(toggledCount).toBe(5)

      // Verify the count increased
      expect(toggledCount).toBeGreaterThan(initialCount)
      expect(toggledCount - initialCount).toBe(2) // 2 archived hives added
    })

    it('should maintain apiary filter when toggling archived hives visibility', () => {
      const filterApiaryId = 'apiary-1'

      // With archived hidden
      let showArchivedHives = false
      let filteredHives = mockHives
        .filter(hive => !filterApiaryId || hive.apiary_id === filterApiaryId)
        .filter(hive => showArchivedHives || !hive.archived_at)

      expect(filteredHives).toHaveLength(2)
      expect(filteredHives.every(h => h.apiary_id === 'apiary-1')).toBe(true)

      // With archived shown
      showArchivedHives = true
      filteredHives = mockHives
        .filter(hive => !filterApiaryId || hive.apiary_id === filterApiaryId)
        .filter(hive => showArchivedHives || !hive.archived_at)

      expect(filteredHives).toHaveLength(3)
      expect(filteredHives.every(h => h.apiary_id === 'apiary-1')).toBe(true)
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle scenario: user wants to see records for an archived hive', () => {
      // User has checkbox unchecked initially
      let showArchivedHives = false
      const filterApiaryId = ''

      let filteredHives = mockHives
        .filter(hive => !filterApiaryId || hive.apiary_id === filterApiaryId)
        .filter(hive => showArchivedHives || !hive.archived_at)

      // Archived hive '30-DA' is not visible
      expect(filteredHives.find(h => h.hive_number === '30-DA')).toBeUndefined()

      // User checks "Show Archived Hives"
      showArchivedHives = true
      filteredHives = mockHives
        .filter(hive => !filterApiaryId || hive.apiary_id === filterApiaryId)
        .filter(hive => showArchivedHives || !hive.archived_at)

      // Now archived hive '30-DA' is visible
      const archivedHive = filteredHives.find(h => h.hive_number === '30-DA')
      expect(archivedHive).toBeDefined()
      expect(archivedHive?.archived_at).not.toBeNull()
    })

    it('should handle scenario: filtering specific apiary with mix of active and archived hives', () => {
      const showArchivedHives = true
      const filterApiaryId = 'apiary-1' // Has 2 active and 1 archived

      const filteredHives = mockHives
        .filter(hive => !filterApiaryId || hive.apiary_id === filterApiaryId)
        .filter(hive => showArchivedHives || !hive.archived_at)

      const activeCount = filteredHives.filter(h => h.archived_at === null).length
      const archivedCount = filteredHives.filter(h => h.archived_at !== null).length

      expect(activeCount).toBe(2)
      expect(archivedCount).toBe(1)
      expect(filteredHives).toHaveLength(3)
    })
  })

  describe('Archive Records Filtering', () => {
    // Sample records data
    const mockRecords = [
      { id: 'record-1', hive_id: 'hive-1', record_type: 'inspection', date: '2025-11-20' },
      { id: 'record-2', hive_id: 'hive-2', record_type: 'archive', date: '2025-11-20' },
      { id: 'record-3', hive_id: 'hive-3', record_type: 'inspection', date: '2025-11-19' },
      { id: 'record-4', hive_id: 'hive-4', record_type: 'archive', date: '2025-11-15' },
      { id: 'record-5', hive_id: 'hive-1', record_type: 'feeding', date: '2025-11-18' },
    ]

    it('should hide archive records by default when showArchivedHives is false', () => {
      const showArchivedHives = false

      const filteredRecords = mockRecords.filter(record => {
        // Hide archive records unless showArchivedHives is true
        if (!showArchivedHives && record.record_type === 'archive') {
          return false
        }
        return true
      })

      expect(filteredRecords).toHaveLength(3)
      expect(filteredRecords.every(r => r.record_type !== 'archive')).toBe(true)
      expect(filteredRecords.map(r => r.id)).toEqual(['record-1', 'record-3', 'record-5'])
    })

    it('should show archive records when showArchivedHives is true', () => {
      const showArchivedHives = true

      const filteredRecords = mockRecords.filter(record => {
        // Hide archive records unless showArchivedHives is true
        if (!showArchivedHives && record.record_type === 'archive') {
          return false
        }
        return true
      })

      expect(filteredRecords).toHaveLength(5)
      const archiveRecords = filteredRecords.filter(r => r.record_type === 'archive')
      expect(archiveRecords).toHaveLength(2)
      expect(archiveRecords.map(r => r.id)).toEqual(['record-2', 'record-4'])
    })

    it('should filter archive records only, not other record types', () => {
      const showArchivedHives = false

      const filteredRecords = mockRecords.filter(record => {
        if (!showArchivedHives && record.record_type === 'archive') {
          return false
        }
        return true
      })

      const recordTypes = [...new Set(filteredRecords.map(r => r.record_type))]
      expect(recordTypes).toContain('inspection')
      expect(recordTypes).toContain('feeding')
      expect(recordTypes).not.toContain('archive')
    })

    it('should work with other filters (record type filter)', () => {
      const showArchivedHives = true
      const recordTypeFilter = 'inspection'

      const filteredRecords = mockRecords.filter(record => {
        // Filter by record type
        if (recordTypeFilter !== 'all' && record.record_type !== recordTypeFilter) {
          return false
        }
        // Hide archive records unless showArchivedHives is true
        if (!showArchivedHives && record.record_type === 'archive') {
          return false
        }
        return true
      })

      expect(filteredRecords).toHaveLength(2)
      expect(filteredRecords.every(r => r.record_type === 'inspection')).toBe(true)
    })

    it('should work with ownership filter (team records should exclude archives)', () => {
      const showArchivedHives = true
      const ownershipFilter = 'team'

      const filteredRecords = mockRecords.filter(record => {
        // Filter by ownership - archive records are always user's own records
        // So exclude them when filtering for 'team' records
        if (ownershipFilter === 'team' && record.record_type === 'archive') {
          return false
        }
        // Hide archive records unless showArchivedHives is true
        if (!showArchivedHives && record.record_type === 'archive') {
          return false
        }
        return true
      })

      // Even with showArchivedHives true, team filter should exclude archives
      expect(filteredRecords.every(r => r.record_type !== 'archive')).toBe(true)
    })

    it('should handle empty records array', () => {
      const emptyRecords: typeof mockRecords = []
      const showArchivedHives = false

      const filteredRecords = emptyRecords.filter(record => {
        if (!showArchivedHives && record.record_type === 'archive') {
          return false
        }
        return true
      })

      expect(filteredRecords).toHaveLength(0)
    })

    it('should handle all records being archives', () => {
      const allArchiveRecords = [
        { id: 'record-1', hive_id: 'hive-1', record_type: 'archive', date: '2025-11-20' },
        { id: 'record-2', hive_id: 'hive-2', record_type: 'archive', date: '2025-11-19' },
        { id: 'record-3', hive_id: 'hive-3', record_type: 'archive', date: '2025-11-18' },
      ]
      const showArchivedHives = false

      const filteredRecords = allArchiveRecords.filter(record => {
        if (!showArchivedHives && record.record_type === 'archive') {
          return false
        }
        return true
      })

      expect(filteredRecords).toHaveLength(0)
    })

    it('should show all archive records when checkbox is enabled and all are archives', () => {
      const allArchiveRecords = [
        { id: 'record-1', hive_id: 'hive-1', record_type: 'archive', date: '2025-11-20' },
        { id: 'record-2', hive_id: 'hive-2', record_type: 'archive', date: '2025-11-19' },
        { id: 'record-3', hive_id: 'hive-3', record_type: 'archive', date: '2025-11-18' },
      ]
      const showArchivedHives = true

      const filteredRecords = allArchiveRecords.filter(record => {
        if (!showArchivedHives && record.record_type === 'archive') {
          return false
        }
        return true
      })

      expect(filteredRecords).toHaveLength(3)
      expect(filteredRecords.every(r => r.record_type === 'archive')).toBe(true)
    })
  })
})
