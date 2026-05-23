'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Printer } from 'lucide-react'
import ModalShell from '@/components/ui/ModalShell'
import FormActionRow from '@/components/ui/FormActionRow'
import Button from '@/components/ui/Button'
import LabelSheet from './LabelSheet'
import { getPreset } from './presets'
import { buildPrintDocument } from './printHtml'
import type { LabelDatum, LabelPresetId } from './types'

interface PrintLabelsModalProps {
  open: boolean
  onClose: () => void
  data: LabelDatum[]
  presetId: LabelPresetId
  title?: string
}

type PrintStatus = 'idle' | 'opening' | 'blocked' | 'error'

export default function PrintLabelsModal({
  open,
  onClose,
  data,
  presetId,
  title,
}: PrintLabelsModalProps) {
  const [status, setStatus] = useState<PrintStatus>('idle')

  // Reset any prior error state when the modal is re-opened so a previous
  // pop-up-blocker banner doesn't persist across separate print attempts.
  useEffect(() => {
    if (open) setStatus('idle')
  }, [open])

  if (!open) return null

  const preset = getPreset(presetId)
  if (!preset) {
    // Compile-time guarded by the LabelPresetId union; runtime guard hardens
    // against a future caller that derives the preset id from URL / DB state.
    return null
  }

  const busy = status === 'opening'

  const handlePrint = () => {
    if (data.length === 0 || busy) return
    setStatus('opening')
    let win: Window | null = null
    try {
      win = window.open('', '_blank')
    } catch {
      setStatus('error')
      return
    }
    if (!win) {
      setStatus('blocked')
      return
    }
    try {
      win.document.write(buildPrintDocument(data, preset))
      win.document.close()
      setStatus('idle')
    } catch {
      // Best-effort cleanup; if the document write failed we should release the
      // popped-up tab so the user isn't left with a blank window.
      try { win.close() } catch { /* noop */ }
      setStatus('error')
    }
  }

  return (
    <ModalShell
      title={title ?? `Print labels — ${preset.name}`}
      maxWidthClassName="max-w-2xl"
      onClose={onClose}
      closeOnBackdrop
      bodyClassName="p-6 space-y-4"
      footer={(
        <FormActionRow bordered padding="md">
          <Button
            onClick={onClose}
            tone="neutral"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            tone="success"
            className="flex-1"
            disabled={data.length === 0 || busy}
          >
            <Printer size={16} />
            {busy
              ? 'Opening…'
              : `Print ${data.length} ${data.length === 1 ? 'label' : 'labels'}`}
          </Button>
        </FormActionRow>
      )}
    >
      <div className="text-sm text-text-tertiary">
        {preset.description} In the browser print dialog, set scale to <strong>100%</strong>, margins to <strong>None</strong>, and turn off &ldquo;fit to page&rdquo; so labels print at the correct size and align with the die-cut.
      </div>

      {status === 'blocked' && (
        <div
          role="alert"
          className="flex items-start gap-2 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-sm text-amber-900 dark:text-amber-100"
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            The browser blocked the print window. Allow pop-ups for this site, then click Print again.
          </div>
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="flex items-start gap-2 p-3 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-sm text-red-900 dark:text-red-100"
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            Could not open the print window. Please try again, or check the browser console for details.
          </div>
        </div>
      )}

      <div className="max-h-[60vh] overflow-y-auto bg-surface-secondary dark:bg-surface-elevated rounded-lg p-4">
        <LabelSheet data={data} preset={preset} />
      </div>
    </ModalShell>
  )
}
