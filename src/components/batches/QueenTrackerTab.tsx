'use client'

import { Fragment, startTransition, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  GitMerge,
  CalendarDays,
  Snowflake,
  Search,
  X,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { NON_GROUP_LEDGER_SCOPE, useQueenTracker, type TrackedQueen, type StatusFilter } from '@/hooks/useQueenTracker'
import { useRearingGroups } from '@/hooks/useRearingGroups'
import { parseLocalDate, toLocalDateString } from '@/lib/date-utils'
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
  breeder_summary_label: string
  recipient_display_name: string
  recipient_type_label: string
  recipient_type_class: string
  recipient_type_dot: string
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

type OutcomeActionKind = 'mated' | 'overwintered' | 'hybridised' | 'failed'

type OutcomeActionDraft = {
  rowId: string
  kind: OutcomeActionKind
  value: boolean | null
  date: string
}

const MAX_FAILURE_COMMENT_LENGTH = 280

function getTodayLocalDate(): string {
  return toLocalDateString(new Date())
}

function outcomeNeedsDate(kind: OutcomeActionKind, value: boolean | null): boolean {
  switch (kind) {
    case 'mated':
    case 'failed':
      return true
    case 'overwintered':
      return value !== null
    case 'hybridised':
      return value === true
    default:
      return false
  }
}

function getOutcomeActionTitle(kind: OutcomeActionKind): string {
  switch (kind) {
    case 'mated':
      return 'Record mated date'
    case 'overwintered':
      return 'Record overwintered outcome'
    case 'hybridised':
      return 'Record hybridised outcome'
    case 'failed':
      return 'Record failure date'
    default:
      return 'Record outcome'
  }
}

function createOutcomeActionDraft(distribution: TrackedQueen, kind: OutcomeActionKind): OutcomeActionDraft {
  switch (kind) {
    case 'mated':
      return {
        rowId: distribution.id,
        kind,
        value: true,
        date: distribution.mating_confirmed_date || getTodayLocalDate(),
      }
    case 'failed':
      return {
        rowId: distribution.id,
        kind,
        value: true,
        date: distribution.queen_failed_date || getTodayLocalDate(),
      }
    case 'overwintered':
      return {
        rowId: distribution.id,
        kind,
        value: distribution.overwintered ?? true,
        date: distribution.overwintered_date || getTodayLocalDate(),
      }
    case 'hybridised':
      return {
        rowId: distribution.id,
        kind,
        value: distribution.offspring_hybridised ?? true,
        date: distribution.hybridisation_date || getTodayLocalDate(),
      }
    default:
      return {
        rowId: distribution.id,
        kind: 'mated',
        value: true,
        date: getTodayLocalDate(),
      }
  }
}

function OutcomeActionEditor({
  draft,
  disabled,
  onValueChange,
  onDateChange,
  onCancel,
  onSave,
}: {
  draft: OutcomeActionDraft
  disabled: boolean
  onValueChange: (value: boolean | null) => void
  onDateChange: (date: string) => void
  onCancel: () => void
  onSave: () => void
}) {
  const needsDate = outcomeNeedsDate(draft.kind, draft.value)
  const saveDisabled = disabled || (needsDate && draft.date.trim() === '')
  const showStateChoices = draft.kind === 'overwintered' || draft.kind === 'hybridised'

  return (
    <div className="mt-3 rounded-2xl border border-emerald-200/80 bg-white/90 p-3 shadow-sm dark:border-emerald-900/60 dark:bg-surface-elevated/95">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
        <CalendarDays size={14} className="text-emerald-700 dark:text-emerald-300" />
        <span>{getOutcomeActionTitle(draft.kind)}</span>
      </div>

      {showStateChoices && (
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            { label: 'Yes', value: true },
            { label: 'No', value: false },
            { label: 'Unknown', value: null },
          ].map((option) => {
            const isActive = draft.value === option.value
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => onValueChange(option.value)}
                disabled={disabled}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200'
                    : 'border-border bg-surface text-text-secondary dark:bg-surface'
                } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:opacity-85'}`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          Date
        </label>
        <input
          type="date"
          value={needsDate ? draft.date : ''}
          onChange={(event) => onDateChange(event.target.value)}
          disabled={disabled || !needsDate}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm disabled:cursor-not-allowed disabled:bg-surface-secondary/70 disabled:text-text-tertiary dark:bg-surface-elevated"
        />
        {!needsDate && (
          <p className="text-xs text-text-secondary">No date is needed for the selected outcome.</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className="rounded-full border border-emerald-500 bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Save
        </button>
      </div>
    </div>
  )
}

function OutcomeActionIcon({
  icon: Icon,
  label,
  active,
  activeClass,
  disabled,
  onClick,
  ariaLabel,
}: {
  icon: typeof Check
  label: string
  active: boolean | null
  activeClass: string
  disabled: boolean
  onClick: () => void
  ariaLabel: string
}) {
  const isOn = active === true
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`${label}: ${isOn ? 'On' : active === false ? 'Off' : '?'}`}
      aria-label={ariaLabel}
      aria-pressed={isOn ? 'true' : active === false ? 'false' : 'mixed'}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
        isOn ? activeClass : 'border-border bg-surface-secondary text-text-tertiary dark:bg-surface-elevated'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:opacity-80'}`}
    >
      <Icon size={13} aria-hidden="true" />
    </button>
  )
}

function OutcomeActionStack({
  showMatedAction,
  mated,
  overwintered,
  hybridised,
  failed,
  matingDisabled,
  outcomeDisabled,
  failureDisabled,
  queenLabel,
  onMatingToggle,
  onOverwinteredClick,
  onHybridisationClick,
  onFailureToggle,
}: {
  showMatedAction: boolean
  mated: boolean
  overwintered: boolean | null
  hybridised: boolean | null
  failed: boolean
  matingDisabled: boolean
  outcomeDisabled: boolean
  failureDisabled: boolean
  queenLabel: string
  onMatingToggle: () => void
  onOverwinteredClick: () => void
  onHybridisationClick: () => void
  onFailureToggle: () => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      {showMatedAction && (
        <OutcomeActionIcon
          icon={Check}
          label="Mated"
          active={mated}
          activeClass="border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900/50 dark:text-green-300"
          disabled={matingDisabled}
          onClick={onMatingToggle}
          ariaLabel={`${queenLabel} mated: ${mated ? 'Confirmed' : 'Pending'}`}
        />
      )}
      <OutcomeActionIcon
        icon={Snowflake}
        label="Overwintered"
        active={overwintered}
        activeClass="border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
        disabled={outcomeDisabled}
        onClick={onOverwinteredClick}
        ariaLabel={`${queenLabel} overwintered: ${formatTriStateValue(overwintered)}`}
      />
      <OutcomeActionIcon
        icon={GitMerge}
        label="Hybridised"
        active={hybridised}
        activeClass="border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
        disabled={outcomeDisabled}
        onClick={onHybridisationClick}
        ariaLabel={`${queenLabel} hybridised: ${formatTriStateValue(hybridised)}`}
      />
      <OutcomeActionIcon
        icon={X}
        label="Failed"
        active={failed}
        activeClass="border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/50 dark:text-red-300"
        disabled={failureDisabled}
        onClick={onFailureToggle}
        ariaLabel={`${queenLabel} failed: ${failed ? 'Yes' : 'No'}`}
      />
    </div>
  )
}

function OutcomeDateField({
  id,
  label,
  date,
  disabled,
  dateEnabled,
  onDateChange,
}: {
  id: string
  label: string
  date: string | null
  disabled: boolean
  dateEnabled: boolean
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
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
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
        className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:bg-surface-secondary/70 disabled:text-text-tertiary dark:bg-surface-elevated"
      />
    </div>
  )
}

function OutcomeCommentField({
  id,
  label,
  comment,
  disabled,
  maxLength = MAX_FAILURE_COMMENT_LENGTH,
  onCommentChange,
}: {
  id: string
  label: string
  comment: string | null
  disabled: boolean
  maxLength?: number
  onCommentChange: (id: string, comment: string) => Promise<boolean>
}) {
  const [draftComment, setDraftComment] = useState(comment || '')

  useEffect(() => {
    setDraftComment(comment || '')
  }, [comment, id])

  const commitComment = useCallback(async () => {
    if (disabled) return

    const nextValue = draftComment.trim()
    const currentValue = comment?.trim() || ''
    if (nextValue === currentValue) return

    const success = await onCommentChange(id, nextValue)
    if (!success) {
      setDraftComment(comment || '')
    }
  }, [comment, disabled, draftComment, id, onCommentChange])

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
        <span className="text-[11px] text-text-tertiary">{disabled ? 0 : draftComment.length}/{maxLength}</span>
      </div>
      <textarea
        value={draftComment}
        onChange={(event) => setDraftComment(event.target.value.slice(0, maxLength))}
        onBlur={() => void commitComment()}
        disabled={disabled}
        rows={2}
        className="w-full resize-none rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:bg-surface-secondary/70 disabled:text-text-tertiary dark:bg-surface-elevated"
      />
    </div>
  )
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
      {children}
    </p>
  )
}

function DetailItem({
  label,
  value,
  className = '',
  valueClassName = 'text-sm text-foreground',
}: {
  label: string
  value: ReactNode
  className?: string
  valueClassName?: string
}) {
  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="shrink-0 text-xs text-text-tertiary">{label}:</span>
      <span className={valueClassName}>{value}</span>
    </div>
  )
}


function formatTriStateValue(value: boolean | null): string {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return '?'
}

function isMatedDistribution(distribution: TrackedQueen): boolean {
  return distribution.mating_confirmed || distribution.distribution_type === 'mated_queen'
}

function ExpandedTrackerRowContent({
  distribution,
  ownerDisplayName,
  isReadOnly,
  isUpdating,
  onMatingDateChange,
  onOverwinteredDateChange,
  onHybridisationDateChange,
  onFailureDateChange,
  onFailureCommentChange,
}: {
  distribution: DerivedTrackerRow
  ownerDisplayName: string
  isReadOnly: boolean
  isUpdating: boolean
  onMatingDateChange: (id: string, date: string) => Promise<boolean>
  onOverwinteredDateChange: (id: string, date: string) => Promise<boolean>
  onHybridisationDateChange: (id: string, date: string) => Promise<boolean>
  onFailureDateChange: (id: string, date: string) => Promise<boolean>
  onFailureCommentChange: (id: string, comment: string) => Promise<boolean>
}) {
  const showMatingDateEditor = distribution.distribution_type !== 'mated_queen'

  return (
    <div className="grid gap-4 px-4 py-3 sm:px-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)]">
      {/* Reference */}
      <div className="space-y-3">
        <SectionHeading>Reference</SectionHeading>
        <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          <DetailItem label="Queen tagged" value={formatQueenTaggedValue(distribution.queen_number) || 'Not tagged'} />
          <DetailItem label="Marking" value={distribution.marking_status_label} />
          <DetailItem label="Batch" value={distribution.batch_name} />
          <DetailItem label="Group / Member" value={`${distribution.group_name} / ${ownerDisplayName}`} />
          <DetailItem label="Distributed" value={formatOptionalDate(distribution.distribution_date)} />
          <DetailItem label="Emergence date" value={formatOptionalDate(distribution.emergence_date)} />
          <DetailItem label="Mother queen" value={distribution.mother_queen_label} />
          <DetailItem label="Mother age" value={distribution.mother_queen_age_label} />
          <DetailItem label="Mating apiary" value={distribution.origin_mating_apiary_label} />
          <DetailItem label="Latest weight" value={distribution.latest_weight_label} />
        </div>

        <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          <DetailItem label="Recipient" value={distribution.recipient_display_name} />
          <DetailItem label="Type" value={distribution.recipient_type_label} />
          <DetailItem label="Club member" value={distribution.recipient_is_club_member ? 'Yes' : 'No'} />
          <DetailItem label="Contact" value={distribution.recipient_contact_label} />
          {!(distribution.distribution_type === 'mated_queen' && distribution.recipient_type === 'public') && (
            <>
              <DetailItem label="Apiary" value={distribution.recipient_apiary_label} />
              {distribution.destination_label !== '-' && (
                <DetailItem label="Recipient mating site" value={distribution.destination_label} />
              )}
            </>
          )}
          {distribution.notes && (
            <DetailItem
              label="Notes"
              value={distribution.notes}
              className="sm:col-span-2"
              valueClassName="text-sm whitespace-pre-wrap text-foreground"
            />
          )}
        </div>
      </div>

      {/* Outcomes */}
      <div className="min-w-0 space-y-3">
        <SectionHeading>Outcomes</SectionHeading>

        {isReadOnly && (
          <p className="text-xs text-text-secondary">
            Only the distributing member can update outcomes for this record.
          </p>
        )}

        <div className="space-y-1.5">
          <DetailItem
            label="Mated"
            value={<>
              {isMatedDistribution(distribution) ? 'Confirmed' : 'Pending'}
              {distribution.mating_confirmed_date && (
                <span className="text-text-secondary">{` \u2014 ${formatOptionalDate(distribution.mating_confirmed_date)}`}</span>
              )}
              {distribution.mating_location && (
                <span className="text-text-secondary">{` (${distribution.mating_location})`}</span>
              )}
            </>}
          />
          <DetailItem
            label="Failed"
            value={<>
              {distribution.queen_failed ? 'Yes' : 'No'}
              {distribution.queen_failed && distribution.queen_failed_date && (
                <span className="text-text-secondary">{` \u2014 ${formatOptionalDate(distribution.queen_failed_date)}`}</span>
              )}
            </>}
          />
          {distribution.queen_failed && distribution.queen_failure_comment && (
            <DetailItem
              label="Failure comment"
              value={distribution.queen_failure_comment}
              valueClassName="text-sm whitespace-pre-wrap text-foreground"
            />
          )}
          <DetailItem
            label="Overwintered"
            value={<>
              {formatTriStateValue(distribution.overwintered)}
              {distribution.overwintered !== null && distribution.overwintered_date && (
                <span className="text-text-secondary">{` \u2014 ${formatOptionalDate(distribution.overwintered_date)}`}</span>
              )}
            </>}
          />
          <DetailItem
            label="Hybridised"
            value={<>
              {formatTriStateValue(distribution.offspring_hybridised)}
              {distribution.offspring_hybridised !== null && distribution.hybridisation_date && (
                <span className="text-text-secondary">{` \u2014 ${formatOptionalDate(distribution.hybridisation_date)}`}</span>
              )}
            </>}
          />
        </div>

        {!isReadOnly && (showMatingDateEditor && distribution.mating_confirmed
          || distribution.queen_failed
          || (distribution.overwintered !== null && !distribution.queen_failed)
          || (distribution.offspring_hybridised === true && !distribution.queen_failed)
        ) && (
          <div className="mt-2 space-y-2 border-t border-border pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              Record dates
            </p>
            <div className="grid gap-2">
              {showMatingDateEditor && distribution.mating_confirmed && (
                <OutcomeDateField
                  id={distribution.id}
                  label="Mated date"
                  date={distribution.mating_confirmed_date}
                  disabled={isUpdating}
                  dateEnabled
                  onDateChange={onMatingDateChange}
                />
              )}
              {distribution.queen_failed && (
                <OutcomeDateField
                  id={distribution.id}
                  label="Failure date"
                  date={distribution.queen_failed_date}
                  disabled={isUpdating}
                  dateEnabled
                  onDateChange={onFailureDateChange}
                />
              )}
              {distribution.overwintered !== null && !distribution.queen_failed && (
                <OutcomeDateField
                  id={distribution.id}
                  label="Overwintered date"
                  date={distribution.overwintered_date}
                  disabled={isUpdating}
                  dateEnabled
                  onDateChange={onOverwinteredDateChange}
                />
              )}
              {distribution.offspring_hybridised === true && !distribution.queen_failed && (
                <OutcomeDateField
                  id={distribution.id}
                  label="Hybridisation date"
                  date={distribution.hybridisation_date}
                  disabled={isUpdating}
                  dateEnabled
                  onDateChange={onHybridisationDateChange}
                />
              )}
              {distribution.queen_failed && (
                <div>
                  <OutcomeCommentField
                    id={distribution.id}
                    label="Failure comment"
                    comment={distribution.queen_failure_comment}
                    disabled={isUpdating}
                    onCommentChange={onFailureCommentChange}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
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
  if (distribution.queen_failed) {
    return {
      label: 'Failed',
      className: 'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/35 dark:text-red-300',
    }
  }

  if (distribution.overwintered === false) {
    return {
      label: 'Winter loss',
      className: 'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-900/35 dark:text-orange-300',
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
  const phone = distribution.external_recipient_phone || null

  if (name) return name
  if (email) return email
  if (phone) return phone
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

// Recipient-type dot palette. Deliberately uses the indigo/violet/fuchsia band, which the
// lifecycle stats legend (slate/green/blue/red/amber) never uses — so a recipient-type dot can
// never be misread as a queen status. Keep in sync with the RECIPIENT_TYPE_LEGEND below.
function getRecipientTypePresentation(distribution: TrackedQueen) {
  switch (distribution.recipient_type) {
    case 'group_member':
      return {
        label: 'Group Member',
        dotClass: 'bg-indigo-500',
        className: 'border-indigo-200 bg-indigo-100 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-900/35 dark:text-indigo-300',
      }
    case 'app_user':
      return {
        label: 'App User',
        dotClass: 'bg-violet-500',
        className: 'border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-900/35 dark:text-violet-300',
      }
    default:
      return {
        label: 'Public Recipient',
        dotClass: 'bg-fuchsia-500',
        className: 'border-fuchsia-200 bg-fuchsia-100 text-fuchsia-800 dark:border-fuchsia-800 dark:bg-fuchsia-900/35 dark:text-fuchsia-300',
      }
  }
}

// Legend for the recipient-type dot shown in the DISTRIBUTION column.
const RECIPIENT_TYPE_LEGEND: { label: string; dotClass: string }[] = [
  { label: 'Group member', dotClass: 'bg-indigo-500' },
  { label: 'App user', dotClass: 'bg-violet-500' },
  { label: 'Public', dotClass: 'bg-fuchsia-500' },
]

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
  const recipientTypeInfo = getRecipientTypePresentation(distribution)
  const markingColour = distribution.queen_marked && distribution.emergence_date
    ? getQueenColorFromYear(distribution.emergence_date)
    : ''
  const motherQueenMarkingColour = distribution.mother_queen_marking_color || (
    distribution.mother_queen_birth_date ? getQueenColorFromYear(distribution.mother_queen_birth_date) : ''
  )
  // Cell numbers only count within a batch, so they aren't a unique handle. Lead with the
  // tagged queen number when present (unique per account); otherwise scope the cell to its batch.
  const queenTag = distribution.queen_number?.trim().replace(/^#/, '') || ''
  const queenDisplayName = queenTag
    ? `Queen ${queenTag}`
    : `${distribution.batch_name} · Cell ${distribution.cell_number}`
  // Breeder (mother) queen gives lineage at a glance; omit entirely when unknown.
  const breederSummaryLabel = distribution.mother_queen_number
    ? [distribution.mother_queen_number, distribution.mother_queen_subspecies]
        .filter(Boolean)
        .join(' · ')
    : ''
  const markingStatusLabel = distribution.queen_marked
    ? markingColour
      ? `Marked (${markingColour})`
      : 'Marked'
    : 'Unmarked'
  const queenAge = distribution.emergence_date ? calculateQueenAge(distribution.emergence_date) : null
  const queenSecondaryLabel = queenAge === 'Not yet emerged'
    ? 'Not yet emerged'
    : queenAge
      ? `Age ${queenAge}`
      : ''
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
    breeder_summary_label: breederSummaryLabel,
    recipient_display_name: getRecipientName(distribution),
    recipient_type_label: recipientTypeInfo.label,
    recipient_type_class: recipientTypeInfo.className,
    recipient_type_dot: recipientTypeInfo.dotClass,
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
    updateMating,
    updateMatingDate,
    updateOverwintered,
    updateOverwinteredDate,
    updateHybridisation,
    updateHybridisationDate,
    updateFailure,
    updateFailureDate,
    updateFailureComment,
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
  const [queenQuery, setQueenQuery] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionDraft, setActionDraft] = useState<OutcomeActionDraft | null>(null)
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
      const date = parseLocalDate(distribution.distribution_date)
      if (Number.isNaN(date.getTime())) return
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

  const safeSelectedGroupId = useMemo(() => {
    if (!selectedGroupId) return ''

    if (selectedGroupId === NON_GROUP_LEDGER_SCOPE) {
      return availableGroupFilters.hasNonGroupRows ? selectedGroupId : ''
    }

    return availableGroupFilters.groups.some((group) => group.id === selectedGroupId)
      ? selectedGroupId
      : ''
  }, [availableGroupFilters, selectedGroupId])

  const groupScopedDistributions = useMemo(() => {
    return filterByGroup(preHierarchyDistributions, safeSelectedGroupId || null)
  }, [preHierarchyDistributions, safeSelectedGroupId, filterByGroup])

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

  const safeSelectedMemberId = useMemo(() => {
    if (!selectedMemberId) return ''

    return availableMembers.some((member) => member.id === selectedMemberId)
      ? selectedMemberId
      : ''
  }, [availableMembers, selectedMemberId])

  const memberScopedDistributions = useMemo(() => {
    return filterByMember(groupScopedDistributions, safeSelectedMemberId || null)
  }, [groupScopedDistributions, safeSelectedMemberId, filterByMember])

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

  const safeSelectedBatchId = useMemo(() => {
    if (!selectedBatchId) return ''

    return availableBatches.some((batch) => batch.id === selectedBatchId)
      ? selectedBatchId
      : ''
  }, [availableBatches, selectedBatchId])

  const filteredDistributions = useMemo(() => {
    return filterByBatch(memberScopedDistributions, safeSelectedBatchId || null)
  }, [memberScopedDistributions, safeSelectedBatchId, filterByBatch])

  // Free-text search for a single queen — matches the tagged queen number (e.g. "38"/"38W")
  // or the cell number (e.g. "30" / "#30"). A leading "#" is ignored.
  const queenMatchedDistributions = useMemo(() => {
    const query = queenQuery.trim().toLowerCase().replace(/^#/, '')
    if (!query) return filteredDistributions
    return filteredDistributions.filter((distribution) => {
      const queenNumber = (distribution.queen_number ?? '').toLowerCase()
      const cellNumber = String(distribution.cell_number ?? '')
      return queenNumber.includes(query) || cellNumber.includes(query)
    })
  }, [filteredDistributions, queenQuery])

  const trackerRows = useMemo(() => {
    return queenMatchedDistributions.map((distribution) =>
      buildDerivedRow(distribution, getGroupScopeLabel(distribution, groupNameById.get(distribution.rearing_group_id ?? '') || null))
    )
  }, [queenMatchedDistributions, groupNameById])

  useEffect(() => {
    if (!selectedId && !expandedId) return

    const visibleIds = new Set(trackerRows.map((d) => d.id))

    if (selectedId && !visibleIds.has(selectedId)) {
      setSelectedId(null)
    }
    if (expandedId && !visibleIds.has(expandedId)) {
      setExpandedId(null)
    }
  }, [selectedId, expandedId, trackerRows])

  useEffect(() => {
    if (!actionDraft) return

    const hasDraftRow = trackerRows.some((distribution) => distribution.id === actionDraft.rowId)
    if (!hasDraftRow) {
      setActionDraft(null)
    }
  }, [actionDraft, trackerRows])

  const stats = useMemo(() => calculateStats(queenMatchedDistributions), [queenMatchedDistributions, calculateStats])
  const summaryLabel = stats.total === 1
    ? '1 queen matches the current filters.'
    : `${stats.total} queens match the current filters.`

  const openOutcomeActionDraft = useCallback((distribution: DerivedTrackerRow, kind: OutcomeActionKind) => {
    if (updatingIdsRef.current.has(distribution.id) || !distribution.can_edit) return

    setSelectedId(distribution.id)
    setActionDraft((current) => {
      if (current?.rowId === distribution.id && current.kind === kind) {
        return null
      }
      return createOutcomeActionDraft(distribution, kind)
    })
  }, [])

  const handleMatingToggle = useCallback(async (distribution: DerivedTrackerRow) => {
    if (updatingIdsRef.current.has(distribution.id)) return

    if (!distribution.mating_confirmed) {
      openOutcomeActionDraft(distribution, 'mated')
      return
    }

    setUpdatingIds((prev) => new Set(prev).add(distribution.id))
    try {
      const success = await updateMating(distribution.id, false)
      if (success) {
        toast.success('Mating confirmation cleared')
        setActionDraft((current) => current?.rowId === distribution.id && current.kind === 'mated' ? null : current)
      } else {
        toast.error('Failed to update mating status')
      }
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(distribution.id)
        return next
      })
    }
  }, [openOutcomeActionDraft, updateMating, toast])

  const handleMatingDateChange = useCallback(async (id: string, date: string): Promise<boolean> => {
    if (updatingIdsRef.current.has(id)) return false

    const nextDate = date.trim()
    if (nextDate === '') {
      toast.error('Mated date is required while mating remains confirmed')
      return false
    }

    setUpdatingIds((prev) => new Set(prev).add(id))
    try {
      const success = await updateMatingDate(id, nextDate)
      if (success) {
        toast.success('Mated date updated')
      } else {
        toast.error('Failed to update mated date')
      }
      return success
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [updateMatingDate, toast])

  const handleOverwinteredDateChange = useCallback(async (id: string, date: string): Promise<boolean> => {
    if (updatingIdsRef.current.has(id)) return false

    const nextDate = date.trim()

    setUpdatingIds((prev) => new Set(prev).add(id))
    try {
      const success = await updateOverwinteredDate(id, nextDate === '' ? null : nextDate)
      if (success) {
        toast.success('Overwintered date updated')
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
  }, [updateOverwinteredDate, toast])

  const handleFailureToggle = useCallback(async (distribution: DerivedTrackerRow) => {
    if (updatingIdsRef.current.has(distribution.id)) return

    if (!distribution.queen_failed) {
      openOutcomeActionDraft(distribution, 'failed')
      return
    }

    setUpdatingIds((prev) => new Set(prev).add(distribution.id))
    try {
      const success = await updateFailure(distribution.id, false)
      if (success) {
        toast.success('Queen failure cleared')
        setActionDraft((current) => current?.rowId === distribution.id && current.kind === 'failed' ? null : current)
      } else {
        toast.error('Failed to update queen failure status')
      }
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(distribution.id)
        return next
      })
    }
  }, [openOutcomeActionDraft, updateFailure, toast])

  const handleSaveOutcomeAction = useCallback(async () => {
    if (!actionDraft || updatingIdsRef.current.has(actionDraft.rowId)) return

    const { rowId, kind, value, date } = actionDraft
    const requiresDate = outcomeNeedsDate(kind, value)
    const nextDate = date.trim()
    if (requiresDate && nextDate === '') {
      toast.error('Please record the date before saving this outcome')
      return
    }

    setUpdatingIds((prev) => new Set(prev).add(rowId))
    try {
      let success = false

      switch (kind) {
        case 'mated':
          success = await updateMating(rowId, true, nextDate)
          if (success) toast.success('Mating confirmed')
          break
        case 'overwintered':
          success = await updateOverwintered(
            rowId,
            value,
            value === null ? null : nextDate
          )
          if (success) toast.success('Overwintering status updated')
          break
        case 'hybridised':
          success = await updateHybridisation(
            rowId,
            value,
            value === true ? nextDate : null
          )
          if (success) toast.success('Hybridisation status updated')
          break
        case 'failed':
          success = await updateFailure(rowId, true, nextDate)
          if (success) toast.success('Queen marked as failed')
          break
      }

      if (success) {
        setActionDraft(null)
      } else {
        toast.error('Failed to update outcome')
      }
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(rowId)
        return next
      })
    }
  }, [actionDraft, toast, updateFailure, updateHybridisation, updateMating, updateOverwintered])

  const handleHybridisationDateChange = useCallback(async (id: string, date: string): Promise<boolean> => {
    if (updatingIdsRef.current.has(id)) return false

    const nextDate = date.trim()

    setUpdatingIds((prev) => new Set(prev).add(id))
    try {
      const success = await updateHybridisationDate(id, nextDate === '' ? null : nextDate)
      if (success) {
        toast.success('Hybridisation date updated')
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
  }, [updateHybridisationDate, toast])

  const handleFailureDateChange = useCallback(async (id: string, date: string): Promise<boolean> => {
    if (updatingIdsRef.current.has(id)) return false

    const nextDate = date.trim()

    setUpdatingIds((prev) => new Set(prev).add(id))
    try {
      const success = await updateFailureDate(id, nextDate === '' ? null : nextDate)
      if (success) {
        toast.success('Failure date updated')
      } else {
        toast.error('Failed to update failure date')
      }
      return success
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [updateFailureDate, toast])

  const handleFailureCommentChange = useCallback(async (id: string, comment: string): Promise<boolean> => {
    if (updatingIdsRef.current.has(id)) return false

    setUpdatingIds((prev) => new Set(prev).add(id))
    try {
      const success = await updateFailureComment(id, comment)
      if (success) {
        toast.success('Failure comment updated')
      } else {
        toast.error('Failed to update failure comment')
      }
      return success
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [updateFailureComment, toast])

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
              <p className="mt-1 text-xs text-text-secondary">{summaryLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-text-secondary"><span className="h-2 w-2 rounded-full bg-slate-500" />{stats.total} tracked</span>
              <span className="inline-flex items-center gap-1.5 text-text-secondary"><span className="h-2 w-2 rounded-full bg-green-500" />{stats.mated} mated</span>
              <span className="inline-flex items-center gap-1.5 text-text-secondary"><span className="h-2 w-2 rounded-full bg-blue-500" />{stats.overwintered} overwintered</span>
              <span className="inline-flex items-center gap-1.5 text-text-secondary"><span className="h-2 w-2 rounded-full bg-red-500" />{stats.failed} failed</span>
              <span className="inline-flex items-center gap-1.5 text-text-secondary"><span className="h-2 w-2 rounded-full bg-amber-500" />{stats.hybridised} hybridised</span>
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">Queen</label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={queenQuery}
                onChange={(event) => setQueenQuery(event.target.value)}
                placeholder="Search by queen number or cell # (e.g. 38W or 30)"
                className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-9 text-sm text-foreground shadow-sm dark:bg-surface-elevated"
              />
              {queenQuery && (
                <button
                  type="button"
                  onClick={() => setQueenQuery('')}
                  aria-label="Clear queen search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-tertiary hover:text-foreground"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="min-w-0">
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">Group</label>
              <select
                value={safeSelectedGroupId}
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
                value={safeSelectedMemberId}
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
                value={safeSelectedBatchId}
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-2.5 text-xs text-text-secondary">
            <span className="font-medium text-text-tertiary">Recipient dot:</span>
            {RECIPIENT_TYPE_LEGEND.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.dotClass}`} />
                {item.label}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[48rem] w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-surface-secondary/70 dark:bg-surface-elevated/85">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Queen</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Actions</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Distribution</th>
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
                  const activeActionDraft = actionDraft?.rowId === distribution.id ? actionDraft : null
                  const outcomeDisabled = isUpdating || isReadOnly || distribution.queen_failed
                  const ownerDisplayName = distribution.batch_owner_name
                    || (distribution.batch_owner_id === userId ? 'You' : '-')
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
                        <td className={`relative border-t border-border px-4 py-2 align-top ${cellHighlightClass} ${rowFrameClass} ${leadingAccentClass}`}>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(distribution.id)
                                setExpandedId(isExpanded ? null : distribution.id)
                              }}
                              className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-emerald-700 dark:hover:text-emerald-300"
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? 'Collapse queen details' : 'Expand queen details'}
                            >
                              {isExpanded ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
                              <span>{distribution.queen_display_name}</span>
                            </button>
                            <span
                              title={distribution.marking_status_label}
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                                distribution.queen_marked
                                  ? 'border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/35 dark:text-green-300'
                                  : 'border-border bg-surface text-text-tertiary dark:bg-surface-elevated'
                              }`}
                            >
                              {distribution.queen_marked ? (
                                <span className="flex items-center gap-0.5">
                                  {markingColourDotClass && (
                                    <span className={`inline-block h-2 w-2 rounded-full ${markingColourDotClass}`} />
                                  )}
                                  <Check size={11} />
                                </span>
                              ) : (
                                <X size={11} />
                              )}
                            </span>
                          </div>
                          {distribution.breeder_summary_label && (
                            <p className="mt-0.5 pl-5 text-xs text-text-secondary">Breeder {distribution.breeder_summary_label}</p>
                          )}
                          {distribution.queen_secondary_label && (
                            <p className="mt-0.5 pl-5 text-xs text-text-secondary">{distribution.queen_secondary_label}</p>
                          )}
                        </td>
                        <td className={`border-t border-border pl-2 pr-3 py-2 align-top ${cellHighlightClass} ${rowFrameClass}`}>
                          <OutcomeActionStack
                            showMatedAction={distribution.distribution_type !== 'mated_queen'}
                            mated={distribution.mating_confirmed}
                            overwintered={distribution.overwintered}
                            hybridised={distribution.offspring_hybridised}
                            failed={distribution.queen_failed}
                            matingDisabled={isUpdating || isReadOnly}
                            outcomeDisabled={outcomeDisabled}
                            failureDisabled={isUpdating || isReadOnly}
                            queenLabel={distribution.queen_display_name}
                            onMatingToggle={() => void handleMatingToggle(distribution)}
                            onOverwinteredClick={() => openOutcomeActionDraft(distribution, 'overwintered')}
                            onHybridisationClick={() => openOutcomeActionDraft(distribution, 'hybridised')}
                            onFailureToggle={() => void handleFailureToggle(distribution)}
                          />
                          {activeActionDraft && (
                            <OutcomeActionEditor
                              draft={activeActionDraft}
                              disabled={isUpdating}
                              onValueChange={(value) => {
                                setActionDraft((current) => (
                                  current && current.rowId === distribution.id
                                    ? { ...current, value }
                                    : current
                                ))
                              }}
                              onDateChange={(date) => {
                                setActionDraft((current) => (
                                  current && current.rowId === distribution.id
                                    ? { ...current, date }
                                    : current
                                ))
                              }}
                              onCancel={() => setActionDraft(null)}
                              onSave={() => void handleSaveOutcomeAction()}
                            />
                          )}
                        </td>
                        <td className={`border-t border-border px-4 py-2 align-top ${cellHighlightClass} ${rowFrameClass}`}>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${distribution.lifecycle_class}`}>
                            {distribution.lifecycle_label}
                          </span>
                        </td>
                        <td className={`border-t border-border px-4 py-2 align-top ${cellHighlightClass} ${rowFrameClass}`}>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${distribution.recipient_type_dot}`} title={distribution.recipient_type_label} />
                            <span className="font-medium text-foreground">{distribution.recipient_display_name}</span>
                            {distribution.recipient_is_club_member && (
                              <span className="inline-flex items-center rounded-full border border-forest-300 bg-forest-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest-800 dark:border-forest-700 dark:bg-forest-900/40 dark:text-forest-300" title="Club member (mated-queen pricing differs)">
                                Club
                              </span>
                            )}
                            <span className="text-xs text-text-secondary">
                              {formatOptionalDate(distribution.distribution_date)}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={4}
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
                              isUpdating={isUpdating}
                              onMatingDateChange={handleMatingDateChange}
                              onOverwinteredDateChange={handleOverwinteredDateChange}
                              onHybridisationDateChange={handleHybridisationDateChange}
                              onFailureDateChange={handleFailureDateChange}
                              onFailureCommentChange={handleFailureCommentChange}
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

