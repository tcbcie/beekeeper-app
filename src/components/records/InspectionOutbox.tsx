'use client'

import { useCallback, useEffect, useState } from 'react'
import { CloudOff } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import {
  OUTBOX_CHANGED_EVENT,
  discardQueuedInspection,
  flushQueuedInspections,
  listQueuedInspections,
  retryQueuedInspection,
  type QueuedInspection,
} from '@/lib/inspection-outbox'

function describeTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-IE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * Sends waiting inspections when the app opens, returns to the screen, or the signal comes back.
 * There is no timer, so it costs nothing while there is nothing to do.
 */
export function InspectionOutboxRunner({ userId }: { userId: string | null }) {
  const toast = useToast()

  useEffect(() => {
    if (!userId) return
    let flushing = false
    const flush = async () => {
      if (flushing) return
      flushing = true
      try {
        const { sent, refused, warnings } = await flushQueuedInspections(userId)
        if (sent > 0) toast.success(sent === 1 ? 'Waiting inspection sent' : `${sent} waiting inspections sent`)
        // No time limit: part of an inspection needs checking, so each warning stays until closed.
        warnings.forEach(warning => toast.warning(warning, 0))
        if (refused > 0) toast.error('An inspection could not be sent. Open Records to see why.')
      } finally {
        flushing = false
      }
    }
    const onVisible = () => {
      if (!document.hidden) void flush()
    }

    void flush()
    window.addEventListener('online', flush)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', flush)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, toast])

  return null
}

/** What is on this device and not yet on the server, and what happened to it. */
export default function InspectionOutbox({ userId }: { userId: string | null }) {
  const toast = useToast()
  const confirmDialog = useConfirm()
  const [entries, setEntries] = useState<QueuedInspection[]>([])
  const [sending, setSending] = useState(false)

  const refresh = useCallback(async () => {
    setEntries(userId ? await listQueuedInspections(userId) : [])
  }, [userId])

  useEffect(() => {
    void refresh()
    window.addEventListener(OUTBOX_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(OUTBOX_CHANGED_EVENT, refresh)
  }, [refresh])

  if (entries.length === 0) return null

  const retry = async (entry: QueuedInspection) => {
    setSending(true)
    try {
      const result = await retryQueuedInspection(entry)
      if (result.status === 'waiting') toast.info('Could not send it just now. It will try again when the app is next open with signal.')
      if (result.status === 'sent') {
        toast.success('Inspection sent')
        result.warnings.forEach(warning => toast.warning(warning, 0))
      }
    } finally {
      setSending(false)
    }
  }

  const discard = async (entry: QueuedInspection) => {
    const confirmed = await confirmDialog({
      title: 'Discard this inspection?',
      message: `The inspection of hive ${entry.hiveLabel} is only on this device. Discarding it cannot be undone.`,
      confirmLabel: 'Discard',
      cancelLabel: 'Keep it',
      variant: 'warning',
    })
    if (confirmed) await discardQueuedInspection(entry)
  }

  return (
    <section aria-label="Inspections not yet sent" className="mb-4 rounded-lg border border-border bg-surface-elevated p-3">
      <h2 className="flex items-center gap-2 font-semibold text-foreground">
        <CloudOff size={18} aria-hidden="true" />
        Saved on this device, not sent yet
      </h2>
      <ul className="mt-2 divide-y divide-border">
        {entries.map(entry => (
          <li key={entry.id} className="py-2">
            <p className="text-foreground">
              <span className="font-medium">Hive {entry.hiveLabel}</span>
              <span className="text-sm text-text-secondary"> · {describeTime(entry.queuedAt)}</span>
            </p>
            {entry.failedReason ? (
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Could not be sent: {entry.failedReason}</p>
            ) : (
              <p className="text-sm text-text-secondary">Sends when the app is open and has signal</p>
            )}
            <div className="mt-2 flex gap-2">
              <Button tone="neutral" size="sm" disabled={sending} onClick={() => void retry(entry)}>
                {entry.failedReason ? 'Try again' : 'Send now'}
              </Button>
              {!entry.rowSaved && (
                <Button tone="neutral" size="sm" onClick={() => void discard(entry)}>
                  Discard
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
