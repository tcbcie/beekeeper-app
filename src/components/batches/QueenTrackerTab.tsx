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
  recipient_display_name: string
  recipient_type_label: string
  recipient_type_class: string
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

function ThreeStateActionButton({
  value,
  onClick,
  labels = { true: 'Yes', false: 'No', null: '?' },
  disabled = false,
  ariaLabel,
  size = 'default',
}: {
  value: boolean | null
  onClick: () => void
  labels?: { true: string; false: string; null: string }
  disabled?: boolean
  ariaLabel?: string
  size?: 'default' | 'compact'
}) {
  const bgColor = value === true
    ? 'border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900/50 dark:text-green-300'
    : value === false
      ? 'border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/50 dark:text-red-300'
      : 'border-border bg-surface-secondary text-text-secondary dark:bg-surface-elevated'

  const Icon = value === true ? Check : value === false ? X : HelpCircle
  const displayLabel = value === null ? labels.null : value ? labels.true : labels.false
  const sizingClass = size === 'compact'
    ? 'min-w-[4.15rem] px-2.5 py-1 text-xs'
    : 'min-w-[4.75rem] px-3 py-1.5 text-sm'
  const iconSize = size === 'compact' ? 12 : 14

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={value === true ? 'true' : value === false ? 'false' : 'mixed'}
      aria-label={ariaLabel ? `${ariaLabel}: ${displayLabel}` : displayLabel}
      className={`inline-flex items-center justify-center gap-1 rounded-full border font-medium transition-colors ${sizingClass} ${bgColor} ${
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:opacity-85'
      }`}
      title={displayLabel}
    >
      <Icon size={iconSize} aria-hidden="true" />
      <span>{displayLabel}</span>
    </button>
  )
}

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
    <div className="min-w-[7.75rem] space-y-2">
      {showMatedAction && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Mated</span>
          <button
            type="button"
            onClick={onMatingToggle}
            disabled={matingDisabled}
            aria-pressed={mated}
            aria-label={`Queen ${queenLabel} mating status: ${mated ? 'Confirmed' : 'Pending mating'}`}
            className={`inline-flex min-w-[4.15rem] items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              mated
                ? 'border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900/50 dark:text-green-300'
                : 'border-border bg-surface-secondary text-text-secondary dark:bg-surface-elevated'
            } ${matingDisabled ? 'cursor-not-allowed opacity-50' : 'hover:opacity-85'}`}
          >
            <Check size={12} aria-hidden="true" />
            <span>{mated ? 'Clear' : 'Mark'}</span>
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Overwintered</span>
        <ThreeStateActionButton
          value={overwintered}
          onClick={onOverwinteredClick}
          labels={{ true: 'Yes', false: 'No', null: '?' }}
          disabled={outcomeDisabled}
          ariaLabel={`Queen ${queenLabel} overwintered`}
          size="compact"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Hybridised</span>
        <ThreeStateActionButton
          value={hybridised}
          onClick={onHybridisationClick}
          labels={{ true: 'Yes', false: 'No', null: '?' }}
          disabled={outcomeDisabled}
          ariaLabel={`Queen ${queenLabel} hybridised`}
          size="compact"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Failed</span>
        <button
          type="button"
          onClick={onFailureToggle}
          disabled={failureDisabled}
          aria-pressed={failed}
          aria-label={`Queen ${queenLabel} failure status: ${failed ? 'Failed' : 'Not failed'}`}
          className={`inline-flex min-w-[4.15rem] items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            failed
              ? 'border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/50 dark:text-red-300'
              : 'border-border bg-surface-secondary text-text-secondary dark:bg-surface-elevated'
          } ${failureDisabled ? 'cursor-not-allowed opacity-50' : 'hover:opacity-85'}`}
        >
          <X size={12} aria-hidden="true" />
          <span>{failed ? 'Clear' : 'Mark'}</span>
        </button>
      </div>
    </div>
  )
}

function OutcomeDateField({
  id,
  label,
  date,
  disabled,
  dateEnabled,
  disabledMessage = 'Set the outcome first to record a date.',
  onDateChange,
}: {
  id: string
  label: string
  date: string | null
  disabled: boolean
  dateEnabled: boolean
  disabledMessage?: string
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
    <div className="space-y-2">
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
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm disabled:cursor-not-allowed disabled:bg-surface-secondary/70 disabled:text-text-tertiary dark:bg-surface-elevated"
      />
      {!dateEnabled && (
        <p className="text-xs text-text-secondary">{disabledMessage}</p>
      )}
    </div>
  )
}

function OutcomeCommentField({
  id,
  label,
  comment,
  disabled,
  enabled,
  maxLength = MAX_FAILURE_COMMENT_LENGTH,
  disabledMessage = 'Mark the queen as failed to record a comment.',
  onCommentChange,
}: {
  id: string
  label: string
  comment: string | null
  disabled: boolean
  enabled: boolean
  maxLength?: number
  disabledMessage?: string
  onCommentChange: (id: string, comment: string) => Promise<boolean>
}) {
  const [draftComment, setDraftComment] = useState(comment || '')

  useEffect(() => {
    setDraftComment(comment || '')
  }, [comment, id])

  const commitComment = useCallback(async () => {
    if (disabled || !enabled) return

    const nextValue = draftComment.trim()
    const currentValue = comment?.trim() || ''
    if (nextValue === currentValue) return

    const success = await onCommentChange(id, nextValue)
    if (!success) {
      setDraftComment(comment || '')
    }
  }, [comment, disabled, draftComment, enabled, id, onCommentChange])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
        <span className="text-[11px] text-text-tertiary">{draftComment.length}/{maxLength}</span>
      </div>
      <textarea
        value={enabled ? draftComment : ''}
        onChange={(event) => setDraftComment(event.target.value.slice(0, maxLength))}
        onBlur={() => void commitComment()}
        disabled={disabled || !enabled}
        rows={3}
        className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm disabled:cursor-not-allowed disabled:bg-surface-secondary/70 disabled:text-text-tertiary dark:bg-surface-elevated"
      />
      {!enabled && (
        <p className="text-xs text-text-secondary">{disabledMessage}</p>
      )}
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

        <TrackerPanel title="Distribution" icon={UserRound}>
          <DetailItem label="Distribution type" value={distribution.recipient_type_label} />
          <DetailItem label="Recipient" value={distribution.recipient_display_name} />
          <DetailItem label="Contact" value={distribution.recipient_contact_label} />
          <DetailItem label="Recipient apiary" value={distribution.recipient_apiary_label} />
          <DetailItem label="Distribution location" value={distribution.destination_label} />
          <DetailItem label="Distribution date" value={formatOptionalDate(distribution.distribution_date)} />
          <DetailItem label="Notes" value={distribution.notes || '-'} />
        </TrackerPanel>

        <TrackerPanel title="Outcomes" icon={Sprout}>
          {isReadOnly && (
            <div className="rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-text-secondary dark:bg-surface-elevated">
              Only the distributing member can update failure, overwintering, and hybridisation outcomes for this record.
            </div>
          )}

          <DetailItem
            label="Mated"
            value={isMatedDistribution(distribution) ? 'Confirmed' : 'Pending'}
          />
          <DetailItem label="Mated date" value={formatOptionalDate(distribution.mating_confirmed_date)} />
          <DetailItem label="Mated location" value={distribution.mating_location || '-'} />
          <DetailItem label="Failed" value={distribution.queen_failed ? 'Yes' : 'No'} />
          {isReadOnly && distribution.queen_failed && (
            <DetailItem label="Failure date" value={formatOptionalDate(distribution.queen_failed_date)} />
          )}
          {isReadOnly && distribution.queen_failed && (
            <DetailItem label="Failure comment" value={distribution.queen_failure_comment || '-'} />
          )}
          <DetailItem label="Overwintered" value={formatTriStateValue(distribution.overwintered)} />
          {isReadOnly && (
            <DetailItem label="Overwintered date" value={formatOptionalDate(distribution.overwintered_date)} />
          )}
          <DetailItem label="Hybridised offspring" value={formatTriStateValue(distribution.offspring_hybridised)} />
          {isReadOnly && (
            <DetailItem label="Hybridisation date" value={formatOptionalDate(distribution.hybridisation_date)} />
          )}

          {!isReadOnly && (
            <div className="space-y-3 rounded-2xl border border-border bg-surface px-3 py-3 dark:bg-surface-elevated">
              {distribution.distribution_type !== 'mated_queen' && (
                <OutcomeDateField
                  id={distribution.id}
                  label="Record mated date"
                  date={distribution.mating_confirmed_date}
                  disabled={isUpdating}
                  dateEnabled={distribution.mating_confirmed}
                  disabledMessage="Mark the queen as mated to record a date."
                  onDateChange={onMatingDateChange}
                />
              )}
              <OutcomeDateField
                id={distribution.id}
                label="Record failure date"
                date={distribution.queen_failed_date}
                disabled={isUpdating}
                dateEnabled={distribution.queen_failed}
                disabledMessage="Mark the queen as failed to record a date."
                onDateChange={onFailureDateChange}
              />
              <OutcomeCommentField
                id={distribution.id}
                label="Failure comment"
                comment={distribution.queen_failure_comment}
                disabled={isUpdating}
                enabled={distribution.queen_failed}
                onCommentChange={onFailureCommentChange}
              />
              <OutcomeDateField
                id={distribution.id}
                label="Record overwintered date"
                date={distribution.overwintered_date}
                disabled={isUpdating}
                dateEnabled={distribution.overwintered !== null && !distribution.queen_failed}
                disabledMessage={distribution.queen_failed
                  ? 'Clear the failure outcome to edit overwintering.'
                  : 'Set the outcome first to record a date.'}
                onDateChange={onOverwinteredDateChange}
              />
              <OutcomeDateField
                id={distribution.id}
                label="Record hybridisation date"
                date={distribution.hybridisation_date}
                disabled={isUpdating}
                dateEnabled={distribution.offspring_hybridised === true && !distribution.queen_failed}
                disabledMessage={distribution.queen_failed
                  ? 'Clear the failure outcome to edit hybridisation.'
                  : 'Set the outcome first to record a date.'}
                onDateChange={onHybridisationDateChange}
              />
            </div>
          )}
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

function getRecipientTypePresentation(distribution: TrackedQueen) {
  switch (distribution.recipient_type) {
    case 'group_member':
      return {
        label: 'Group Member',
        className: 'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/35 dark:text-green-300',
      }
    case 'app_user':
      return {
        label: 'App User',
        className: 'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-900/35 dark:text-sky-300',
      }
    default:
      return {
        label: 'Public Recipient',
        className: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/35 dark:text-amber-300',
      }
  }
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
  const recipientTypeInfo = getRecipientTypePresentation(distribution)
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
    recipient_type_label: recipientTypeInfo.label,
    recipient_type_class: recipientTypeInfo.className,
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
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false)
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

  useEffect(() => {
    if (!actionDraft) return

    const hasDraftRow = trackerRows.some((distribution) => distribution.id === actionDraft.rowId)
    if (!hasDraftRow) {
      setActionDraft(null)
    }
  }, [actionDraft, trackerRows])

  const stats = useMemo(() => calculateStats(filteredDistributions), [filteredDistributions, calculateStats])
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

    const requiresDate = outcomeNeedsDate(actionDraft.kind, actionDraft.value)
    const nextDate = actionDraft.date.trim()
    if (requiresDate && nextDate === '') {
      toast.error('Please record the date before saving this outcome')
      return
    }

    setUpdatingIds((prev) => new Set(prev).add(actionDraft.rowId))
    try {
      let success = false

      switch (actionDraft.kind) {
        case 'mated':
          success = await updateMating(actionDraft.rowId, true, nextDate)
          if (success) toast.success('Mating confirmed')
          break
        case 'overwintered':
          success = await updateOverwintered(
            actionDraft.rowId,
            actionDraft.value,
            actionDraft.value === null ? null : nextDate
          )
          if (success) toast.success('Overwintering status updated')
          break
        case 'hybridised':
          success = await updateHybridisation(
            actionDraft.rowId,
            actionDraft.value,
            actionDraft.value === true ? nextDate : null
          )
          if (success) toast.success('Hybridisation status updated')
          break
        case 'failed':
          success = await updateFailure(actionDraft.rowId, true, nextDate)
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
        next.delete(actionDraft.rowId)
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
              <p className="mt-1 text-xs text-text-secondary">Group, member, batch, year, and outcome status</p>
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
            <table className="min-w-[66rem] w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-surface-secondary/70 dark:bg-surface-elevated/85">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">Details</th>
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
                        <td className={`border-t border-border pl-4 pr-2 py-3 align-top ${cellHighlightClass} ${rowFrameClass}`}>
                          <div className="min-w-[8.75rem] space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-semibold text-foreground">{distribution.queen_display_name}</p>
                              <div className="flex shrink-0 items-center gap-1">
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
                        <td className={`border-t border-border pl-2 pr-3 py-3 align-top ${cellHighlightClass} ${rowFrameClass}`}>
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
                        <td className={`border-t border-border px-4 py-3 align-top ${cellHighlightClass} ${rowFrameClass}`}>
                          <div className="min-w-[7.5rem] space-y-1.5">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${distribution.display_type_class}`}>
                              {distribution.display_type_label}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${distribution.lifecycle_class}`}>
                              {distribution.lifecycle_label}
                            </span>
                          </div>
                        </td>
                        <td className={`border-t border-border px-4 py-3 align-top ${cellHighlightClass} ${rowFrameClass}`}>
                          <div className="min-w-[13rem] space-y-1.5">
                            <p className="font-medium text-foreground">{distribution.recipient_display_name}</p>
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${distribution.recipient_type_class}`}>
                                {distribution.recipient_type_label}
                              </span>
                              <p className="text-xs text-text-secondary">
                                Distributed {formatOptionalDate(distribution.distribution_date)}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={5}
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
