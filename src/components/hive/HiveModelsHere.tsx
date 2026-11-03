'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { getCurrentUserId } from '@/lib/auth'
import { useHiveModels } from '@/hooks/useHiveModels'
import { summariseHiveModels } from '@/lib/hive-model'

interface HiveModelsHereProps {
  /** The apiary's hives; archived ones are left out of the summary. */
  hives: ReadonlyArray<{ hive_model_id?: string | null; archived_at?: string | null }>
  /** Tighter spacing inside another panel (the visit checklist). */
  compact?: boolean
  title?: string
}

/**
 * "Hive models here": hives per model and the brood frame sizes they take, so the beekeeper
 * knows which compatible gear to bring. Renders nothing until at least one hive has a model.
 */
export default function HiveModelsHere({ hives, compact = false, title = 'Hive models here' }: HiveModelsHereProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const headingId = useId()

  useEffect(() => {
    let cancelled = false
    getCurrentUserId().then((id) => { if (!cancelled) setUserId(id) })
    return () => { cancelled = true }
  }, [])

  const activeHives = useMemo(() => hives.filter(h => !h.archived_at), [hives])
  const anyModel = activeHives.some(h => h.hive_model_id)
  const { modelsById, systemsById, frameStandardsById } = useHiveModels(anyModel ? userId : null)

  const summary = useMemo(
    () => summariseHiveModels(activeHives, modelsById, systemsById, frameStandardsById),
    [activeHives, modelsById, systemsById, frameStandardsById]
  )

  if (!anyModel || summary.models.length === 0) return null

  return (
    <section
      aria-labelledby={headingId}
      className={compact ? '' : 'bg-surface dark:bg-surface rounded-lg shadow p-4 md:p-6 border border-border'}
    >
      <h2 id={headingId} className={`flex items-center gap-2 font-semibold text-foreground ${compact ? 'text-base mb-2' : 'text-lg mb-3'}`}>
        <Package size={20} aria-hidden="true" className="text-forest-600 dark:text-forest-400" />
        {title}
      </h2>
      <ul className="space-y-1 text-base text-text-primary">
        {summary.models.map((row) => (
          <li key={row.modelId}>
            <span className="font-semibold">{row.count} ×</span> {row.name}
            {row.description && <span className="text-sm text-text-secondary"> ({row.description})</span>}
          </li>
        ))}
        {summary.unassigned > 0 && (
          <li className="text-text-secondary">
            {summary.unassigned} {summary.unassigned === 1 ? 'hive has' : 'hives have'} no model set
          </li>
        )}
      </ul>
      {summary.broodFrames.length > 0 && (
        <p className="mt-2 text-sm text-text-secondary">
          Brood frames: {summary.broodFrames.map(f => `${f.label} (${f.count} ${f.count === 1 ? 'hive' : 'hives'})`).join(', ')}
        </p>
      )}
      {!compact && (
        <Link href="/dashboard/hive-models" className="mt-2 inline-flex min-h-[48px] items-center text-sm font-medium text-forest-700 dark:text-forest-400 underline">
          Manage hive models
        </Link>
      )}
    </section>
  )
}
