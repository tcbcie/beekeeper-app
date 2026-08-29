'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getTeamAccess } from '@/lib/team-access'
import { formatDateIrish } from '@/lib/date-utils'
import { Plus, Edit2, Archive, Trash2, X, ClipboardList, ChevronDown, ChevronUp, History, Eye, EyeOff, Send, Search } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import NucInspectionPanel from './NucInspectionPanel'
import { getQueenColorFromYear } from '@/types/queen'
import { COLOUR_DOTS } from './graftConstants'
import { useGraftDistributions } from '@/hooks/useGraftDistributions'
import type { CreateDistributionData } from '@/hooks/useGraftDistributions'
import { useMatingNucBulk } from '@/hooks/useMatingNucBulk'
import type { AvailableSealedGraft, MatingNucBulkMode } from '@/hooks/useMatingNucBulk'
import DistributeGraftModal from './DistributeGraftModal'

interface Batch {
 id: string
 batch_name: string
 graft_date: string
 mother_queen_id: string | null
 mating_apiary_id: string | null
 rearing_group_id: string | null
}

interface Graft {
 id: string
 batch_id: string
 cell_number: number
 status: string
 notes: string | null
 queen_marked?: boolean
 queen_number?: string | null
 breeder_queen_id?: string | null
}

interface Queen {
 id: string
 queen_number: string
 status: string
}

interface MatingLocationOption {
 id: string
 name: string
 is_shared: boolean
}

interface MatingNuc {
 id: string
 nuc_number: string
 reference_code?: string | null
 creation_batch_id?: string | null
 graft_id: string | null
 batch_id: string | null
 queen_id: string | null
 reared_queen_id: string | null
 mating_location: string | null
 status: string
 setup_date: string
 cell_introduced_at: string | null
 queen_emerged_at: string | null
 mating_confirmed_at: string | null
 queen_last_seen_at: string | null
 queen_marked_at: string | null
 failed_at: string | null
 notes: string | null
 updated_at: string
 retired_at: string | null
 batch_grafts?: {
 cell_number: number
 status: string
 queen_marked: boolean
 queen_number: string | null
 } | null
 rearing_batches?: {
 batch_name: string
 emergence_date: string | null
 } | null
 // The breeder/mother queen (the "Grafted from" field), via mating_nucs.queen_id.
 queens?: {
 queen_number: string
 } | null
 // The queen reared in this nuc, via mating_nucs.reared_queen_id. Minted on demand.
 reared_queen?: {
 queen_number: string
 } | null
 mating_nuc_inspections?: { count: number }[]
}

interface MatingNucsTabProps {
 userId: string
}

interface BatchSummary {
 batch_id: string
 batch_name: string
 total: number
 statusCounts: Record<string, number>
}

type SummaryRow = {
 batch_id: string | null
 status: string
 rearing_batches: { batch_name: string }[] | { batch_name: string } | null
}

const NUC_STATUSES = [
 { value: 'setup', label: 'Setup', color: 'bg-surface-secondary text-text-secondary border border-border' },
 { value: 'graft_introduced', label: 'Graft Introduced', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
 { value: 'cell_introduced', label: 'Cell Introduced', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
 { value: 'virgin', label: 'Virgin Queen', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
 { value: 'mating', label: 'Mated', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
 { value: 'laying', label: 'Laying', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
 { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
 { value: 'sold', label: 'Distributed/Sold', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
 { value: 'merged', label: 'Merged', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
]

// Format date to Irish format (DD/MM/YYYY) - uses string splitting to avoid timezone drift
const NUC_DISTRIBUTABLE_STATUSES = ['virgin', 'mating', 'laying']
const NUC_ACTION_BUTTON_CLASS = 'inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-secondary text-text-tertiary transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-elevated'
const BULK_MODES: { value: MatingNucBulkMode; label: string }[] = [
 { value: 'numbered', label: 'Numbered Nucs' },
 { value: 'unnumbered', label: 'Unnumbered from Sealed Cells' },
]

const getNucDistributionType = (status: string): 'virgin_queen' | 'mated_queen' => {
 // 'mating' is labelled "Mated" in NUC_STATUSES — both it and 'laying' are past the virgin stage.
 if (status === 'laying' || status === 'mating') return 'mated_queen'
 return 'virgin_queen'
}

export default function MatingNucsTab({ userId }: MatingNucsTabProps) {
 const searchParams = useSearchParams()
 const highlightNucId = searchParams.get('nuc')
 const highlightNucNumber = searchParams.get('nuc_number')
 const toast = useToast()
 const [nucs, setNucs] = useState<MatingNuc[]>([])
 const [batches, setBatches] = useState<Batch[]>([])
 const [grafts, setGrafts] = useState<Graft[]>([])
 const [queens, setQueens] = useState<Queen[]>([])
 const [filteredGrafts, setFilteredGrafts] = useState<Graft[]>([])
 const [loading, setLoading] = useState(true)
 const [showForm, setShowForm] = useState(false)
 const [editingNuc, setEditingNuc] = useState<MatingNuc | null>(null)
 const [expandedNucId, setExpandedNucId] = useState<string | null>(null)
 const [selectedNucId, setSelectedNucId] = useState<string | null>(null)
 // Multi-select for bulk actions (independent of the single-row highlight above)
 const [selectedNucIds, setSelectedNucIds] = useState<Set<string>>(new Set())
 const [showBulkSiteModal, setShowBulkSiteModal] = useState(false)
 const [bulkSiteLocation, setBulkSiteLocation] = useState('')
 const [bulkSiteSaving, setBulkSiteSaving] = useState(false)
 const selectAllRef = useRef<HTMLInputElement>(null)
 const [showRetired, setShowRetired] = useState(false)
 const [historyNucNumber, setHistoryNucNumber] = useState<string | null>(null)
 const [historyData, setHistoryData] = useState<MatingNuc[]>([])
 const [distributeNuc, setDistributeNuc] = useState<MatingNuc | null>(null)
 const [distributeQueenId, setDistributeQueenId] = useState<string | null>(null)
 const [mintingNucId, setMintingNucId] = useState<string | null>(null)
 const [distributeGroupMemberIds, setDistributeGroupMemberIds] = useState<string[]>([])
 const [showBulkForm, setShowBulkForm] = useState(false)
 const [bulkLoading, setBulkLoading] = useState(false)
 const [batchSummaries, setBatchSummaries] = useState<BatchSummary[]>([])
 const [activeBatchId, setActiveBatchId] = useState<string | null>(null)
 const [availableBulkGrafts, setAvailableBulkGrafts] = useState<AvailableSealedGraft[]>([])
 const [bulkCellSearch, setBulkCellSearch] = useState('')
 // Free-text search over the nuc list (matches nuc_number / reference_code)
 const [nucSearch, setNucSearch] = useState('')
 // Filter the nuc list by mating site (apiary). '' = all sites.
 const [apiaryFilter, setApiaryFilter] = useState('')
 const [matingLocationOptions, setMatingLocationOptions] = useState<MatingLocationOption[]>([])
 const [inventoryNucs, setInventoryNucs] = useState<{ id: string; nuc_number: string; qr_tag_code: string | null }[]>([])
 const [selectedInventoryNucId, setSelectedInventoryNucId] = useState('')
 const [nucTagCodes, setNucTagCodes] = useState<Record<string, string>>({})
 const [nucWeights, setNucWeights] = useState<Record<string, number>>({})
 const autoExpandApplied = useRef(false)
 // Sequencing guard: rapid filter changes launch overlapping fetchNucs runs; only the
 // latest run is allowed to commit state, so a slow earlier run can't overwrite it.
 const fetchNucsGenRef = useRef(0)

 const {
 createDistribution,
 searchUsers,
 fetchRecipientApiaries,
 fetchRecipientHives,
 } = useGraftDistributions()

 const {
 fetchAvailableSealedGrafts,
 createBulkNucs,
 } = useMatingNucBulk()

 // Form state
 const [formData, setFormData] = useState({
 nuc_number: '',
 batch_id: '',
 graft_id: '',
 queen_id: '',
 mating_location: '',
 status: 'cell_introduced',
 setup_date: new Date().toISOString().split('T')[0],
 queen_marked_at: '',
 notes: '',
 })

 const [bulkFormData, setBulkFormData] = useState({
 source_batch_id: '',
 mode: 'numbered' as MatingNucBulkMode,
 nuc_numbers_text: '',
 selected_graft_ids: [] as string[],
 auto_assign_cells: true,
 mating_location: '',
 notes: '',
 status: 'setup',
 })

 // A search spans both active and retired nucs, so the retired filter is dropped
 // while searching. Boolean (not the raw text) gates the refetch, so it only fires
 // when search starts/ends — not on every keystroke.
 const isSearching = nucSearch.trim().length > 0

 const fetchNucs = useCallback(async () => {
 const gen = ++fetchNucsGenRef.current
 let query = supabase
 .from('mating_nucs')
 .select('*, batch_grafts(cell_number, status, queen_marked, queen_number), rearing_batches(batch_name, emergence_date), queens!mating_nucs_queen_id_fkey(queen_number), reared_queen:queens!mating_nucs_reared_queen_id_fkey(queen_number), mating_nuc_inspections(count)')
 .eq('user_id', userId)
 .eq('is_inventory', false)

 // Filter by retired status (skipped while searching so retired nucs are reachable)
 if (isSearching) {
 // no retired filter — load both active and retired
 } else if (showRetired) {
 query = query.not('retired_at', 'is', null)
 } else {
 query = query.is('retired_at', null)
 }

 if (activeBatchId) {
 query = query.eq('batch_id', activeBatchId)
 }

 const { data, error } = await query.order('created_at', { ascending: false })
 if (gen !== fetchNucsGenRef.current) return

 if (error) {
 console.error('Error fetching nucs:', error)
 } else if (data) {
 setNucs(data)

 // Fetch QR tag codes for displayed nucs
 const nucIds = data.map(n => n.id)
 if (nucIds.length > 0) {
   const { data: tagData } = await supabase
     .from('qr_tags')
     .select('mating_nuc_id, code')
     .in('mating_nuc_id', nucIds)
   const tagMap: Record<string, string> = {}
   if (tagData) {
     for (const t of tagData) {
       if (t.mating_nuc_id) tagMap[t.mating_nuc_id] = t.code
     }
   }
   if (gen !== fetchNucsGenRef.current) return
   setNucTagCodes(tagMap)
 } else {
   setNucTagCodes({})
 }

 // Fetch latest queen weights for nucs with grafts
 const graftIdToNucId: Record<string, string> = {}
 for (const n of data) {
   if (n.graft_id) graftIdToNucId[n.graft_id] = n.id
 }
 const weightGraftIds = Object.keys(graftIdToNucId)
 if (weightGraftIds.length > 0) {
   const { data: weights } = await supabase
     .from('queen_weights')
     .select('graft_id, weight_mg')
     .in('graft_id', weightGraftIds)
     .order('weighed_at', { ascending: false })
   const wMap: Record<string, number> = {}
   if (weights) {
     for (const w of weights) {
       const nucId = graftIdToNucId[w.graft_id]
       if (nucId && !(nucId in wMap)) {
         wMap[nucId] = w.weight_mg
       }
     }
   }
   if (gen !== fetchNucsGenRef.current) return
   setNucWeights(wMap)
 } else {
   setNucWeights({})
 }

 // Sync graft statuses: only when viewing active nucs without bulk filter
 if (!showRetired && !activeBatchId) {
   const activeGraftIds = data
     .filter(n => !n.retired_at && n.graft_id && n.status !== 'failed')
     .map(n => n.graft_id)
     .filter(Boolean) as string[]
   if (activeGraftIds.length > 0) {
     supabase
       .from('batch_grafts')
       .update({ status: 'in_nuc' })
       .in('id', activeGraftIds)
       .in('status', ['sealed', 'caged', 'emerged'])
       .eq('user_id', userId)
       .then(({ error: syncError }) => {
         if (syncError) console.error('Failed to sync graft statuses:', syncError)
       })
   }
 }
 }

 // Per-batch summary (independent of the active filter): active nucs grouped by status.
 // On failure, log and leave the previous summary intact rather than blanking it to
 // a misleading "no nucs" state.
 const { data: summaryRows, error: summaryError } = await supabase
   .from('mating_nucs')
   .select('batch_id, status, rearing_batches(batch_name)')
   .eq('user_id', userId)
   .eq('is_inventory', false)
   .is('retired_at', null)
   .not('batch_id', 'is', null)
 if (gen !== fetchNucsGenRef.current) return
 if (summaryError) {
   console.error('Error loading batch summary:', summaryError)
 } else {
   const summaryMap = new Map<string, BatchSummary>()
   for (const row of (summaryRows || []) as SummaryRow[]) {
     if (!row.batch_id) continue
     const rb = Array.isArray(row.rearing_batches) ? row.rearing_batches[0] : row.rearing_batches
     let entry = summaryMap.get(row.batch_id)
     if (!entry) {
       entry = { batch_id: row.batch_id, batch_name: rb?.batch_name || 'Unknown batch', total: 0, statusCounts: {} }
       summaryMap.set(row.batch_id, entry)
     }
     entry.total++
     entry.statusCounts[row.status] = (entry.statusCounts[row.status] || 0) + 1
   }
   setBatchSummaries(Array.from(summaryMap.values()))
 }

 if (gen === fetchNucsGenRef.current) setLoading(false)
 }, [userId, showRetired, activeBatchId, isSearching])

 const fetchBatches = useCallback(async () => {
 const { data } = await supabase
 .from('rearing_batches')
 .select('id, batch_name, graft_date, mother_queen_id, mating_apiary_id, rearing_group_id')
 .eq('user_id', userId)
 .order('graft_date', { ascending: false })

 if (data) setBatches(data)
 }, [userId])

 const fetchGrafts = useCallback(async () => {
 const { data } = await supabase
 .from('batch_grafts')
 .select('*')
 .eq('user_id', userId)
 .order('cell_number')

 if (data) setGrafts(data)
 }, [userId])

 const fetchQueens = useCallback(async () => {
 const { data } = await supabase
 .from('queens')
 .select('id, queen_number, status')
 .eq('user_id', userId)
 .eq('status', 'active')
 .order('queen_number')

 if (data) setQueens(data)
 }, [userId])

 const fetchMatingLocationOptions = useCallback(async () => {
 try {
 const { data: ownApiaries, error: ownApiariesError } = await supabase
 .from('apiaries')
 .select('id, name, user_id')
 .eq('user_id', userId)
 .order('name')

 if (ownApiariesError) throw ownApiariesError

 // One memoised round trip for shared apiary access
 const { sharedApiaryIds } = await getTeamAccess(userId)
 let sharedApiaries: MatingLocationOption[] = []

 if (sharedApiaryIds.length > 0) {
 const { data: sharedApiaryData, error: sharedApiaryError } = await supabase
 .from('apiaries')
 .select('id, name, user_id')
 .in('id', sharedApiaryIds)
 .neq('user_id', userId)

 if (sharedApiaryError) throw sharedApiaryError

 sharedApiaries = (sharedApiaryData || []).map((apiary) => ({
 id: apiary.id as string,
 name: apiary.name as string,
 is_shared: true,
 }))
 }

 const ownApiaryOptions: MatingLocationOption[] = (ownApiaries || []).map((apiary) => ({
 id: apiary.id,
 name: apiary.name,
 is_shared: false,
 }))

 const allOptions = [...ownApiaryOptions, ...sharedApiaries]
 const uniqueOptions = Array.from(
 new Map(allOptions.map((apiary) => [apiary.id, apiary])).values()
 ).sort((a, b) => a.name.localeCompare(b.name))

 setMatingLocationOptions(uniqueOptions)
 } catch (error) {
 console.error('Error fetching mating location options:', error)
 toast.error('Failed to load apiary options')
 setMatingLocationOptions([])
 }
 }, [userId, toast])

 const fetchInventoryNucs = useCallback(async () => {
 const { data } = await supabase
 .from('mating_nucs')
 .select('id, nuc_number')
 .eq('user_id', userId)
 .eq('is_inventory', true)
 .eq('equipment_status', 'ready')
 .is('retired_at', null)
 .order('nuc_number')

 const nucs = data || []
 const nucIds = nucs.map(n => n.id)
 const tagMap: Record<string, string> = {}

 if (nucIds.length > 0) {
 const { data: tagData } = await supabase
 .from('qr_tags')
 .select('mating_nuc_id, code')
 .in('mating_nuc_id', nucIds)

 if (tagData) {
 for (const t of tagData) {
 if (t.mating_nuc_id) tagMap[t.mating_nuc_id] = t.code
 }
 }
 }

 setInventoryNucs(nucs.map(n => ({ ...n, qr_tag_code: tagMap[n.id] || null })))
 }, [userId])

 useEffect(() => {
 fetchNucs()
 fetchBatches()
 fetchGrafts()
 fetchQueens()
 fetchMatingLocationOptions()
 fetchInventoryNucs()
 }, [fetchNucs, fetchBatches, fetchGrafts, fetchQueens, fetchMatingLocationOptions, fetchInventoryNucs])

 // Auto-expand highlighted nuc from URL params (by ID or by nuc_number) - once only
 useEffect(() => {
 if (loading || autoExpandApplied.current) return
 let targetId = highlightNucId || null
 if (!targetId && highlightNucNumber) {
 const match = nucs.find(n => n.nuc_number === highlightNucNumber)
 if (match) targetId = match.id
 }
 if (targetId) {
 autoExpandApplied.current = true
 setExpandedNucId(targetId)
 const timer = setTimeout(() => {
 document.getElementById(`nuc-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
 }, 200)
 return () => clearTimeout(timer)
 }
 }, [highlightNucId, highlightNucNumber, nucs, loading])

 // Clear stale selection/expansion when nucs change
 useEffect(() => {
 if (!selectedNucId && !expandedNucId) return
 const visibleIds = new Set(nucs.map((n) => n.id))
 if (selectedNucId && !visibleIds.has(selectedNucId)) setSelectedNucId(null)
 if (expandedNucId && !visibleIds.has(expandedNucId)) setExpandedNucId(null)
 }, [selectedNucId, expandedNucId, nucs])

 // Prune bulk selection of any nuc no longer visible (filter/refresh changes the list)
 useEffect(() => {
 const visibleIds = new Set(nucs.map((n) => n.id))
 setSelectedNucIds((prev) => {
 let changed = false
 const next = new Set<string>()
 for (const id of prev) {
 if (visibleIds.has(id)) next.add(id)
 else changed = true
 }
 return changed ? next : prev
 })
 }, [nucs])

 // Filter grafts by selected batch (include the nuc's current graft when editing)
 useEffect(() => {
 if (formData.batch_id) {
 const currentGraftId = editingNuc?.graft_id
 const filtered = grafts.filter(g => g.batch_id === formData.batch_id && (['sealed', 'caged', 'emerged'].includes(g.status) || g.id === currentGraftId))
 setFilteredGrafts(filtered)
 } else {
 setFilteredGrafts([])
 }
 }, [formData.batch_id, grafts, editingNuc])

 useEffect(() => {
 if (!bulkFormData.source_batch_id) {
 setAvailableBulkGrafts([])
 return
 }

 fetchAvailableSealedGrafts(userId, bulkFormData.source_batch_id)
 .then((data) => setAvailableBulkGrafts(data))
 .catch((error) => {
 console.error('Error loading sealed cells for bulk creation:', error)
 toast.error('Failed to load available sealed cells')
 setAvailableBulkGrafts([])
 })
 }, [bulkFormData.source_batch_id, fetchAvailableSealedGrafts, userId, toast])

 // Fetch group member IDs when distribute modal opens
 useEffect(() => {
 if (!distributeNuc) {
  setDistributeGroupMemberIds([])
  return
 }
 const batch = batches.find((b) => b.id === distributeNuc.batch_id)
 const groupId = batch?.rearing_group_id
 if (!groupId) {
  setDistributeGroupMemberIds([])
  return
 }
 let cancelled = false
 supabase
  .from('rearing_group_members')
  .select('user_id')
  .eq('group_id', groupId)
  .then(
   ({ data }) => {
    if (!cancelled && data) setDistributeGroupMemberIds(data.map((m) => m.user_id))
   },
   (err) => {
    console.error('Error fetching group members:', err)
    if (!cancelled) setDistributeGroupMemberIds([])
   }
  )
 return () => { cancelled = true }
 }, [distributeNuc, batches])

 const handleBatchChange = (batchId: string) => {
 const selectedBatch = batches.find((b) => b.id === batchId)
 const matingApiary = selectedBatch?.mating_apiary_id
   ? matingLocationOptions.find((a) => a.id === selectedBatch.mating_apiary_id)
   : null
 setFormData((prev) => ({
 ...prev,
 batch_id: batchId,
 graft_id: '',
 queen_id: selectedBatch?.mother_queen_id || '',
 mating_location: matingApiary?.name || prev.mating_location,
 }))
 }

 const handleBulkBatchChange = (batchId: string) => {
 const selectedBatch = batches.find((b) => b.id === batchId)
 const matingApiary = selectedBatch?.mating_apiary_id
   ? matingLocationOptions.find((a) => a.id === selectedBatch.mating_apiary_id)
   : null
 setBulkFormData((prev) => ({
 ...prev,
 source_batch_id: batchId,
 selected_graft_ids: [],
 mating_location: matingApiary?.name || prev.mating_location,
 }))
 setBulkCellSearch('')
 }

 const toggleBulkGraftSelection = (graftId: string) => {
 setBulkFormData((prev) => {
 const exists = prev.selected_graft_ids.includes(graftId)
 return {
 ...prev,
 selected_graft_ids: exists
 ? prev.selected_graft_ids.filter((id) => id !== graftId)
 : [...prev.selected_graft_ids, graftId],
 }
 })
 }

 const selectAllFilteredBulkCells = () => {
 const filteredIds = availableBulkGrafts
 .filter((g) => `Cell #${g.cell_number}`.toLowerCase().includes(bulkCellSearch.toLowerCase()))
 .map((g) => g.id)
 setBulkFormData((prev) => ({ ...prev, selected_graft_ids: Array.from(new Set([...prev.selected_graft_ids, ...filteredIds])) }))
 }

 const clearAllBulkCells = () => {
 setBulkFormData((prev) => ({ ...prev, selected_graft_ids: [] }))
 }

 const resetBulkForm = () => {
 setBulkFormData({
 source_batch_id: '',
 mode: 'numbered',
 nuc_numbers_text: '',
 selected_graft_ids: [],
 auto_assign_cells: true,
 mating_location: '',
 notes: '',
 status: 'setup',
 })
 setBulkCellSearch('')
 setShowBulkForm(false)
 }

 const parseBulkNucNumbers = (text: string): string[] =>
 text
 .split(/[\n,]+/)
 .map((value) => value.trim())
 .filter((value) => value.length > 0)

 const handleCreateBulkNucs = async () => {
 if (!bulkFormData.source_batch_id) {
 toast.error('Select a source batch')
 return
 }

 if (!bulkFormData.mating_location.trim()) {
 toast.error('Mating location is required.')
 return
 }

 const inputNumbers = bulkFormData.mode === 'numbered'
 ? parseBulkNucNumbers(bulkFormData.nuc_numbers_text)
 : []

 try {
 setBulkLoading(true)
 const result = await createBulkNucs({
 userId,
 sourceBatchId: bulkFormData.source_batch_id,
 mode: bulkFormData.mode,
 nucNumbers: inputNumbers,
 selectedGraftIds: bulkFormData.selected_graft_ids,
 autoAssignSealedCells: bulkFormData.auto_assign_cells,
 matingLocation: bulkFormData.mating_location,
 notes: bulkFormData.notes,
 status: bulkFormData.status,
 })

 toast.success(`Created ${result.createdCount} of ${result.requestedCount} nuc entries`)
 setActiveBatchId(bulkFormData.source_batch_id)
 await fetchNucs()
 await fetchGrafts()
 resetBulkForm()
 } catch (error) {
 console.error('Error creating bulk mating nucs:', error)
 toast.error(error instanceof Error ? error.message : 'Failed to create bulk mating nucs')
 } finally {
 setBulkLoading(false)
 }
 }

 const resetForm = () => {
 setFormData({
 nuc_number: '',
 batch_id: '',
 graft_id: '',
 queen_id: '',
 mating_location: '',
 status: 'cell_introduced',
 setup_date: new Date().toISOString().split('T')[0],
 queen_marked_at: '',
 notes: '',
 })
 setEditingNuc(null)
 setSelectedInventoryNucId('')
 setShowForm(false)
 }

 const handleEdit = (nuc: MatingNuc) => {
 setEditingNuc(nuc)
 setFormData({
 nuc_number: nuc.nuc_number,
 batch_id: nuc.batch_id || '',
 graft_id: nuc.graft_id || '',
 queen_id: nuc.queen_id || '',
 mating_location: nuc.mating_location || '',
 status: nuc.status,
 setup_date: nuc.setup_date ? nuc.setup_date.split('T')[0] : '',
 queen_marked_at: nuc.queen_marked_at ? nuc.queen_marked_at.split('T')[0] : '',
 notes: nuc.notes || '',
 })
 setShowForm(true)
 }

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()

 if (!formData.mating_location.trim()) {
 toast.error('Mating location is required. Select an apiary or enter a custom location.')
 return
 }

 if (formData.batch_id && !formData.graft_id) {
 toast.error('Please select a cell/graft when a batch is chosen.')
 return
 }

 const nucData = {
 nuc_number: formData.nuc_number || null,
 batch_id: formData.batch_id || null,
 graft_id: formData.graft_id || null,
 queen_id: formData.queen_id || null,
 mating_location: formData.mating_location || null,
 status: formData.status,
 setup_date: formData.setup_date || null,
 queen_marked_at: formData.queen_marked_at || null,
 notes: formData.notes || null,
 user_id: userId,
 }

 try {
 if (editingNuc) {
 const { error } = await supabase
 .from('mating_nucs')
 .update(nucData)
 .eq('id', editingNuc.id)
 .eq('user_id', userId)

 if (error) throw error

 // Handle graft change on edit: revert old graft, transition new graft
 const oldGraftId = editingNuc.graft_id
 const newGraftId = formData.graft_id || null
 if (oldGraftId && oldGraftId !== newGraftId) {
   await supabase
     .from('batch_grafts')
     .update({ status: 'sealed', queen_marked: false, queen_number: null })
     .eq('id', oldGraftId)
     .eq('user_id', userId)
 }
 if (newGraftId && newGraftId !== oldGraftId) {
   await supabase
     .from('batch_grafts')
     .update({ status: 'in_nuc', status_date: formData.setup_date || new Date().toISOString().split('T')[0] })
     .eq('id', newGraftId)
     .eq('user_id', userId)
 }

 toast.success('Mating nuc updated')
 } else {
 const { error } = await supabase
 .from('mating_nucs')
 .insert([nucData])

 if (error) throw error

 // Update graft status to 'in_nuc' if a graft was selected
 if (formData.graft_id) {
 await supabase
 .from('batch_grafts')
 .update({ status: 'in_nuc', status_date: formData.setup_date || new Date().toISOString().split('T')[0] })
 .eq('id', formData.graft_id)
 .eq('user_id', userId)
 }

 // Mark inventory nuc as active so it is no longer available for selection
 if (selectedInventoryNucId) {
 await supabase
 .from('mating_nucs')
 .update({ equipment_status: 'active' })
 .eq('id', selectedInventoryNucId)
 .eq('user_id', userId)
 }

 toast.success('Mating nuc created')
 }

 fetchNucs()
 fetchGrafts()
 fetchInventoryNucs()
 resetForm()
 } catch (error) {
 console.error('Error saving nuc:', error)
 toast.error('Failed to save mating nuc')
 }
 }

 const handleRetire = async (id: string) => {
 if (!confirm('Retire this nuc? It will be archived but history preserved.')) return

 try {
 const nuc = nucs.find(n => n.id === id)

 const { error } = await supabase
 .from('mating_nucs')
 .update({ retired_at: new Date().toISOString() })
 .eq('id', id)
 .eq('user_id', userId)

 if (error) throw error

 // Set the corresponding inventory nuc to 'retired' if one exists
 if (nuc?.nuc_number) {
   await supabase
     .from('mating_nucs')
     .update({ equipment_status: 'retired', retired_at: new Date().toISOString() })
     .eq('nuc_number', nuc.nuc_number)
     .eq('user_id', userId)
     .eq('is_inventory', true)
     .eq('equipment_status', 'active')
 }

 toast.success('Nuc retired')
 fetchNucs()
 fetchGrafts()
 fetchInventoryNucs()
 } catch (error) {
 console.error('Error retiring nuc:', error)
 toast.error('Failed to retire mating nuc')
 }
 }

 const handleDelete = async (id: string) => {
 if (!confirm('Delete this nuc permanently? This will also delete all its inspections. This cannot be undone.')) return

 try {
 // Reset graft status back to 'sealed' before deleting (guard includes pre-sync statuses)
 const nuc = nucs.find(n => n.id === id)
 if (nuc?.graft_id) {
 await supabase
   .from('batch_grafts')
   .update({ status: 'sealed', queen_marked: false, queen_number: null })
   .eq('id', nuc.graft_id)
   .in('status', ['in_nuc', 'sealed', 'caged', 'emerged'])
   .eq('user_id', userId)
 }

 const { error } = await supabase
 .from('mating_nucs')
 .delete()
 .eq('id', id)
 .eq('user_id', userId)

 if (error) throw error
 toast.success('Nuc deleted')
 fetchNucs()
 fetchGrafts()
 } catch (error) {
 console.error('Error deleting nuc:', error)
 toast.error('Failed to delete mating nuc')
 }
 }

 const fetchHistory = async (nucNumber: string) => {
 const { data, error } = await supabase
 .from('mating_nucs')
 .select('*, batch_grafts(cell_number, status, queen_marked, queen_number), rearing_batches(batch_name, emergence_date), queens!mating_nucs_queen_id_fkey(queen_number), reared_queen:queens!mating_nucs_reared_queen_id_fkey(queen_number), mating_nuc_inspections(count)')
 .eq('user_id', userId)
 .eq('nuc_number', nucNumber)
 .order('setup_date', { ascending: false })

 if (error) {
 console.error('Error fetching history:', error)
 toast.error('Failed to load history')
 } else {
 setHistoryData(data || [])
 setHistoryNucNumber(nucNumber)
 }
 }

 // A graft-linked nuc distributes through the graft. A nuc that reared its own queen
 // (direct graft, no batch) mints that queen first, then distributes her as a registry queen.
 // Marking is never required — an unmarked virgin is minted as "Nuc 198".
 const openDistribute = async (nuc: MatingNuc) => {
 if (nuc.graft_id && nuc.batch_id) {
 setDistributeQueenId(null)
 setDistributeNuc(nuc)
 return
 }

 setMintingNucId(nuc.id)
 const { data, error } = await supabase.rpc('ensure_nuc_reared_queen', { p_nuc_id: nuc.id })
 setMintingNucId(null)

 if (error || !data) {
 console.error('Error preparing nuc queen for distribution:', error)
 toast.error(error?.message || 'Could not prepare this queen for distribution')
 return
 }

 setDistributeQueenId(data as string)
 setDistributeNuc(nuc)
 fetchNucs()
 }

 const handleDistributeSave = async (data: CreateDistributionData) => {
 const success = await createDistribution(data)
 if (success === true) {
 // Also update nuc status to 'sold'
 if (distributeNuc) {
 const { error: nucError } = await supabase
 .from('mating_nucs')
 .update({ status: 'sold' })
 .eq('id', distributeNuc.id)
 .eq('user_id', userId)

 if (nucError) {
 console.error('Error updating nuc status to sold:', nucError)
 toast.error('Distribution saved but nuc status could not be updated to sold. Please update manually.')
 }
 }
 // A nuc-reared queen lives in the owner's register, so retire her from it once sent —
 // mirrors the queen detail page's registry-queen distribution.
 if (distributeQueenId) {
 const { error: queenError } = await supabase
 .from('queens')
 .update({ status: 'distributed' })
 .eq('id', distributeQueenId)
 .eq('user_id', userId)

 if (queenError) console.error('Non-blocking: failed to mark queen distributed:', queenError)
 }
 toast.success('Distribution recorded')
 fetchNucs()
 fetchGrafts()
 } else if (success === false) {
 toast.error(distributeQueenId ? 'This queen has already been distributed' : 'This graft has already been distributed')
 } else {
 toast.error('Failed to record distribution')
 }
 return success
 }

 const toggleExpand = (nucId: string) => {
 setExpandedNucId(expandedNucId === nucId ? null : nucId)
 }

 // A nuc can be bulk-selected unless it has left active management (sold or retired).
 const isNucSelectable = (nuc: MatingNuc) => !nuc.retired_at && nuc.status !== 'sold'
 // Distinct mating sites present on the loaded nucs, for the apiary filter dropdown.
 const matingSites = useMemo(
 () => Array.from(new Set(nucs.map(n => n.mating_location).filter((l): l is string => !!l)))
 .sort((a, b) => a.localeCompare(b)),
 [nucs]
 )
 // Narrow the list by search (nuc_number / reference_code, case-insensitive) and mating site.
 const trimmedNucSearch = nucSearch.trim().toLowerCase()
 const visibleNucs = useMemo(() => {
 return nucs.filter(n => {
 if (apiaryFilter && n.mating_location !== apiaryFilter) return false
 if (trimmedNucSearch &&
 !(n.nuc_number || '').toLowerCase().includes(trimmedNucSearch) &&
 !(n.reference_code || '').toLowerCase().includes(trimmedNucSearch)) return false
 return true
 })
 }, [nucs, trimmedNucSearch, apiaryFilter])
 const selectableNucs = visibleNucs.filter(isNucSelectable)
 const allSelectableSelected = selectableNucs.length > 0 && selectableNucs.every((n) => selectedNucIds.has(n.id))

 const toggleNucSelection = (id: string) => {
 setSelectedNucIds((prev) => {
 const next = new Set(prev)
 if (next.has(id)) next.delete(id)
 else next.add(id)
 return next
 })
 }

 const toggleSelectAll = () => {
 setSelectedNucIds((prev) =>
 selectableNucs.every((n) => prev.has(n.id)) ? new Set() : new Set(selectableNucs.map((n) => n.id))
 )
 }

 const clearSelection = () => setSelectedNucIds(new Set())

 const handleBulkChangeMatingSite = async () => {
 if (bulkSiteSaving) return // in-flight guard: ignore double-clicks
 const location = bulkSiteLocation.trim()
 if (!location) {
 toast.error('Select an apiary or enter a location')
 return
 }
 const ids = Array.from(selectedNucIds)
 if (ids.length === 0) {
 toast.error('No nucs selected')
 return
 }
 setBulkSiteSaving(true)
 try {
 // Chunk the ids so the PATCH filter (?id=in.(...)) can never exceed URL length
 // limits when "Select all" spans a large, unfiltered nuc list.
 const CHUNK_SIZE = 100
 for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
 const chunk = ids.slice(i, i + CHUNK_SIZE)
 const { error } = await supabase
 .from('mating_nucs')
 .update({ mating_location: location })
 .in('id', chunk)
 .eq('user_id', userId)
 if (error) throw error
 }
 toast.success(`Updated mating site for ${ids.length} nuc${ids.length === 1 ? '' : 's'}`)
 setShowBulkSiteModal(false)
 setBulkSiteLocation('')
 setSelectedNucIds(new Set())
 fetchNucs()
 } catch (error) {
 console.error('Error updating mating site:', error)
 toast.error('Failed to update mating site')
 fetchNucs() // re-sync UI with whatever actually persisted on partial failure
 } finally {
 setBulkSiteSaving(false)
 }
 }

 // Drive the tri-state "Select all" checkbox (checked / indeterminate / empty)
 useEffect(() => {
 if (selectAllRef.current) {
 selectAllRef.current.indeterminate = selectedNucIds.size > 0 && !allSelectableSelected
 }
 }, [selectedNucIds, allSelectableSelected])

 // When a search narrows the list to a single nuc, open its record automatically.
 useEffect(() => {
 if (trimmedNucSearch && visibleNucs.length === 1) {
 setExpandedNucId(visibleNucs[0].id)
 }
 }, [trimmedNucSearch, visibleNucs])

 // Keep bulk selection in sync with the visible list: when a filter (search / mating
 // site / batch / retired) changes the rendered set, drop any selected nucs that are no
 // longer shown so a bulk action can never silently act on hidden rows.
 useEffect(() => {
 const visibleIds = new Set(visibleNucs.map(n => n.id))
 setSelectedNucIds(prev => {
 if (prev.size === 0) return prev
 let changed = false
 const next = new Set<string>()
 for (const id of prev) {
 if (visibleIds.has(id)) next.add(id)
 else changed = true
 }
 return changed ? next : prev
 })
 }, [visibleNucs])

 const getStatusBadge = (status: string) => {
 const statusConfig = NUC_STATUSES.find(s => s.value === status)
 return statusConfig?.color || 'bg-surface-secondary text-text-secondary border border-border'
 }

 const bulkVisibleGrafts = availableBulkGrafts.filter((g) =>
 `Cell #${g.cell_number}`.toLowerCase().includes(bulkCellSearch.toLowerCase())
 )
 const selectedMatingLocationOptionId = matingLocationOptions.find((apiary) => apiary.name === formData.mating_location)?.id || ''

 if (loading) {
 return <div className="text-center py-8 text-text-secondary">Loading mating nucs...</div>
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex justify-between items-center flex-wrap gap-3">
 <h2 className="text-xl font-semibold text-foreground">Mating Nucs</h2>
 <div className="flex items-center gap-2">
 <Button
 onClick={() => setShowRetired(!showRetired)}
 className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
 showRetired
 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
 : 'bg-surface-secondary text-text-secondary border border-border'
 }`}
 >
 {showRetired ? <EyeOff size={16} /> : <Eye size={16} />}
 {showRetired ? 'Hide Retired' : 'Show Retired'}
 </Button>
 <Button
 onClick={() => {
 setShowForm(!showForm)
 if (!showForm) setShowBulkForm(false)
 }}
 className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 flex items-center gap-2"
 >
 {showForm ? <X size={16} /> : <Plus size={16} />}
 {showForm ? 'Cancel' : 'New Nuc'}
 </Button>
 <Button
 onClick={() => {
 setShowBulkForm(!showBulkForm)
 if (!showBulkForm) setShowForm(false)
 }}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
 >
 {showBulkForm ? <X size={16} /> : <Plus size={16} />}
 {showBulkForm ? 'Cancel Bulk' : 'Bulk Nucs'}
 </Button>
 </div>
 </div>

 {/* Create/Edit Form */}
 {showForm && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
 <h3 className="text-lg font-semibold mb-4 text-foreground">
 {editingNuc ? 'Edit Mating Nuc' : 'Create Mating Nuc'}
 </h3>
 <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {!editingNuc && inventoryNucs.length > 0 && (
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Select from Inventory</label>
 <select
 value={selectedInventoryNucId}
 onChange={(e) => {
 const selected = inventoryNucs.find(n => n.id === e.target.value)
 setSelectedInventoryNucId(e.target.value)
 setFormData({ ...formData, nuc_number: selected?.nuc_number || '' })
 }}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 >
 <option value="">- or type below -</option>
 {inventoryNucs.map(n => (
 <option key={n.id} value={n.id}>{n.nuc_number}{n.qr_tag_code ? ` (${n.qr_tag_code})` : ''}</option>
 ))}
 </select>
 </div>
 )}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Nuc Number</label>
 <input
 type="text"
 value={formData.nuc_number}
 onChange={(e) => setFormData({ ...formData, nuc_number: e.target.value })}
 placeholder="e.g., N1, N2, A-01"
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Batch</label>
 <select
 value={formData.batch_id}
 onChange={(e) => handleBatchChange(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 >
 <option value="">Select batch (optional)</option>
 {batches.map(b => (
 <option key={b.id} value={b.id}>
 {b.batch_name} ({formatDateIrish(b.graft_date)})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Grafted from</label>
 <select
 value={formData.queen_id}
 onChange={(e) => setFormData({ ...formData, queen_id: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 >
 <option value="">Select queen (optional)</option>
 {queens.map(q => (
 <option key={q.id} value={q.id}>
 {q.queen_number}
 </option>
 ))}
 </select>
 </div>

 {formData.batch_id && (
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Cell/Graft *</label>
 <select
 value={formData.graft_id}
 onChange={(e) => {
 const selectedGraft = filteredGrafts.find(g => g.id === e.target.value)
 const autoStatus = selectedGraft?.status === 'emerged' ? 'virgin' : formData.status === 'virgin' && !e.target.value ? 'cell_introduced' : formData.status
 const updates: Partial<typeof formData> & { graft_id: string; status: string } = {
   graft_id: e.target.value,
   status: e.target.value ? autoStatus : formData.status,
 }
 // Multi-breeder batches store the mother per cell; auto-fill the "Grafted from" queen
 // from the selected cell's breeder (falls back to the batch mother for single-breeder cells).
 if (selectedGraft?.breeder_queen_id) {
   updates.queen_id = selectedGraft.breeder_queen_id
 }
 if (selectedGraft?.status === 'emerged' && selectedGraft.queen_marked) {
   updates.queen_marked_at = formData.setup_date || new Date().toISOString().split('T')[0]
 } else if (!e.target.value) {
   updates.queen_marked_at = ''
 }
 setFormData({ ...formData, ...updates })
 }}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 >
 <option value="">Select cell *</option>
 {filteredGrafts.map(g => (
 <option key={g.id} value={g.id}>
 Cell #{g.cell_number} ({g.status}{g.queen_marked ? ', marked' : ''}{g.queen_number ? ` #${g.queen_number}` : ''})
 </option>
 ))}
 </select>
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Mating Location *</label>
 <select
 value={selectedMatingLocationOptionId}
 onChange={(e) => {
 const selectedApiary = matingLocationOptions.find((apiary) => apiary.id === e.target.value)
 setFormData({ ...formData, mating_location: selectedApiary?.name || '' })
 }}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 >
 <option value="">Select apiary</option>
 {matingLocationOptions.map((apiary) => (
 <option key={apiary.id} value={apiary.id}>
 {apiary.name}{apiary.is_shared ? ' (Shared)' : ''}
 </option>
 ))}
 </select>
 <input
 type="text"
 value={formData.mating_location}
 onChange={(e) => setFormData({ ...formData, mating_location: e.target.value })}
 placeholder="Or enter a custom location"
 className="w-full mt-2 px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 />
 <p className="mt-1 text-xs text-text-tertiary">Choose an apiary from the list or enter a custom location.</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Setup Date</label>
 <input
 type="date"
 value={formData.setup_date}
 onChange={(e) => setFormData({ ...formData, setup_date: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
 <select
 value={formData.status}
 onChange={(e) => setFormData({ ...formData, status: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 >
 {NUC_STATUSES.map(s => (
 <option key={s.value} value={s.value}>{s.label}</option>
 ))}
 </select>
 </div>

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={2}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 placeholder="Any additional notes..."
 />
 </div>

 <div className="md:col-span-2 flex gap-3">
 <Button
 type="submit"
 className="px-6 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700"
 >
 {editingNuc ? 'Update Nuc' : 'Create Nuc'}
 </Button>
 <Button
 type="button"
 onClick={resetForm}
 className="px-6 py-2 bg-surface-secondary text-foreground rounded-lg hover:bg-surface-elevated"
 >
 Cancel
 </Button>
 </div>
 </form>
 </div>
 )}

 {/* Bulk Create Form */}
 {showBulkForm && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border space-y-4">
 <h3 className="text-lg font-semibold text-foreground">Bulk Create Mating Nucs</h3>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Source Batch *</label>
 <select
 value={bulkFormData.source_batch_id}
 onChange={(e) => handleBulkBatchChange(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 >
 <option value="">Select batch</option>
 {batches.map((b) => (
 <option key={b.id} value={b.id}>
 {b.batch_name} ({formatDateIrish(b.graft_date)})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Bulk Mode</label>
 <select
 value={bulkFormData.mode}
 onChange={(e) => setBulkFormData((prev) => ({ ...prev, mode: e.target.value as MatingNucBulkMode, selected_graft_ids: [] }))}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 >
 {BULK_MODES.map((mode) => (
 <option key={mode.value} value={mode.value}>{mode.label}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
 <select
 value={bulkFormData.status}
 onChange={(e) => setBulkFormData((prev) => ({ ...prev, status: e.target.value }))}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 >
 {NUC_STATUSES.map(s => (
 <option key={s.value} value={s.value}>{s.label}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Mating Location *</label>
 <input
 type="text"
 value={bulkFormData.mating_location}
 onChange={(e) => setBulkFormData((prev) => ({ ...prev, mating_location: e.target.value }))}
 placeholder="Applied to all created nucs"
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 />
 </div>
 </div>

 {bulkFormData.mode === 'numbered' && (
 <div className="space-y-3">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Nuc Numbers *</label>
 <textarea
 value={bulkFormData.nuc_numbers_text}
 onChange={(e) => setBulkFormData((prev) => ({ ...prev, nuc_numbers_text: e.target.value }))}
 rows={4}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 placeholder={'Enter one per line or comma separated (e.g. N1, N2, N3)'}
 />
 </div>
 <label className="inline-flex items-center gap-2 text-sm text-foreground">
 <input
 type="checkbox"
 checked={bulkFormData.auto_assign_cells}
 onChange={(e) => setBulkFormData((prev) => ({ ...prev, auto_assign_cells: e.target.checked, selected_graft_ids: [] }))}
 />
 Auto-assign sealed cells by cell number
 </label>
 </div>
 )}

 {bulkFormData.source_batch_id && (
 <div className="border border-border rounded-md p-3 space-y-3">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <h4 className="text-sm font-semibold text-foreground">Sealed Cells</h4>
 <span className="text-xs text-text-secondary">
 Available: {availableBulkGrafts.length} | Selected: {bulkFormData.selected_graft_ids.length}
 </span>
 </div>

 {(bulkFormData.mode === 'unnumbered' || !bulkFormData.auto_assign_cells) ? (
 <>
 <div className="flex flex-wrap items-center gap-2">
 <input
 type="text"
 value={bulkCellSearch}
 onChange={(e) => setBulkCellSearch(e.target.value)}
 placeholder="Search by cell number"
 className="px-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
 />
 <Button type="button" onClick={selectAllFilteredBulkCells} className="text-xs">Select Filtered</Button>
 <Button type="button" onClick={clearAllBulkCells} className="text-xs">Clear</Button>
 </div>
 <div className="max-h-48 overflow-y-auto border border-border rounded-md p-2 space-y-1">
 {bulkVisibleGrafts.length === 0 ? (
 <p className="text-xs text-text-secondary px-1 py-2">No sealed cells available.</p>
 ) : bulkVisibleGrafts.map((g) => (
 <label key={g.id} className="flex items-center gap-2 text-sm text-foreground px-1 py-1 rounded hover:bg-surface-secondary">
 <input
 type="checkbox"
 checked={bulkFormData.selected_graft_ids.includes(g.id)}
 onChange={() => toggleBulkGraftSelection(g.id)}
 />
 Cell #{g.cell_number}
 </label>
 ))}
 </div>
 </>
 ) : (
 <p className="text-sm text-text-secondary">
 Cells will be auto-assigned from the available sealed pool in ascending cell order.
 </p>
 )}
 </div>
 )}

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
 <textarea
 value={bulkFormData.notes}
 onChange={(e) => setBulkFormData((prev) => ({ ...prev, notes: e.target.value }))}
 rows={2}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 placeholder="Optional notes for this bulk run"
 />
 </div>

 <div className="flex gap-3">
 <Button
 type="button"
 onClick={handleCreateBulkNucs}
 className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 disabled={bulkLoading}
 >
 {bulkLoading ? 'Creating...' : 'Create Bulk Nucs'}
 </Button>
 <Button
 type="button"
 onClick={resetBulkForm}
 className="px-6 py-2 bg-surface-secondary text-foreground rounded-lg hover:bg-surface-elevated"
 >
 Cancel
 </Button>
 </div>
 </div>
 )}

 {/* Nucs by Batch summary */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border border-border space-y-3">
 <div className="flex items-center justify-between gap-2 flex-wrap">
 <h3 className="text-base font-semibold text-foreground">Nucs by Batch</h3>
 {activeBatchId && (
 <Button
 type="button"
 onClick={() => setActiveBatchId(null)}
 className="text-xs px-3 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded"
 >
 Clear Batch Filter
 </Button>
 )}
 </div>

 {batchSummaries.length === 0 ? (
 <p className="text-sm text-text-secondary">No nucs assigned to a batch yet.</p>
 ) : (
 <div className="space-y-2">
 {[...batchSummaries]
   .sort((a, b) => batches.findIndex((x) => x.id === a.batch_id) - batches.findIndex((x) => x.id === b.batch_id))
   .map((summary) => {
   const isActive = activeBatchId === summary.batch_id
   return (
   <div
   key={summary.batch_id}
   className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
     isActive
       ? 'border-forest-500 ring-2 ring-forest-500/20 bg-surface dark:bg-surface-elevated/95'
       : 'border-border bg-surface dark:bg-surface-elevated/95'
   }`}
   >
   <div className="min-w-0 flex-1">
   <div className="font-semibold text-foreground">{summary.batch_name}</div>
   <div className="mt-1 flex flex-wrap gap-1">
   {NUC_STATUSES.filter((s) => summary.statusCounts[s.value]).map((s) => (
   <span key={s.value} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.color}`}>
   {summary.statusCounts[s.value]} {s.label}
   </span>
   ))}
   </div>
   </div>
   <div className="flex items-center gap-3">
   <div className="text-right">
   <div className="text-2xl font-bold leading-none text-foreground">{summary.total}</div>
   <div className="text-[11px] text-text-tertiary">nucs</div>
   </div>
   <Button
   type="button"
   onClick={() => setActiveBatchId(summary.batch_id)}
   className="text-xs px-3 py-1.5 bg-surface-secondary text-foreground rounded border border-border hover:bg-surface-elevated"
   >
   View Nucs
   </Button>
   </div>
   </div>
   )
 })}
 </div>
 )}
 </div>

 {/* Nuc filters: search + mating site */}
 <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
 <div className="relative flex-1">
 <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
 <input
 type="text"
 value={nucSearch}
 onChange={(e) => {
 const value = e.target.value
 setNucSearch(value)
 // Searching looks across all active nucs, so drop any batch filter.
 if (value.trim() && activeBatchId) setActiveBatchId(null)
 }}
 placeholder="Search by nuc number…"
 aria-label="Search nucs by number"
 className="w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-10 text-base text-foreground placeholder:text-text-tertiary focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30 dark:bg-surface-elevated/95"
 />
 {nucSearch && (
 <button
 type="button"
 onClick={() => setNucSearch('')}
 aria-label="Clear nuc search"
 className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-tertiary hover:text-foreground"
 >
 <X size={18} />
 </button>
 )}
 </div>
 <select
 value={apiaryFilter}
 onChange={(e) => setApiaryFilter(e.target.value)}
 aria-label="Filter nucs by mating site"
 className="rounded-lg border border-border bg-surface py-2.5 px-3 text-base text-foreground focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30 dark:bg-surface-elevated/95 sm:w-56"
 >
 <option value="">All mating sites</option>
 {apiaryFilter && !matingSites.includes(apiaryFilter) && (
 <option value={apiaryFilter}>{apiaryFilter}</option>
 )}
 {matingSites.map(site => (
 <option key={site} value={site}>{site}</option>
 ))}
 </select>
 </div>

 {/* Bulk action bar */}
 {selectableNucs.length > 0 && (
 <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 dark:bg-surface-elevated/95">
 <label className="inline-flex items-center gap-2 text-sm text-foreground">
 <input
 ref={selectAllRef}
 type="checkbox"
 checked={allSelectableSelected}
 onChange={toggleSelectAll}
 className="h-4 w-4 cursor-pointer rounded border-border text-forest-600 focus:ring-2 focus:ring-forest-500"
 />
 Select all
 </label>
 <span className="text-sm text-text-secondary">{selectedNucIds.size} selected</span>
 <div className="ml-auto flex items-center gap-2">
 <Button
 type="button"
 onClick={() => { setBulkSiteLocation(''); setShowBulkSiteModal(true) }}
 disabled={selectedNucIds.size === 0}
 className="px-3 py-1.5 text-sm bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Change Mating Site
 </Button>
 {selectedNucIds.size > 0 && (
 <Button
 type="button"
 onClick={clearSelection}
 className="px-3 py-1.5 text-sm bg-surface-secondary text-foreground rounded-lg hover:bg-surface-elevated"
 >
 Clear
 </Button>
 )}
 </div>
 </div>
 )}

 {/* Nucs List */}
 {visibleNucs.length === 0 ? (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-8 text-center border border-border">
 <p className="text-text-secondary">
 {trimmedNucSearch
 ? `No nucs match “${nucSearch.trim()}”.`
 : apiaryFilter
 ? `No nucs at “${apiaryFilter}”.`
 : activeBatchId ? 'No nucs found for the selected batch.' : 'No mating nucs yet. Create your first nuc above.'}
 </p>
 </div>
 ) : (
 <div className="space-y-1.5">
 {visibleNucs.map(nuc => {
 const isExpanded = expandedNucId === nuc.id
 const isSelected = selectedNucId === nuc.id
 const isHighlighted = highlightNucId === nuc.id || highlightNucNumber === nuc.nuc_number
 const statusInfo = NUC_STATUSES.find(s => s.value === nuc.status)
 const inspectionCount = nuc.mating_nuc_inspections?.[0]?.count || 0
 // A direct-graft nuc has no batch, so fall back to its own emergence date for the colour.
 const markingDate = nuc.rearing_batches?.emergence_date || nuc.queen_emerged_at
 const markingColour = markingDate ? getQueenColorFromYear(markingDate) : ''
 // The number lives on the graft cell for batch-reared queens, or on the nuc's own reared queen.
 const queenNumber = nuc.batch_grafts?.queen_number || nuc.reared_queen?.queen_number || null
 // Once a queen is marked, show its marking (colour + number) instead of the cell it came from.
 const queenMarked = !!(nuc.queen_marked_at || nuc.batch_grafts?.queen_marked)
 const cellOrMarking = queenMarked
 ? ` · Marked${markingColour ? ` ${markingColour}` : ''}${queenNumber ? ` #${queenNumber}` : ''}`
 : (nuc.batch_grafts ? ` · Cell #${nuc.batch_grafts.cell_number}` : '')

 return (
 <div
 key={nuc.id}
 id={`nuc-${nuc.id}`}
 onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; setSelectedNucId(nuc.id) }}
 className={`overflow-hidden rounded-xl border shadow-sm transition-colors cursor-pointer ${
 isHighlighted
 ? 'border-forest-500 ring-2 ring-forest-500/20 bg-surface dark:bg-surface-elevated/95'
 : isSelected
 ? 'border-emerald-400 bg-emerald-50/80 dark:border-emerald-700 dark:bg-emerald-950/25'
 : 'border-border bg-surface dark:bg-surface-elevated/95'
 }`}
 >
 {/* Collapsed row */}
 <div className="flex items-center gap-2 px-3 py-2">
 {/* Bulk-select checkbox (hidden for sold/retired nucs) */}
 {isNucSelectable(nuc) && (
 <input
 type="checkbox"
 checked={selectedNucIds.has(nuc.id)}
 onChange={() => toggleNucSelection(nuc.id)}
 onClick={(e) => e.stopPropagation()}
 aria-label={`Select nuc ${nuc.nuc_number || nuc.reference_code || ''} for bulk action`}
 className="h-4 w-4 shrink-0 cursor-pointer rounded border-border text-forest-600 focus:ring-2 focus:ring-forest-500"
 />
 )}
 {/* Name + badges */}
 <div className="min-w-0 flex-1">
 {/* Line 1: nuc name + tag */}
 <div className="flex items-center gap-1.5">
 <button
 type="button"
 onClick={() => { setSelectedNucId(nuc.id); toggleExpand(nuc.id) }}
 className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-emerald-700 dark:hover:text-emerald-300"
 aria-expanded={isExpanded}
 aria-label={isExpanded ? 'Collapse nuc details' : 'Expand nuc details'}
 >
 {isExpanded ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
 <span>{nuc.nuc_number || nuc.reference_code || 'Unnumbered Nuc'}</span>
 </button>
 {nucTagCodes[nuc.id] && (
 <span className="rounded-full bg-surface-secondary px-1.5 py-0.5 text-[11px] font-medium text-text-secondary dark:bg-surface-elevated">{nucTagCodes[nuc.id]}</span>
 )}
 </div>
 {/* Line 2: status + inspections + actions */}
 <div className="mt-0.5 flex flex-wrap items-center gap-1 pl-5">
 <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getStatusBadge(nuc.status)}`}>
 {statusInfo?.label}
 </span>
 <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
 <ClipboardList size={11} />
 {inspectionCount}
 </span>
 {!nuc.retired_at && (
 <>
 {/* No graft required: a nuc that reared its own queen mints her on demand. Marking is optional. */}
 {NUC_DISTRIBUTABLE_STATUSES.includes(nuc.status) && (
 <button type="button" onClick={() => openDistribute(nuc)} disabled={mintingNucId === nuc.id} className={`${NUC_ACTION_BUTTON_CLASS} text-indigo-600`} title="Distribute">
 <Send size={13} />
 </button>
 )}
 <button type="button" onClick={() => { if (nuc.nuc_number) fetchHistory(nuc.nuc_number) }} disabled={!nuc.nuc_number} className={`${NUC_ACTION_BUTTON_CLASS} text-blue-600`} title="View History">
 <History size={13} />
 </button>
 {nuc.status !== 'sold' && (
 <>
 <button type="button" onClick={() => handleEdit(nuc)} className={`${NUC_ACTION_BUTTON_CLASS} text-amber-600`} title="Edit">
 <Edit2 size={13} />
 </button>
 <button type="button" onClick={() => handleDelete(nuc.id)} className={`${NUC_ACTION_BUTTON_CLASS} text-red-500`} title="Delete">
 <Trash2 size={13} />
 </button>
 </>
 )}
 <button type="button" onClick={() => handleRetire(nuc.id)} className={`${NUC_ACTION_BUTTON_CLASS} text-text-secondary`} title="Retire">
 <Archive size={13} />
 </button>
 </>
 )}
 </div>
 {/* Line 3: context */}
 <p className="mt-0.5 pl-5 text-xs text-text-secondary">
 {[
 nuc.rearing_batches && `${nuc.rearing_batches.batch_name}${cellOrMarking}`,
 nuc.queens && `Breeder Queen: ${nuc.queens.queen_number}`,
 nuc.mating_location && `Mating Site: ${nuc.mating_location}`,
 ].filter(Boolean).join(' · ') || 'No batch assigned'}
 </p>
 </div>
 </div>

 {/* Expanded details + inspection panel */}
 {isExpanded && (
 <div className="border-t border-border">
 <div className="bg-surface-secondary/30 px-4 py-3 dark:bg-surface/35">
 <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
 <span className="text-text-tertiary">Setup: <span className="font-medium text-foreground">{formatDateIrish(nuc.setup_date)}</span></span>
 {nuc.cell_introduced_at && (
 <span className="text-text-tertiary">Cell in: <span className="font-medium text-foreground">{formatDateIrish(nuc.cell_introduced_at)}</span></span>
 )}
 {nuc.queen_emerged_at && (
 <span className="text-text-tertiary">Emerged: <span className="font-medium text-foreground">{formatDateIrish(nuc.queen_emerged_at)}</span></span>
 )}
 {nuc.mating_confirmed_at && (
 <span className="text-text-tertiary">Mated: <span className="font-medium text-foreground">{formatDateIrish(nuc.mating_confirmed_at)}</span></span>
 )}
 {nuc.failed_at && (
 <span className="text-text-tertiary">Dead: <span className="font-medium text-red-600 dark:text-red-400">{formatDateIrish(nuc.failed_at)}</span></span>
 )}
 {nuc.queen_last_seen_at && (
 <span className="text-text-tertiary">Queen seen: <span className="font-medium text-foreground">{formatDateIrish(nuc.queen_last_seen_at)}</span></span>
 )}
 {(nuc.queen_marked_at || nuc.batch_grafts?.queen_marked) && (
 <span className="text-text-tertiary">Marked: <span className="inline-flex items-center gap-1 font-medium text-foreground">
 {markingColour && COLOUR_DOTS[markingColour] && <span className={`inline-block h-2 w-2 rounded-full ${COLOUR_DOTS[markingColour]}`} />}
 {nuc.queen_marked_at ? formatDateIrish(nuc.queen_marked_at) : 'Recorded'}
 {queenNumber && ` (#${queenNumber})`}
 </span></span>
 )}
 {nucWeights[nuc.id] && (
 <span className="text-text-tertiary">Weight: <span className="font-medium text-foreground">{nucWeights[nuc.id]} mg</span></span>
 )}
 <span className="text-text-tertiary">Updated: <span className="font-medium text-text-secondary">{formatDateIrish(nuc.updated_at)}</span></span>
 </div>
 </div>
 <NucInspectionPanel
 nucId={nuc.id}
 nucNumber={nuc.nuc_number || nuc.reference_code || 'Unnumbered Nuc'}
 userId={userId}
 graftId={nuc.graft_id}
 nucStatus={nuc.status}
 // A direct-graft nuc has no batch, so fall back to the nuc's own emergence date —
 // otherwise the marking colour would render as "Unknown".
 emergenceDate={nuc.rearing_batches?.emergence_date || nuc.queen_emerged_at || nuc.setup_date || null}
 onInspectionChange={fetchNucs}
 readOnly={nuc.status === 'sold' || !!nuc.retired_at}
 existingQueenMarkedAt={nuc.queen_marked_at}
 existingQueenMarked={(nuc.batch_grafts?.queen_marked ?? false) || !!nuc.queen_marked_at}
 existingQueenNumber={nuc.batch_grafts?.queen_number ?? nuc.reared_queen?.queen_number ?? null}
 autoOpenForm={!!(highlightNucNumber === nuc.nuc_number || highlightNucId === nuc.id)}
 graftStatus={nuc.batch_grafts?.status || null}
 />
 </div>
 )}
 </div>
 )
 })}
 </div>
 )}

 {/* History Modal */}
 {historyNucNumber && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
 <div className="p-4 border-b border-border flex justify-between items-center">
 <h3 className="text-lg font-semibold text-foreground">
 History for Nuc {historyNucNumber}
 </h3>
 <Button
 onClick={() => setHistoryNucNumber(null)}
 className="p-2 text-text-secondary hover:text-foreground rounded"
 >
 <X size={20} />
 </Button>
 </div>
 <div className="p-4 overflow-y-auto max-h-[60vh]">
 {historyData.length === 0 ? (
 <p className="text-text-secondary text-center py-4">No history found.</p>
 ) : (
 <div className="space-y-3">
 {historyData.map((nuc, index) => (
 <div
 key={nuc.id}
 className={`p-3 rounded-lg border ${
 nuc.retired_at
 ? 'bg-surface-secondary border-border'
 : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
 }`}
 >
 <div className="flex items-center justify-between mb-2">
 <span className="font-medium text-foreground">
 Cycle {historyData.length - index}
 </span>
 <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(nuc.status)}`}>
 {NUC_STATUSES.find(s => s.value === nuc.status)?.label}
 </span>
 </div>
 <div className="text-sm text-text-secondary space-y-1">
 <div>Setup: {formatDateIrish(nuc.setup_date)}</div>
 {nuc.retired_at && <div>Retired: {formatDateIrish(nuc.retired_at)}</div>}
 {nuc.rearing_batches && (
 <div>Batch: {nuc.rearing_batches.batch_name}</div>
 )}
 {nuc.queens && (
 <div>Grafted from: {nuc.queens.queen_number}</div>
 )}
 <div>Inspections: {nuc.mating_nuc_inspections?.[0]?.count || 0}</div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Distribute Modal */}
 {distributeNuc && (distributeNuc.graft_id && distributeNuc.batch_id ? (
 <DistributeGraftModal
 graftId={distributeNuc.graft_id}
 batchId={distributeNuc.batch_id}
 cellNumber={distributeNuc.batch_grafts?.cell_number ?? 0}
 graftStatus={distributeNuc.batch_grafts?.status || (getNucDistributionType(distributeNuc.status) === 'mated_queen' ? 'mated' : 'emerged')}
 userId={userId}
 groupMemberIds={distributeGroupMemberIds}
 searchUsers={searchUsers}
 fetchRecipientApiaries={fetchRecipientApiaries}
 fetchRecipientHives={fetchRecipientHives}
 onSave={handleDistributeSave}
 onClose={() => setDistributeNuc(null)}
 defaultMatingLocation={distributeNuc.mating_location || undefined}
 />
 ) : distributeQueenId ? (
 <DistributeGraftModal
 sourceQueenId={distributeQueenId}
 distributionTypeOverride={getNucDistributionType(distributeNuc.status)}
 titleOverride={`Distribute Queen from ${distributeNuc.nuc_number || distributeNuc.reference_code || 'Nuc'}`}
 userId={userId}
 groupMemberIds={distributeGroupMemberIds}
 searchUsers={searchUsers}
 fetchRecipientApiaries={fetchRecipientApiaries}
 fetchRecipientHives={fetchRecipientHives}
 onSave={handleDistributeSave}
 onClose={() => { setDistributeNuc(null); setDistributeQueenId(null) }}
 defaultMatingLocation={distributeNuc.mating_location || undefined}
 />
 ) : null)}

 {/* Bulk Change Mating Site Modal */}
 {showBulkSiteModal && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-surface dark:bg-surface rounded-lg shadow-xl max-w-md w-full">
 <div className="p-4 border-b border-border flex justify-between items-center">
 <h3 className="text-lg font-semibold text-foreground">
 Change Mating Site ({selectedNucIds.size} nuc{selectedNucIds.size === 1 ? '' : 's'})
 </h3>
 <Button onClick={() => setShowBulkSiteModal(false)} className="p-2 text-text-secondary hover:text-foreground rounded">
 <X size={20} />
 </Button>
 </div>
 <div className="p-4 space-y-2">
 <label className="block text-sm font-medium text-text-secondary mb-1">Mating Site</label>
 <select
 value={matingLocationOptions.find((a) => a.name === bulkSiteLocation)?.id || ''}
 onChange={(e) => {
 const apiary = matingLocationOptions.find((a) => a.id === e.target.value)
 setBulkSiteLocation(apiary?.name || '')
 }}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 >
 <option value="">Select apiary</option>
 {matingLocationOptions.map((apiary) => (
 <option key={apiary.id} value={apiary.id}>
 {apiary.name}{apiary.is_shared ? ' (Shared)' : ''}
 </option>
 ))}
 </select>
 <input
 type="text"
 value={bulkSiteLocation}
 onChange={(e) => setBulkSiteLocation(e.target.value)}
 placeholder="Or enter a custom location"
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 />
 <p className="text-xs text-text-tertiary">This site will be applied to all selected nucs.</p>
 </div>
 <div className="p-4 border-t border-border flex gap-3 justify-end">
 <Button
 type="button"
 onClick={() => setShowBulkSiteModal(false)}
 disabled={bulkSiteSaving}
 className="px-4 py-2 bg-surface-secondary text-foreground rounded-lg hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Cancel
 </Button>
 <Button
 type="button"
 onClick={handleBulkChangeMatingSite}
 disabled={!bulkSiteLocation.trim() || bulkSiteSaving}
 className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {bulkSiteSaving ? 'Applying…' : 'Apply'}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}

