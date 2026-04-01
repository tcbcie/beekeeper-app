'use client'

import { startTransition, useState, useEffect, useCallback, useMemo, useRef, type ComponentType, type ReactNode } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  HelpCircle,
  CalendarDays,
  Mail,
  MapPin,
  Package2,
  Phone,
  Scale,
  Sprout,
  Tag,
  UserRound,
  X,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useQueenTracker, type TrackedQueen, type StatusFilter } from '@/hooks/useQueenTracker'
import { useRearingGroups } from '@/hooks/useRearingGroups'
import { COLOUR_DOTS, formatDateIrish } from './graftConstants'
import { calculateQueenAge, getQueenColorFromYear } from '@/types/queen'

interface QueenTrackerTabProps {
  userId: string
}

type DerivedTrackerRow = TrackedQueen & {
  display_type_label: string
  display_type_class: string
  lifecycle_label: string
  lifecycle_class: string
  group_name: string
  queen_display_name: string
  queen_secondary_label: string
  recipient_display_name: string
  recipient_contact_label: string
  destination_label: string
  recipient_apiary_label: string
  origin_mating_apiary_label: string
  mother_queen_label: string
  current_stage_label: string
  latest_weight_label: string
  queen_age_label: string
  queen_tagged_label: string | null
  marking_colour_label: string
  marking_status_label: string
  mother_queen_age_label: string
  mother_queen_marking_label: string
  has_hybridisation_date_input: boolean
}

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
    if (value === null) onChange(true)
    else if (value === true) onChange(false)
    else onChange(null)
  }

  const bgColor = value === true
    ? 'border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900/50 dark:text-green-300'
    : value === false
      ? 'border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/50 dark:text-red-300'
      : 'border-border bg-surface-secondary text-text-secondary dark:bg-surface-elevated'

  const Icon = value === true ? Check : value === false ? X : HelpCircle
  const displayLabel = value === null ? labels.null : value ? labels.true : labels.false

  return (
    <button
      type="button"
      onClick={cycle}
      disabled={disabled}
      aria-pressed={value === true ? 'true' : value === false ? 'false' : 'mixed'}
      aria-label={ariaLabel ? `${ariaLabel}: ${displayLabel}` : displayLabel}
      className={`inline-flex min-w-[4.75rem] items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${bgColor} ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:opacity-85'
      }`}
      title={displayLabel}
    >
      <Icon size={14} aria-hidden="true" />
      <span>{displayLabel}</span>
    </button>
  )
}

function SummaryCard({
  label,
  value,
  accentClass,
}: {
  label: string
  value: number
  accentClass: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface px-4 py-4 shadow-sm dark:bg-surface-elevated/95">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentClass}`} />
      <div className="space-y-1">
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <div className="text-sm text-text-secondary">{label}</div>
      </div>
    </div>
  )
}

function TrackerPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: ComponentType<{ size?: number; className?: string }>
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-secondary/45 p-4 dark:bg-surface-elevated/55">
      <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-50 text-forest-700 dark:bg-forest-900/30 dark:text-forest-300">
          <Icon size={14} />
        </span>
        <span>{title}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function DetailItem({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  )
}

function formatOptionalDate(date: string | null): string {
  return date ? formatDateIrish(date) : '-'
}

function formatDistributionType(distributionType: TrackedQueen['distribution_type']) {
  switch (distributionType) {
    case 'queen_cell':
      return {
        label: 'Cell',
        className: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/35 dark:text-amber-300',
      }
    case 'mated_queen':
      return {
        label: 'Distributed as mated',
        className: 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-300',
      }
    default:
      return {
        label: 'Virgin',
        className: 'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-900/35 dark:text-sky-300',
      }
  }
}

function formatLifecycle(distribution: TrackedQueen) {
  if (distribution.overwintered === false) {
    return {
      label: 'Failed',
      className: 'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/35 dark:text-red-300',
    }
  }

  if (distribution.overwintered === true) {
    return {
      label: 'Overwintered',
      className: 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-900/35 dark:text-blue-300',
    }
  }

  if (distribution.mating_confirmed || distribution.distribution_type === 'mated_queen') {
    return {
      label: 'Mated',
      className: 'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/35 dark:text-green-300',
    }
  }

  return {
    label: 'Pending Mating',
    className: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/35 dark:text-amber-300',
  }
}

function formatGraftStatus(status: string | null): string {
  if (!status) return '-'

  switch (status) {
    case 'in_nuc':
      return 'In nuc'
    case 'queen_cell':
      return 'Queen cell'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
  }
}

function getRecipientName(distribution: TrackedQueen): string {
  const name = distribution.recipient_name || distribution.external_recipient_name || null
  const email = distribution.recipient_email || distribution.external_recipient_email || null

  if (name && email) return `${name} (${email})`
  if (name) return name
  if (email) return email
  return 'Unknown recipient'
}

function getRecipientContact(distribution: TrackedQueen): string {
  const contactParts = [
    distribution.recipient_email || distribution.external_recipient_email || null,
    distribution.external_recipient_phone || null,
  ].filter(Boolean)

  return contactParts.length > 0 ? contactParts.join(' / ') : '-'
}

function getDestinationLabel(distribution: TrackedQueen): string {
  if (distribution.mating_location) return distribution.mating_location
  if (distribution.recipient_apiary_name) {
    return distribution.recipient_apiary_eircode
      ? `${distribution.recipient_apiary_name} (${distribution.recipient_apiary_eircode})`
      : distribution.recipient_apiary_name
  }
  return distribution.external_recipient_location || '-'
}

function getRecipientApiaryLabel(distribution: TrackedQueen): string {
  const apiaryLabel = distribution.recipient_apiary_name
    ? distribution.recipient_apiary_eircode
      ? `${distribution.recipient_apiary_name} (${distribution.recipient_apiary_eircode})`
      : distribution.recipient_apiary_name
    : distribution.external_recipient_location || '-'

  return distribution.recipient_hive_number
    ? `${apiaryLabel} / Hive ${distribution.recipient_hive_number}`
    : apiaryLabel
}

function getOriginMatingApiaryLabel(distribution: TrackedQueen): string {
  if (!distribution.mating_apiary_name) return '-'
  return distribution.mating_apiary_eircode
    ? `${distribution.mating_apiary_name} (${distribution.mating_apiary_eircode})`
    : distribution.mating_apiary_name
}

function getMotherQueenLabel(distribution: TrackedQueen): string {
  if (!distribution.mother_queen_number) return '-'

  const parts = [distribution.mother_queen_number]
  if (distribution.mother_queen_subspecies) {
    parts.push(distribution.mother_queen_subspecies)
  }

  return parts.join(' / ')
}

function buildDerivedRow(distribution: TrackedQueen, groupName: string): DerivedTrackerRow {
  const typeInfo = formatDistributionType(distribution.distribution_type)
  const lifecycleInfo = formatLifecycle(distribution)
  const markingColour = distribution.queen_marked && distribution.emergence_date
    ? getQueenColorFromYear(distribution.emergence_date)
    : ''
  const motherQueenMarkingColour = distribution.mother_queen_marking_color || (
    distribution.mother_queen_birth_date ? getQueenColorFromYear(distribution.mother_queen_birth_date) : ''
  )
  const queenDisplayName = `Cell #${distribution.cell_number}`
  const queenTaggedLabel = distribution.queen_number ? `Queen Tagged ${distribution.queen_number}` : null
  const markingStatusLabel = distribution.queen_marked
    ? markingColour
      ? `Marked (${markingColour})`
      : 'Marked'
    : 'Unmarked'
  const queenSecondaryParts = [
    distribution.queen_marked ? 'Marked' : 'Unmarked',
    distribution.emergence_date ? calculateQueenAge(distribution.emergence_date) : null,
  ].filter(Boolean)
  const latestWeightLabel = distribution.latest_weight_mg
    !== null
    ? distribution.latest_weight_date
      ? `${distribution.latest_weight_mg} mg on ${formatDateIrish(distribution.latest_weight_date)}`
      : `${distribution.latest_weight_mg} mg`
    : '-'

  return {
    ...distribution,
    display_type_label: typeInfo.label,
    display_type_class: typeInfo.className,
    lifecycle_label: lifecycleInfo.label,
    lifecycle_class: lifecycleInfo.className,
    group_name: groupName,
    queen_display_name: queenDisplayName,
    queen_secondary_label: queenSecondaryParts.join(' / '),
    recipient_display_name: getRecipientName(distribution),
    recipient_contact_label: getRecipientContact(distribution),
    destination_label: getDestinationLabel(distribution),
    recipient_apiary_label: getRecipientApiaryLabel(distribution),
    origin_mating_apiary_label: getOriginMatingApiaryLabel(distribution),
    mother_queen_label: getMotherQueenLabel(distribution),
    current_stage_label: formatGraftStatus(distribution.graft_status),
    latest_weight_label: latestWeightLabel,
    queen_age_label: distribution.emergence_date ? calculateQueenAge(distribution.emergence_date) : 'N/A',
    queen_tagged_label: queenTaggedLabel,
    marking_colour_label: markingColour || '-',
    marking_status_label: markingStatusLabel,
    mother_queen_age_label: distribution.mother_queen_birth_date ? calculateQueenAge(distribution.mother_queen_birth_date) : 'N/A',
    mother_queen_marking_label: motherQueenMarkingColour || '-',
    has_hybridisation_date_input: distribution.offspring_hybridised === true,
  }
}

export default function QueenTrackerTab({ userId }: QueenTrackerTabProps) {
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
  } = useQueenTracker()
  const { ownedRearingGroups, memberRearingGroups, fetchRearingGroups } = useRearingGroups()

  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear())
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const updatingIdsRef = useRef(updatingIds)
  updatingIdsRef.current = updatingIds

  useEffect(() => {
    fetchDistributions(userId)
    fetchRearingGroups(userId)
  }, [userId, fetchDistributions, fetchRearingGroups])

  const allGroups = useMemo(() => {
    const groupsById = new Map<string, (typeof ownedRearingGroups)[number]>()

    memberRearingGroups.forEach((group) => {
      groupsById.set(group.id, group)
    })
    ownedRearingGroups.forEach((group) => {
      groupsById.set(group.id, group)
    })

    return Array.from(groupsById.values())
  }, [ownedRearingGroups, memberRearingGroups])

  const groupNameById = useMemo(() => {
    return new Map(allGroups.map((group) => [group.id, group.name]))
  }, [allGroups])

  const availableYears = useMemo(() => {
    const years = new Set<number>()

    distributions.forEach((distribution) => {
      if (!distribution.distribution_date) return
      const date = new Date(distribution.distribution_date + 'T00:00:00')
      if (isNaN(date.getTime())) return
      years.add(date.getFullYear())
    })

    return Array.from(years).sort((a, b) => b - a)
  }, [distributions])

  const filteredDistributions = useMemo(() => {
    let result = distributions
    result = filterByGroup(result, selectedGroupId || null)
    result = filterByYear(result, selectedYear)
    result = filterByStatus(result, selectedStatus)
    return result
  }, [distributions, selectedGroupId, selectedYear, selectedStatus, filterByGroup, filterByYear, filterByStatus])

  const trackerRows = useMemo(() => {
    return filteredDistributions.map((distribution) =>
      buildDerivedRow(distribution, groupNameById.get(distribution.rearing_group_id) || 'Unknown group')
    )
  }, [filteredDistributions, groupNameById])

  const stats = useMemo(() => calculateStats(filteredDistributions), [filteredDistributions, calculateStats])

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

  const handleHybridisationDateChange = useCallback(async (id: string, date: string) => {
    if (!date || updatingIdsRef.current.has(id)) return

    setUpdatingIds((prev) => new Set(prev).add(id))
    try {
      const success = await updateHybridisation(id, true, date)
      if (success) {
        toast.success('Hybridisation date updated')
        await fetchDistributions(userId)
      } else {
        toast.error('Failed to update hybridisation date')
      }
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [updateHybridisation, fetchDistributions, userId, toast])

  if (loading) {
    return <div className="py-10 text-center text-text-secondary">Loading queen tracker...</div>
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-800 dark:bg-red-900/20">
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">Error loading queen tracker</h3>
        <p className="mt-2 text-sm text-red-600 dark:text-red-200">{error}</p>
        <Button type="button" tone="danger" size="sm" className="mt-4" onClick={() => fetchDistributions(userId)}>
          Retry
        </Button>
      </div>
    )
  }

  if (allGroups.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm dark:bg-surface-elevated/95">
        <h3 className="text-lg font-semibold text-foreground">Queen Tracker</h3>
        <p className="mt-2 text-sm text-text-secondary">
          You are not a member of any rearing groups. Join or create a group to track distributed queens here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border bg-surface px-5 py-5 shadow-sm dark:bg-surface-elevated/95 sm:px-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-tertiary">Queen tracker</p>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-foreground sm:text-[2rem]">Distributed Queen Ledger</h3>
              <p className="text-sm leading-6 text-text-secondary">
                Follow each distributed queen as a full record: identity, breeding context, destination, and longer-term outcomes in one place.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:min-w-[38rem]">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Group</label>
              <select
                value={selectedGroupId}
                onChange={(event) => {
                  const value = event.target.value
                  startTransition(() => setSelectedGroupId(value))
                }}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm dark:bg-surface-elevated"
              >
                <option value="">All groups</option>
                {allGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} {group.user_role === 'owner' ? '(Owner)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Year</label>
              <select
                value={selectedYear ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  startTransition(() => {
                    const parsed = parseInt(value, 10)
                    setSelectedYear(Number.isFinite(parsed) ? parsed : null)
                  })
                }}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm dark:bg-surface-elevated"
              >
                <option value="">All years</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Status</label>
              <select
                value={selectedStatus}
                onChange={(event) => {
                  const value = event.target.value as StatusFilter
                  startTransition(() => setSelectedStatus(value))
                }}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm dark:bg-surface-elevated"
              >
                <option value="all">All</option>
                <option value="pending">Pending mating</option>
                <option value="mated">Mated (awaiting winter)</option>
                <option value="overwintered">Overwintered</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Tracked queens" value={stats.total} accentClass="bg-slate-500" />
        <SummaryCard label="Mated" value={stats.mated} accentClass="bg-green-500" />
        <SummaryCard label="Overwintered" value={stats.overwintered} accentClass="bg-blue-500" />
        <SummaryCard label="Failed" value={stats.failed} accentClass="bg-red-500" />
        <SummaryCard label="Hybridised" value={stats.hybridised} accentClass="bg-amber-500" />
      </div>

      {trackerRows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm dark:bg-surface-elevated/95">
          <p className="text-sm text-text-secondary">No distributed queens match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trackerRows.map((distribution) => {
            const markingColourDotClass = distribution.queen_marked && distribution.marking_colour_label !== '-'
              ? COLOUR_DOTS[distribution.marking_colour_label] || ''
              : ''
            const isExpanded = expandedId === distribution.id
            const isUpdating = updatingIds.has(distribution.id)
            const isReadOnly = !distribution.can_edit

            return (
              <article
                key={distribution.id}
                className="overflow-hidden rounded-[1.6rem] border border-border bg-surface shadow-sm [content-visibility:auto] dark:bg-surface-elevated/95"
              >
                <div className="border-b border-border bg-gradient-to-r from-surface-secondary via-surface to-surface px-4 py-4 dark:from-surface dark:via-surface-elevated/90 dark:to-surface-elevated sm:px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${distribution.display_type_class}`}>
                          {distribution.display_type_label}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${distribution.lifecycle_class}`}>
                          {distribution.lifecycle_label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary dark:bg-surface-elevated">
                          {distribution.group_name}
                        </span>
                        {distribution.offspring_hybridised === true && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900/35 dark:text-amber-300">
                            Hybridised
                          </span>
                        )}
                        {isReadOnly && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/35 dark:text-slate-300">
                            Read only
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-forest-700 dark:bg-forest-900/25 dark:text-forest-300">
                              <Crown size={20} />
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {markingColourDotClass && (
                                  <span className={`inline-block h-3 w-3 rounded-full ${markingColourDotClass}`} />
                                )}
                                <h4 className="truncate text-lg font-semibold text-foreground">{distribution.queen_display_name}</h4>
                              </div>
                              <p className="mt-1 text-sm text-text-secondary">{distribution.queen_secondary_label}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary dark:bg-surface-elevated">
                            <Tag size={13} />
                            {distribution.marking_status_label}
                          </span>
                          {distribution.queen_tagged_label && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary dark:bg-surface-elevated">
                              <span>{distribution.queen_tagged_label}</span>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary dark:bg-surface-elevated">
                            <Scale size={13} />
                            {distribution.latest_weight_label === '-' ? 'No weight logged' : distribution.latest_weight_label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : distribution.id)}
                      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium text-text-secondary transition-colors hover:text-foreground dark:bg-surface-elevated"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Collapse queen details' : 'Expand queen details'}
                    >
                      <span>{isExpanded ? 'Hide details' : 'Show details'}</span>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>
                <div className={isExpanded ? 'block' : 'hidden'}>
                  <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2 2xl:grid-cols-4">
                    <TrackerPanel title="Queen Record" icon={Crown}>
                      <DetailItem label="Queen Tagged" value={distribution.queen_number || '-'} />
                      <DetailItem label="Cell number" value={`#${distribution.cell_number}`} />
                      <DetailItem label="Marking" value={distribution.marking_status_label} />
                      <DetailItem label="Age" value={distribution.queen_age_label} />
                      <DetailItem label="Latest weight" value={distribution.latest_weight_label} />
                      <DetailItem label="Current graft stage" value={distribution.current_stage_label} />
                      <DetailItem label="Stage date" value={formatOptionalDate(distribution.graft_status_date)} />
                    </TrackerPanel>

                    <TrackerPanel title="Breeding Context" icon={Package2}>
                      <DetailItem label="Batch" value={distribution.batch_name} />
                      <DetailItem label="Breeder" value={distribution.batch_owner_name || '-'} />
                      <DetailItem label="Mother queen" value={distribution.mother_queen_label} />
                      <DetailItem label="Mother marking" value={distribution.mother_queen_marking_label} />
                      <DetailItem label="Mother age" value={distribution.mother_queen_age_label} />
                      <DetailItem label="Graft date" value={formatOptionalDate(distribution.graft_date)} />
                      <DetailItem label="Emergence date" value={formatOptionalDate(distribution.emergence_date)} />
                      <DetailItem label="Source mating apiary" value={distribution.origin_mating_apiary_label} />
                    </TrackerPanel>

                    <TrackerPanel title="Destination" icon={UserRound}>
                      <DetailItem label="Recipient" value={distribution.recipient_display_name} />
                      <DetailItem label="Contact" value={distribution.recipient_contact_label} />
                      <DetailItem label="Recipient apiary" value={distribution.recipient_apiary_label} />
                      <DetailItem label="Recorded location" value={distribution.destination_label} />
                      <DetailItem label="Distribution date" value={formatOptionalDate(distribution.distribution_date)} />
                      <DetailItem label="Notes" value={distribution.notes || '-'} />
                    </TrackerPanel>

                    <TrackerPanel title="Outcomes" icon={Sprout}>
                      {isReadOnly && (
                        <div className="rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-text-secondary dark:bg-surface-elevated">
                          Only the distributing member can update overwintering and hybridisation outcomes for this record.
                        </div>
                      )}

                      <div className="rounded-2xl border border-border bg-surface px-3 py-3 dark:bg-surface-elevated">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Mated</p>
                            <p className="mt-1 text-sm text-foreground">
                              {distribution.mating_confirmed || distribution.distribution_type === 'mated_queen' ? 'Confirmed' : 'Pending'}
                            </p>
                            <p className="mt-1 text-xs text-text-secondary">Date: {formatOptionalDate(distribution.mating_confirmed_date)}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium ${
                            distribution.mating_confirmed || distribution.distribution_type === 'mated_queen'
                              ? 'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/35 dark:text-green-300'
                              : 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/35 dark:text-amber-300'
                          }`}>
                            {distribution.mating_confirmed || distribution.distribution_type === 'mated_queen' ? <Check size={14} /> : <HelpCircle size={14} />}
                            <span>{distribution.mating_confirmed || distribution.distribution_type === 'mated_queen' ? 'Yes' : 'Pending'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-surface px-3 py-3 dark:bg-surface-elevated">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Overwintered</p>
                            <p className="mt-1 text-xs text-text-secondary">Date: {formatOptionalDate(distribution.overwintered_date)}</p>
                          </div>
                          <ThreeStateToggle
                            value={distribution.overwintered}
                            onChange={(value) => handleOverwinteredChange(distribution.id, value)}
                            labels={{ true: 'Yes', false: 'No', null: '?' }}
                            disabled={isUpdating || isReadOnly}
                            ariaLabel={`Queen ${distribution.queen_display_name} overwintered`}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-surface px-3 py-3 dark:bg-surface-elevated">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Hybridised offspring</p>
                              <p className="mt-1 text-xs text-text-secondary">Date: {formatOptionalDate(distribution.hybridisation_date)}</p>
                            </div>
                            <ThreeStateToggle
                              value={distribution.offspring_hybridised}
                              onChange={(value) => handleHybridisationChange(distribution.id, value)}
                              labels={{ true: 'Yes', false: 'No', null: '?' }}
                              disabled={isUpdating || isReadOnly}
                              ariaLabel={`Queen ${distribution.queen_display_name} hybridised`}
                            />
                          </div>

                          {distribution.has_hybridisation_date_input && (
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                                Hybridisation date
                              </label>
                              <input
                                key={`${distribution.id}-hd-${distribution.hybridisation_date ?? ''}`}
                                type="date"
                                defaultValue={distribution.hybridisation_date || ''}
                                onChange={(event) => handleHybridisationDateChange(distribution.id, event.target.value)}
                                disabled={isUpdating || isReadOnly}
                                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground dark:bg-surface-elevated"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </TrackerPanel>
                  </div>

                  <div className="grid gap-3 border-t border-border px-4 py-4 sm:px-5 md:grid-cols-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-surface-secondary/60 px-3 py-2 text-sm text-text-secondary dark:bg-surface/60">
                      <CalendarDays size={15} className="text-forest-600 dark:text-forest-300" />
                      <span>Distributed {formatOptionalDate(distribution.distribution_date)}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-surface-secondary/60 px-3 py-2 text-sm text-text-secondary dark:bg-surface/60">
                      <MapPin size={15} className="text-forest-600 dark:text-forest-300" />
                      <span>{distribution.destination_label}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(distribution.recipient_email || distribution.external_recipient_email) && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-surface-secondary/60 px-3 py-2 text-sm text-text-secondary dark:bg-surface/60">
                          <Mail size={15} className="text-forest-600 dark:text-forest-300" />
                          <span className="truncate">{distribution.recipient_email || distribution.external_recipient_email}</span>
                        </span>
                      )}
                      {distribution.external_recipient_phone && (
                        <span className="inline-flex items-center gap-2 rounded-full bg-surface-secondary/60 px-3 py-2 text-sm text-text-secondary dark:bg-surface/60">
                          <Phone size={15} className="text-forest-600 dark:text-forest-300" />
                          <span>{distribution.external_recipient_phone}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
