'use client'
import { useState } from 'react'
import ModalShell from '@/components/ui/ModalShell'
import Button from '@/components/ui/Button'
import { toLocalDateString } from '@/lib/date-utils'

export interface BulkFeedingValues {
  feed_date: string
  feed_type: string
  quantity: number | null
  unit: string
  notes: string
}

interface BulkFeedingModalProps {
  count: number
  /** Feed type options from the `feed_type` dropdown category. */
  feedTypes: { id: string; value: string }[]
  saving: boolean
  onClose: () => void
  onApply: (values: BulkFeedingValues) => void
}

const OTHER = 'Other'

/**
 * Records one feeding against every selected hive.
 *
 * A feeding row holds nothing hive-specific beyond `hive_id`, so every field
 * here is shared verbatim across the batch — this is a pure fan-out with no
 * per-hive computation at all.
 *
 * Follows MoveHivesModal: local state for the form only, data by props, and the
 * parent owns both the open/closed flag and every database write.
 */
export default function BulkFeedingModal({
  count,
  feedTypes,
  saving,
  onClose,
  onApply,
}: BulkFeedingModalProps) {
  // toLocalDateString, not toISOString().split('T')[0]: the latter is a day out
  // for anyone behind UTC, and feed_date is a calendar date.
  const [feedDate, setFeedDate] = useState(() => toLocalDateString(new Date()))
  const [feedType, setFeedType] = useState('')
  const [otherFeedType, setOtherFeedType] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('L')
  const [notes, setNotes] = useState('')

  const isOther = feedType === OTHER
  const resolvedType = isOther ? otherFeedType.trim() : feedType
  const canApply = Boolean(feedDate && resolvedType) && !saving

  const apply = () => {
    if (!canApply) return
    const parsed = parseFloat(quantity)
    onApply({
      feed_date: feedDate,
      feed_type: resolvedType,
      quantity: quantity.trim() === '' || Number.isNaN(parsed) ? null : parsed,
      unit,
      notes: notes.trim(),
    })
  }

  return (
    <ModalShell
      title={`Record feeding for ${count} hive${count === 1 ? '' : 's'}`}
      onClose={onClose}
      closeOnBackdrop
      footer={
        <div className="border-t border-border px-6 py-4 flex flex-col sm:flex-row justify-end gap-3">
          <Button
            type="button"
            onClick={onClose}
            className="px-6 py-3 sm:py-2 min-h-[48px] bg-surface dark:bg-surface-elevated text-text-primary rounded-lg hover:bg-surface-elevated font-medium"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canApply}
            onClick={apply}
            className="px-6 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Recording…' : `Record for ${count}`}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-text-secondary mb-4">
        The same feeding is recorded against every selected hive. You can edit any of them
        afterwards from Records.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="bulk-feed-date" className="block text-sm font-medium text-text-primary mb-2">
            Feed date *
          </label>
          <input
            id="bulk-feed-date"
            type="date"
            value={feedDate}
            onChange={(e) => setFeedDate(e.target.value)}
            className="w-full px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition-all"
          />
        </div>

        <div>
          <label htmlFor="bulk-feed-type" className="block text-sm font-medium text-text-primary mb-2">
            Feed type *
          </label>
          <select
            id="bulk-feed-type"
            value={feedType}
            onChange={(e) => setFeedType(e.target.value)}
            className="w-full px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition-all"
          >
            <option value="" disabled>Select feed type…</option>
            {feedTypes.map((option) => (
              <option key={option.id} value={option.value}>{option.value}</option>
            ))}
          </select>
          {isOther && (
            <input
              type="text"
              aria-label="Specify feed type"
              value={otherFeedType}
              onChange={(e) => setOtherFeedType(e.target.value)}
              placeholder="Enter feed type"
              className="mt-2 w-full px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bulk-feed-qty" className="block text-sm font-medium text-text-primary mb-2">
              Quantity per hive
            </label>
            <input
              id="bulk-feed-qty"
              type="number"
              step="0.1"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
            />
          </div>
          <div>
            <label htmlFor="bulk-feed-unit" className="block text-sm font-medium text-text-primary mb-2">
              Unit
            </label>
            <select
              id="bulk-feed-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
            >
              <option value="L">L</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="bulk-feed-notes" className="block text-sm font-medium text-text-primary mb-2">
            Notes
          </label>
          <textarea
            id="bulk-feed-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground"
          />
        </div>
      </div>
    </ModalShell>
  )
}
