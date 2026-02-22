'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, RefreshCw, Send, Check, X, CheckSquare, Square } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useGraftDistributions } from '@/hooks/useGraftDistributions'
import type { GraftDistribution, BulkDistributionData } from '@/hooks/useGraftDistributions'
import DistributeGraftModal from './DistributeGraftModal'

interface Graft {
  id: string
  batch_id: string
  cell_number: number
  status: string
  notes: string | null
}

interface BatchGraftsSectionProps {
  batchId: string
  userId: string
  cellCount: number | null
  frameRows?: number | null
  cellsPerRow?: number | null
  groupId?: string | null
  batchCounters?: { grafts_accepted: number | null; queens_hatched: number | null; queens_mated: number | null }
}

const GRAFT_STATUSES = [
  { value: 'grafted', label: 'Grafted', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'caged', label: 'Caged', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'emerged', label: 'Emerged', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'in_nuc', label: 'In Nuc', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { value: 'mated', label: 'Mated', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  { value: 'sold', label: 'Sold', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
]

const DISTRIBUTABLE_STATUSES = ['emerged', 'in_nuc', 'mated']

const CUP_COLORS: Record<string, string> = {
  grafted: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  accepted: 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200',
  caged: 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  emerged: 'bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
  in_nuc: 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
  mated: 'bg-teal-200 dark:bg-teal-900 text-teal-800 dark:text-teal-200',
  failed: 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200',
  sold: 'bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  queen_cell: { label: 'Queen Cell', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  virgin_queen: { label: 'Virgin Queen', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  mated_queen: { label: 'Mated Queen', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
}

// Format date to Irish format (DD/MM/YYYY)
const formatDateIrish = (dateString: string | null): string => {
  if (!dateString) return '-'
  const parts = dateString.split('-')
  if (parts.length !== 3) return dateString
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export default function BatchGraftsSection({ batchId, userId, cellCount, frameRows, cellsPerRow, groupId, batchCounters }: BatchGraftsSectionProps) {
  const toast = useToast()
  const [grafts, setGrafts] = useState<Graft[]>([])
  const [loading, setLoading] = useState(true)
  const [distributeGraft, setDistributeGraft] = useState<Graft | null>(null)
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([])

  // Selection state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // Bulk distribute modal state
  const [bulkDistributeGrafts, setBulkDistributeGrafts] = useState<Graft[] | null>(null)

  const {
    distributions,
    loading: distLoading,
    fetchDistributions,
    createDistribution,
    createBulkDistributions,
    deleteDistribution,
    toggleMatingConfirmed,
    searchUsers,
    fetchRecipientApiaries,
    fetchRecipientHives,
  } = useGraftDistributions()

  const fetchGrafts = useCallback(async () => {
    const { data, error } = await supabase
      .from('batch_grafts')
      .select('*')
      .eq('batch_id', batchId)
      .eq('user_id', userId)
      .order('cell_number')

    if (error) {
      console.error('Error fetching grafts:', error)
    } else if (data) {
      setGrafts(data)
    }
    setLoading(false)
  }, [batchId, userId])

  // Fetch group member IDs for the "Group" badge in the modal
  useEffect(() => {
    if (!groupId) return
    supabase
      .from('rearing_group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .then(
        ({ data }) => {
          if (data) setGroupMemberIds(data.map((m) => m.user_id))
        },
        (err) => {
          console.error('Error fetching group members:', err)
        }
      )
  }, [groupId])

  useEffect(() => {
    fetchGrafts()
    fetchDistributions(batchId)
  }, [fetchGrafts, fetchDistributions, batchId])

  const generateGrafts = async () => {
    if (!cellCount || cellCount <= 0) {
      toast.error('Set cell count first')
      return
    }

    if (grafts.length > 0) {
      if (!confirm(`This will add ${cellCount} new grafts. Existing grafts will be kept. Continue?`)) {
        return
      }
    }

    const newGrafts = []
    const nextNumber = grafts.length > 0
      ? Math.max(...grafts.map(g => g.cell_number)) + 1
      : 1

    for (let i = 0; i < cellCount; i++) {
      newGrafts.push({
        batch_id: batchId,
        cell_number: nextNumber + i,
        status: 'grafted',
        user_id: userId,
      })
    }

    try {
      const { error } = await supabase
        .from('batch_grafts')
        .insert(newGrafts)

      if (error) throw error
      toast.success(`${cellCount} grafts created`)
      fetchGrafts()
    } catch (error) {
      console.error('Error creating grafts:', error)
      toast.error('Failed to create grafts')
    }
  }

  const updateGraftStatus = async (graftId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('batch_grafts')
        .update({ status: newStatus })
        .eq('id', graftId)

      if (error) throw error
      fetchGrafts()
    } catch (error) {
      console.error('Error updating graft:', error)
      toast.error('Failed to update graft')
    }
  }

  const deleteGraft = async (graftId: string) => {
    if (!confirm('Delete this graft?')) return

    try {
      const { error } = await supabase
        .from('batch_grafts')
        .delete()
        .eq('id', graftId)

      if (error) throw error
      toast.success('Graft deleted')
      fetchGrafts()
    } catch (error) {
      console.error('Error deleting graft:', error)
      toast.error('Failed to delete graft')
    }
  }

  const handleDistributeSave = async (data: Parameters<typeof createDistribution>[0]) => {
    const success = await createDistribution(data)
    if (success) {
      toast.success('Distribution recorded')
      fetchGrafts()
      fetchDistributions(batchId)
    } else {
      toast.error('Failed to record distribution')
    }
    return success
  }

  const handleDeleteDistribution = async (dist: GraftDistribution) => {
    if (!confirm(`Remove distribution for Cell #${dist.cell_number}?`)) return
    const success = await deleteDistribution(dist.id, dist.graft_id, dist.previous_graft_status || 'mated')
    if (success) {
      toast.success('Distribution removed')
      fetchGrafts()
      fetchDistributions(batchId)
    } else {
      toast.error('Failed to remove distribution')
    }
  }

  const handleToggleMating = async (dist: GraftDistribution) => {
    const success = await toggleMatingConfirmed(dist.id, !dist.mating_confirmed)
    if (success) {
      fetchDistributions(batchId)
    } else {
      toast.error('Failed to update mating status')
    }
  }

  // --- Selection helpers ---
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(grafts.map((g) => g.id)))
  const deselectAll = () => setSelectedIds(new Set())
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()) }

  // --- Bulk handlers ---
  const handleBulkStatusChange = async (newStatus: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      const { error } = await supabase
        .from('batch_grafts')
        .update({ status: newStatus })
        .in('id', ids)
      if (error) throw error
      toast.success(`${ids.length} grafts updated to ${newStatus}`)
      fetchGrafts()
      deselectAll()
    } catch (error) {
      console.error('Error bulk updating grafts:', error)
      toast.error('Failed to update grafts')
    }
  }

  const handleBulkDistribute = () => {
    const selected = grafts.filter(
      (g) => selectedIds.has(g.id) && DISTRIBUTABLE_STATUSES.includes(g.status) && g.status !== 'sold'
    )
    if (selected.length === 0) {
      toast.error('No distributable grafts selected')
      return
    }
    setBulkDistributeGrafts(selected)
  }

  const handleBulkDistributeSave = async (data: BulkDistributionData) => {
    const success = await createBulkDistributions(data)
    if (success) {
      toast.success(`${data.grafts.length} distributions recorded`)
      fetchGrafts()
      fetchDistributions(batchId)
      deselectAll()
    } else {
      toast.error('Failed to record distributions')
    }
    return success
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} selected grafts? This cannot be undone.`)) return
    try {
      const { error } = await supabase
        .from('batch_grafts')
        .delete()
        .in('id', ids)
      if (error) throw error
      toast.success(`${ids.length} grafts deleted`)
      fetchGrafts()
      fetchDistributions(batchId)
      deselectAll()
    } catch (error) {
      console.error('Error bulk deleting grafts:', error)
      toast.error('Failed to delete grafts')
    }
  }

  // --- Sync from counters ---
  const handleSyncFromCounters = async () => {
    if (!batchCounters) return
    const { grafts_accepted, queens_hatched, queens_mated } = batchCounters
    const accepted = grafts_accepted || 0
    const hatched = queens_hatched || 0
    const mated = queens_mated || 0

    // Filter out locked statuses, sort by cell_number
    const assignable = grafts
      .filter((g) => g.status !== 'failed' && g.status !== 'sold')
      .sort((a, b) => a.cell_number - b.cell_number)

    if (assignable.length === 0) {
      toast.error('No assignable grafts (all failed or sold)')
      return
    }

    // Build assignment plan
    const plan: Record<string, string[]> = { mated: [], emerged: [], accepted: [], grafted: [] }
    let idx = 0
    // First N → mated
    for (let i = 0; i < mated && idx < assignable.length; i++, idx++) {
      plan.mated.push(assignable[idx].id)
    }
    // Next (hatched - mated) → emerged
    for (let i = 0; i < (hatched - mated) && idx < assignable.length; i++, idx++) {
      plan.emerged.push(assignable[idx].id)
    }
    // Next (accepted - hatched) → accepted
    for (let i = 0; i < (accepted - hatched) && idx < assignable.length; i++, idx++) {
      plan.accepted.push(assignable[idx].id)
    }
    // Remainder → grafted
    for (; idx < assignable.length; idx++) {
      plan.grafted.push(assignable[idx].id)
    }

    const summary = Object.entries(plan)
      .filter(([, ids]) => ids.length > 0)
      .map(([status, ids]) => `${ids.length} → ${status}`)
      .join(', ')

    if (!confirm(`Sync statuses from batch counters?\n\n${summary}\n\n(Failed and sold grafts are unchanged)`)) return

    try {
      for (const [status, ids] of Object.entries(plan)) {
        if (ids.length === 0) continue
        const { error } = await supabase
          .from('batch_grafts')
          .update({ status })
          .in('id', ids)
        if (error) throw error
      }
      toast.success('Statuses synced from counters')
      fetchGrafts()
    } catch (error) {
      console.error('Error syncing from counters:', error)
      toast.error('Failed to sync statuses')
    }
  }

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading grafts...</div>
  }

  // Summary counts
  const statusCounts = GRAFT_STATUSES.reduce((acc, s) => {
    acc[s.value] = grafts.filter(g => g.status === s.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold text-foreground">Individual Cells/Grafts</h4>
        <div className="flex gap-2">
          {grafts.length > 0 && (
            <button
              type="button"
              onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
                selectMode
                  ? 'bg-forest-600 text-white hover:bg-forest-700'
                  : 'bg-gray-200 dark:bg-gray-700 text-foreground hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <CheckSquare size={14} />
              {selectMode ? 'Done' : 'Select'}
            </button>
          )}
          <button
            type="button"
            onClick={generateGrafts}
            className="px-3 py-1.5 text-sm bg-forest-600 text-white rounded hover:bg-forest-700 flex items-center gap-1"
          >
            <Plus size={14} />
            Generate from Cell Count
          </button>
        </div>
      </div>

      {/* Status Summary */}
      {grafts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {GRAFT_STATUSES.filter(s => statusCounts[s.value] > 0).map(s => (
            <span key={s.value} className={`px-2 py-1 rounded text-xs font-medium ${s.color}`}>
              {s.label}: {statusCounts[s.value]}
            </span>
          ))}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectMode && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-forest-50 dark:bg-forest-950/30 rounded-lg border border-forest-200 dark:border-forest-800">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          <button type="button" onClick={selectAll} className="text-xs text-forest-600 dark:text-forest-400 hover:underline">
            Select All
          </button>
          {selectedIds.size > 0 && (
            <button type="button" onClick={deselectAll} className="text-xs text-text-secondary hover:underline">
              Deselect All
            </button>
          )}
          <span className="text-border">|</span>
          <select
            onChange={(e) => { if (e.target.value) { handleBulkStatusChange(e.target.value); e.target.value = '' } }}
            defaultValue=""
            className="px-2 py-1 text-xs border border-border rounded bg-surface text-foreground"
          >
            <option value="" disabled>Change Status...</option>
            {GRAFT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleBulkDistribute}
            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
          >
            <Send size={12} />
            Distribute
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}

      {/* Grafts Frame Visualisation */}
      {grafts.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          No grafts yet. Click &quot;Generate from Cell Count&quot; to create grafts based on your cell count.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="border-4 border-amber-700 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 min-w-fit">
            {(() => {
              // Organise grafts into rows
              let rows: Graft[][]
              if (frameRows && cellsPerRow) {
                rows = Array.from({ length: frameRows }, (_, r) =>
                  grafts.slice(r * cellsPerRow, (r + 1) * cellsPerRow)
                ).filter(row => row.length > 0)
                // Include any overflow grafts beyond frameRows × cellsPerRow
                const shown = frameRows * cellsPerRow
                if (grafts.length > shown) {
                  rows.push(grafts.slice(shown))
                }
              } else {
                rows = [grafts] // fallback: single row
              }

              return rows.map((rowGrafts, rowIdx) => (
                <div key={rowIdx} className={rowIdx > 0 ? 'mt-4' : ''}>
                  {/* Horizontal bar */}
                  <div className="h-2 bg-amber-600 dark:bg-amber-700 rounded mx-2" />
                  {/* Cell cups hanging below */}
                  <div className="flex justify-between pt-1 px-2">
                    {rowGrafts.map(graft => (
                      <div key={graft.id} className="flex flex-col items-center flex-1 min-w-0">
                        {/* Connector line */}
                        <div className="w-0.5 h-2 bg-amber-600 dark:bg-amber-700" />
                        {/* Select checkbox above cup */}
                        {selectMode && (
                          <div className="mb-0.5">
                            {selectedIds.has(graft.id)
                              ? <CheckSquare size={12} className="text-forest-600 dark:text-forest-400" />
                              : <Square size={12} className="text-text-tertiary" />
                            }
                          </div>
                        )}
                        {/* Cup */}
                        <button
                          type="button"
                          onClick={selectMode ? () => toggleSelect(graft.id) : undefined}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            CUP_COLORS[graft.status] || 'bg-gray-200 text-gray-700'
                          } ${selectMode ? 'cursor-pointer' : ''} ${
                            selectedIds.has(graft.id)
                              ? 'ring-2 ring-forest-500 ring-offset-1'
                              : ''
                          }`}
                          title={`#${graft.cell_number} - ${GRAFT_STATUSES.find(s => s.value === graft.status)?.label || graft.status}`}
                        >
                          {graft.cell_number}
                        </button>
                        {/* Status dropdown + actions (when not in select mode) */}
                        {!selectMode && (
                          <div className="flex flex-col items-center mt-1 gap-0.5">
                            <select
                              value={graft.status}
                              onChange={(e) => updateGraftStatus(graft.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-16 px-0 py-0.5 text-[10px] rounded border border-border bg-surface text-foreground text-center"
                            >
                              {GRAFT_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                            <div className="flex gap-0.5">
                              {DISTRIBUTABLE_STATUSES.includes(graft.status) && (
                                <button
                                  type="button"
                                  onClick={() => setDistributeGraft(graft)}
                                  className="p-0.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                                  title="Distribute"
                                >
                                  <Send size={10} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteGraft(graft.id)}
                                className="p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="Delete"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {grafts.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => fetchGrafts()}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          {batchCounters && (
            <button
              type="button"
              onClick={handleSyncFromCounters}
              className="px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded flex items-center gap-1"
            >
              <RefreshCw size={14} />
              Sync from Counters
            </button>
          )}
        </div>
      )}

      {/* Distribution List */}
      {!distLoading && distributions.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-foreground mb-3">Distributions ({distributions.length})</h4>
          <div className="space-y-2">
            {distributions.map((dist) => {
              const distTypeInfo = TYPE_LABELS[dist.distribution_type] || TYPE_LABELS.queen_cell
              return (
                <div
                  key={dist.id}
                  className="flex items-center gap-3 p-3 bg-surface-elevated dark:bg-surface-elevated rounded-lg border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        Cell #{dist.cell_number}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${distTypeInfo.color}`}>
                        {distTypeInfo.label}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      To: {dist.recipient_name || dist.recipient_email || 'Unknown'}
                      {dist.recipient_apiary_name && ` \u2022 ${dist.recipient_apiary_name}`}
                      {dist.recipient_hive_number && ` \u2022 Hive ${dist.recipient_hive_number}`}
                      {' \u2022 '}{formatDateIrish(dist.distribution_date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {dist.distribution_type !== 'mated_queen' && (
                      <button
                        type="button"
                        onClick={() => handleToggleMating(dist)}
                        className={`p-1.5 rounded text-xs ${
                          dist.mating_confirmed
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                        title={dist.mating_confirmed ? 'Mating confirmed' : 'Confirm mating'}
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteDistribution(dist)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Remove distribution"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Distribute Modal (single) */}
      {distributeGraft && (
        <DistributeGraftModal
          graftId={distributeGraft.id}
          batchId={batchId}
          cellNumber={distributeGraft.cell_number}
          graftStatus={distributeGraft.status}
          userId={userId}
          groupMemberIds={groupMemberIds}
          searchUsers={searchUsers}
          fetchRecipientApiaries={fetchRecipientApiaries}
          fetchRecipientHives={fetchRecipientHives}
          onSave={handleDistributeSave}
          onClose={() => setDistributeGraft(null)}
        />
      )}

      {/* Distribute Modal (bulk) */}
      {bulkDistributeGrafts && bulkDistributeGrafts.length > 0 && (
        <DistributeGraftModal
          graftId={bulkDistributeGrafts[0].id}
          batchId={batchId}
          cellNumber={bulkDistributeGrafts[0].cell_number}
          graftStatus={bulkDistributeGrafts[0].status}
          userId={userId}
          groupMemberIds={groupMemberIds}
          searchUsers={searchUsers}
          fetchRecipientApiaries={fetchRecipientApiaries}
          fetchRecipientHives={fetchRecipientHives}
          onSave={handleDistributeSave}
          onClose={() => setBulkDistributeGrafts(null)}
          bulkGrafts={bulkDistributeGrafts.map((g) => ({ id: g.id, status: g.status, cell_number: g.cell_number }))}
          onBulkSave={handleBulkDistributeSave}
        />
      )}
    </div>
  )
}
