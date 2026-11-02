'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { describeDraftSavedAt, inspectionDraftOwner, loadInspectionDraft } from '@/lib/inspection-draft'

/** Finds a beekeeper's unfinished inspection for them when they come back to the app. */
export default function UnfinishedInspectionNotice({ userId }: { userId: string | null }) {
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    const owner = inspectionDraftOwner(userId)
    if (!owner) return
    let cancelled = false
    loadInspectionDraft(owner).then(draft => {
      if (!cancelled) setSavedAt(draft?.savedAt ?? null)
    })
    return () => { cancelled = true }
  }, [userId])

  if (savedAt === null) return null

  return (
    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated p-4">
      <p className="text-foreground">
        <span className="font-semibold">Unfinished inspection</span>
        <span className="block text-sm text-text-secondary">On this phone since {describeDraftSavedAt(savedAt)}</span>
      </p>
      <Link href="/dashboard/records?create=inspection" className="fj-btn fj-btn-success">
        Open it
      </Link>
    </div>
  )
}
