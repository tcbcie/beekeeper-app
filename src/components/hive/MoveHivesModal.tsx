'use client'
import { useState } from 'react'
import ModalShell from '@/components/ui/ModalShell'
import Button from '@/components/ui/Button'

interface MoveHivesModalApiary {
  id: string
  name: string
  is_shared?: boolean
}

interface MoveHivesModalProps {
  count: number
  apiaries: MoveHivesModalApiary[]
  onClose: () => void
  // null = remove from apiary (unassign)
  onMove: (apiaryId: string | null) => void
}

const UNASSIGN = '__none__'

export default function MoveHivesModal({ count, apiaries, onClose, onMove }: MoveHivesModalProps) {
  const [dest, setDest] = useState('')

  return (
    <ModalShell
      title={`Move ${count} hive${count === 1 ? '' : 's'}`}
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
            disabled={!dest}
            onClick={() => onMove(dest === UNASSIGN ? null : dest)}
            className="px-6 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Move
          </Button>
        </div>
      }
    >
      <p className="text-sm text-text-secondary mb-4">
        Choose where to move the selected hive{count === 1 ? '' : 's'}. Each hive&apos;s row and position
        are cleared so you can re-place them in the new apiary.
      </p>
      <label className="block text-sm font-medium text-text-primary mb-2">Destination apiary</label>
      <select
        value={dest}
        onChange={(e) => setDest(e.target.value)}
        className="w-full px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition-all"
      >
        <option value="" disabled>
          Select destination…
        </option>
        {apiaries.map((apiary) => (
          <option key={apiary.id} value={apiary.id}>
            {apiary.name}
            {apiary.is_shared ? ' (Shared)' : ''}
          </option>
        ))}
        <option value={UNASSIGN}>— No apiary (unassign) —</option>
      </select>
    </ModalShell>
  )
}
