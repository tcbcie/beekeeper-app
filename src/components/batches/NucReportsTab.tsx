'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import Panel from '@/components/ui/Panel'
import { AlertTriangle, BarChart3 } from 'lucide-react'

interface NucReportsTabProps {
  userId: string
}

interface NucRecord {
  id: string
  status: string
  is_inventory: boolean
  equipment_status: string | null
  batch_id: string | null
  setup_date: string | null
  retired_at: string | null
  queen_emerged_at: string | null
  mating_confirmed_at: string | null
  cell_introduced_at: string | null
  rearing_batches: { id: string; batch_name: string } | null
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
  sold: 'Sold',
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

export default function NucReportsTab({ userId }: NucReportsTabProps) {
  const [loading, setLoading] = useState(true)
  const [nucs, setNucs] = useState<NucRecord[]>([])
  const [fetchError, setFetchError] = useState(false)

  const fetchNucs = useCallback(async () => {
    setLoading(true)
    setFetchError(false)
    const { data, error } = await supabase
      .from('mating_nucs')
      .select('id, status, is_inventory, equipment_status, batch_id, setup_date, retired_at, queen_emerged_at, mating_confirmed_at, cell_introduced_at, rearing_batches(id, batch_name)')
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to load NUC report data:', error)
      setFetchError(true)
      setLoading(false)
      return
    }

    // PostgREST joins with explicit selects return arrays; normalise to single object
    setNucs((data || []).map(n => {
      const rb = Array.isArray(n.rearing_batches) ? n.rearing_batches[0] : n.rearing_batches
      return { ...n, rearing_batches: rb ?? null } as NucRecord
    }))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchNucs()
  }, [fetchNucs])

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

  // --- Derived data ---

  // Split into mating nucs (active setups) and inventory nucs
  const matingNucs = nucs.filter(n => !n.is_inventory)
  const inventoryNucs = nucs.filter(n => n.is_inventory)

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

  return (
    <div className="space-y-6">
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
              {/* Simple bar */}
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
  )
}
