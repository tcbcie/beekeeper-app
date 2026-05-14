'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useGraftDistributions } from '@/hooks/useGraftDistributions'
import type { GraftDistribution, BulkDistributionData } from '@/hooks/useGraftDistributions'
import { getQueenColorFromYear } from '@/types/queen'
import { Graft, GRAFT_STATUSES, FRAME_STATUS_VALUES } from '@/components/batches/graftConstants'

const VALID_GRAFT_STATUS_VALUES = GRAFT_STATUSES.map(s => s.value)

interface UseBatchGraftsProps {
  batchId: string
  userId: string
  cellCount: number | null
  groupId?: string | null
  emergenceDate?: string | null
  graftDate?: string | null
  onCountsChange?: (counts: { grafts_accepted: number; queens_hatched: number; queens_mated: number }) => void
}

export function useBatchGrafts({ batchId, userId, cellCount, groupId, emergenceDate, graftDate, onCountsChange }: UseBatchGraftsProps) {
  const toast = useToast()
  const [grafts, setGrafts] = useState<Graft[]>([])
  // Sets aggregate signal across multiple nuc rows per graft. mating_nucs has no
  // UNIQUE constraint on graft_id, so a graft can legitimately have several rows
  // (e.g. retired + active). Using sets means any non-null timestamp wins.
  const [hatchedViaNuc, setHatchedViaNuc] = useState<Set<string>>(new Set())
  const [matedViaNuc, setMatedViaNuc] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [distributeGraft, setDistributeGraft] = useState<Graft | null>(null)
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([])
  const [showHelp, setShowHelp] = useState(false)

  // Stable ref for onCountsChange to avoid infinite re-render loops
  const onCountsChangeRef = useRef(onCountsChange)
  onCountsChangeRef.current = onCountsChange

  // Frame selection state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatusDraft, setBulkStatusDraft] = useState('')
  const [bulkDateDraft, setBulkDateDraft] = useState('')
  const [bulkDateTouched, setBulkDateTouched] = useState(false)
  const [savingFrameBulkEdits, setSavingFrameBulkEdits] = useState(false)

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
    confirmMatingWithLocation,
    clearMatingConfirmation,
    searchUsers,
    fetchRecipientApiaries,
    fetchRecipientHives,
  } = useGraftDistributions()

  // --- Data fetching ---

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
      // Fetch latest weights and nuc timestamps in parallel. Filtering mating_nucs by
      // batch_id (rather than graft_id IN …) keeps the URL bounded and picks up nucs
      // that were created without a graft link, harmlessly.
      type NucRow = { graft_id: string | null; queen_emerged_at: string | null; mating_confirmed_at: string | null }
      const graftIds = (data as Graft[]).map(g => g.id)
      const weightMap = new Map<string, number>()
      const nextHatched = new Set<string>()
      const nextMated = new Set<string>()
      if (graftIds.length > 0) {
        const [weightsRes, nucsRes] = await Promise.all([
          supabase
            .from('queen_weights')
            .select('graft_id, weight_mg')
            .in('graft_id', graftIds)
            .order('weighed_at', { ascending: false }),
          supabase
            .from('mating_nucs')
            .select('graft_id, queen_emerged_at, mating_confirmed_at')
            .eq('batch_id', batchId),
        ])
        // Fail loud: persisting `queens_hatched` from a partial nuc result would write
        // an under-reported counter back to rearing_batches. Bail before the persist
        // effect runs (loading stays true so the effect's guard short-circuits).
        if (nucsRes.error) {
          console.error('Error fetching mating nuc timestamps:', nucsRes.error)
          toast.error('Failed to load nuc data')
          return
        }
        if (weightsRes.data) {
          for (const w of weightsRes.data) {
            if (!weightMap.has(w.graft_id)) {
              weightMap.set(w.graft_id, w.weight_mg)
            }
          }
        }
        for (const n of (nucsRes.data || []) as NucRow[]) {
          if (!n.graft_id) continue
          if (n.queen_emerged_at || n.mating_confirmed_at) nextHatched.add(n.graft_id)
          if (n.mating_confirmed_at) nextMated.add(n.graft_id)
        }
      }
      const graftsWithWeights = (data as Graft[]).map(g => ({
        ...g,
        latest_weight_mg: weightMap.get(g.id) ?? null,
      }))
      setGrafts(graftsWithWeights)
      setHatchedViaNuc(nextHatched)
      setMatedViaNuc(nextMated)
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
  }, [batchId, userId, toast])

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

  // Prune unlockedGraftIds when distributions change
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

  // Sync counts to parent and persist to DB when grafts change
  const lastPersistedCounts = useRef<string>('')
  useEffect(() => {
    if (loading) return
    const accepted = grafts.length === 0 ? 0 : grafts.filter(g => !['grafted', 'failed'].includes(g.status)).length
    const distributionByGraftId = new Map(distributions.map((distribution) => [distribution.graft_id, distribution]))

    // A graft counts as "hatched" when its status is emerged/mated, when a sold graft
    // was distributed as a virgin or mated queen, or when its linked mating_nuc has a
    // queen_emerged_at / mating_confirmed_at timestamp (set by inspection). 'in_nuc'
    // on its own is NOT a hatched signal — sealed cells get that status on transfer.
    const isHatched = (graft: Graft): boolean => {
      if (graft.status === 'sold') {
        const dist = distributionByGraftId.get(graft.id)
        if (!dist) return false
        if (dist.distribution_type === 'virgin_queen' || dist.distribution_type === 'mated_queen') return true
        if (dist.mating_confirmed) return true
        return false
      }
      if (graft.status === 'emerged' || graft.status === 'mated') return true
      return hatchedViaNuc.has(graft.id)
    }

    const isMated = (graft: Graft): boolean => {
      if (graft.status === 'mated') return true
      if (graft.status === 'sold') {
        const dist = distributionByGraftId.get(graft.id)
        if (!dist) return false
        return dist.distribution_type === 'mated_queen' || !!dist.mating_confirmed
      }
      return matedViaNuc.has(graft.id)
    }

    const hatched = grafts.length === 0 ? 0 : grafts.filter(isHatched).length
    const mated = grafts.length === 0 ? 0 : grafts.filter(isMated).length

    const cb = onCountsChangeRef.current
    if (cb) cb({ grafts_accepted: accepted, queens_hatched: hatched, queens_mated: mated })

    // Determine batch completion: all grafts in terminal status (sold/failed)
    const allTerminal = grafts.length > 0 && grafts.every(g => g.status === 'sold' || g.status === 'failed')
    const batchStatus = allTerminal ? 'completed' : 'active'

    // Persist to DB if counts changed (fire-and-forget)
    const key = `${batchId}:${accepted}:${hatched}:${mated}:${batchStatus}`
    if (key !== lastPersistedCounts.current) {
      lastPersistedCounts.current = key
      supabase
        .from('rearing_batches')
        .update({ grafts_accepted: accepted, queens_hatched: hatched, queens_mated: mated, status: batchStatus })
        .eq('id', batchId)
        .then(({ error }) => {
          if (error) console.error('Failed to persist batch counts:', error)
        })
    }
  }, [grafts, loading, distributions, hatchedViaNuc, matedViaNuc, batchId])

  // --- CRUD ---

  const generateGrafts = useCallback(async () => {
    if (!cellCount || cellCount <= 0) {
      toast.error('Populate Batch Quantities')
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
        status_date: graftDate || null,
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
  }, [cellCount, grafts, batchId, userId, graftDate, toast, fetchGrafts])

  const updateGraftStatus = useCallback(async (graftId: string, newStatus: string) => {
    if (!VALID_GRAFT_STATUS_VALUES.includes(newStatus)) {
      console.error('Invalid graft status:', newStatus)
      toast.error('Invalid status value')
      return
    }
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
  }, [fetchGrafts, toast])

  const deleteGraft = useCallback(async (graftId: string) => {
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
  }, [fetchGrafts, toast])

  const updateGraftQueenMarked = useCallback(async (graftId: string, marked: boolean) => {
    const previous = grafts.find(g => g.id === graftId)?.queen_marked
    setGrafts(prev => prev.map(g => g.id === graftId ? { ...g, queen_marked: marked } : g))
    try {
      const { error } = await supabase
        .from('batch_grafts')
        .update({ queen_marked: marked })
        .eq('id', graftId)
      if (error) throw error
    } catch (error) {
      console.error('Error updating queen marked:', error)
      toast.error('Failed to update queen marked')
      setGrafts(prev => prev.map(g => g.id === graftId ? { ...g, queen_marked: previous ?? false } : g))
    }
  }, [toast, grafts])

  const updateGraftStatusDate = useCallback(async (graftId: string, date: string) => {
    const previous = grafts.find(g => g.id === graftId)?.status_date
    setGrafts(prev => prev.map(g => g.id === graftId ? { ...g, status_date: date || null } : g))
    try {
      const { error } = await supabase
        .from('batch_grafts')
        .update({ status_date: date || null })
        .eq('id', graftId)
      if (error) throw error
    } catch (error) {
      console.error('Error updating status date:', error)
      toast.error('Failed to update status date')
      setGrafts(prev => prev.map(g => g.id === graftId ? { ...g, status_date: previous ?? null } : g))
    }
  }, [toast, grafts])

  const updateGraftQueenNumber = useCallback(async (graftId: string, queenNumber: string) => {
    const previous = grafts.find(g => g.id === graftId)?.queen_number
    setGrafts(prev => prev.map(g => g.id === graftId ? { ...g, queen_number: queenNumber || null } : g))
    try {
      const { error } = await supabase
        .from('batch_grafts')
        .update({ queen_number: queenNumber || null })
        .eq('id', graftId)
      if (error) throw error
    } catch (error) {
      console.error('Error updating queen number:', error)
      toast.error('Failed to update queen number')
      setGrafts(prev => prev.map(g => g.id === graftId ? { ...g, queen_number: previous ?? null } : g))
    }
  }, [toast, grafts])

  const updateGraftWeight = useCallback(async (graftId: string, weightMg: number) => {
    const previous = grafts.find(g => g.id === graftId)?.latest_weight_mg
    setGrafts(prev => prev.map(g => g.id === graftId ? { ...g, latest_weight_mg: weightMg } : g))
    try {
      const { error } = await supabase
        .from('queen_weights')
        .insert([{
          user_id: userId,
          graft_id: graftId,
          weight_mg: weightMg,
          weighed_at: new Date().toISOString().split('T')[0],
        }])
      if (error) throw error
    } catch (error) {
      console.error('Error recording weight:', error)
      toast.error('Failed to record weight')
      setGrafts(prev => prev.map(g => g.id === graftId ? { ...g, latest_weight_mg: previous ?? null } : g))
    }
  }, [toast, grafts, userId])

  // --- Distribution wrappers ---

  const handleDistributeSave = useCallback(async (data: Parameters<typeof createDistribution>[0]) => {
    const success = await createDistribution(data)
    if (success === true) {
      toast.success('Distribution recorded')
      fetchGrafts()
      fetchDistributions(batchId)
    } else if (success === false) {
      toast.error('This graft has already been distributed')
    } else {
      toast.error('Failed to record distribution')
    }
    return success
  }, [createDistribution, toast, fetchGrafts, fetchDistributions, batchId])

  const handleDeleteDistribution = useCallback(async (dist: GraftDistribution) => {
    if (!confirm(`Remove distribution for Cell #${dist.cell_number}?`)) return
    const success = await deleteDistribution(dist.id, dist.graft_id, dist.previous_graft_status || 'mated')
    if (success) {
      toast.success('Distribution removed')
      fetchGrafts()
      fetchDistributions(batchId)
    } else {
      toast.error('Failed to remove distribution')
    }
  }, [deleteDistribution, toast, fetchGrafts, fetchDistributions, batchId])

  const handleConfirmMating = useCallback(async (distId: string, matingDate: string, matingLocation: string): Promise<boolean> => {
    const success = await confirmMatingWithLocation(distId, matingDate, matingLocation)
    if (success) {
      toast.success('Mating confirmed')
      fetchDistributions(batchId)
    } else {
      toast.error('Failed to confirm mating')
    }
    return success
  }, [confirmMatingWithLocation, fetchDistributions, batchId, toast])

  const handleClearMating = useCallback(async (distId: string): Promise<boolean> => {
    const success = await clearMatingConfirmation(distId)
    if (success) {
      toast.success('Mating confirmation cleared')
      fetchDistributions(batchId)
    } else {
      toast.error('Failed to clear mating')
    }
    return success
  }, [clearMatingConfirmation, fetchDistributions, batchId, toast])

  const handleBulkDistributeSave = useCallback(async (data: BulkDistributionData) => {
    const success = await createBulkDistributions(data)
    if (success === true) {
      toast.success(`${data.grafts.length} distributions recorded`)
      fetchGrafts()
      fetchDistributions(batchId)
      setBulkDistributeGrafts(null)
      setTableSelectedIds(new Set())
    } else {
      toast.error('Failed to record distributions. One or more may already be distributed.')
    }
    return success
  }, [createBulkDistributions, toast, fetchGrafts, fetchDistributions, batchId])

  // --- Frame selection helpers ---

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => setSelectedIds(new Set(grafts.filter(g => FRAME_STATUS_VALUES.includes(g.status)).map((g) => g.id))), [grafts])
  const deselectAll = useCallback(() => setSelectedIds(new Set()), [])
  const getTodayDate = useCallback(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])
  const enterSelectMode = useCallback(() => {
    setSelectMode(true)
    setBulkStatusDraft('')
    setBulkDateDraft(getTodayDate())
    setBulkDateTouched(false)
  }, [getTodayDate])
  const clearFrameBulkDrafts = useCallback(() => {
    setBulkStatusDraft('')
    setBulkDateDraft('')
    setBulkDateTouched(false)
  }, [])
  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
    clearFrameBulkDrafts()
  }, [clearFrameBulkDrafts])

  // --- Table computed values (needed by selection helpers) ---

  const tableGrafts = useMemo(() =>
    grafts.filter(g => !FRAME_STATUS_VALUES.includes(g.status)),
  [grafts])

  const distributedGraftIds = useMemo(() =>
    new Set(distributions.map(d => d.graft_id)),
  [distributions])

  // --- Table selection helpers ---

  const toggleTableSelect = useCallback((id: string) => {
    setTableSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllTable = useCallback(() => {
    setTableSelectedIds(new Set(
      tableGrafts.filter(g =>
        g.status !== 'failed' &&
        g.status !== 'sold' &&
        !distributedGraftIds.has(g.id)
      ).map(g => g.id)
    ))
  }, [tableGrafts, distributedGraftIds])

  const deselectAllTable = useCallback(() => setTableSelectedIds(new Set()), [])
  const exitTableSelectMode = useCallback(() => { setTableSelectMode(false); setTableSelectedIds(new Set()) }, [])

  // --- Bulk handlers (frame) ---

  const handleBulkStatusChange = useCallback((newStatus: string) => {
    setBulkStatusDraft(newStatus)
  }, [])

  const handleBulkDateChange = useCallback((date: string) => {
    setBulkDateDraft(date)
    setBulkDateTouched(true)
  }, [])

  const commitFrameBulkChanges = useCallback(async (): Promise<'saved' | 'noop' | 'error'> => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return 'noop'

    const updates: { status?: string; status_date?: string | null } = {}
    if (bulkStatusDraft) updates.status = bulkStatusDraft
    if (bulkDateDraft && (bulkStatusDraft !== '' || bulkDateTouched)) updates.status_date = bulkDateDraft
    if (!updates.status && !updates.status_date) return 'noop'

    try {
      setSavingFrameBulkEdits(true)
      const { error } = await supabase
        .from('batch_grafts')
        .update(updates)
        .in('id', ids)
      if (error) throw error

      toast.success(`${ids.length} graft${ids.length === 1 ? '' : 's'} updated`)
      clearFrameBulkDrafts()
      await fetchGrafts()
      return 'saved'
    } catch (error) {
      console.error('Error committing frame bulk updates:', error)
      toast.error('Failed to update selected grafts')
      return 'error'
    } finally {
      setSavingFrameBulkEdits(false)
    }
  }, [selectedIds, bulkStatusDraft, bulkDateDraft, bulkDateTouched, toast, clearFrameBulkDrafts, fetchGrafts])

  const handleBulkDelete = useCallback(async () => {
    // Exclude distributed or failed grafts that would fail FK or shouldn't be deleted
    const ids = Array.from(selectedIds).filter(id => {
      const g = grafts.find(gr => gr.id === id)
      return g && g.status !== 'failed' && g.status !== 'sold' && !distributedGraftIds.has(id)
    })
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
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Error bulk deleting grafts:', error)
      toast.error('Failed to delete grafts')
    }
  }, [selectedIds, toast, fetchGrafts, fetchDistributions, batchId, distributedGraftIds, grafts])

  // --- Table bulk handlers ---

  const handleTableBulkStatusChange = useCallback(async (newStatus: string, date?: string) => {
    if (!VALID_GRAFT_STATUS_VALUES.includes(newStatus)) {
      toast.error('Invalid status value')
      return
    }
    const ids = Array.from(tableSelectedIds)
    if (ids.length === 0) return
    try {
      const statusDate = date || new Date().toISOString().split('T')[0]
      const { error } = await supabase
        .from('batch_grafts')
        .update({ status: newStatus, status_date: statusDate })
        .in('id', ids)
      if (error) throw error
      toast.success(`${ids.length} grafts updated to ${newStatus}`)
      fetchGrafts()
      setTableSelectedIds(new Set())
    } catch (error) {
      console.error('Error bulk updating grafts:', error)
      toast.error('Failed to update grafts')
    }
  }, [tableSelectedIds, toast, fetchGrafts])

  const handleTableBulkDateChange = useCallback(async (date: string) => {
    const ids = Array.from(tableSelectedIds)
    if (ids.length === 0) return
    try {
      const { error } = await supabase
        .from('batch_grafts')
        .update({ status_date: date })
        .in('id', ids)
      if (error) throw error
      toast.success(`${ids.length} graft dates updated`)
      fetchGrafts()
    } catch (error) {
      console.error('Error bulk updating dates:', error)
      toast.error('Failed to update dates')
    }
  }, [tableSelectedIds, toast, fetchGrafts])

  const handleTableBulkQueenMarked = useCallback(async (marked: boolean) => {
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
      setTableSelectedIds(new Set())
    } catch (error) {
      console.error('Error bulk updating queen marked:', error)
      toast.error('Failed to update queen marked')
    }
  }, [tableSelectedIds, toast, fetchGrafts])

  const handleTableBulkDelete = useCallback(async () => {
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
      setTableSelectedIds(new Set())
    } catch (error) {
      console.error('Error bulk deleting grafts:', error)
      toast.error('Failed to delete grafts')
    }
  }, [tableSelectedIds, toast, fetchGrafts, fetchDistributions, batchId])

  // --- Computed values (memoised to stabilise references for child components) ---

  const statusCounts = useMemo(() =>
    GRAFT_STATUSES.reduce((acc, s) => {
      acc[s.value] = grafts.filter(g => g.status === s.value).length
      return acc
    }, {} as Record<string, number>),
  [grafts])

  const markingColour = useMemo(() =>
    emergenceDate ? getQueenColorFromYear(emergenceDate) : '',
  [emergenceDate])

  const emergenceYear = useMemo(() => {
    if (!emergenceDate) return null
    const year = new Date(emergenceDate).getFullYear()
    return isNaN(year) ? null : year
  }, [emergenceDate])

  return {
    // State
    grafts,
    loading,
    distributeGraft,
    setDistributeGraft,
    groupMemberIds,
    showHelp,
    setShowHelp,
    selectMode,
    setSelectMode,
    selectedIds,
    bulkStatusDraft,
    bulkDateDraft,
    savingFrameBulkEdits,
    tableSelectMode,
    setTableSelectMode,
    tableSelectedIds,
    bulkDistributeGrafts,
    setBulkDistributeGrafts,
    unlockedGraftIds,
    setUnlockedGraftIds,
    frameCollapsed,
    setFrameCollapsed,

    // Distribution hook pass-through
    distributions,
    distLoading,
    searchUsers,
    fetchRecipientApiaries,
    fetchRecipientHives,

    // CRUD
    generateGrafts,
    updateGraftStatus,
    deleteGraft,
    updateGraftQueenMarked,
    updateGraftStatusDate,
    updateGraftQueenNumber,
    updateGraftWeight,

    // Distribution wrappers
    handleDistributeSave,
    handleDeleteDistribution,
    handleConfirmMating,
    handleClearMating,
    handleBulkDistributeSave,

    // Frame selection
    toggleSelect,
    enterSelectMode,
    selectAll,
    deselectAll,
    exitSelectMode,
    commitFrameBulkChanges,

    // Table selection
    toggleTableSelect,
    selectAllTable,
    deselectAllTable,
    exitTableSelectMode,

    // Bulk handlers (frame)
    handleBulkStatusChange,
    handleBulkDateChange,
    handleBulkDelete,

    // Table bulk handlers
    handleTableBulkStatusChange,
    handleTableBulkDateChange,
    handleTableBulkQueenMarked,
    handleTableBulkDelete,

    // Computed
    statusCounts,
    tableGrafts,
    distributedGraftIds,
    markingColour,
    emergenceYear,
  }
}
