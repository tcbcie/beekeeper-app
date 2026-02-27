'use client'

import type { Hive } from '@/types/records'
import type { ApiaryWithEircode, TimePeriod } from '@/types/reports'
import Button from '@/components/ui/Button'

interface ReportFiltersProps {
  apiaryId: string
  hiveId: string
  timePeriod: TimePeriod
  startDate: string
  endDate: string
  apiaries: ApiaryWithEircode[]
  hives: Hive[]
  showHiveFilter?: boolean
  onApiaryChange: (value: string) => void
  onHiveChange: (value: string) => void
  onTimePeriodChange: (value: TimePeriod) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
}

export default function ReportFilters({
  apiaryId,
  hiveId,
  timePeriod,
  startDate,
  endDate,
  apiaries,
  hives,
  showHiveFilter = true,
  onApiaryChange,
  onHiveChange,
  onTimePeriodChange,
  onStartDateChange,
  onEndDateChange
}: ReportFiltersProps) {
  // Filter hives based on selected apiary
  const filteredHives = apiaryId
    ? hives.filter(h => h.apiary_id === apiaryId)
    : hives

  return (
    <div className="space-y-4 no-print">
      {/* Location Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={apiaryId}
          onChange={(e) => {
            onApiaryChange(e.target.value)
            onHiveChange('')
          }}
          className="px-4 py-2 border border-border rounded-lg bg-surface text-foreground"
        >
          <option value="">All Apiaries</option>
          {apiaries.map((apiary) => (
            <option key={apiary.id} value={apiary.id}>
              {apiary.name}
            </option>
          ))}
        </select>

        {showHiveFilter && (
          <select
            value={hiveId}
            onChange={(e) => onHiveChange(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-surface text-foreground"
          >
            <option value="">All Hives</option>
            {filteredHives.map((hive) => (
              <option key={hive.id} value={hive.id}>
                {hive.hive_number}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Time Period Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', '3months', '6months', '1year', 'custom'] as TimePeriod[]).map((period) => (
          <Button
            key={period}
            onClick={() => onTimePeriodChange(period)}
            tone={timePeriod === period ? 'success' : 'neutral'}
            size="sm"
            className={`${
              timePeriod === period
                ? ''
                : 'bg-surface border border-border text-foreground hover:bg-forest-50 dark:hover:bg-forest-950/30'
            }`}
          >
            {period === 'all' && 'All Time'}
            {period === '3months' && '3 Months'}
            {period === '6months' && '6 Months'}
            {period === '1year' && '1 Year'}
            {period === 'custom' && 'Custom'}
          </Button>
        ))}
      </div>

      {/* Custom Date Range */}
      {timePeriod === 'custom' && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg bg-surface text-foreground text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-secondary">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg bg-surface text-foreground text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
