'use client'
import { useState } from 'react'
import ModalShell from '@/components/ui/ModalShell'
import Button from '@/components/ui/Button'
import { toLocalDateString } from '@/lib/date-utils'

export interface RemovableTreatment {
  id: string
  hive_id: string
  treatment_type: string
  treatment_date: string
  user_id: string
}

interface BulkTreatmentRemovalModalProps {
  treatments: RemovableTreatment[]
  userId: string
  /** Selected hives with no treatment on. They are told about, not written to. */
  hivesWithNothingOn: number
  saving: boolean
  onClose: () => void
  onApply: (removedDate: string, treatmentIds: string[]) => void
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`

/**
 * Records one removal date against every treatment still on the selected hives.
 *
 * Two kinds of treatment cannot take the date, and are left on rather than failing the batch: RLS
 * lets only the person who recorded a treatment update it, and a database check forbids a removal
 * before the treatment was applied. The sheet says how many before anything is written, so it is
 * also the confirmation.
 */
export default function BulkTreatmentRemovalModal({
  treatments,
  userId,
  hivesWithNothingOn,
  saving,
  onClose,
  onApply,
}: BulkTreatmentRemovalModalProps) {
  const today = toLocalDateString(new Date())
  const [removedDate, setRemovedDate] = useState(today)

  const own = treatments.filter(treatment => treatment.user_id === userId)
  const eligible = own.filter(treatment => treatment.treatment_date <= removedDate)
  const appliedLater = own.length - eligible.length
  const byTeamMates = treatments.length - own.length
  const dateValid = Boolean(removedDate) && removedDate <= today
  const canApply = dateValid && eligible.length > 0 && !saving

  const hivesByProduct = new Map<string, Set<string>>()
  eligible.forEach(treatment => {
    const hives = hivesByProduct.get(treatment.treatment_type) ?? new Set<string>()
    hives.add(treatment.hive_id)
    hivesByProduct.set(treatment.treatment_type, hives)
  })
  const summary = [...hivesByProduct]
    .map(([product, hives]) => `${product} on ${plural(hives.size, 'hive')}`)
    .join(', ')

  return (
    <ModalShell
      title="Record treatment removal"
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
            onClick={() => { if (canApply) onApply(removedDate, eligible.map(treatment => treatment.id)) }}
            className="px-6 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Recording…' : `Record removal for ${eligible.length}`}
          </Button>
        </div>
      }
    >
      {summary && <p className="text-base font-medium text-text-primary mb-4">{summary}</p>}

      <label htmlFor="bulk-removed-date" className="block text-sm font-medium text-text-primary mb-2">Removed on</label>
      <input
        id="bulk-removed-date"
        type="date"
        value={removedDate}
        max={today}
        onChange={(e) => setRemovedDate(e.target.value)}
        className="w-full px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition-all"
      />
      {removedDate > today && (
        <p className="mt-1 text-sm text-red-700 dark:text-red-300">The removal date cannot be in the future.</p>
      )}

      <div className="mt-4 space-y-2 text-sm text-text-secondary empty:hidden">
        {removedDate && appliedLater > 0 && (
          <p>{plural(appliedLater, 'treatment')} applied after this date will stay on.</p>
        )}
        {byTeamMates > 0 && (
          <p>{plural(byTeamMates, 'treatment')} recorded by a team-mate will stay on. Only the person who recorded a treatment can change it.</p>
        )}
        {hivesWithNothingOn > 0 && (
          <p>{plural(hivesWithNothingOn, 'selected hive')} with no treatment on will not change.</p>
        )}
      </div>
    </ModalShell>
  )
}
