'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useVirginQueenTracker, type TrackedVirginQueen, type StatusFilter } from '@/hooks/useVirginQueenTracker'
import { useRearingGroups } from '@/hooks/useRearingGroups'
import { Check, X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDateIrish } from './graftConstants'

interface VirginQueenTrackerTabProps {
  userId: string
}

// Three-state toggle component with accessibility
function ThreeStateToggle({
  value,
  onChange,
  labels = { true: 'Yes', false: 'No', null: '?' },
  disabled = false,
  ariaLabel,
}: {
  value: boolean | null
  onChange: (newValue: boolean | null) => void
  labels?: { true: string; false: string; null: string }
  disabled?: boolean
  ariaLabel?: string
}) {
  const cycle = () => {
    if (disabled) return
    // null -> true -> false -> null
    if (value === null) onChange(true)
    else if (value === true) onChange(false)
    else onChange(null)
  }

  const bgColor = value === true
    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-300 dark:border-green-700'
    : value === false
      ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700'
      : 'bg-surface-secondary text-text-secondary border-border'

  const Icon = value === true ? Check : value === false ? X : HelpCircle
  const displayLabel = value === null ? labels.null : value ? labels.true : labels.false

  return (
    <button
      type="button"
      onClick={cycle}
      disabled={disabled}
      aria-pressed={value === true ? 'true' : value === false ? 'false' : 'mixed'}
      aria-label={ariaLabel ? `${ariaLabel}: ${displayLabel}` : displayLabel}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-sm font-medium transition-colors ${bgColor} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'
      }`}
      title={displayLabel}
    >
      <Icon size={14} aria-hidden="true" />
      <span className="hidden sm:inline">{displayLabel}</span>
    </button>
  )
}

export default function VirginQueenTrackerTab({ userId }: VirginQueenTrackerTabProps) {
  const toast = useToast()
  const {
    distributions,
    loading,
    error,
    fetchDistributions,
    updateOverwintered,
    updateHybridisation,
    calculateStats,
    filterByStatus,
    filterByYear,
    filterByGroup,
  } = useVirginQueenTracker()

  const { ownedRearingGroups, memberRearingGroups, fetchRearingGroups } = useRearingGroups()

  // Filters
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear())
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Track in-flight updates to prevent race conditions (ref avoids stale closures)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const updatingIdsRef = useRef(updatingIds)
  updatingIdsRef.current = updatingIds

  // Fetch data on mount
  useEffect(() => {
    fetchDistributions(userId)
    fetchRearingGroups(userId)
  }, [userId, fetchDistributions, fetchRearingGroups])

  // Combined groups for filter dropdown
  const allGroups = useMemo(() => {
    return [...ownedRearingGroups, ...memberRearingGroups]
  }, [ownedRearingGroups, memberRearingGroups])

  // Get unique years from distributions with validation
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    distributions.forEach((d) => {
      if (!d.distribution_date) return
      const date = new Date(d.distribution_date + 'T00:00:00')
      if (isNaN(date.getTime())) return
      years.add(date.getFullYear())
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [distributions])

  // Apply filters
  const filteredDistributions = useMemo(() => {
    let result = distributions
    result = filterByGroup(result, selectedGroupId || null)
    result = filterByYear(result, selectedYear)
    result = filterByStatus(result, selectedStatus)
    return result
  }, [distributions, selectedGroupId, selectedYear, selectedStatus, filterByGroup, filterByYear, filterByStatus])

  // Calculate stats from filtered data
  const stats = useMemo(() => calculateStats(filteredDistributions), [filteredDistributions, calculateStats])

  // Handle toggle updates with in-flight protection (ref-based guard)
  const handleOverwinteredChange = useCallback(async (id: string, newValue: boolean | null) => {
    if (updatingIdsRef.current.has(id)) return

    setUpdatingIds((prev) => new Set(prev).add(id))
    try {
      const success = await updateOverwintered(id, newValue)
      if (success) {
        toast.success('Overwintering status updated')
        await fetchDistributions(userId)
      } else {
        toast.error('Failed to update overwintering status')
      }
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [updateOverwintered, fetchDistributions, userId, toast])

  const handleHybridisationChange = useCallback(async (id: string, newValue: boolean | null) => {
    if (updatingIdsRef.current.has(id)) return

    setUpdatingIds((prev) => new Set(prev).add(id))
    try {
      const success = await updateHybridisation(id, newValue)
      if (success) {
        toast.success('Hybridisation status updated')
        await fetchDistributions(userId)
      } else {
        toast.error('Failed to update hybridisation status')
      }
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [updateHybridisation, fetchDistributions, userId, toast])

  // Get recipient display name + email
  const getRecipientName = (d: TrackedVirginQueen): string => {
    const name = d.recipient_name || d.external_recipient_name || null
    const email = d.recipient_email || d.external_recipient_email || null
    if (name && email) return `${name} (${email})`
    if (name) return name
    if (email) return email
    return 'Unknown'
  }

  // Get location display — mating_location, then recipient apiary, then external location
  const getLocation = (d: TrackedVirginQueen): string => {
    if (d.mating_location) return d.mating_location
    if (d.recipient_apiary_name) {
      return d.recipient_apiary_eircode
        ? `${d.recipient_apiary_name} (${d.recipient_apiary_eircode})`
        : d.recipient_apiary_name
    }
    return d.external_recipient_location || '-'
  }

  if (loading) {
    return <div className="text-center py-8 text-text-secondary">Loading virgin queen tracker...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-6 border border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Error Loading Data</h3>
        <p className="text-red-600 dark:text-red-300">{error}</p>
        <button
          type="button"
          onClick={() => fetchDistributions(userId)}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (allGroups.length === 0) {
    return (
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Virgin Queen Tracker</h3>
        <p className="text-text-secondary">
          You are not a member of any rearing groups. Join or create a group to track virgin queens distributed from group batches.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border border-border">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Group Filter */}
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-text-secondary mb-1">Group</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
            >
              <option value="">All Groups</option>
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.user_role === 'owner' ? '(Owner)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="flex-1 min-w-[120px]">
            <label className="block text-sm font-medium text-text-secondary mb-1">Year</label>
            <select
              value={selectedYear ?? ''}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10)
                setSelectedYear(Number.isFinite(parsed) ? parsed : null)
              }}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
            >
              <option value="">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
            >
              <option value="all">All</option>
              <option value="pending">Pending Mating</option>
              <option value="mated">Mated (Awaiting Winter)</option>
              <option value="overwintered">Overwintered</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border border-border text-center">
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-sm text-text-secondary">Total</div>
        </div>
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border border-border text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.mated}</div>
          <div className="text-sm text-text-secondary">Mated</div>
        </div>
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border border-border text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.overwintered}</div>
          <div className="text-sm text-text-secondary">Overwintered</div>
        </div>
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border border-border text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
          <div className="text-sm text-text-secondary">Failed</div>
        </div>
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border border-border text-center">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.hybridised}</div>
          <div className="text-sm text-text-secondary">Hybridised</div>
        </div>
      </div>

      {/* Distributions List */}
      {filteredDistributions.length === 0 ? (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-8 text-center border border-border">
          <p className="text-text-secondary">
            No virgin queen distributions found matching your filters.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block bg-surface dark:bg-surface rounded-lg shadow border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary">
                    <th className="text-left py-3 px-4 font-medium text-text-secondary">Cell</th>
                    <th className="text-left py-3 px-4 font-medium text-text-secondary">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-text-secondary">Batch</th>
                    <th className="text-left py-3 px-4 font-medium text-text-secondary">Recipient</th>
                    <th className="text-left py-3 px-4 font-medium text-text-secondary">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-text-secondary">Mating Location</th>
                    <th className="text-center py-3 px-4 font-medium text-text-secondary">Mated</th>
                    <th className="text-center py-3 px-4 font-medium text-text-secondary">Overwintered</th>
                    <th className="text-center py-3 px-4 font-medium text-text-secondary">Hybridised</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDistributions.map((d) => (
                    <tr key={d.id} className="border-b border-border last:border-b-0 hover:bg-surface-secondary/50">
                      <td className="py-3 px-4 text-foreground font-medium">#{d.cell_number}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          d.distribution_type === 'queen_cell'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                            : d.distribution_type === 'mated_queen'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        }`}>
                          {d.distribution_type === 'queen_cell' ? 'Cell' : d.distribution_type === 'mated_queen' ? 'Mated' : 'Virgin'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-foreground">{d.batch_name}</td>
                      <td className="py-3 px-4 text-foreground">{getRecipientName(d)}</td>
                      <td className="py-3 px-4 text-text-secondary">{formatDateIrish(d.distribution_date)}</td>
                      <td className="py-3 px-4 text-text-secondary">{getLocation(d)}</td>
                      <td className="py-3 px-4 text-center">
                        {(d.mating_confirmed || d.distribution_type === 'mated_queen') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs font-medium">
                            <Check size={12} /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-secondary text-text-secondary text-xs font-medium">
                            <HelpCircle size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <ThreeStateToggle
                          value={d.overwintered}
                          onChange={(v) => handleOverwinteredChange(d.id, v)}
                          labels={{ true: 'Yes', false: 'No', null: '?' }}
                          disabled={updatingIds.has(d.id)}
                          ariaLabel={`Cell ${d.cell_number} overwintered`}
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <ThreeStateToggle
                          value={d.offspring_hybridised}
                          onChange={(v) => handleHybridisationChange(d.id, v)}
                          labels={{ true: 'Yes', false: 'No', null: '?' }}
                          disabled={updatingIds.has(d.id)}
                          ariaLabel={`Cell ${d.cell_number} hybridised`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards - Hidden on desktop */}
          <div className="md:hidden space-y-3">
            {filteredDistributions.map((d) => (
              <div key={d.id} className="bg-surface dark:bg-surface rounded-lg shadow border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">Cell #{d.cell_number}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          d.distribution_type === 'queen_cell'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                            : d.distribution_type === 'mated_queen'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                        }`}>
                          {d.distribution_type === 'queen_cell' ? 'Cell' : d.distribution_type === 'mated_queen' ? 'Mated' : 'Virgin'}
                        </span>
                        <span className="text-sm text-text-secondary">• {d.batch_name}</span>
                      </div>
                      <div className="text-sm text-text-secondary mt-1">
                        {getRecipientName(d)} • {formatDateIrish(d.distribution_date)}
                      </div>
                    </div>
                    {expandedId === d.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>

                  {/* Quick status indicators */}
                  <div className="flex gap-2 mt-2">
                    {(d.mating_confirmed || d.distribution_type === 'mated_queen') && (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                        Mated
                      </span>
                    )}
                    {d.overwintered === true && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        Overwintered
                      </span>
                    )}
                    {d.overwintered === false && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                        Failed
                      </span>
                    )}
                    {d.offspring_hybridised === true && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                        Hybridised
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {expandedId === d.id && (
                  <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-text-secondary">Mating Location:</span>
                        <span className="ml-2 text-foreground">{getLocation(d)}</span>
                      </div>
                      {d.mating_confirmed_date && (
                        <div>
                          <span className="text-text-secondary">Mated:</span>
                          <span className="ml-2 text-foreground">{formatDateIrish(d.mating_confirmed_date)}</span>
                        </div>
                      )}
                      {d.overwintered_date && (
                        <div>
                          <span className="text-text-secondary">Overwintered:</span>
                          <span className="ml-2 text-foreground">{formatDateIrish(d.overwintered_date)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-secondary" id={`overwintered-label-${d.id}`}>Overwintered:</span>
                        <ThreeStateToggle
                          value={d.overwintered}
                          onChange={(v) => handleOverwinteredChange(d.id, v)}
                          labels={{ true: 'Yes', false: 'No', null: '?' }}
                          disabled={updatingIds.has(d.id)}
                          ariaLabel={`Cell ${d.cell_number} overwintered`}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-secondary" id={`hybridised-label-${d.id}`}>Hybridised:</span>
                        <ThreeStateToggle
                          value={d.offspring_hybridised}
                          onChange={(v) => handleHybridisationChange(d.id, v)}
                          labels={{ true: 'Yes', false: 'No', null: '?' }}
                          disabled={updatingIds.has(d.id)}
                          ariaLabel={`Cell ${d.cell_number} hybridised`}
                        />
                      </div>
                    </div>

                    {d.notes && (
                      <div className="text-sm">
                        <span className="text-text-secondary">Notes:</span>
                        <p className="text-foreground mt-1">{d.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
