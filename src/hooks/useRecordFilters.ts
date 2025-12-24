'use client'

import { useState, useMemo, useCallback } from 'react'
import type {
  UnifiedRecord,
  Hive,
  FilterState,
  RecordType,
  OwnershipFilter,
  TimePeriod
} from '@/types/records'

interface UseRecordFiltersOptions {
  allRecords: UnifiedRecord[]
  hives: Hive[]
}

interface TimePeriodCounts {
  all: number
  threeMonths: number
  sixMonths: number
  oneYear: number
  custom: number
}

interface UseRecordFiltersReturn {
  // Filter state
  filters: FilterState
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>

  // Individual setters for convenience
  setHiveId: (id: string) => void
  setApiaryId: (id: string) => void
  setShowArchivedHives: (show: boolean) => void
  setTimePeriod: (period: TimePeriod) => void
  setCustomStartDate: (date: string) => void
  setCustomEndDate: (date: string) => void
  setOwnershipFilter: (filter: OwnershipFilter) => void
  setRecordTypeFilter: (filter: RecordType | 'all') => void

  // Computed values
  filteredRecords: UnifiedRecord[]
  timePeriodCounts: TimePeriodCounts

  // Helpers
  resetFilters: () => void
}

export function useRecordFilters(options: UseRecordFiltersOptions): UseRecordFiltersReturn {
  const { allRecords, hives } = options

  const [filters, setFilters] = useState<FilterState>({
    hiveId: '',
    apiaryId: '',
    showArchivedHives: false,
    timePeriod: 'all',
    customStartDate: '',
    customEndDate: '',
    ownershipFilter: 'my',
    recordTypeFilter: 'all'
  })

  // Individual setters
  const setHiveId = useCallback((id: string) => {
    setFilters(prev => ({ ...prev, hiveId: id }))
  }, [])

  const setApiaryId = useCallback((id: string) => {
    setFilters(prev => ({ ...prev, apiaryId: id }))
  }, [])

  const setShowArchivedHives = useCallback((show: boolean) => {
    setFilters(prev => ({ ...prev, showArchivedHives: show }))
  }, [])

  const setTimePeriod = useCallback((period: TimePeriod) => {
    setFilters(prev => ({ ...prev, timePeriod: period }))
  }, [])

  const setCustomStartDate = useCallback((date: string) => {
    setFilters(prev => ({ ...prev, customStartDate: date }))
  }, [])

  const setCustomEndDate = useCallback((date: string) => {
    setFilters(prev => ({ ...prev, customEndDate: date }))
  }, [])

  const setOwnershipFilter = useCallback((filter: OwnershipFilter) => {
    setFilters(prev => ({ ...prev, ownershipFilter: filter }))
  }, [])

  const setRecordTypeFilter = useCallback((filter: RecordType | 'all') => {
    setFilters(prev => ({ ...prev, recordTypeFilter: filter }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({
      hiveId: '',
      apiaryId: '',
      showArchivedHives: false,
      timePeriod: 'all',
      customStartDate: '',
      customEndDate: '',
      ownershipFilter: 'my',
      recordTypeFilter: 'all'
    })
  }, [])

  // Create hive lookup map for O(1) access
  const hiveMap = useMemo(() =>
    new Map(hives.map(h => [h.id, h])),
    [hives]
  )

  // Calculate date range based on time period
  const getDateRange = useCallback((): Date | null => {
    const today = new Date()

    switch (filters.timePeriod) {
      case '3months':
        return new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
      case '6months':
        return new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
      case '1year':
        return new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      case 'custom':
        return filters.customStartDate ? new Date(filters.customStartDate) : null
      case 'all':
      default:
        return null
    }
  }, [filters.timePeriod, filters.customStartDate])

  const dateRangeStart = useMemo(() => getDateRange(), [getDateRange])

  // Filter all records
  const filteredRecords = useMemo(() => {
    return allRecords.filter(record => {
      // Filter by record type
      if (filters.recordTypeFilter !== 'all' && record.record_type !== filters.recordTypeFilter) {
        return false
      }

      // Filter by ownership - archive records are always user's own records
      if (filters.ownershipFilter === 'team' && record.record_type === 'archive') {
        return false
      }

      // Filter archived hives
      if (!filters.showArchivedHives) {
        if (record.record_type === 'archive') {
          return false
        }
        const hive = hiveMap.get(record.hive_id)
        if (hive && hive.archived_at) {
          return false
        }
      }

      // Filter by apiary
      if (filters.apiaryId) {
        const hive = hiveMap.get(record.hive_id)
        if (!hive || hive.apiary_id !== filters.apiaryId) {
          return false
        }
      }

      // Filter by hive
      if (filters.hiveId && record.hive_id !== filters.hiveId) {
        return false
      }

      // Filter by time period
      if (dateRangeStart) {
        const recordDate = new Date(record.date)

        if (filters.timePeriod === 'custom') {
          if (filters.customStartDate && recordDate < new Date(filters.customStartDate)) {
            return false
          }
          if (filters.customEndDate && recordDate > new Date(filters.customEndDate)) {
            return false
          }
        } else {
          if (recordDate < dateRangeStart) {
            return false
          }
        }
      }

      return true
    })
  }, [allRecords, filters, hiveMap, dateRangeStart])

  // Calculate record counts for each time period
  const timePeriodCounts = useMemo((): TimePeriodCounts => {
    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

    // Filter with everything except time period
    const baseFilteredRecords = allRecords.filter(record => {
      if (filters.recordTypeFilter !== 'all' && record.record_type !== filters.recordTypeFilter) return false
      if (filters.ownershipFilter === 'team' && record.record_type === 'archive') return false
      if (!filters.showArchivedHives) {
        const recordHive = hiveMap.get(record.hive_id)
        if (recordHive?.archived_at) return false
      }
      if (filters.apiaryId && record.hive_id) {
        const recordHive = hiveMap.get(record.hive_id)
        if (recordHive?.apiary_id !== filters.apiaryId) return false
      }
      if (filters.hiveId && record.hive_id !== filters.hiveId) return false
      return true
    })

    return {
      all: baseFilteredRecords.length,
      threeMonths: baseFilteredRecords.filter(r => new Date(r.date) >= threeMonthsAgo).length,
      sixMonths: baseFilteredRecords.filter(r => new Date(r.date) >= sixMonthsAgo).length,
      oneYear: baseFilteredRecords.filter(r => new Date(r.date) >= oneYearAgo).length,
      custom: baseFilteredRecords.filter(r => {
        const recordDate = new Date(r.date)
        if (filters.customStartDate && recordDate < new Date(filters.customStartDate)) return false
        if (filters.customEndDate && recordDate > new Date(filters.customEndDate)) return false
        return true
      }).length
    }
  }, [allRecords, filters, hiveMap])

  return {
    filters,
    setFilters,
    setHiveId,
    setApiaryId,
    setShowArchivedHives,
    setTimePeriod,
    setCustomStartDate,
    setCustomEndDate,
    setOwnershipFilter,
    setRecordTypeFilter,
    filteredRecords,
    timePeriodCounts,
    resetFilters
  }
}
