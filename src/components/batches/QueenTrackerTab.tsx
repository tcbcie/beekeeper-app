'use client'

import { Fragment, startTransition, useState, useEffect, useCallback, useMemo, useRef, type ComponentType, type ReactNode } from 'react'
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
  Sprout,
  Tag,
  UserRound,
  X,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { NON_GROUP_LEDGER_SCOPE, useQueenTracker, type TrackedQueen, type StatusFilter } from '@/hooks/useQueenTracker'
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
  latest_weight_label: string
  queen_age_label: string
  marking_colour_label: string
  marking_status_label: string
  mother_queen_age_label: string
  mother_queen_marking_label: string
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

function OutcomeActionCell({
  id,
  value,
  date,
  disabled,
  dateEnabled,
  ariaLabel,
  onValueChange,
  onDateChange,
}: {
  id: string
  value: boolean | null
  date: string | null
  disabled: boolean
  dateEnabled: boolean
  ariaLabel: string
  onValueChange: (newValue: boolean | null) => void
  onDateChange: (id: string, date: string) => Promise<boolean>
}) {
  const [draftDate, setDraftDate] = useState(date || '')

  useEffect(() => {
    setDraftDate(date || '')
  }, [date, id])

  const commitDate = useCallback(async () => {
    if (disabled || !dateEnabled) return

    const nextValue = draftDate.trim()
    const currentValue = date || ''
    if (nextValue === currentValue) return

    const success = await onDateChange(id, nextValue)
    if (!success) {
      setDraftDate(currentValue)
    }
  }, [date, dateEnabled, disabled, draftDate, id, onDateChange])

  return (
    <div className="min-w-[8.75rem] space-y-2">
      <ThreeStateToggle
        value={value}
        onChange={onValueChange}
        labels={{ true: 'Yes', false: 'No', null: '?' }}
        disabled={disabled}
        ariaLabel={ariaLabel}
      />
      <input
        type="date"
        value={dateEnabled ? draftDate : ''}
        onChange={(event) => setDraftDate(event.target.value)}
        onBlur={() => void commitDate()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
        disabled={disabled || !dateEnabled}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground shadow-sm disabled:cursor-not-allowed disabled:bg-surface-secondary/70 disabled:text-text-tertiary dark:bg-surface-elevated"
      />
    </div>
  )
}

function SummaryPill({
  label,
  value,
  accentClass,
}: {
  label: string
  value: number
  accentClass: string
}) {
  return (
    <div className="inline-flex min-w-[10.5rem] flex-1 items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm dark:bg-surface-elevated/95">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accentClass}`} />
      <div className="min-w-0 space-y-0.5">
        <div className="text-lg font-semibold text-foreground">{value}</div>
        <div className="text-xs text-text-secondary">{label}</div>
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

function formatTriStateValue(value: boolean | null): string {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return '?'
}

function ExpandedTrackerRowContent({
  distribution,
  ownerDisplayName,
  isReadOnly,
}: {
  distribution: DerivedTrackerRow
  ownerDisplayName: string
  isReadOnly: boolean
}) {
  return (
    <>
      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2 2xl:grid-cols-4">
        <TrackerPanel title="Queen Record" icon={Crown}>
          <DetailItem label="Queen Tagged" value={formatQueenTaggedValue(distribution.queen_number) || '-'} />
          <DetailItem label="Cell number" value={`#${distribution.cell_number}`} />
          <DetailItem label="Marking" value={distribution.marking_status_label} />
          <DetailItem label="Age" value={distribution.queen_age_label} />
          <DetailItem label="Latest weight" value={distribution.latest_weight_label} />
        </TrackerPanel>

        <TrackerPanel title="Breeding Context" icon={Package2}>
          <DetailItem label="Group" value={distribution.group_name} />
          <DetailItem label="Member" value={ownerDisplayName} />
          <DetailItem label="Batch" value={distribution.batch_name} />
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

          <DetailItem
            label="Mated"
            value={distribution.mating_confirmed || distribution.distribution_type === 'mated_queen' ? 'Confirmed' : 'Pending'}
          />
          <DetailItem label="Mated date" value={formatOptionalDate(distribution.mating_confirmed_date)} />
          <DetailItem label="Overwintered" value={formatTriStateValue(distribution.overwintered)} />
          <DetailItem label="Overwintered date" value={formatOptionalDate(distribution.overwintered_date)} />
          <DetailItem label="Hybridised offspring" value={formatTriStateValue(distribution.offspring_hybridised)} />
          <DetailItem label="Hybridisation date" value={formatOptionalDate(distribution.hybridisation_date)} />
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
    </>
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

function formatQueenTaggedValue(queenNumber: string | null): string | null {
  const value = queenNumber?.trim()
  if (!value) return null
  return value.startsWith('#') ? value : `#${value}`
}

function getGroupScopeLabel(distribution: TrackedQueen, groupName: string | null): string {
  if (!distribution.is_group_batch) return 'Non-group batch'
  return groupName || 'Unknown group'
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
  const markingStatusLabel = distribution.queen_marked
    ? markingColour
      ? `Marked (${markingColour})`
      : 'Marked'
    : 'Unmarked'
  const queenSecondaryLabel = distribution.emergence_date
    ? `Age ${calculateQueenAge(distribution.emergence_date)}`
    : 'Age N/A'
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
    queen_secondary_label: queenSecondaryLabel,
    recipient_display_name: getRecipientName(distribution),
    recipient_contact_label: getRecipientContact(distribution),
    destination_label: getDestinationLabel(distribution),
    recipient_apiary_label: getRecipientApiaryLabel(distribution),
    origin_mating_apiary_label: getOriginMatingApiaryLabel(distribution),
    mother_queen_label: getMotherQueenLabel(distribution),
    latest_weight_label: latestWeightLabel,
    queen_age_label: distribution.emergence_date ? calculateQueenAge(distribution.emergence_date) : 'N/A',
    marking_colour_label: markingColour || '-',
    marking_status_label: markingStatusLabel,
    mother_queen_age_label: distribution.mother_queen_birth_date ? calculateQueenAge(distribution.mother_queen_birth_date) : 'N/A',
    mother_queen_marking_label: motherQueenMarkingColour || '-',
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
    filterByMember,
    filterByBatch,
  } = useQueenTracker()
  const { ownedRearingGroups, memberRearingGroups, fetchRearingGroups } = useRearingGroups()

  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear())
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all')
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
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

  const preHierarchyDistributions = useMemo(() => {
    let result = distributions
    result = filterByYear(result, selectedYear)
    result = filterByStatus(result, selectedStatus)
    return result
  }, [distributions, selectedYear, selectedStatus, filterByYear, filterByStatus])

  const availableGroupFilters = useMemo(() => {
    const visibleGroupIds = new Set<string>()
    let hasNonGroupRows = false

    preHierarchyDistributions.forEach((distribution) => {
      if (distribution.is_group_batch && distribution.rearing_group_id) {
        visibleGroupIds.add(distribution.rearing_group_id)
        return
      }

      hasNonGroupRows = true
    })

    const groups = allGroups
      .filter((group) => visibleGroupIds.has(group.id))
      .sort((a, b) => a.name.localeCompare(b.name))

    return { groups, hasNonGroupRows }
  }, [allGroups, preHierarchyDistributions])

  useEffect(() => {
    if (!selectedGroupId) return

    if (selectedGroupId === NON_GROUP_LEDGER_SCOPE) {
      if (!availableGroupFilters.hasNonGroupRows) {
        setSelectedGroupId('')
        setSelectedMemberId('')
        setSelectedBatchId('')
      }
      return
    }

    const hasSelectedGroup = availableGroupFilters.groups.some((group) => group.id === selectedGroupId)
    if (!hasSelectedGroup) {
      setSelectedGroupId('')
      setSelectedMemberId('')
      setSelectedBatchId('')
    }
  }, [availableGroupFilters, selectedGroupId])

  const groupScopedDistributions = useMemo(() => {
    return filterByGroup(preHierarchyDistributions, selectedGroupId || null)
  }, [preHierarchyDistributions, selectedGroupId, filterByGroup])

  const availableMembers = useMemo(() => {
    const membersById = new Map<string, string>()

    groupScopedDistributions.forEach((distribution) => {
      if (membersById.has(distribution.batch_owner_id)) return

      const ownerName = distribution.batch_owner_name?.trim()
      const label = distribution.batch_owner_id === userId
        ? 'You'
        : ownerName || 'Unknown member'

      membersById.set(distribution.batch_owner_id, label)
    })

    return Array.from(membersById.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [groupScopedDistributions, userId])

  useEffect(() => {
    if (!selectedMemberId) return

    const hasSelectedMember = availableMembers.some((member) => member.id === selectedMemberId)
    if (!hasSelectedMember) {
      setSelectedMemberId('')
      setSelectedBatchId('')
    }
  }, [availableMembers, selectedMemberId])

  const memberScopedDistributions = useMemo(() => {
    return filterByMember(groupScopedDistributions, selectedMemberId || null)
  }, [groupScopedDistributions, selectedMemberId, filterByMember])

  const availableBatches = useMemo(() => {
    const batchesById = new Map<string, string>()

    memberScopedDistributions.forEach((distribution) => {
      if (batchesById.has(distribution.batch_id)) return
      batchesById.set(distribution.batch_id, distribution.batch_name)
    })

    return Array.from(batchesById.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [memberScopedDistributions])

  useEffect(() => {
    if (!selectedBatchId) return

    const hasSelectedBatch = availableBatches.some((batch) => batch.id === selectedBatchId)
    if (!hasSelectedBatch) {
      setSelectedBatchId('')
    }
  }, [availableBatches, selectedBatchId])

  const filteredDistributions = useMemo(() => {
    return filterByBatch(memberScopedDistributions, selectedBatchId || null)
  }, [memberScopedDistributions, selectedBatchId, filterByBatch])

  const trackerRows = useMemo(() => {
    return filteredDistributions.map((distribution) =>
      buildDerivedRow(distribution, getGroupScopeLabel(distribution, groupNameById.get(distribution.rearing_group_id ?? '') || null))
    )
  }, [filteredDistributions, groupNameById])

  useEffect(() => {
    if (!selectedId) return

    const hasSelectedRow = trackerRows.some((distribution) => distribution.id === selectedId)
    if (!hasSelectedRow) {
      setSelectedId(null)
    }
  }, [selectedId, trackerRows])

  const stats = useMemo(() => calculateStats(filteredDistributions), [filteredDistributions, calculateStats])
  const summaryLabel = stats.total === 1
    ? '1 queen matches the current filters.'
    : `${stats.total} queens match the current filters.`

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

  const handleOverwinteredDateChange = useCallback(async (
    id: string,
    currentValue: boolean | null,
    date: string
  ): Promise<boolean> => {
    if (currentValue === null || updatingIdsRef.current.has(id)) return false

    const nextDate = date.trim()

    setUpdatingIds((prev) => new Set(prev).add(id))
    try {
      const success = await updateOverwintered(id, currentValue, nextDate === '' ? null : nextDate)
      if (success) {
        toast.success('Overwintered date updated')
        await fetchDistributions(userId)
      } else {
        toast.error('Failed to update overwintered date')
      }
      return success
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

  const handleHybridisationDateChange = useCallback(async (id: string, date: string): Promise<boolean> => {
    if (updatingIdsRef.current.has(id)) return false

    const nextDate = date.trim()

    setUpdatingIds((prev) => new Set(prev).add(id))
    try {
      const success = await updateHybridisation(id, true, nextDate === '' ? null : nextDate)
      if (success) {
        toast.success('Hybridisation date updated')
        await fetchDistributions(userId)
      } else {
        toast.error('Failed to update hybridisation date')
      }
      return success
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

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-border bg-surface px-5 py-5 shadow-sm dark:bg-surface-elevated/95 sm:px-6">
        <div className="rounded-2xl border border-border bg-surface-secondary/55 p-4 shadow-sm dark:bg-surface-elevated/55">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">Ledger filters</p>
              <p className="mt-1 text-xs text-text-secondary">Group, member, batch, year, and outcome status</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="min-w-0">
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Group</label>
              <select
                value={selectedGroupId}
                onChange={(event) => {
                  const value = event.target.value
                  startTransition(() => {
                    setSelectedGroupId(value)
                    setSelectedMemberId('')
                    setSelectedBatchId('')
                  })
                }}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm dark:bg-surface-elevated"
              >
                <option value="">All groups and non-group batches</option>
                {availableGroupFilters.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} {group.user_role === 'owner' ? '(Owner)' : ''}
                  </option>
                ))}
                {availableGroupFilters.hasNonGroupRows && (
                  <option value={NON_GROUP_LEDGER_SCOPE}>Non-group batches</option>
                )}
              </select>
            </div>

            <div className="min-w-0">
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Member</label>
              <select
                value={selectedMemberId}
                onChange={(event) => {
                  const value = event.target.value
                  startTransition(() => {
                    setSelectedMemberId(value)
                    setSelectedBatchId('')
                  })
                }}
                disabled={availableMembers.length === 0}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-elevated"
              >
                <option value="">All members</option>
                {availableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Batch</label>
              <select
                value={selectedBatchId}
                onChange={(event) => {
                  const value = event.target.value
                  startTransition(() => setSelectedBatchId(value))
                }}
                disabled={availableBatches.length === 0}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-elevated"
              >
                <option value="">All batches</option>
                {availableBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Year</label>
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

            <div className="min-w-0">
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Status</label>
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

      <section className="overflow-hidden rounded-[1.6rem] border border-border bg-surface shadow-sm dark:bg-surface-elevated/95">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">Ledger summary</p>
            <p className="mt-1 text-sm text-text-secondary">{summaryLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsSummaryExpanded((current) => !current)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium text-text-secondary transition-colors hover:text-foreground dark:bg-surface-elevated"
            aria-expanded={isSummaryExpanded}
            aria-controls="queen-ledger-summary-panel"
          >
            <span>{isSummaryExpanded ? 'Hide summary' : 'Show summary'}</span>
            {isSummaryExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        <div
          id="queen-ledger-summary-panel"
          className={isSummaryExpanded ? 'border-t border-border px-4 py-4 sm:px-5' : 'hidden'}
        >
          <div className="flex flex-wrap gap-3">
            <SummaryPill label="Tracked queens" value={stats.total} accentClass="bg-slate-500" />
            <SummaryPill label="Mated" value={stats.mated} accentClass="bg-green-500" />
            <SummaryPill label="Overwintered" value={stats.overwintered} accentClass="bg-blue-500" />
            <SummaryPill label="Failed" value={stats.failed} accentClass="bg-red-500" />
            <SummaryPill label="Hybridised" value={stats.hybridised} accentClass="bg-amber-500" />
          </div>
        </div>
      </section>

      {trackerRows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm dark:bg-surface-elevated/95">
          <p className="text-sm text-text-secondary">
            {distributions.length === 0
              ? 'No queen ledger records are available yet.'
              : 'No distributed queens match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.6rem] border border-border bg-surface shadow-sm dark:bg-surface-elevated/95">
          <div className="overflow-x-auto">
            <table className="min-w-[84rem] w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-surface-secondary/70 dark:bg-surface-elevated/85">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Details</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Overwintered</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Hybridised</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Queen</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Destination</th>
                </tr>
              </thead>
              <tbody>
                {trackerRows.map((distribution) => {
                  const markingColourDotClass = distribution.queen_marked && distribution.marking_colour_label !== '-'
                    ? COLOUR_DOTS[distribution.marking_colour_label] || ''
                    : ''
                  const isExpanded = expandedId === distribution.id
                  const isSelected = selectedId === distribution.id
                  const isUpdating = updatingIds.has(distribution.id)
                  const isReadOnly = !distribution.can_edit
                  const ownerDisplayName = distribution.batch_owner_name
                    || (distribution.batch_owner_id === userId ? 'You' : '-')
                  const queenTaggedValue = formatQueenTaggedValue(distribution.queen_number)
                  const cellHighlightClass = isSelected
                    ? 'bg-emerald-50/95 dark:bg-emerald-950/30'
                    : isReadOnly
                      ? 'bg-slate-50/95 dark:bg-slate-950/28'
                      : isExpanded
                        ? 'bg-surface-secondary/30 dark:bg-surface-elevated/70'
                        : ''
                  const rowFrameClass = isSelected
                    ? 'shadow-[inset_0_1px_0_rgba(16,185,129,0.42),inset_0_-1px_0_rgba(16,185,129,0.42)]'
                    : isReadOnly
                      ? 'shadow-[inset_0_1px_0_rgba(100,116,139,0.2),inset_0_-1px_0_rgba(100,116,139,0.2)]'
                      : ''
                  const leadingAccentClass = isSelected
                    ? "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:rounded-r-full before:bg-emerald-500 before:content-[''] dark:before:bg-emerald-400"
                    : isReadOnly
                      ? "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-slate-400 before:content-[''] dark:before:bg-slate-500"
                      : ''

                  return (
                    <Fragment key={distribution.id}>
                      <tr
                        aria-selected={isSelected}
                        onClick={() => setSelectedId(distribution.id)}
                        onFocusCapture={() => setSelectedId(distribution.id)}
                        className="transition-colors"
                      >
                        <td className={`relative border-t border-border px-4 py-3 align-top ${cellHighlightClass} ${rowFrameClass} ${leadingAccentClass}`}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(distribution.id)
                              setExpandedId(isExpanded ? null : distribution.id)
                            }}
                            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-sm font-medium transition-colors ${
                              isSelected
                                ? 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-200'
                                : isReadOnly
                                  ? 'border-slate-300 bg-slate-100 text-slate-700 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-200'
                                  : 'border-border bg-surface text-text-secondary hover:text-foreground dark:bg-surface-elevated'
                            }`}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Collapse queen details' : 'Expand queen details'}
                          >
                            <span>{isExpanded ? 'Hide' : 'Show'}</span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className={`border-t border-border px-4 py-3 align-top ${cellHighlightClass} ${rowFrameClass}`}>
                          <OutcomeActionCell
                            id={distribution.id}
                            value={distribution.overwintered}
                            date={distribution.overwintered_date}
                            disabled={isUpdating || isReadOnly}
                            dateEnabled={distribution.overwintered !== null}
                            ariaLabel={`Queen ${distribution.queen_display_name} overwintered`}
                            onValueChange={(value) => handleOverwinteredChange(distribution.id, value)}
                            onDateChange={(id, date) => handleOverwinteredDateChange(id, distribution.overwintered, date)}
                          />
                        </td>
                        <td className={`border-t border-border px-4 py-3 align-top ${cellHighlightClass} ${rowFrameClass}`}>
                          <OutcomeActionCell
                            id={distribution.id}
                            value={distribution.offspring_hybridised}
                            date={distribution.hybridisation_date}
                            disabled={isUpdating || isReadOnly}
                            dateEnabled={distribution.offspring_hybridised === true}
                            ariaLabel={`Queen ${distribution.queen_display_name} hybridised`}
                            onValueChange={(value) => handleHybridisationChange(distribution.id, value)}
                            onDateChange={handleHybridisationDateChange}
                          />
                        </td>
                        <td className={`border-t border-border px-4 py-3 align-top ${cellHighlightClass} ${rowFrameClass}`}>
                          <div className="min-w-[12rem] space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-foreground">{distribution.queen_display_name}</p>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <span
                                  title={distribution.marking_status_label}
                                  aria-label={distribution.marking_status_label}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                                    distribution.queen_marked
                                      ? 'border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/35 dark:text-green-300'
                                      : 'border-border bg-surface text-text-secondary dark:bg-surface-elevated'
                                  }`}
                                >
                                  {distribution.queen_marked ? (
                                    <span className="flex items-center gap-1">
                                      {markingColourDotClass && (
                                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${markingColourDotClass}`} />
                                      )}
                                      <Check size={13} />
                                    </span>
                                  ) : (
                                    <X size={13} />
                                  )}
                                </span>
                                <span
                                  title={queenTaggedValue ? `Tagged ${queenTaggedValue}` : 'Untagged'}
                                  aria-label={queenTaggedValue ? `Tagged ${queenTaggedValue}` : 'Untagged'}
                                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${
                                    queenTaggedValue
                                      ? 'border-border bg-surface text-text-secondary dark:bg-surface-elevated'
                                      : 'border-border bg-surface-secondary text-text-tertiary dark:bg-surface-elevated'
                                  }`}
                                >
                                  <Tag size={12} />
                                  {queenTaggedValue && <span>{queenTaggedValue}</span>}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-text-secondary">{distribution.queen_secondary_label}</p>
                          </div>
                        </td>
                        <td className={`border-t border-border px-4 py-3 align-top ${cellHighlightClass} ${rowFrameClass}`}>
                          <div className="min-w-[9.5rem] space-y-1.5">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${distribution.display_type_class}`}>
                              {distribution.display_type_label}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${distribution.lifecycle_class}`}>
                              {distribution.lifecycle_label}
                            </span>
                          </div>
                        </td>
                        <td className={`border-t border-border px-4 py-3 align-top ${cellHighlightClass} ${rowFrameClass}`}>
                          <div className="min-w-[16rem]">
                            <p className="font-medium text-foreground">{distribution.recipient_display_name}</p>
                            <p className="mt-1 text-xs text-text-secondary">{distribution.destination_label}</p>
                            <p className="mt-1 text-xs text-text-secondary">Distributed {formatOptionalDate(distribution.distribution_date)}</p>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={6}
                            className={`border-t border-border p-0 ${
                              isSelected
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/20'
                                : isReadOnly
                                  ? 'bg-slate-50/80 dark:bg-slate-950/20'
                                  : 'bg-surface-secondary/20 dark:bg-surface/35'
                            }`}
                          >
                            <ExpandedTrackerRowContent
                              distribution={distribution}
                              ownerDisplayName={ownerDisplayName}
                              isReadOnly={isReadOnly}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
