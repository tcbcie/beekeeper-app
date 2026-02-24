'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Send, Check, X, CheckSquare, Square, HelpCircle, Lock, LockOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useGraftDistributions } from '@/hooks/useGraftDistributions'
import type { GraftDistribution, BulkDistributionData } from '@/hooks/useGraftDistributions'
import { getQueenColorFromYear } from '@/types/queen'
import DistributeGraftModal from './DistributeGraftModal'

interface Graft {
  id: string
  batch_id: string
  cell_number: number
  status: string
  status_date: string | null
  notes: string | null
  queen_marked: boolean
  queen_number: string | null
}

interface BatchGraftsSectionProps {
  batchId: string
  userId: string
  cellCount: number | null
  frameRows?: number | null
  cellsPerRow?: number | null
  groupId?: string | null
  emergenceDate?: string | null
  onCountsChange?: (counts: { grafts_accepted: number; queens_hatched: number; queens_mated: number }) => void
}

const GRAFT_STATUSES = [
  { value: 'grafted', label: 'Grafted', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'sealed', label: 'Sealed', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  { value: 'caged', label: 'Caged', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'emerged', label: 'Emerged', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'in_nuc', label: 'In Nuc', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { value: 'mated', label: 'Mated', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  { value: 'sold', label: 'Distributed/Sold', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
]

const FRAME_STATUSES = [
  { value: 'grafted', label: 'Grafted', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  { value: 'sealed', label: 'Sealed', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
]

const TABLE_STATUSES = [
  { value: 'sealed', label: 'Sealed', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  { value: 'caged', label: 'Caged', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'emerged', label: 'Emerged', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'in_nuc', label: 'In Nuc', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  { value: 'mated', label: 'Mated', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  { value: 'sold', label: 'Distributed/Sold', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
]

const FRAME_STATUS_VALUES = ['grafted', 'accepted']

const DISTRIBUTABLE_STATUSES = ['sealed', 'emerged', 'mated']

const CUP_COLORS: Record<string, string> = {
  grafted: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  accepted: 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200',
  sealed: 'bg-cyan-200 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200',
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

const COLOUR_DOTS: Record<string, string> = {
  White: 'bg-gray-200 dark:bg-gray-400',
  Yellow: 'bg-yellow-400',
  Red: 'bg-red-500',
  Green: 'bg-green-500',
  Blue: 'bg-blue-500',
}

// Format date to Irish format (DD/MM/YYYY)
const formatDateIrish = (dateString: string | null): string => {
  if (!dateString) return '-'
  const parts = dateString.split('T')[0].split('-')
  if (parts.length !== 3) return dateString
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export default function BatchGraftsSection({ batchId, userId, cellCount, frameRows, cellsPerRow, groupId, emergenceDate, onCountsChange }: BatchGraftsSectionProps) {
  const toast = useToast()
  const [grafts, setGrafts] = useState<Graft[]>([])
  const [loading, setLoading] = useState(true)
  const [distributeGraft, setDistributeGraft] = useState<Graft | null>(null)
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([])
  const [showHelp, setShowHelp] = useState(false)

  // Frame selection state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Table selection state
  const [tableSelectMode, setTableSelectMode] = useState(false)
  const [tableSelectedIds, setTableSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDistributeGrafts, setBulkDistributeGrafts] = useState<Graft[] | null>(null)
  const [unlockedGraftIds, setUnlockedGraftIds] = useState<Set<string>>(new Set())
  const [frameCollapsed, setFrameCollapsed] = useState(false)
  const frameInitialised = useRef(false)
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
      toast.error('Failed to load grafts')
    } else if (data) {
      setGrafts(data)
      // Prune frame selected IDs to only include grafts still on the frame
      setSelectedIds(prev => {
        if (prev.size === 0) return prev
        const frameIds = new Set(data.filter((g: Graft) => FRAME_STATUS_VALUES.includes(g.status)).map((g: Graft) => g.id))
        const pruned = new Set([...prev].filter(id => frameIds.has(id)))
        return pruned.size === prev.size ? prev : pruned
      })
      // Prune table selected IDs to only include grafts still in the table
      setTableSelectedIds(prev => {
        if (prev.size === 0) return prev
        const tableIds = new Set(data.filter((g: Graft) => !FRAME_STATUS_VALUES.includes(g.status)).map((g: Graft) => g.id))
        const pruned = new Set([...prev].filter(id => tableIds.has(id)))
        return pruned.size === prev.size ? prev : pruned
      })
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

  // Prune unlockedGraftIds when distributions change (e.g. after a distribution is deleted)
  useEffect(() => {
    const currentDistributed = new Set(distributions.map(d => d.graft_id))
    setUnlockedGraftIds(prev => {
      const next = new Set([...prev].filter(id => currentDistributed.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [distributions])

  // Reset table select mode when all grafts leave the table
  useEffect(() => {
    const hasTableGrafts = grafts.some(g => !FRAME_STATUS_VALUES.includes(g.status))
    if (!hasTableGrafts && tableSelectMode) {
      setTableSelectMode(false)
      setTableSelectedIds(new Set())
    }
  }, [grafts, tableSelectMode])

  // Auto-collapse frame once on first load if table grafts already exist
  useEffect(() => {
    if (frameInitialised.current || grafts.length === 0) return
    frameInitialised.current = true
    const hasTableGrafts = grafts.some(g => !FRAME_STATUS_VALUES.includes(g.status))
    if (hasTableGrafts) setFrameCollapsed(true)
  }, [grafts])

  // Sync counts to parent when grafts change
  useEffect(() => {
    if (!onCountsChange || loading) return
    if (grafts.length === 0) {
      onCountsChange({ grafts_accepted: 0, queens_hatched: 0, queens_mated: 0 })
      return
    }
    const accepted = grafts.filter(g => !['grafted', 'failed'].includes(g.status)).length
    const hatched = grafts.filter(g => ['emerged', 'in_nuc', 'mated', 'sold'].includes(g.status)).length
    const mated = grafts.filter(g => ['mated', 'sold'].includes(g.status)).length
    onCountsChange({ grafts_accepted: accepted, queens_hatched: hatched, queens_mated: mated })
  }, [grafts, onCountsChange, loading])

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
      ? grafts.reduce((max, g) => g.cell_number > max ? g.cell_number : max, 0) + 1
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
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase
        .from('batch_grafts')
        .update({ status: newStatus, status_date: today })
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

  const updateGraftQueenMarked = async (graftId: string, marked: boolean) => {
    try {
      const { error } = await supabase
        .from('batch_grafts')
        .update({ queen_marked: marked })
        .eq('id', graftId)
      if (error) throw error
      setGrafts(prev => prev.map(g => g.id === graftId ? { ...g, queen_marked: marked } : g))
    } catch (error) {
      console.error('Error updating queen marked:', error)
      toast.error('Failed to update queen marked')
    }
  }

  const updateGraftStatusDate = async (graftId: string, date: string) => {
    try {
      const { error } = await supabase
        .from('batch_grafts')
        .update({ status_date: date || null })
        .eq('id', graftId)
      if (error) throw error
      setGrafts(prev => prev.map(g => g.id === graftId ? { ...g, status_date: date || null } : g))
    } catch (error) {
      console.error('Error updating status date:', error)
      toast.error('Failed to update status date')
    }
  }

  const updateGraftQueenNumber = async (graftId: string, queenNumber: string) => {
    try {
      const { error } = await supabase
        .from('batch_grafts')
        .update({ queen_number: queenNumber || null })
        .eq('id', graftId)
      if (error) throw error
      setGrafts(prev => prev.map(g => g.id === graftId ? { ...g, queen_number: queenNumber || null } : g))
    } catch (error) {
      console.error('Error updating queen number:', error)
      toast.error('Failed to update queen number')
    }
  }

  const handleDistributeSave = async (data: Parameters<typeof createDistribution>[0]) => {
    const success = await createDistribution(data)
    if (success) {
      toast.success('Distribution recorded')
    } else {
      toast.error('This graft has already been distributed')
    }
    // Always refresh to sync UI state
    fetchGrafts()
    fetchDistributions(batchId)
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

  const selectAll = () => setSelectedIds(new Set(grafts.filter(g => FRAME_STATUS_VALUES.includes(g.status)).map((g) => g.id)))
  const deselectAll = () => setSelectedIds(new Set())
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()) }

  // --- Table selection helpers ---
  const toggleTableSelect = (id: string) => {
    setTableSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAllTable = () => {
    const distributedIds = new Set(distributions.map(d => d.graft_id))
    setTableSelectedIds(new Set(
      grafts.filter(g =>
        !FRAME_STATUS_VALUES.includes(g.status) &&
        g.status !== 'failed' &&
        g.status !== 'sold' &&
        !distributedIds.has(g.id)
      ).map(g => g.id)
    ))
  }
  const deselectAllTable = () => setTableSelectedIds(new Set())
  const exitTableSelectMode = () => { setTableSelectMode(false); setTableSelectedIds(new Set()) }

  // --- Bulk handlers (frame) ---
  const handleBulkStatusChange = async (newStatus: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase
        .from('batch_grafts')
        .update({ status: newStatus, status_date: today })
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

  // --- Table bulk handlers ---
  const handleTableBulkStatusChange = async (newStatus: string) => {
    const ids = Array.from(tableSelectedIds)
    if (ids.length === 0) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase
        .from('batch_grafts')
        .update({ status: newStatus, status_date: today })
        .in('id', ids)
      if (error) throw error
      toast.success(`${ids.length} grafts updated to ${newStatus}`)
      fetchGrafts()
      deselectAllTable()
    } catch (error) {
      console.error('Error bulk updating grafts:', error)
      toast.error('Failed to update grafts')
    }
  }

  const handleTableBulkQueenMarked = async (marked: boolean) => {
    const ids = Array.from(tableSelectedIds)
    if (ids.length === 0) return
    try {
      const { error } = await supabase
        .from('batch_grafts')
        .update({ queen_marked: marked })
        .in('id', ids)
      if (error) throw error
      toast.success(`${ids.length} queens ${marked ? 'marked' : 'unmarked'}`)
      fetchGrafts()
      deselectAllTable()
    } catch (error) {
      console.error('Error bulk updating queen marked:', error)
      toast.error('Failed to update queen marked')
    }
  }

  const handleTableBulkDelete = async () => {
    const ids = Array.from(tableSelectedIds)
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
      deselectAllTable()
    } catch (error) {
      console.error('Error bulk deleting grafts:', error)
      toast.error('Failed to delete grafts')
    }
  }

  const handleBulkDistributeSave = async (data: BulkDistributionData) => {
    const success = await createBulkDistributions(data)
    if (success) {
      toast.success(`${data.grafts.length} distributions recorded`)
      fetchGrafts()
      fetchDistributions(batchId)
      setBulkDistributeGrafts(null)
      deselectAllTable()
    } else {
      toast.error('Failed to record distributions. One or more may already be distributed.')
    }
    return success
  }

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading grafts...</div>
  }

  // Summary counts
  const statusCounts = GRAFT_STATUSES.reduce((acc, s) => {
    acc[s.value] = grafts.filter(g => g.status === s.value).length
    return acc
  }, {} as Record<string, number>)

  // Split grafts into frame (grafted/accepted) and table (everything else)
  const frameGrafts = grafts.filter(g => FRAME_STATUS_VALUES.includes(g.status))
  const tableGrafts = grafts.filter(g => !FRAME_STATUS_VALUES.includes(g.status))

  // Set of graft IDs that have been distributed
  const distributedGraftIds = new Set(distributions.map(d => d.graft_id))

  // Marking colour derived from emergence date
  const markingColour = emergenceDate ? getQueenColorFromYear(emergenceDate) : ''
  const emergenceYear = emergenceDate ? new Date(emergenceDate).getFullYear() : null

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">Individual Cells/Grafts</h4>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className={`p-1 rounded-full transition-colors ${showHelp ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' : 'text-text-tertiary hover:text-blue-600'}`}
            title="How this works"
          >
            <HelpCircle size={16} />
          </button>
        </div>
        <div className="flex gap-2">
          {grafts.length > 0 && (
            <button
              type="button"
              onClick={() => { if (selectMode) { exitSelectMode() } else { exitTableSelectMode(); setSelectMode(true) } }}
              className={`px-3 py-1.5 text-sm rounded font-medium flex items-center gap-1 ${
                selectMode
                  ? 'bg-forest-600 text-white hover:bg-forest-700'
                  : 'border border-forest-600 text-forest-600 dark:border-forest-400 dark:text-forest-400 hover:bg-forest-50 dark:hover:bg-forest-950/30'
              }`}
            >
              <CheckSquare size={14} />
              {selectMode ? 'Done' : 'Bulk Actions'}
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

      {/* Help Banner */}
      {showHelp && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 relative">
          <button
            type="button"
            onClick={() => setShowHelp(false)}
            className="absolute top-2 right-2 p-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
          >
            <X size={14} />
          </button>
          <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">How Graft Tracking Works</h5>
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-medium">Grafted</span>
              <span>&rarr;</span>
              <span className="px-2 py-0.5 rounded bg-green-200 dark:bg-green-900 font-medium">Accepted</span>
              <span>&rarr;</span>
              <span className="px-2 py-0.5 rounded bg-cyan-200 dark:bg-cyan-900 font-medium">Sealed</span>
              <span>&rarr;</span>
              <span className="text-text-secondary">moves to table below</span>
            </div>
            <p><strong>Frame</strong> &mdash; tracks cells from grafting through to sealing. Mark cells as <em>Failed</em> if they don&apos;t take. Use <em>Select All</em> + <em>Change Status</em> to advance cells in bulk.</p>
            <p><strong>Queen Tracking Table</strong> &mdash; appears once cells are sealed. Track queen marking, assign queen numbers, change status (Caged &rarr; Emerged &rarr; In Nuc &rarr; Mated), and distribute queen cells or queens.</p>
          </div>
        </div>
      )}

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
            {FRAME_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
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
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Cell Frame</span>
            <button
              type="button"
              onClick={() => setFrameCollapsed(prev => !prev)}
              className="flex items-center gap-1 text-xs text-text-tertiary hover:text-foreground"
            >
              {frameCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {frameCollapsed ? 'Show' : 'Hide'}
            </button>
          </div>
          {!frameCollapsed && (frameGrafts.length === 0 ? (
            <p className="text-sm text-text-tertiary">
              All grafts have progressed beyond the frame stage.
            </p>
          ) : (
          <div className="overflow-x-auto">
          <div className="border-4 border-amber-700 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 min-w-fit">
            {(() => {
              // Organise frame grafts into rows
              let rows: Graft[][]
              if (frameRows && cellsPerRow) {
                rows = Array.from({ length: frameRows }, (_, r) =>
                  frameGrafts.slice(r * cellsPerRow, (r + 1) * cellsPerRow)
                ).filter(row => row.length > 0)
                const shown = frameRows * cellsPerRow
                if (frameGrafts.length > shown) {
                  rows.push(frameGrafts.slice(shown))
                }
              } else {
                rows = [frameGrafts]
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
                          title={`#${graft.cell_number} - ${FRAME_STATUSES.find(s => s.value === graft.status)?.label || graft.status}`}
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
                              {FRAME_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                            <div className="flex gap-0.5">
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
          ))}
        </div>
      )}

      {/* Queen Tracking Table */}
      {tableGrafts.length > 0 && (
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-sm font-semibold text-foreground">Queen Tracking ({tableGrafts.length})</h4>
            <button
              type="button"
              onClick={() => { if (tableSelectMode) { exitTableSelectMode() } else { exitSelectMode(); setTableSelectMode(true) } }}
              className={`px-3 py-1.5 text-sm rounded font-medium flex items-center gap-1 ${
                tableSelectMode
                  ? 'bg-forest-600 text-white hover:bg-forest-700'
                  : 'border border-forest-600 text-forest-600 dark:border-forest-400 dark:text-forest-400 hover:bg-forest-50 dark:hover:bg-forest-950/30'
              }`}
            >
              <CheckSquare size={14} />
              {tableSelectMode ? 'Done' : 'Bulk Actions'}
            </button>
          </div>

          {/* Marking Colour Note */}
          {markingColour && emergenceYear && !isNaN(emergenceYear) && (
            <p className="text-xs text-text-secondary mb-2 flex items-center gap-1.5">
              Marking colour for this batch:
              <span className={`inline-block w-3 h-3 rounded-full ${COLOUR_DOTS[markingColour] || ''}`} />
              <span className="font-semibold">{markingColour}</span>
              ({emergenceYear})
            </p>
          )}

          {/* Table Bulk Action Bar */}
          {tableSelectMode && (
            <div className="flex flex-wrap items-center gap-2 p-3 mb-3 bg-forest-50 dark:bg-forest-950/30 rounded-lg border border-forest-200 dark:border-forest-800">
              <span className="text-sm font-medium text-foreground">{tableSelectedIds.size} selected</span>
              <button type="button" onClick={selectAllTable} className="text-xs text-forest-600 dark:text-forest-400 hover:underline">
                Select All
              </button>
              {tableSelectedIds.size > 0 && (
                <button type="button" onClick={deselectAllTable} className="text-xs text-text-secondary hover:underline">
                  Deselect All
                </button>
              )}
              <span className="text-border">|</span>
              <select
                onChange={(e) => { if (e.target.value) { handleTableBulkStatusChange(e.target.value); e.target.value = '' } }}
                defaultValue=""
                className="px-2 py-1 text-xs border border-border rounded bg-surface text-foreground"
              >
                <option value="" disabled>Change Status...</option>
                {TABLE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleTableBulkQueenMarked(true)}
                disabled={tableSelectedIds.size === 0}
                className="px-2 py-1 text-xs bg-forest-600 text-white rounded hover:bg-forest-700 disabled:opacity-50"
              >
                Mark All
              </button>
              <button
                type="button"
                onClick={() => handleTableBulkQueenMarked(false)}
                disabled={tableSelectedIds.size === 0}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-foreground rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Unmark All
              </button>
              {tableSelectedIds.size > 0 && Array.from(tableSelectedIds).every(id => {
                const g = grafts.find(gr => gr.id === id)
                return g && DISTRIBUTABLE_STATUSES.includes(g.status)
              }) && (
                <button
                  type="button"
                  onClick={() => {
                    const selected = grafts.filter(g => tableSelectedIds.has(g.id))
                    setBulkDistributeGrafts(selected)
                  }}
                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
                >
                  <Send size={12} />
                  Distribute
                </button>
              )}
              <button
                type="button"
                onClick={handleTableBulkDelete}
                disabled={tableSelectedIds.size === 0}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          )}

          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-sage-50 dark:bg-slate-800">
                <tr>
                  {tableSelectMode && <th className="px-2 py-2 w-8" />}
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Cell #</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Last Update</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Queen Marked</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Queen Number</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tableGrafts.map(graft => {
                  const isDistributed = distributedGraftIds.has(graft.id) || graft.status === 'sold'
                  const isLockedByFailed = graft.status === 'failed'
                  const isLocked = (isDistributed || isLockedByFailed) && !unlockedGraftIds.has(graft.id)
                  return (
                    <tr key={graft.id} className={`hover:bg-sage-50 dark:hover:bg-slate-800 ${tableSelectedIds.has(graft.id) ? 'ring-1 ring-inset ring-forest-500 bg-forest-50/50 dark:bg-forest-950/20' : ''} ${isLocked ? 'opacity-60' : ''}`}>
                      {tableSelectMode && (
                        <td className="px-2 py-2">
                          {!isLocked && (
                            <button type="button" onClick={() => toggleTableSelect(graft.id)}>
                              {tableSelectedIds.has(graft.id)
                                ? <CheckSquare size={16} className="text-forest-600 dark:text-forest-400" />
                                : <Square size={16} className="text-text-tertiary" />
                              }
                            </button>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2 text-sm font-medium text-foreground">#{graft.cell_number}</td>
                      <td className="px-3 py-2">
                        {isLocked ? (
                          isLockedByFailed ? (
                            <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 font-medium">
                              Failed
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-medium">
                              Distributed
                            </span>
                          )
                        ) : (
                          <select
                            value={graft.status}
                            onChange={(e) => updateGraftStatus(graft.id, e.target.value)}
                            className="px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
                          >
                            {TABLE_STATUSES.map(s => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isLocked ? (
                          <span className="text-xs text-text-secondary">{graft.status_date ? formatDateIrish(graft.status_date) : '-'}</span>
                        ) : (
                          <input
                            key={`${graft.id}-sd-${graft.status_date ?? ''}`}
                            type="date"
                            defaultValue={graft.status_date || ''}
                            onChange={(e) => updateGraftStatusDate(graft.id, e.target.value)}
                            className="w-32 px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={graft.queen_marked}
                          onChange={(e) => updateGraftQueenMarked(graft.id, e.target.checked)}
                          className="h-4 w-4 rounded border-border text-forest-600 focus:ring-forest-500"
                          disabled={isLocked}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {isLocked ? (
                          <span className="text-xs text-text-secondary">{graft.queen_number || '-'}</span>
                        ) : (
                          <input
                            key={`${graft.id}-qn-${graft.queen_number ?? ''}`}
                            type="text"
                            defaultValue={graft.queen_number || ''}
                            onBlur={(e) => {
                              const val = e.target.value.trim()
                              if (val !== (graft.queen_number || '')) {
                                updateGraftQueenNumber(graft.id, val)
                              }
                            }}
                            placeholder="Enter number..."
                            className="w-28 px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-1 justify-end items-center">
                          {(isDistributed || isLockedByFailed) && (
                            <button
                              type="button"
                              onClick={() => setUnlockedGraftIds(prev => {
                                const next = new Set(prev)
                                if (next.has(graft.id)) next.delete(graft.id)
                                else next.add(graft.id)
                                return next
                              })}
                              className="p-1.5 text-text-tertiary hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                              title={isLocked ? 'Unlock row' : 'Lock row'}
                            >
                              {isLocked ? <Lock size={14} /> : <LockOpen size={14} />}
                            </button>
                          )}
                          {!isLocked && !distLoading && DISTRIBUTABLE_STATUSES.includes(graft.status) && !isDistributed && (
                            <button
                              type="button"
                              onClick={() => setDistributeGraft(graft)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                              title="Distribute"
                            >
                              <Send size={14} />
                            </button>
                          )}
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={() => deleteGraft(graft.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {tableGrafts.map(graft => {
              const statusInfo = GRAFT_STATUSES.find(s => s.value === graft.status)
              const isDistributed = distributedGraftIds.has(graft.id) || graft.status === 'sold'
              const isLockedByFailed = graft.status === 'failed'
              const isLocked = (isDistributed || isLockedByFailed) && !unlockedGraftIds.has(graft.id)
              return (
                <div key={graft.id} className={`p-3 bg-surface-elevated rounded-lg border border-border space-y-2 ${tableSelectedIds.has(graft.id) ? 'ring-1 ring-forest-500 bg-forest-50/50 dark:bg-forest-950/20' : ''} ${isLocked ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {tableSelectMode && !isLocked && (
                        <button type="button" onClick={() => toggleTableSelect(graft.id)}>
                          {tableSelectedIds.has(graft.id)
                            ? <CheckSquare size={16} className="text-forest-600 dark:text-forest-400" />
                            : <Square size={16} className="text-text-tertiary" />
                          }
                        </button>
                      )}
                      <span className="text-sm font-medium text-foreground">Cell #{graft.cell_number}</span>
                    </div>
                    {isLocked ? (
                      isLockedByFailed ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                          Failed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                          Distributed
                        </span>
                      )
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo?.color || ''}`}>
                        {statusInfo?.label || graft.status}
                      </span>
                    )}
                  </div>
                  {!isLocked && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-secondary">Status</label>
                        <select
                          value={graft.status}
                          onChange={(e) => updateGraftStatus(graft.id, e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
                        >
                          {TABLE_STATUSES.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-secondary">Last Update</label>
                        <input
                          key={`${graft.id}-sd-${graft.status_date ?? ''}`}
                          type="date"
                          defaultValue={graft.status_date || ''}
                          onChange={(e) => updateGraftStatusDate(graft.id, e.target.value)}
                          className="w-32 px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-text-secondary">Queen Marked</label>
                        <input
                          type="checkbox"
                          checked={graft.queen_marked}
                          onChange={(e) => updateGraftQueenMarked(graft.id, e.target.checked)}
                          className="h-4 w-4 rounded border-border text-forest-600 focus:ring-forest-500"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs text-text-secondary shrink-0">Queen Number</label>
                        <input
                          key={`${graft.id}-qn-${graft.queen_number ?? ''}`}
                          type="text"
                          defaultValue={graft.queen_number || ''}
                          onBlur={(e) => {
                            const val = e.target.value.trim()
                            if (val !== (graft.queen_number || '')) {
                              updateGraftQueenNumber(graft.id, val)
                            }
                          }}
                          placeholder="Enter number..."
                          className="w-28 px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-1 pt-1 border-t border-border items-center">
                    {(isDistributed || isLockedByFailed) && (
                      <button
                        type="button"
                        onClick={() => setUnlockedGraftIds(prev => {
                          const next = new Set(prev)
                          if (next.has(graft.id)) next.delete(graft.id)
                          else next.add(graft.id)
                          return next
                        })}
                        className="px-2 py-1 text-xs text-text-tertiary hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-1"
                      >
                        {isLocked ? <Lock size={12} /> : <LockOpen size={12} />}
                        {isLocked ? 'Unlock' : 'Lock'}
                      </button>
                    )}
                    {!isLocked && !distLoading && DISTRIBUTABLE_STATUSES.includes(graft.status) && !isDistributed && (
                      <button
                        type="button"
                        onClick={() => setDistributeGraft(graft)}
                        className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded flex items-center gap-1"
                      >
                        <Send size={12} />
                        Distribute
                      </button>
                    )}
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => deleteGraft(graft.id)}
                        className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Distribution List */}
      {!distLoading && distributions.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-semibold text-foreground mb-3">Distributions ({distributions.length})</h4>
          <div className="space-y-2">
            {distributions.map((dist) => {
              const distTypeInfo = TYPE_LABELS[dist.distribution_type] || TYPE_LABELS.queen_cell || { label: 'Unknown', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
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
                    {dist.recipient_apiary_name && (dist.recipient_apiary_grid_reference || dist.recipient_apiary_elevation != null || dist.recipient_apiary_latitude != null) && (
                      <div className="text-xs text-text-tertiary mt-0.5">
                        {[
                          dist.recipient_apiary_grid_reference,
                          dist.recipient_apiary_elevation != null ? `${dist.recipient_apiary_elevation}m` : null,
                          (dist.recipient_apiary_latitude != null && dist.recipient_apiary_longitude != null)
                            ? `${dist.recipient_apiary_latitude.toFixed(4)}, ${dist.recipient_apiary_longitude.toFixed(4)}`
                            : null,
                        ].filter(Boolean).join(' \u2022 ')}
                      </div>
                    )}
                    {dist.mating_confirmed && dist.mating_confirmed_date && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        Mated: {formatDateIrish(dist.mating_confirmed_date)}
                      </div>
                    )}
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
                        title={dist.mating_confirmed ? `Mating confirmed ${dist.mating_confirmed_date ? formatDateIrish(dist.mating_confirmed_date) : ''}`.trim() : 'Confirm mating'}
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
      {distributeGraft && grafts.some(g => g.id === distributeGraft.id) && (
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

      {/* Distribute Modal (bulk from table) */}
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
          bulkGrafts={bulkDistributeGrafts.map(g => ({ id: g.id, status: g.status, cell_number: g.cell_number }))}
          onBulkSave={handleBulkDistributeSave}
        />
      )}

    </div>
  )
}
