'use client'

import { useEffect } from 'react'
import { WifiOff } from 'lucide-react'
import Button from '@/components/ui/Button'

function describeSavedAt(savedAt: number): string {
  return new Date(savedAt).toLocaleString('en-IE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface CachedDataNoticeProps {
  savedAt: number | null
  /** Loads the screen again. Also runs by itself when the signal comes back. */
  onRetry: () => void
}

/** Says plainly that a screen is showing older data, because the latest could not be loaded. */
export default function CachedDataNotice({ savedAt, onRetry }: CachedDataNoticeProps) {
  const showing = savedAt !== null

  useEffect(() => {
    if (!showing) return
    window.addEventListener('online', onRetry)
    return () => window.removeEventListener('online', onRetry)
  }, [showing, onRetry])

  if (savedAt === null) return null
  return (
    <div role="status" className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface-elevated px-3 py-2">
      <p className="flex min-w-0 flex-1 basis-48 items-center gap-2 text-sm font-medium text-text-primary">
        <WifiOff size={16} className="flex-shrink-0" aria-hidden="true" />
        Could not refresh. Showing what was saved on {describeSavedAt(savedAt)}.
      </p>
      <Button tone="neutral" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
