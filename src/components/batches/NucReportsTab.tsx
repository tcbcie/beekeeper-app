'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import Panel from '@/components/ui/Panel'
import Button from '@/components/ui/Button'
import ReportExportBar from '@/components/reports/ReportExportBar'
import { exportToCSV, printReport, exportToImage } from '@/lib/export-utils'
import { useToast } from '@/components/ui/Toast'
import { AlertTriangle, BarChart3 } from 'lucide-react'
import type { TimePeriod } from '@/types/reports'

interface NucReportsTabProps {
  userId: string
}

interface NucRecord {
  id: string
  nuc_number: string | null
  status: string
  is_inventory: boolean
  equipment_status: string | null
  batch_id: string | null
  setup_date: string | null
  retired_at: string | null
  queen_emerged_at: string | null
  mating_confirmed_at: string | null
  cell_introduced_at: string | null
  failed_at: string | null
  rearing_batches: { id: string; batch_name: string } | null
  // Breeder (mother) queen number, resolved per nuc: the cell's own breeder
  // for multi-breeder batches, else the batch-level mother queen.
  breeder_queen_number: string | null
}

interface StatusCount {
  label: string
  count: number
  tone: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'neutral'
}

interface BatchPerformance {
  batchId: string
  batchName: string
  total: number
  laying: number
  failed: number
  successRate: number
}

const STATUS_LABELS: Record<string, string> = {
  setup: 'Setup',
  graft_introduced: 'Graft Introduced',
  cell_introduced: 'Cell Introduced',
  virgin: 'Virgin',
  mating: 'Mating',
  laying: 'Laying',
  failed: 'Failed',
  sold: 'Distributed/Sold',
  merged: 'Merged',
}

const STATUS_TONES: Record<string, 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'neutral'> = {
  setup: 'neutral',
  graft_introduced: 'blue',
  cell_introduced: 'blue',
  virgin: 'purple',
  mating: 'amber',
  laying: 'green',
  failed: 'red',
  sold: 'neutral',
  merged: 'neutral',
}

const EQUIPMENT_LABELS: Record<string, string> = {
  active: 'Active (In Use)',
  ready: 'Ready (Available)',
  retired: 'Retired',
}

const EQUIPMENT_TONES: Record<string, 'green' | 'amber' | 'neutral'> = {
  active: 'green',
  ready: 'amber',
  retired: 'neutral',
}

const TIME_PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: '3months', label: '3 Months' },
  { value: '6months', label: '6 Months' },
  { value: '1year', label: '1 Year' },
  { value: 'custom', label: 'Custom' },
]

// PostgREST embeds arrive as either an object or a single-element array
// depending on the relationship — normalise to the first record.
function firstEmbed(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  const v = Array.isArray(value) ? value[0] : value
  return (v as Record<string, unknown>) ?? null
}

// Pull queen_number from an embed that itself nests a `queens` relation
// (rearing_batches → mother queen, or batch_grafts → breeder queen).
function embedQueenNumber(value: unknown): string | null {
  const queen = firstEmbed(firstEmbed(value)?.queens)
  const num = queen?.queen_number
  return typeof num === 'string' && num.length > 0 ? num : null
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getDateRangeStart(period: TimePeriod): Date | null {
  const today = new Date()
  switch (period) {
    case '3months':
      return new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
    case '6months':
      return new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
    case '1year':
      return new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
    default:
      return null
  }
}

export default function NucReportsTab({ userId }: NucReportsTabProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [nucs, setNucs] = useState<NucRecord[]>([])
  const [fetchError, setFetchError] = useState(false)

  // Filters
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Export refs
  const reportRef = useRef<HTMLDivElement>(null)
  const nucTableRef = useRef<HTMLDivElement>(null)

  const fetchNucs = useCallback(async () => {
    setLoading(true)
    setFetchError(false)
    const { data, error } = await supabase
      .from('mating_nucs')
      .select('id, nuc_number, status, is_inventory, equipment_status, batch_id, setup_date, retired_at, queen_emerged_at, mating_confirmed_at, cell_introduced_at, failed_at, rearing_batches(id, batch_name, queens!mother_queen_id(queen_number)), batch_grafts(queens!batch_grafts_breeder_queen_id_fkey(queen_number))')
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to load NUC report data:', error)
      setFetchError(true)
      setLoading(false)
      return
    }

    // PostgREST joins with explicit selects return arrays; normalise to single object
    setNucs((data || []).map(n => {
      const rb = firstEmbed(n.rearing_batches)
      // Per-cell breeder (multi-breeder batches) wins; fall back to the batch mother.
      const breeder = embedQueenNumber(n.batch_grafts) ?? embedQueenNumber(n.rearing_batches)
      return {
        ...n,
        rearing_batches: rb ? { id: rb.id as string, batch_name: rb.batch_name as string } : null,
        breeder_queen_number: breeder,
      } as NucRecord
    }))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchNucs()
  }, [fetchNucs])

  // --- Batch options for filter dropdown ---
  const batchOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const n of nucs) {
      if (n.rearing_batches && !seen.has(n.rearing_batches.id)) {
        seen.set(n.rearing_batches.id, n.rearing_batches.batch_name)
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [nucs])

  // --- Apply filters ---
  const filteredNucs = useMemo(() => {
    let result = nucs

    // Batch filter
    if (selectedBatchId) {
      result = result.filter(n => n.rearing_batches?.id === selectedBatchId)
    }

    // Date filter based on setup_date
    if (timePeriod === 'custom') {
      if (customStartDate) {
        const start = new Date(customStartDate + 'T00:00:00')
        if (!isNaN(start.getTime())) {
          result = result.filter(n => {
            if (!n.setup_date) return true
            return new Date(n.setup_date + 'T00:00:00') >= start
          })
        }
      }
      if (customEndDate) {
        const end = new Date(customEndDate + 'T23:59:59')
        if (!isNaN(end.getTime())) {
          result = result.filter(n => {
            if (!n.setup_date) return true
            return new Date(n.setup_date + 'T00:00:00') <= end
          })
        }
      }
    } else if (timePeriod !== 'all') {
      const start = getDateRangeStart(timePeriod)
      if (start) {
        result = result.filter(n => {
          if (!n.setup_date) return true
          return new Date(n.setup_date + 'T00:00:00') >= start
        })
      }
    }

    return result
  }, [nucs, selectedBatchId, timePeriod, customStartDate, customEndDate])

  // --- Derived data from filtered nucs ---
  const matingNucs = filteredNucs.filter(n => !n.is_inventory)
  const inventoryNucs = filteredNucs.filter(n => n.is_inventory)

  // 1. NUC Status Overview (mating nucs only, excluding retired)
  const activeNucs = matingNucs.filter(n => !n.retired_at)
  const statusCounts: StatusCount[] = Object.entries(STATUS_LABELS)
    .map(([key, label]) => ({
      label,
      count: activeNucs.filter(n => n.status === key).length,
      tone: (STATUS_TONES[key] || 'neutral') as StatusCount['tone'],
    }))
    .filter(s => s.count > 0)

  // 2. Equipment Inventory Summary
  const equipmentCounts: StatusCount[] = Object.entries(EQUIPMENT_LABELS)
    .map(([key, label]) => ({
      label,
      count: inventoryNucs.filter(n => n.equipment_status === key).length,
      tone: (EQUIPMENT_TONES[key] || 'neutral') as StatusCount['tone'],
    }))

  // 3. Batch Performance Summary
  const batchMap = new Map<string, { batchName: string; nucs: NucRecord[] }>()
  for (const nuc of matingNucs) {
    if (!nuc.rearing_batches) continue
    const batchInfo = nuc.rearing_batches
    const key = batchInfo.id
    if (!batchMap.has(key)) {
      batchMap.set(key, { batchName: batchInfo.batch_name, nucs: [] })
    }
    batchMap.get(key)!.nucs.push(nuc)
  }

  const batchPerformance: BatchPerformance[] = Array.from(batchMap.entries()).map(([batchId, b]) => {
    const total = b.nucs.length
    const laying = b.nucs.filter(n => n.status === 'laying').length
    const failed = b.nucs.filter(n => n.status === 'failed').length
    return {
      batchId,
      batchName: b.batchName,
      total,
      laying,
      failed,
      successRate: total > 0 ? Math.round((laying / total) * 100) : 0,
    }
  })

  // 4. NUC Utilisation (inventory nucs: active vs ready)
  const activeInventory = inventoryNucs.filter(n => n.equipment_status === 'active').length
  const readyInventory = inventoryNucs.filter(n => n.equipment_status === 'ready').length
  const totalUsable = activeInventory + readyInventory
  const utilisationPct = totalUsable > 0 ? Math.round((activeInventory / totalUsable) * 100) : 0

  // 5. Queen Mating Success Rate (all-time, mating nucs)
  const terminatedNucs = matingNucs.filter(n =>
    ['laying', 'failed', 'sold', 'merged'].includes(n.status)
  )
  const successfulMatings = matingNucs.filter(n =>
    ['laying', 'sold', 'merged'].includes(n.status)
  ).length
  const matingSuccessRate = terminatedNucs.length > 0
    ? Math.round((successfulMatings / terminatedNucs.length) * 100)
    : null

  // 6. Timeline Metrics
  const daysToEmergence: number[] = []
  const daysToMating: number[] = []

  for (const nuc of matingNucs) {
    const setupDate = nuc.setup_date ? new Date(nuc.setup_date + 'T00:00:00') : null
    if (!setupDate || isNaN(setupDate.getTime())) continue

    if (nuc.queen_emerged_at) {
      const emerged = new Date(nuc.queen_emerged_at)
      const days = Math.round((emerged.getTime() - setupDate.getTime()) / (1000 * 60 * 60 * 24))
      if (days >= 0) daysToEmergence.push(days)
    }

    if (nuc.mating_confirmed_at) {
      const mated = new Date(nuc.mating_confirmed_at)
      const days = Math.round((mated.getTime() - setupDate.getTime()) / (1000 * 60 * 60 * 24))
      if (days >= 0) daysToMating.push(days)
    }
  }

  const avgEmergence = daysToEmergence.length > 0
    ? Math.round(daysToEmergence.reduce((a, b) => a + b, 0) / daysToEmergence.length)
    : null
  const avgMating = daysToMating.length > 0
    ? Math.round(daysToMating.reduce((a, b) => a + b, 0) / daysToMating.length)
    : null

  const sortedActiveNucs = useMemo(() =>
    [...activeNucs].sort((a, b) =>
      (a.nuc_number || '').localeCompare(b.nuc_number || '', undefined, { numeric: true })
    ), [activeNucs])

  // Cell Introduced / Queen Emerged only apply to cell-reared queens. Hide each
  // column when no nuc currently shown carries that date (e.g. a virgin-queen
  // batch), but keep it whenever any row still needs it.
  const showCellIntroduced = useMemo(
    () => sortedActiveNucs.some(n => n.cell_introduced_at), [sortedActiveNucs])
  const showQueenEmerged = useMemo(
    () => sortedActiveNucs.some(n => n.queen_emerged_at), [sortedActiveNucs])

  // --- Export handlers ---
  const handleExportCSV = useCallback(() => {
    const rows = matingNucs.map(n => ({
      'Apidea Number': n.nuc_number || '',
      'Breeder Queen': n.breeder_queen_number || '',
      'Queen Status': STATUS_LABELS[n.status] || n.status,
      'Batch': n.rearing_batches?.batch_name || '',
      'Setup Date': n.setup_date || '',
      'Cell Introduced': n.cell_introduced_at?.split('T')[0] || '',
      'Queen Emerged': n.queen_emerged_at?.split('T')[0] || '',
      'Mating Confirmed': n.mating_confirmed_at?.split('T')[0] || '',
      'Failed': n.failed_at?.split('T')[0] || '',
      'Retired': n.retired_at?.split('T')[0] || '',
    }))
    exportToCSV(rows, 'nuc-report')
  }, [matingNucs])

  const handlePrint = useCallback(() => {
    printReport()
  }, [])

  const handleExportImage = useCallback(async () => {
    if (!reportRef.current) return
    try {
      await exportToImage(reportRef.current, 'nuc-report')
    } catch {
      toast.error('Failed to export image')
    }
  }, [toast])

  // --- Mating Nuc table export handlers ---
  const handleNucTableCSV = useCallback(() => {
    const rows = sortedActiveNucs.map(n => ({
      'Nuc Number': n.nuc_number || '',
      'Breeder Queen': n.breeder_queen_number || '',
      'Queen Status': STATUS_LABELS[n.status] || n.status,
      'Setup Date': n.setup_date || '',
      ...(showCellIntroduced ? { 'Cell Introduced': n.cell_introduced_at?.split('T')[0] || '' } : {}),
      ...(showQueenEmerged ? { 'Queen Emerged': n.queen_emerged_at?.split('T')[0] || '' } : {}),
      'Mating Confirmed': n.mating_confirmed_at?.split('T')[0] || '',
      'Failed': n.failed_at?.split('T')[0] || '',
    }))
    exportToCSV(rows, 'mating-nucs-overview')
  }, [sortedActiveNucs, showCellIntroduced, showQueenEmerged])

  const handleNucTablePrint = useCallback(() => {
    printReport()
  }, [])

  const handleNucTableImage = useCallback(async () => {
    if (!nucTableRef.current) return
    try {
      await exportToImage(nucTableRef.current, 'mating-nucs-overview')
    } catch {
      toast.error('Failed to export image')
    }
  }, [toast])

  // --- Render ---
  if (loading) {
    return <LoadingSpinner />
  }

  if (fetchError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to Load Reports"
        description="Could not fetch NUC data. Please try again."
        actionLabel="Retry"
        actionOnClick={fetchNucs}
      />
    )
  }

  if (nucs.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No NUC Data Yet"
        description="Create some mating nucs or inventory nucs to see reports here."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Mating Nuc's Overview Table */}
      {sortedActiveNucs.length > 0 && (
        <div ref={nucTableRef} className="print-container">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Mating Nuc&apos;s Overview</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Each mating nuc and its current queen status ({sortedActiveNucs.length} active)
                </p>
              </div>
              <div className="no-print">
                <ReportExportBar
                  onExportCSV={handleNucTableCSV}
                  onPrint={handleNucTablePrint}
                  onExportImage={handleNucTableImage}
                  disabled={sortedActiveNucs.length === 0}
                />
              </div>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {sortedActiveNucs.map(n => (
                <div key={n.id} className="bg-surface-elevated rounded-lg p-3 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{n.nuc_number || '—'}</span>
                    <Badge tone={STATUS_TONES[n.status] || 'neutral'}>{STATUS_LABELS[n.status] || n.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-text-secondary">Breeder Queen</span>
                    <span className="text-foreground">{n.breeder_queen_number || '—'}</span>
                    {n.setup_date && (
                      <>
                        <span className="text-text-secondary">Setup</span>
                        <span className="text-foreground">{formatDate(n.setup_date)}</span>
                      </>
                    )}
                    {n.cell_introduced_at && (
                      <>
                        <span className="text-text-secondary">Cell Introduced</span>
                        <span className="text-foreground">{formatDate(n.cell_introduced_at)}</span>
                      </>
                    )}
                    {n.queen_emerged_at && (
                      <>
                        <span className="text-text-secondary">Queen Emerged</span>
                        <span className="text-foreground">{formatDate(n.queen_emerged_at)}</span>
                      </>
                    )}
                    {n.mating_confirmed_at && (
                      <>
                        <span className="text-text-secondary">Mating Confirmed</span>
                        <span className="text-foreground">{formatDate(n.mating_confirmed_at)}</span>
                      </>
                    )}
                    {n.failed_at && (
                      <>
                        <span className="text-text-secondary text-red-600 dark:text-red-400">Failed</span>
                        <span className="text-red-600 dark:text-red-400">{formatDate(n.failed_at)}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-sm font-medium text-text-secondary">Nuc Number</th>
                    <th className="py-2 px-4 text-sm font-medium text-text-secondary">Breeder Queen</th>
                    <th className="py-2 px-4 text-sm font-medium text-text-secondary">Queen Status</th>
                    <th className="py-2 px-4 text-sm font-medium text-text-secondary">Setup</th>
                    {showCellIntroduced && (
                      <th className="py-2 px-4 text-sm font-medium text-text-secondary">Cell Introduced</th>
                    )}
                    {showQueenEmerged && (
                      <th className="py-2 px-4 text-sm font-medium text-text-secondary">Queen Emerged</th>
                    )}
                    <th className="py-2 px-4 text-sm font-medium text-text-secondary">Mating Confirmed</th>
                    <th className="py-2 px-4 text-sm font-medium text-text-secondary">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedActiveNucs.map(n => (
                    <tr key={n.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 text-foreground font-medium">{n.nuc_number || '—'}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{n.breeder_queen_number || '—'}</td>
                      <td className="py-3 px-4">
                        <Badge tone={STATUS_TONES[n.status] || 'neutral'}>{STATUS_LABELS[n.status] || n.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">{formatDate(n.setup_date)}</td>
                      {showCellIntroduced && (
                        <td className="py-3 px-4 text-sm text-foreground">{formatDate(n.cell_introduced_at)}</td>
                      )}
                      {showQueenEmerged && (
                        <td className="py-3 px-4 text-sm text-foreground">{formatDate(n.queen_emerged_at)}</td>
                      )}
                      <td className="py-3 px-4 text-sm text-foreground">{formatDate(n.mating_confirmed_at)}</td>
                      <td className="py-3 px-4 text-sm text-red-600 dark:text-red-400">{n.failed_at ? formatDate(n.failed_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* Filters & Export Bar */}
      <Panel className="no-print">
        <div className="space-y-4">
          {/* Row: Batch filter + Export buttons */}
          <div className="flex flex-wrap items-end gap-4 justify-between">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Batch filter */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Rearing Batch</label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg bg-surface text-foreground"
                >
                  <option value="">All Batches</option>
                  {batchOptions.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Export buttons */}
            <ReportExportBar
              onExportCSV={handleExportCSV}
              onPrint={handlePrint}
              onExportImage={handleExportImage}
              disabled={filteredNucs.length === 0}
            />
          </div>

          {/* Row: Time period buttons */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Time Period</label>
            <div className="flex flex-wrap gap-2">
              {TIME_PERIOD_OPTIONS.map(opt => (
                <Button
                  key={opt.value}
                  onClick={() => setTimePeriod(opt.value)}
                  tone={timePeriod === opt.value ? 'success' : 'neutral'}
                  size="sm"
                  className={timePeriod === opt.value
                    ? ''
                    : 'bg-surface border border-border text-foreground hover:bg-forest-50 dark:hover:bg-forest-950/30'
                  }
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom date range */}
          {timePeriod === 'custom' && (
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-text-secondary">From:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-border rounded-lg bg-surface text-foreground text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-text-secondary">To:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-border rounded-lg bg-surface text-foreground text-sm"
                />
              </div>
              <Button
                onClick={() => { setCustomStartDate(''); setCustomEndDate('') }}
                tone="neutral"
                size="sm"
                className="underline"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </Panel>

      {/* Report Content (wrapped for image export + print) */}
      <div ref={reportRef} className="print-container space-y-6">
        {/* Print header (only visible when printing) */}
        <div className="hidden print:block mb-4">
          <h2 className="text-xl font-bold text-foreground">NUC Reports</h2>
          <p className="text-sm text-text-secondary">
            {selectedBatchId
              ? `Batch: ${batchOptions.find(b => b.id === selectedBatchId)?.name || ''}`
              : 'All Batches'}
            {timePeriod !== 'all' && ` | Period: ${TIME_PERIOD_OPTIONS.find(o => o.value === timePeriod)?.label || ''}`}
            {timePeriod === 'custom' && (customStartDate || customEndDate) &&
              ` (${customStartDate || '...'} – ${customEndDate || '...'})`}
          </p>
        </div>

        {/* Row 1: Status Overview + Equipment Inventory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NUC Status Overview */}
          <Panel>
            <h3 className="text-lg font-semibold text-foreground mb-4">NUC Status Overview</h3>
            <p className="text-sm text-text-secondary mb-3">
              Active mating nucs by current status ({activeNucs.length} total)
            </p>
            {statusCounts.length > 0 ? (
              <div className="space-y-2">
                {statusCounts.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <Badge tone={s.tone}>{s.label}</Badge>
                    <span className="text-lg font-semibold text-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">No active mating nucs.</p>
            )}
          </Panel>

          {/* Equipment Inventory Summary */}
          <Panel>
            <h3 className="text-lg font-semibold text-foreground mb-4">Equipment Inventory</h3>
            <p className="text-sm text-text-secondary mb-3">
              Inventory nuc boxes by status ({inventoryNucs.length} total)
            </p>
            {inventoryNucs.length > 0 ? (
              <div className="space-y-2">
                {equipmentCounts.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <Badge tone={s.tone}>{s.label}</Badge>
                    <span className="text-lg font-semibold text-foreground">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">No inventory nucs registered.</p>
            )}
          </Panel>
        </div>

        {/* Row 2: Utilisation + Mating Success */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NUC Utilisation */}
          <Panel>
            <h3 className="text-lg font-semibold text-foreground mb-4">NUC Utilisation</h3>
            <p className="text-sm text-text-secondary mb-3">
              Percentage of usable inventory nucs currently in use
            </p>
            {totalUsable > 0 ? (
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-foreground">{utilisationPct}%</div>
                <p className="text-sm text-text-secondary mt-2">
                  {activeInventory} in use / {readyInventory} available
                </p>
                <div className="mt-4 w-full bg-surface-elevated rounded-full h-3">
                  <div
                    className="bg-forest-600 h-3 rounded-full transition-all"
                    style={{ width: `${utilisationPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">No usable inventory nucs to calculate utilisation.</p>
            )}
          </Panel>

          {/* Queen Mating Success Rate */}
          <Panel>
            <h3 className="text-lg font-semibold text-foreground mb-4">Queen Mating Success</h3>
            <p className="text-sm text-text-secondary mb-3">
              Successfully mated queens vs total completed setups
            </p>
            {matingSuccessRate !== null ? (
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-foreground">{matingSuccessRate}%</div>
                <p className="text-sm text-text-secondary mt-2">
                  {successfulMatings} successful / {terminatedNucs.length} completed
                </p>
                <div className="mt-4 w-full bg-surface-elevated rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${matingSuccessRate >= 70 ? 'bg-green-600' : matingSuccessRate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${matingSuccessRate}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">No completed mating setups yet.</p>
            )}
          </Panel>
        </div>

        {/* Row 3: Timeline Metrics */}
        <Panel>
          <h3 className="text-lg font-semibold text-foreground mb-4">Timeline Metrics</h3>
          <p className="text-sm text-text-secondary mb-3">
            Average days between key milestones
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-foreground">
                {avgEmergence !== null ? `${avgEmergence} days` : '—'}
              </div>
              <p className="text-sm text-text-secondary mt-1">Setup to Queen Emergence</p>
              {daysToEmergence.length > 0 && (
                <p className="text-xs text-text-tertiary mt-1">Based on {daysToEmergence.length} nucs</p>
              )}
            </div>
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-foreground">
                {avgMating !== null ? `${avgMating} days` : '—'}
              </div>
              <p className="text-sm text-text-secondary mt-1">Setup to Mating Confirmed</p>
              {daysToMating.length > 0 && (
                <p className="text-xs text-text-tertiary mt-1">Based on {daysToMating.length} nucs</p>
              )}
            </div>
          </div>
        </Panel>

        {/* Row 4: Batch Performance */}
        {batchPerformance.length > 0 && (
          <Panel>
            <h3 className="text-lg font-semibold text-foreground mb-4">Batch Performance</h3>
            <p className="text-sm text-text-secondary mb-3">
              NUC outcomes per rearing batch
            </p>
            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {batchPerformance.map(b => (
                <div key={b.batchId} className="bg-surface-elevated rounded-lg p-3 border border-border">
                  <div className="font-medium text-foreground mb-2">{b.batchName}</div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-text-secondary">Total</span>
                      <div className="font-semibold text-foreground">{b.total}</div>
                    </div>
                    <div>
                      <span className="text-text-secondary">Laying</span>
                      <div className="font-semibold text-green-700 dark:text-green-400">{b.laying}</div>
                    </div>
                    <div>
                      <span className="text-text-secondary">Failed</span>
                      <div className="font-semibold text-red-700 dark:text-red-400">{b.failed}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-surface rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${b.successRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground">{b.successRate}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-sm font-medium text-text-secondary">Batch</th>
                    <th className="py-2 px-4 text-sm font-medium text-text-secondary text-right">Total NUCs</th>
                    <th className="py-2 px-4 text-sm font-medium text-text-secondary text-right">Laying</th>
                    <th className="py-2 px-4 text-sm font-medium text-text-secondary text-right">Failed</th>
                    <th className="py-2 px-4 text-sm font-medium text-text-secondary text-right">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {batchPerformance.map(b => (
                    <tr key={b.batchId} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 text-foreground font-medium">{b.batchName}</td>
                      <td className="py-3 px-4 text-foreground text-right">{b.total}</td>
                      <td className="py-3 px-4 text-green-700 dark:text-green-400 text-right">{b.laying}</td>
                      <td className="py-3 px-4 text-red-700 dark:text-red-400 text-right">{b.failed}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-surface-elevated rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${b.successRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground w-10 text-right">{b.successRate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
