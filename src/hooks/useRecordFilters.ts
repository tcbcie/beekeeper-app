'use client'

import { useMemo, useState, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { usePersistentState } from '@/hooks/usePersistentState'
import { useSelection } from '@/contexts/SelectionContext'
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

/** The fields a free-text search looks at, across every record type. */
interface SearchableRecord {
  hives?: { hive_number?: string | null } | null
  hive_number?: string | null
  notes?: string | null
  treatment_type?: string | null
  batch_number?: string | null
  method?: string | null
  feed_type?: string | null
  floral_source?: string | null
  archive_reason_value?: string | null
}

interface UseRecordFiltersReturn {
  // Filter state
  filters: FilterState
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>

  // Free-text search. Not part of FilterState because it is never persisted.
  searchTerm: string
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>

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

  // Apiary & hive come from the app-wide shared selection (so a choice made on
  // Hives/Tasks/Reports carries into Records and vice versa). The remaining
  // filters persist per-page (localStorage), surviving navigation and restart.
  const { selectedApiaryId, setSelectedApiaryId, selectedHiveId, setSelectedHiveId } = useSelection()

  // Free text is deliberately NOT persisted, unlike every filter below it: a
  // filter is a lasting preference, a search term is a moment. Same convention
  // as crm/customers and crm/orders.
  const [searchTerm, setSearchTerm] = useState('')
  const [stored, setStored] = usePersistentState<FilterState>(
    'records:filters',
    {
      hiveId: '',
      apiaryId: '',
      showArchivedHives: false,
      timePeriod: 'all',
      customStartDate: '',
      customEndDate: '',
      ownershipFilter: 'my',
      recordTypeFilter: 'all'
    },
    // Reject corrupt stored values rather than feeding them back into the UI.
    (v) => !!v && typeof v === 'object' && typeof v.showArchivedHives === 'boolean' && typeof v.timePeriod === 'string'
  )

  // Effective filter set: location from the shared store, the rest persisted.
  // (The stored object's own apiaryId/hiveId are vestigial and overridden here.)
  // Memoised so its identity is stable for the downstream filtering memos.
  const filters: FilterState = useMemo(
    () => ({ ...stored, apiaryId: selectedApiaryId, hiveId: selectedHiveId }),
    [stored, selectedApiaryId, selectedHiveId]
  )

  // Clear a shared hive/apiary selection that no longer exists for this account
  // (e.g. deleted since it was chosen) so it can't silently hide every record.
  useEffect(() => {
    if (hives.length === 0) return
    if (selectedHiveId && !hives.some(h => h.id === selectedHiveId)) setSelectedHiveId('')
    if (selectedApiaryId && !hives.some(h => h.apiary_id === selectedApiaryId)) setSelectedApiaryId('')
  }, [hives, selectedHiveId, selectedApiaryId, setSelectedHiveId, setSelectedApiaryId])

  // Individual setters -- apiary/hive route to the shared store, the rest persist.
  const setHiveId = useCallback((id: string) => {
    setSelectedHiveId(id)
  }, [setSelectedHiveId])

  const setApiaryId = useCallback((id: string) => {
    setSelectedApiaryId(id)
  }, [setSelectedApiaryId])

  const setShowArchivedHives = useCallback((show: boolean) => {
    setStored(prev => ({ ...prev, showArchivedHives: show }))
  }, [setStored])

  const setTimePeriod = useCallback((period: TimePeriod) => {
    setStored(prev => ({ ...prev, timePeriod: period }))
  }, [setStored])

  const setCustomStartDate = useCallback((date: string) => {
    setStored(prev => ({ ...prev, customStartDate: date }))
  }, [setStored])

  const setCustomEndDate = useCallback((date: string) => {
    setStored(prev => ({ ...prev, customEndDate: date }))
  }, [setStored])

  const setOwnershipFilter = useCallback((filter: OwnershipFilter) => {
    setStored(prev => ({ ...prev, ownershipFilter: filter }))
  }, [setStored])

  const setRecordTypeFilter = useCallback((filter: RecordType | 'all') => {
    setStored(prev => ({ ...prev, recordTypeFilter: filter }))
  }, [setStored])

  // Bulk setter kept for the hook's return contract. Routes apiary/hive to the
  // shared store and the rest to the persisted store; reads current values via
  // refs so its identity stays stable across renders.
  const sharedRef = useRef({ apiaryId: selectedApiaryId, hiveId: selectedHiveId })
  sharedRef.current = { apiaryId: selectedApiaryId, hiveId: selectedHiveId }
  const storedRef = useRef(stored)
  storedRef.current = stored

  const setFilters = useCallback<Dispatch<SetStateAction<FilterState>>>((update) => {
    const prev: FilterState = { ...storedRef.current, apiaryId: sharedRef.current.apiaryId, hiveId: sharedRef.current.hiveId }
    const next = typeof update === 'function' ? (update as (p: FilterState) => FilterState)(prev) : update
    if (next.apiaryId !== sharedRef.current.apiaryId) setSelectedApiaryId(next.apiaryId)
    if (next.hiveId !== sharedRef.current.hiveId) setSelectedHiveId(next.hiveId)
    setStored(next)
  }, [setStored, setSelectedApiaryId, setSelectedHiveId])

  const resetFilters = useCallback(() => {
    setSelectedApiaryId('')
    setSelectedHiveId('')
    setStored({
      hiveId: '',
      apiaryId: '',
      showArchivedHives: false,
      timePeriod: 'all',
      customStartDate: '',
      customEndDate: '',
      ownershipFilter: 'my',
      recordTypeFilter: 'all'
    })
  }, [setStored, setSelectedApiaryId, setSelectedHiveId])

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

  const search = searchTerm.trim().toLowerCase()

  // Filter all records
  const filteredRecords = useMemo(() => {
    return allRecords.filter(record => {
      // Free-text search across the fields that identify a record: the hive it
      // belongs to, its notes, and whatever names the record's own subject.
      if (search) {
        // UnifiedRecord is a discriminated union and each member carries a
        // different identifying field, so the searchable surface is described
        // once here rather than branching per record_type.
        const candidate = record as unknown as SearchableRecord
        const matches = [
          candidate.hives?.hive_number,
          candidate.hive_number,
          candidate.notes,
          candidate.treatment_type,
          candidate.batch_number,
          candidate.method,
          candidate.feed_type,
          candidate.floral_source,
          candidate.archive_reason_value,
        ].some((field) => field?.toString().toLowerCase().includes(search))
        if (!matches) return false
      }

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
  }, [allRecords, filters, hiveMap, dateRangeStart, search])

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
    searchTerm,
    setSearchTerm,
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
