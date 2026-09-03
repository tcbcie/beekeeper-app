'use client'

import { Search } from 'lucide-react'

import type { Hive, Apiary, OwnershipFilter, RecordType, TimePeriod } from '@/types/records'
import Button from '@/components/ui/Button'
import TextInput from '@/components/ui/TextInput'
import FilterDisclosure from '@/components/ui/FilterDisclosure'

interface RecordFiltersBarProps {
  // Free-text search. Ephemeral, unlike the filters below.
  searchTerm: string
  onSearchChange: (value: string) => void

  /** How many of the collapsed filters differ from their default. */
  activeFilterCount: number
  onClearFilters: () => void

  // Filter values
  ownershipFilter: OwnershipFilter
  recordTypeFilter: RecordType | 'all'
  apiaryId: string
  hiveId: string
  showArchivedHives: boolean
  timePeriod: TimePeriod
  customStartDate: string
  customEndDate: string

  // Data
  apiaries: Apiary[]
  hives: Hive[]
  isTeamMember: boolean

  // Counts for time period display
  timePeriodCounts?: {
    all: number
    threeMonths: number
    sixMonths: number
    oneYear: number
    custom: number
  }

  // Callbacks
  onOwnershipChange: (value: OwnershipFilter) => void
  onRecordTypeChange: (value: RecordType | 'all') => void
  onApiaryChange: (value: string) => void
  onHiveChange: (value: string) => void
  onShowArchivedChange: (value: boolean) => void
  onTimePeriodChange: (value: TimePeriod) => void
  onCustomStartDateChange: (value: string) => void
  onCustomEndDateChange: (value: string) => void
}

export default function RecordFiltersBar({
  searchTerm,
  onSearchChange,
  activeFilterCount,
  onClearFilters,
  ownershipFilter,
  recordTypeFilter,
  apiaryId,
  hiveId,
  showArchivedHives,
  timePeriod,
  customStartDate,
  customEndDate,
  apiaries,
  hives,
  isTeamMember,
  timePeriodCounts,
  onOwnershipChange,
  onRecordTypeChange,
  onApiaryChange,
  onHiveChange,
  onShowArchivedChange,
  onTimePeriodChange,
  onCustomStartDateChange,
  onCustomEndDateChange
}: RecordFiltersBarProps) {
  // Filter hives based on apiary selection and archived state
  const filteredHives = hives
    .filter(hive => !apiaryId || hive.apiary_id === apiaryId)
    .filter(hive => showArchivedHives || !hive.archived_at)

  return (
    <div className="space-y-4">
      {/* Search sits above the filters: it is the fastest way to a known
          record, and unlike the filters it is not remembered between visits. */}
      <div className="relative w-full sm:max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
        <TextInput
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search hive, notes, treatment or feed"
          aria-label="Search records"
          className="rounded-lg"
          style={{ paddingLeft: '2.25rem' }}
        />
      </div>

      {/* Time Period Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => onTimePeriodChange('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            timePeriod === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-surface border border-border text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30'
          }`}
        >
          All Time {timePeriodCounts && `(${timePeriodCounts.all})`}
        </Button>
        <Button
          onClick={() => onTimePeriodChange('3months')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            timePeriod === '3months'
              ? 'bg-blue-600 text-white'
              : 'bg-surface border border-border text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30'
          }`}
        >
          3 Months {timePeriodCounts && `(${timePeriodCounts.threeMonths})`}
        </Button>
        <Button
          onClick={() => onTimePeriodChange('6months')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            timePeriod === '6months'
              ? 'bg-blue-600 text-white'
              : 'bg-surface border border-border text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30'
          }`}
        >
          6 Months {timePeriodCounts && `(${timePeriodCounts.sixMonths})`}
        </Button>
        <Button
          onClick={() => onTimePeriodChange('1year')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            timePeriod === '1year'
              ? 'bg-blue-600 text-white'
              : 'bg-surface border border-border text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30'
          }`}
        >
          1 Year {timePeriodCounts && `(${timePeriodCounts.oneYear})`}
        </Button>
        <Button
          onClick={() => onTimePeriodChange('custom')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            timePeriod === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-surface border border-border text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30'
          }`}
        >
          Custom {timePeriodCounts && `(${timePeriodCounts.custom})`}
        </Button>
      </div>

      {/* Secondary filters. The time-period presets above stay visible because
          they carry counts and are how records are usually scoped; everything
          else is one control away. */}
      <FilterDisclosure
        activeCount={activeFilterCount}
        storageKey="records:filtersOpen"
        onClear={onClearFilters}
      >
        {/* Main Filters Row */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full">
          {/* Ownership Filter - Only show for team members */}
          {isTeamMember && (
            <select
              aria-label="Filter by record ownership"
              value={ownershipFilter}
              onChange={(e) => onOwnershipChange(e.target.value as OwnershipFilter)}
              className="px-4 py-2 border border-border rounded-lg bg-surface dark:bg-surface text-foreground hover:border-blue-400 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
            >
              <option value="my">My Records</option>
              <option value="team">Team Records</option>
              <option value="all">All Records</option>
            </select>
          )}
  
          {/* Record Type Filter */}
          <select
            aria-label="Filter by record type"
            value={recordTypeFilter}
            onChange={(e) => onRecordTypeChange(e.target.value as RecordType | 'all')}
            className="px-4 py-2 border border-border rounded-lg bg-surface dark:bg-surface text-foreground hover:border-forest-400 dark:hover:border-forest-500 focus:border-forest-500 dark:focus:border-forest-400 focus:ring-2 focus:ring-forest-200 dark:focus:ring-forest-800 transition-all"
          >
            <option value="all">All Types</option>
            <option value="inspection">Hive Inspection</option>
            <option value="varroa_treatment">Varroa Treatment</option>
            <option value="varroa_check">Varroa Check</option>
            <option value="feeding">Feeding</option>
            <option value="harvest">Harvest</option>
            <option value="archive">Hive Archived</option>
          </select>
  
          {/* Apiary Filter */}
          <select
            aria-label="Filter by apiary"
            value={apiaryId}
            onChange={(e) => {
              onApiaryChange(e.target.value)
              onHiveChange('') // Clear hive filter when apiary changes
            }}
            className="px-4 py-2 border border-border rounded-lg bg-surface dark:bg-surface text-foreground hover:border-blue-400 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
          >
            <option value="">All Apiaries</option>
            {apiaries.map((apiary) => (
              <option key={apiary.id} value={apiary.id}>
                {apiary.name}{apiary.is_shared ? ' (Shared)' : ''}
              </option>
            ))}
          </select>
  
          {/* Hive Filter */}
          <select
            aria-label="Filter by hive"
            value={hiveId}
            onChange={(e) => onHiveChange(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-surface dark:bg-surface text-foreground hover:border-blue-400 dark:hover:border-blue-500 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
          >
            <option value="">All Hives</option>
            {filteredHives.map((hive) => (
              <option key={hive.id} value={hive.id}>
                {hive.hive_number}{hive.archived_at ? ' (Archived)' : ''}
              </option>
            ))}
          </select>
  
          {/* Show Archived Hives Toggle */}
          <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg bg-surface dark:bg-surface text-foreground hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchivedHives}
              onChange={(e) => onShowArchivedChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-surface border-border rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm">Show Archived Hives</span>
          </label>
        </div>
      </FilterDisclosure>

      {/* Custom Date Range */}
      {timePeriod === 'custom' && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="records-filter-date-from" className="text-sm text-text-secondary">From:</label>
            <input
              id="records-filter-date-from"
              type="date"
              value={customStartDate}
              onChange={(e) => onCustomStartDateChange(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg bg-surface text-foreground text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="records-filter-date-to" className="text-sm text-text-secondary">To:</label>
            <input
              id="records-filter-date-to"
              type="date"
              value={customEndDate}
              onChange={(e) => onCustomEndDateChange(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg bg-surface text-foreground text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}

