'use client'

import Link from 'next/link'
import { AlertCircle, ExternalLink } from 'lucide-react'
import type { Queen, QueenReport, TraitAverages } from '@/types/queen'
import { colorBadgeClass, TraitBar, formatRating } from './queenTraitVisuals'
import { calculateQueenAge } from '@/types/queen'

export interface CompareColumn {
  id: string
  queen: Queen | null
  hiveNumber: string | null
  apiaryName: string | null
  report: QueenReport | null
  error: string | null
}

interface QueenCompareTableProps {
  columns: CompareColumn[]
}

type TraitKey = keyof Omit<TraitAverages, 'n'>
interface TraitDef {
  key: TraitKey
  label: string
  /**
   * For most traits a higher rating is better. For swarming tendency, a LOWER
   * rating is better (less inclined to swarm). This controls which cell gets
   * the best-in-row highlight.
   */
  bestIs: 'high' | 'low'
}

const TRAITS: TraitDef[] = [
  { key: 'docility', label: 'Docility', bestIs: 'high' },
  { key: 'population', label: 'Population', bestIs: 'high' },
  { key: 'brood_pattern', label: 'Brood Pattern', bestIs: 'high' },
  { key: 'calmness', label: 'Calmness', bestIs: 'high' },
  { key: 'swarm_tendency', label: 'Swarm Tendency', bestIs: 'low' },
]

const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IE') : '—'

// Compute the best index for a trait row. Returns null on ties or when all
// values are null (don't mislead the user).
const bestIndex = (values: (number | null)[], direction: 'high' | 'low'): number | null => {
  const defined = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v != null)
  if (defined.length === 0) return null
  defined.sort((a, b) => (direction === 'high' ? b.v - a.v : a.v - b.v))
  if (defined.length >= 2 && defined[0].v === defined[1].v) return null // tie
  return defined[0].i
}

const HeaderCell = ({ col }: { col: CompareColumn }) => {
  if (col.error || !col.queen) {
    return (
      <th className="px-4 py-3 text-left min-w-[180px] align-top">
        <div className="text-sm font-semibold text-red-700 dark:text-red-400">Unavailable</div>
        <div className="text-xs text-text-tertiary mt-0.5">{col.error}</div>
      </th>
    )
  }
  const q = col.queen
  return (
    <th className="px-4 py-3 text-left min-w-[200px] align-top">
      <Link href={`/dashboard/queens/${q.id}`} className="inline-flex items-center gap-1 text-forest-600 dark:text-forest-400 hover:underline font-semibold">
        {q.queen_number}
        <ExternalLink size={12} />
      </Link>
      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colorBadgeClass(q.marking_color)}`}>
          {q.marking_color || 'None'}
        </span>
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
          q.status === 'active'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            : q.status === 'cell'
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
            : 'bg-surface-secondary text-text-secondary'
        }`}>
          {q.status === 'cell' ? 'Cell' : q.status}
        </span>
      </div>
    </th>
  )
}

const SectionHeading = ({ label, colCount }: { label: string; colCount: number }) => (
  <tr>
    <td
      colSpan={colCount + 1}
      className="px-4 py-2 bg-surface-secondary/60 dark:bg-surface-elevated text-xs font-semibold text-text-tertiary uppercase tracking-wide sticky left-0"
    >
      {label}
    </td>
  </tr>
)

const AttrCell = ({ children }: { children: React.ReactNode }) => (
  <td className="px-4 py-3 text-sm text-text-primary align-top">{children}</td>
)

const AttrLabel = ({ children }: { children: React.ReactNode }) => (
  <th
    scope="row"
    className="px-4 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wide align-top sticky left-0 bg-surface dark:bg-surface whitespace-nowrap"
  >
    {children}
  </th>
)

export default function QueenCompareTable({ columns }: QueenCompareTableProps) {
  const colCount = columns.length

  // Precompute best-in-row for each trait so cells can check cheaply.
  const traitBests: Record<TraitKey, number | null> = {
    docility: null,
    population: null,
    brood_pattern: null,
    calmness: null,
    swarm_tendency: null,
  }
  for (const trait of TRAITS) {
    const values = columns.map((c) =>
      c.report && c.report.traitAverages.n > 0 ? c.report.traitAverages[trait.key] : null
    )
    traitBests[trait.key] = bestIndex(values, trait.bestIs)
  }

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold text-text-tertiary uppercase tracking-wide sticky left-0 bg-surface dark:bg-surface w-[160px]"
            >
              Attribute
            </th>
            {columns.map((col) => (
              <HeaderCell key={col.id} col={col} />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {/* Identity */}
          <SectionHeading label="Identity" colCount={colCount} />
          <tr>
            <AttrLabel>Age</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>{c.queen ? calculateQueenAge(c.queen.birth_date) : '—'}</AttrCell>
            ))}
          </tr>
          <tr>
            <AttrLabel>Subspecies</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>{c.queen?.subspecies || '—'}</AttrCell>
            ))}
          </tr>

          {/* Pedigree */}
          <SectionHeading label="Pedigree" colCount={colCount} />
          <tr>
            <AttrLabel>Mother</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>
                {c.queen?.mother ? (
                  <Link href={`/dashboard/queens/${c.queen.mother.id}`} className="text-forest-600 dark:text-forest-400 hover:underline">
                    {c.queen.mother.queen_number}
                  </Link>
                ) : '—'}
              </AttrCell>
            ))}
          </tr>
          <tr>
            <AttrLabel>Father</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>
                {c.queen?.father ? (
                  <Link href={`/dashboard/queens/${c.queen.father.id}`} className="text-forest-600 dark:text-forest-400 hover:underline">
                    {c.queen.father.queen_number}
                  </Link>
                ) : c.queen ? (
                  <span className="text-text-tertiary italic">Open mated</span>
                ) : '—'}
              </AttrCell>
            ))}
          </tr>
          <tr>
            <AttrLabel>Lineage</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>{c.queen?.lineage || '—'}</AttrCell>
            ))}
          </tr>
          <tr>
            <AttrLabel>Batch</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>{c.queen?.batch?.batch_name || '—'}</AttrCell>
            ))}
          </tr>

          {/* Mating Site */}
          <SectionHeading label="Mating Site" colCount={colCount} />
          <tr>
            <AttrLabel>Mated Date</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>{formatDate(c.queen?.mated_date ?? null)}</AttrCell>
            ))}
          </tr>
          <tr>
            <AttrLabel>Eircode</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>{c.queen?.mated_at_eircode || '—'}</AttrCell>
            ))}
          </tr>

          {/* Assignment */}
          <SectionHeading label="Assignment" colCount={colCount} />
          <tr>
            <AttrLabel>Hive</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>{c.hiveNumber || '—'}</AttrCell>
            ))}
          </tr>
          <tr>
            <AttrLabel>Apiary</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>{c.apiaryName || '—'}</AttrCell>
            ))}
          </tr>

          {/* Trait Averages */}
          <SectionHeading label="Trait Averages" colCount={colCount} />
          {TRAITS.map((trait) => {
            const bestIdx = traitBests[trait.key]
            return (
              <tr key={trait.key}>
                <AttrLabel>
                  {trait.label}
                  {trait.bestIs === 'low' && (
                    <span className="block text-[10px] normal-case text-text-tertiary font-normal">lower is better</span>
                  )}
                </AttrLabel>
                {columns.map((c, idx) => {
                  const avg = c.report?.traitAverages
                  const value = avg && avg.n > 0 ? avg[trait.key] : null
                  const isBest = bestIdx === idx
                  return (
                    <td key={c.id} className="px-4 py-3 align-top">
                      {value == null ? (
                        <div className="text-sm text-text-tertiary">
                          —
                          <div className="text-[10px]">n = {avg?.n ?? 0}</div>
                        </div>
                      ) : (
                        <div
                          className={`inline-flex flex-col gap-1 px-2 py-1 rounded-md ${
                            isBest
                              ? 'bg-forest-100 dark:bg-forest-900/40 ring-1 ring-forest-400 dark:ring-forest-600'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <TraitBar value={value} />
                            <span className={`text-sm tabular-nums ${isBest ? 'font-bold text-forest-800 dark:text-forest-200' : 'text-text-primary'}`}>
                              {formatRating(value)}
                            </span>
                          </div>
                          <span className="text-[10px] text-text-tertiary">n = {avg?.n ?? 0}</span>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}

          {/* Latest Inspection */}
          <SectionHeading label="Latest Inspection" colCount={colCount} />
          <tr>
            <AttrLabel>Date</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>{formatDate(c.report?.latestSnapshot?.inspection_date ?? null)}</AttrCell>
            ))}
          </tr>
          <tr>
            <AttrLabel>Queen seen</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>
                {c.report?.latestSnapshot ? (c.report.latestSnapshot.queen_seen ? 'Yes' : 'No') : '—'}
              </AttrCell>
            ))}
          </tr>
          <tr>
            <AttrLabel>Eggs present</AttrLabel>
            {columns.map((c) => (
              <AttrCell key={c.id}>
                {c.report?.latestSnapshot ? (c.report.latestSnapshot.eggs_present ? 'Yes' : 'No') : '—'}
              </AttrCell>
            ))}
          </tr>
          <tr>
            <AttrLabel>Disease flags</AttrLabel>
            {columns.map((c) => {
              const flags = c.report?.latestSnapshot?.diseases ?? []
              if (!c.report?.latestSnapshot) {
                return <AttrCell key={c.id}>—</AttrCell>
              }
              if (flags.length === 0) {
                return (
                  <td key={c.id} className="px-4 py-3 align-top">
                    <span className="text-xs text-text-tertiary italic">None</span>
                  </td>
                )
              }
              return (
                <td key={c.id} className="px-4 py-3 align-top">
                  <div className="inline-flex items-start gap-1.5 px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700">
                    <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-amber-800 dark:text-amber-300">{flags.join(', ')}</span>
                  </div>
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
