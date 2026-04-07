'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Minus, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react'
import type {
  Queen,
  QueenReport,
  ReportTimeWindow,
  TraitAverages,
  SisterSummary,
} from '@/types/queen'

interface QueenHive {
  id: string
  hive_number: string
  apiary_name: string | null
}

interface QueenReportTabProps {
  queen: Queen
  hive: QueenHive | null
  fetchQueenReport: (
    motherId: string | null | undefined,
    queenId: string,
    hiveId: string | null,
    range: ReportTimeWindow
  ) => Promise<QueenReport>
}

const TRAITS: { key: keyof Omit<TraitAverages, 'n'>; label: string }[] = [
  { key: 'docility', label: 'Docility' },
  { key: 'population', label: 'Population' },
  { key: 'brood_pattern', label: 'Brood Pattern' },
  { key: 'calmness', label: 'Calmness' },
  { key: 'swarm_tendency', label: 'Swarm Tendency' },
]

const colorBadgeClass = (color: string) => {
  switch (color) {
    case 'White': return 'bg-surface-secondary text-text-primary border-border'
    case 'Yellow': return 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-900 dark:text-yellow-200 border-yellow-400 dark:border-yellow-700'
    case 'Red': return 'bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-200 border-red-400 dark:border-red-700'
    case 'Green': return 'bg-green-200 dark:bg-green-900/40 text-green-900 dark:text-green-200 border-green-400 dark:border-green-700'
    case 'Blue': return 'bg-blue-200 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 border-blue-400 dark:border-blue-700'
    default: return 'bg-surface-secondary text-text-primary border-border'
  }
}

const TraitBar = ({ value }: { value: number | null }) => {
  // 5-segment bar; segments fill based on rating (1–5)
  const filled = value == null ? 0 : Math.round(value)
  return (
    <div className="flex gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-2 w-6 rounded-sm ${
            i <= filled
              ? 'bg-forest-500 dark:bg-forest-400'
              : 'bg-surface-secondary dark:bg-surface-elevated border border-border'
          }`}
        />
      ))}
    </div>
  )
}

const formatRating = (value: number | null) =>
  value == null ? '—' : `${value.toFixed(1)} / 5`

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IE') : 'N/A'

const TraitRow = ({
  label,
  value,
  comparison,
}: {
  label: string
  value: number | null
  comparison?: number | null
}) => {
  let delta: 'up' | 'down' | 'same' | null = null
  if (value != null && comparison != null) {
    const diff = value - comparison
    if (Math.abs(diff) < 0.05) delta = 'same'
    else if (diff > 0) delta = 'up'
    else delta = 'down'
  }
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-[120px]">
        <p className="text-sm font-medium text-text-primary">{label}</p>
      </div>
      <div className="flex-1 flex items-center gap-3 justify-end">
        <TraitBar value={value} />
        <span className="text-sm tabular-nums text-text-primary min-w-[60px] text-right">
          {formatRating(value)}
        </span>
        {comparison != null && (
          <span className="inline-flex items-center gap-0.5 text-xs text-text-tertiary min-w-[80px]">
            {delta === 'up' && <ArrowUp size={12} className="text-green-600 dark:text-green-400" />}
            {delta === 'down' && <ArrowDown size={12} className="text-red-600 dark:text-red-400" />}
            {delta === 'same' && <Minus size={12} />}
            vs sisters {formatRating(comparison)}
          </span>
        )}
      </div>
    </div>
  )
}

export default function QueenReportTab({ queen, hive, fetchQueenReport }: QueenReportTabProps) {
  const [timeWindow, setTimeWindow] = useState<ReportTimeWindow>('all')
  const [minInspections, setMinInspections] = useState<number>(1)
  const [report, setReport] = useState<QueenReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchQueenReport(queen.mother_id ?? null, queen.id, hive?.id ?? null, timeWindow)
      .then((r) => {
        if (!cancelled) setReport(r)
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) setError('Failed to load report data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [queen.id, queen.mother_id, hive?.id, timeWindow, fetchQueenReport])

  const traitsMeetMinimum = useMemo(() => {
    if (!report) return false
    return report.traitAverages.n >= minInspections
  }, [report, minInspections])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border border-border">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-tertiary uppercase mb-1">
              Time Window
            </label>
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value as ReportTimeWindow)}
              className="px-3 py-2 rounded-md border border-border bg-surface dark:bg-surface-elevated text-foreground text-sm min-h-[44px]"
            >
              <option value="all">All time</option>
              <option value="90">Last 90 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-tertiary uppercase mb-1">
              Min Inspections
            </label>
            <select
              value={minInspections}
              onChange={(e) => setMinInspections(Number(e.target.value))}
              className="px-3 py-2 rounded-md border border-border bg-surface dark:bg-surface-elevated text-foreground text-sm min-h-[44px]"
            >
              <option value={1}>1+</option>
              <option value={3}>3+</option>
              <option value={5}>5+</option>
              <option value={10}>10+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pedigree & Mating Site */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">Pedigree & Mating Site</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1.5">
            <p>
              <span className="text-text-tertiary">Mother:</span>{' '}
              {queen.mother ? (
                <Link href={`/dashboard/queens/${queen.mother.id}`} className="text-forest-600 dark:text-forest-400 hover:underline">
                  {queen.mother.queen_number}
                </Link>
              ) : <span className="text-text-secondary">Unknown</span>}
            </p>
            <p>
              <span className="text-text-tertiary">Father:</span>{' '}
              {queen.father ? (
                <Link href={`/dashboard/queens/${queen.father.id}`} className="text-forest-600 dark:text-forest-400 hover:underline">
                  {queen.father.queen_number}
                </Link>
              ) : <span className="text-text-secondary">Open mated</span>}
            </p>
            <p><span className="text-text-tertiary">Subspecies:</span> <span className="text-text-primary">{queen.subspecies || 'N/A'}</span></p>
            <p><span className="text-text-tertiary">Lineage:</span> <span className="text-text-primary">{queen.lineage || 'N/A'}</span></p>
            {queen.batch && (
              <p>
                <span className="text-text-tertiary">Batch:</span>{' '}
                <Link href="/dashboard/batches" className="text-forest-600 dark:text-forest-400 hover:underline">
                  {queen.batch.batch_name}
                </Link>
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <p><span className="text-text-tertiary">Mated date:</span> <span className="text-text-primary">{formatDate(queen.mated_date ?? null)}</span></p>
            <p><span className="text-text-tertiary">Mated at (Eircode):</span> <span className="text-text-primary">{queen.mated_at_eircode || 'N/A'}</span></p>
            {!queen.father && (queen.mated_at_eircode || queen.mated_date) && (
              <p className="text-xs text-text-tertiary italic mt-2">
                In the absence of a recorded paternal line, the mating site stands in for drone provenance.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sisters */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Sisters {report && `(${report.sisters.length})`}
        </h2>
        {!queen.mother_id ? (
          <p className="text-sm text-text-tertiary">No sisters recorded — set a mother to compare with siblings.</p>
        ) : loading ? (
          <p className="text-sm text-text-tertiary">Loading…</p>
        ) : report && report.sisters.length === 0 ? (
          <p className="text-sm text-text-tertiary">No sisters found for this queen&apos;s mother.</p>
        ) : report ? (
          <ul className="space-y-2">
            {report.sisters.map((s: SisterSummary) => (
              <li key={s.id}>
                <Link
                  href={`/dashboard/queens/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface-elevated dark:bg-surface-elevated rounded-lg border border-border hover:border-forest-500 dark:hover:border-forest-400 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colorBadgeClass(s.marking_color)}`}>
                      {s.marking_color || 'None'}
                    </span>
                    <span className="font-medium text-foreground">{s.queen_number}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      s.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : s.status === 'cell'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                        : 'bg-surface-secondary text-text-secondary'
                    }`}>
                      {s.status === 'cell' ? 'Cell' : s.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary flex-wrap">
                    {s.hive_number && (
                      <span className="inline-flex items-center gap-1">
                        <ExternalLink size={12} />
                        {s.hive_number}{s.apiary_name ? ` · ${s.apiary_name}` : ''}
                      </span>
                    )}
                    {s.mated_at_eircode && (
                      <span>Mated at {s.mated_at_eircode}</span>
                    )}
                    {s.mated_date && (
                      <span>{formatDate(s.mated_date)}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Trait Averages + Sister Comparison */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Trait Averages</h2>
          {report && (
            <span className="text-xs text-text-tertiary">
              n = {report.traitAverages.n} inspection{report.traitAverages.n === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {!hive ? (
          <p className="text-sm text-text-tertiary">This queen is not assigned to a hive — no inspection data to average.</p>
        ) : loading ? (
          <p className="text-sm text-text-tertiary">Loading…</p>
        ) : !report ? null : !traitsMeetMinimum ? (
          <p className="text-sm text-text-tertiary">
            Only {report.traitAverages.n} inspection{report.traitAverages.n === 1 ? '' : 's'} in the selected window
            {' '}— below the minimum of {minInspections}.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {TRAITS.map((t) => (
              <TraitRow
                key={t.key}
                label={t.label}
                value={report.traitAverages[t.key]}
                comparison={report.sisterAverages.n > 0 ? report.sisterAverages[t.key] : null}
              />
            ))}
          </div>
        )}
        {report && report.sisterAverages.n > 0 && traitsMeetMinimum && (
          <p className="text-xs text-text-tertiary mt-3">
            Sister comparison combines {report.sisterAverages.n} inspection{report.sisterAverages.n === 1 ? '' : 's'} across {report.sisters.length} sister{report.sisters.length === 1 ? '' : 's'}.
          </p>
        )}
      </div>

      {/* Latest Inspection Snapshot */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">Latest Inspection</h2>
        {!hive ? (
          <p className="text-sm text-text-tertiary">No hive assigned.</p>
        ) : loading ? (
          <p className="text-sm text-text-tertiary">Loading…</p>
        ) : report?.latestSnapshot ? (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-text-tertiary">Date:</span>{' '}
              <span className="text-text-primary">{formatDate(report.latestSnapshot.inspection_date)}</span>
            </p>
            <p>
              <span className="text-text-tertiary">Queen seen:</span>{' '}
              <span className="text-text-primary">{report.latestSnapshot.queen_seen ? 'Yes' : 'No'}</span>
            </p>
            <p>
              <span className="text-text-tertiary">Eggs present:</span>{' '}
              <span className="text-text-primary">{report.latestSnapshot.eggs_present ? 'Yes' : 'No'}</span>
            </p>
            {report.latestSnapshot.diseases.length > 0 ? (
              <div className="flex items-start gap-2 mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-300 dark:border-amber-700">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase">Disease flags</p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">{report.latestSnapshot.diseases.join(', ')}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-tertiary italic mt-1">No disease flags on the most recent inspection.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary">No inspections recorded for this queen&apos;s hive.</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  )
}
