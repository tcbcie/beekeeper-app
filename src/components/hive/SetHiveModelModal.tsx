'use client'
import { useState } from 'react'
import Link from 'next/link'
import ModalShell from '@/components/ui/ModalShell'
import Button from '@/components/ui/Button'
import type { HiveModel } from '@/types/hive-model'

interface SetHiveModelModalProps {
  count: number
  /** The signed-in user's own models: only these may go on their hives. */
  models: HiveModel[]
  saving: boolean
  onClose: () => void
  /** null = clear the model from the selected hives. */
  onApply: (modelId: string | null) => void
}

const CLEAR = '__none__'

/** Bulk action: put one hive model on every selected hive. */
export default function SetHiveModelModal({ count, models, saving, onClose, onApply }: SetHiveModelModalProps) {
  const [choice, setChoice] = useState('')
  const plural = count === 1 ? '' : 's'

  return (
    <ModalShell
      title={`Set hive model for ${count} hive${plural}`}
      onClose={onClose}
      closeDisabled={saving}
      closeOnBackdrop
      footer={
        <div className="border-t border-border px-6 py-4 flex flex-col sm:flex-row justify-end gap-3">
          <Button onClick={onClose} disabled={saving} className="min-h-[48px]">
            Cancel
          </Button>
          <Button
            tone="success"
            disabled={!choice || saving}
            onClick={() => onApply(choice === CLEAR ? null : choice)}
            className="min-h-[48px]"
          >
            {saving ? 'Saving…' : 'Set hive model'}
          </Button>
        </div>
      }
    >
      {models.length === 0 ? (
        <p className="text-base text-text-secondary">
          You have no hive models yet.{' '}
          <Link href="/dashboard/hive-models" className="font-medium text-forest-700 dark:text-forest-400 underline">
            Add your hive models
          </Link>{' '}
          first, then come back to set them here.
        </p>
      ) : (
        <>
          <p className="text-base text-text-secondary mb-4">
            The box setup of each hive stays as it is; only the hive model changes.
          </p>
          <label htmlFor="bulk-hive-model" className="block text-sm font-medium text-text-primary mb-2">Hive model</label>
          <select
            id="bulk-hive-model"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            className="w-full fj-control"
          >
            <option value="" disabled>Choose a hive model…</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
            <option value={CLEAR}>No hive model (clear)</option>
          </select>
        </>
      )}
    </ModalShell>
  )
}
