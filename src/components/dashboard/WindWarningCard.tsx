'use client'

import { Wind } from 'lucide-react'
import AlertPanel from '@/components/ui/AlertPanel'
import { useWindWarnings } from '@/hooks/useWindWarnings'
import { WIND_SEVERE_GUST } from '@/lib/wind-warning'
import type { DashboardApiary } from '@/types/dashboard'

/** Strong winds forecast at the user's apiaries; nothing at all on a calm forecast or a failed request */
export default function WindWarningCard({ apiaries }: { apiaries: DashboardApiary[] }) {
  const warnings = useWindWarnings(apiaries)
  if (warnings.length === 0) return null

  return (
    <AlertPanel
      tone={warnings[0].gust >= WIND_SEVERE_GUST ? 'error' : 'warning'}
      icon={<Wind size={20} aria-hidden="true" />}
      title="Strong winds forecast"
      titleClassName="text-lg! font-semibold"
      bodyClassName="text-base"
    >
      <ul className="space-y-1">
        {warnings.map(w => (
          <li key={w.apiaryId}>{w.apiaryName}: gusts up to {w.gust} km/h, {w.when}</li>
        ))}
      </ul>
      <p className="mt-2">Strap the hives and weigh down the lids before then.</p>
      <a
        href="https://www.met.ie/warnings"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center font-medium underline"
      >
        Met Éireann warnings
      </a>
    </AlertPanel>
  )
}
