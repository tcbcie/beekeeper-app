'use client'

import { usePersistentState } from '@/hooks/usePersistentState'
import { useSelection } from '@/contexts/SelectionContext'
import { getPresetRange } from '@/lib/date-utils'
import type { ReportFilters as ReportFiltersState, TimePeriod } from '@/types/reports'

interface DateFilters {
  timePeriod: TimePeriod
  startDate: string
  endDate: string
}

type SetReportFilters = (
  update: ReportFiltersState | ((prev: ReportFiltersState) => ReportFiltersState)
) => void

/**
 * Shared filter state for the report sub-pages.
 *
 * - apiary & hive come from the app-wide {@link useSelection} store, so a
 *   selection made on Hives/Tasks carries into reports (and between reports).
 * - the date window persists per-report (localStorage), surviving navigation
 *   and a full browser/app restart.
 *
 * Returns the same `[filters, setFilters]` shape the reports already use, so the
 * existing `setFilters(prev => ({ ...prev, ... }))` call sites need no change:
 * apiary/hive changes are routed to the shared store and date changes to the
 * persisted store.
 *
 * @param storageKey  Stable per-report key, e.g. `'varroa'`.
 * @param defaultDates Initial date window for this report (apiary/hive default
 *                     to the shared selection, which is `''` = all when unset).
 */
export function useReportFilters(
  storageKey: string,
  defaultDates: DateFilters
): [ReportFiltersState, SetReportFilters] {
  const { selectedApiaryId, setSelectedApiaryId, selectedHiveId, setSelectedHiveId } = useSelection()
  const [dates, setDates] = usePersistentState<DateFilters>(`reports:${storageKey}`, defaultDates)

  // Only a custom window keeps its saved dates. A preset ("last year" etc.) is worked out
  // from today every time; saved preset dates froze on the first visit, so a week later the
  // report silently left out that week's records.
  const dateWindow = dates.timePeriod === 'custom'
    ? { startDate: dates.startDate, endDate: dates.endDate }
    : getPresetRange(dates.timePeriod)

  const filters: ReportFiltersState = {
    apiaryId: selectedApiaryId,
    hiveId: selectedHiveId,
    timePeriod: dates.timePeriod,
    startDate: dateWindow.startDate,
    endDate: dateWindow.endDate
  }

  const setFilters: SetReportFilters = (update) => {
    const next = typeof update === 'function' ? update(filters) : update
    if (next.apiaryId !== filters.apiaryId) setSelectedApiaryId(next.apiaryId)
    if (next.hiveId !== filters.hiveId) setSelectedHiveId(next.hiveId)
    if (
      next.timePeriod !== filters.timePeriod ||
      next.startDate !== filters.startDate ||
      next.endDate !== filters.endDate
    ) {
      setDates({ timePeriod: next.timePeriod, startDate: next.startDate, endDate: next.endDate })
    }
  }

  return [filters, setFilters]
}
