'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Archive, Trash2, X, ClipboardList, MapPin, Calendar, ChevronDown, ChevronUp, History, Eye, EyeOff, Send } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import NucInspectionPanel from './NucInspectionPanel'
import { getQueenColorFromYear } from '@/types/queen'
import { COLOUR_DOTS } from './graftConstants'
import { useGraftDistributions } from '@/hooks/useGraftDistributions'
import type { CreateDistributionData } from '@/hooks/useGraftDistributions'
import { useMatingNucBulk } from '@/hooks/useMatingNucBulk'
import type { AvailableSealedGraft, MatingNucBulkRun, MatingNucBulkMode } from '@/hooks/useMatingNucBulk'
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
 queens?: {
 queen_number: string
 } | null
 mating_nuc_inspections?: { count: number }[]
}

interface MatingNucsTabProps {
 userId: string
}

const NUC_STATUSES = [
 { value: 'setup', label: 'Setup', color: 'bg-surface-secondary text-text-secondary border border-border' },
 { value: 'graft_introduced', label: 'Graft Introduced', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
 { value: 'cell_introduced', label: 'Cell Introduced', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
 { value: 'virgin', label: 'Virgin Queen', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
 { value: 'mating', label: 'Mated', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
 { value: 'laying', label: 'Laying', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
 { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
 { value: 'sold', label: 'Sold', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' },
 { value: 'merged', label: 'Merged', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
]

// Format date to Irish format (DD/MM/YYYY)
const formatDateIrish = (dateString: string | null): string => {
 if (!dateString) return '-'
 const date = new Date(dateString)
 const day = date.getDate().toString().padStart(2, '0')
 const month = (date.getMonth() + 1).toString().padStart(2, '0')
 const year = date.getFullYear()
 return `${day}/${month}/${year}`
}

const NUC_DISTRIBUTABLE_STATUSES = ['virgin', 'mating', 'laying']
const BULK_MODES: { value: MatingNucBulkMode; label: string }[] = [
 { value: 'numbered', label: 'Numbered Nucs' },
 { value: 'unnumbered', label: 'Unnumbered from Sealed Cells' },
]

const getNucDistributionType = (status: string): 'virgin_queen' | 'mated_queen' => {
 if (status === 'laying') return 'mated_queen'
 return 'virgin_queen'
}

export default function MatingNucsTab({ userId }: MatingNucsTabProps) {
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
 const [showRetired, setShowRetired] = useState(false)
 const [historyNucNumber, setHistoryNucNumber] = useState<string | null>(null)
 const [historyData, setHistoryData] = useState<MatingNuc[]>([])
 const [distributeNuc, setDistributeNuc] = useState<MatingNuc | null>(null)
 const [distributeGroupMemberIds, setDistributeGroupMemberIds] = useState<string[]>([])
 const [showBulkForm, setShowBulkForm] = useState(false)
 const [bulkLoading, setBulkLoading] = useState(false)
 const [bulkRuns, setBulkRuns] = useState<MatingNucBulkRun[]>([])
 const [bulkRunsLoading, setBulkRunsLoading] = useState(false)
 const [activeBulkBatchId, setActiveBulkBatchId] = useState<string | null>(null)
 const [availableBulkGrafts, setAvailableBulkGrafts] = useState<AvailableSealedGraft[]>([])
 const [bulkCellSearch, setBulkCellSearch] = useState('')
 const [matingLocationOptions, setMatingLocationOptions] = useState<MatingLocationOption[]>([])

 const {
 createDistribution,
 searchUsers,
 fetchRecipientApiaries,
 fetchRecipientHives,
 } = useGraftDistributions()

 const {
 fetchBulkRuns,
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

 const fetchNucs = useCallback(async () => {
 let query = supabase
 .from('mating_nucs')
 .select('*, batch_grafts(cell_number, status, queen_marked, queen_number), rearing_batches(batch_name, emergence_date), queens(queen_number), mating_nuc_inspections(count)')
 .eq('user_id', userId)

 // Filter by retired status
 if (showRetired) {
 query = query.not('retired_at', 'is', null)
 } else {
 query = query.is('retired_at', null)
 }

 if (activeBulkBatchId) {
 query = query.eq('creation_batch_id', activeBulkBatchId)
 }

 const { data, error } = await query.order('created_at', { ascending: false })

 if (error) {
 console.error('Error fetching nucs:', error)
 } else if (data) {
 setNucs(data)

 // Sync graft statuses: ensure grafts assigned to active nucs show 'in_nuc'
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
     .then(({ error: syncError }) => {
       if (syncError) console.error('Failed to sync graft statuses:', syncError)
     })
 }
 }
 setLoading(false)
 }, [userId, showRetired, activeBulkBatchId])

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

 const { data: teamMemberships, error: teamMembershipsError } = await supabase
 .from('team_members')
 .select('team_id')
 .eq('user_id', userId)

 if (teamMembershipsError) throw teamMembershipsError

 const teamIds = (teamMemberships || []).map((membership) => membership.team_id)
 let sharedApiaries: MatingLocationOption[] = []

 if (teamIds.length > 0) {
 const { data: teamApiaryData, error: teamApiaryError } = await supabase
 .from('team_apiaries')
 .select('apiary_id, apiaries(id, name, user_id)')
 .in('team_id', teamIds)

 if (teamApiaryError) throw teamApiaryError

 sharedApiaries = (teamApiaryData || [])
 .map((entry) => {
 const relatedApiary = Array.isArray(entry.apiaries) ? entry.apiaries[0] : entry.apiaries
 if (!relatedApiary) return null

 return {
 id: relatedApiary.id as string,
 name: relatedApiary.name as string,
 is_shared: (relatedApiary.user_id as string) !== userId,
 }
 })
 .filter((apiary): apiary is MatingLocationOption => Boolean(apiary && apiary.is_shared))
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

 const loadBulkRuns = useCallback(async () => {
 try {
 setBulkRunsLoading(true)
 const data = await fetchBulkRuns(userId)
 setBulkRuns(data)
 } catch (error) {
 console.error('Error loading mating nuc bulk runs:', error)
 toast.error('Failed to load bulk nuc runs')
 } finally {
 setBulkRunsLoading(false)
 }
 }, [fetchBulkRuns, userId, toast])

 useEffect(() => {
 fetchNucs()
 fetchBatches()
 fetchGrafts()
 fetchQueens()
 fetchMatingLocationOptions()
 loadBulkRuns()
 }, [fetchNucs, fetchBatches, fetchGrafts, fetchQueens, fetchMatingLocationOptions, loadBulkRuns])

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
 setActiveBulkBatchId(result.batchId)
 await fetchNucs()
 await fetchGrafts()
 await loadBulkRuns()
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
 notes: '',
 })
 setEditingNuc(null)
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

 const nucData = {
 nuc_number: formData.nuc_number || null,
 batch_id: formData.batch_id || null,
 graft_id: formData.graft_id || null,
 queen_id: formData.queen_id || null,
 mating_location: formData.mating_location || null,
 status: formData.status,
 setup_date: formData.setup_date || null,
 notes: formData.notes || null,
 user_id: userId,
 }

 try {
 if (editingNuc) {
 const { error } = await supabase
 .from('mating_nucs')
 .update(nucData)
 .eq('id', editingNuc.id)

 if (error) throw error
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
 }

 toast.success('Mating nuc created')
 }

 fetchNucs()
 fetchGrafts()
 resetForm()
 } catch (error) {
 console.error('Error saving nuc:', error)
 toast.error('Failed to save mating nuc')
 }
 }

 const handleRetire = async (id: string) => {
 if (!confirm('Retire this nuc? It will be archived but history preserved.')) return

 try {
 const { error } = await supabase
 .from('mating_nucs')
 .update({ retired_at: new Date().toISOString() })
 .eq('id', id)

 if (error) throw error
 toast.success('Nuc retired')
 fetchNucs()
 } catch (error) {
 console.error('Error retiring nuc:', error)
 toast.error('Failed to retire mating nuc')
 }
 }

 const handleDelete = async (id: string) => {
 if (!confirm('Delete this nuc permanently? This will also delete all its inspections. This cannot be undone.')) return

 try {
 // Reset graft status from 'in_nuc' back to 'emerged' before deleting
 const nuc = nucs.find(n => n.id === id)
 if (nuc?.graft_id) {
 await supabase
   .from('batch_grafts')
   .update({ status: 'sealed', queen_marked: false, queen_number: null })
   .eq('id', nuc.graft_id)
   .eq('status', 'in_nuc')
 }

 const { error } = await supabase
 .from('mating_nucs')
 .delete()
 .eq('id', id)

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
 .select('*, batch_grafts(cell_number, status, queen_marked, queen_number), rearing_batches(batch_name, emergence_date), queens(queen_number), mating_nuc_inspections(count)')
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

 const handleDistributeSave = async (data: CreateDistributionData) => {
 const success = await createDistribution(data)
 if (success === true) {
 // Also update nuc status to 'sold'
 if (distributeNuc) {
 const { error: nucError } = await supabase
 .from('mating_nucs')
 .update({ status: 'sold' })
 .eq('id', distributeNuc.id)

 if (nucError) {
 console.error('Error updating nuc status to sold:', nucError)
 toast.error('Distribution saved but nuc status could not be updated to sold. Please update manually.')
 }
 }
 toast.success('Distribution recorded')
 fetchNucs()
 fetchGrafts()
 } else if (success === false) {
 toast.error('This graft has already been distributed')
 } else {
 toast.error('Failed to record distribution')
 }
 return success
 }

 const toggleExpand = (nucId: string) => {
 setExpandedNucId(expandedNucId === nucId ? null : nucId)
 }

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
 <label className="block text-sm font-medium text-text-secondary mb-1">Cell/Graft</label>
 <select
 value={formData.graft_id}
 onChange={(e) => setFormData({ ...formData, graft_id: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface text-foreground"
 >
 <option value="">Select cell (optional)</option>
 {filteredGrafts.map(g => (
 <option key={g.id} value={g.id}>
 Cell #{g.cell_number} ({g.status})
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

 {/* Bulk Runs Table */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-4 border border-border space-y-3">
 <div className="flex items-center justify-between gap-2 flex-wrap">
 <h3 className="text-base font-semibold text-foreground">Bulk Nuc Runs</h3>
 {activeBulkBatchId && (
 <Button
 type="button"
 onClick={() => setActiveBulkBatchId(null)}
 className="text-xs px-3 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded"
 >
 Clear Batch Filter
 </Button>
 )}
 </div>

 {bulkRunsLoading ? (
 <p className="text-sm text-text-secondary">Loading bulk runs...</p>
 ) : bulkRuns.length === 0 ? (
 <p className="text-sm text-text-secondary">No bulk runs created yet.</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="text-left border-b border-border">
 <th className="py-2 pr-3 text-text-secondary">Date</th>
 <th className="py-2 pr-3 text-text-secondary">Batch</th>
 <th className="py-2 pr-3 text-text-secondary">Mode</th>
 <th className="py-2 pr-3 text-text-secondary">Requested</th>
 <th className="py-2 pr-3 text-text-secondary">Created</th>
 <th className="py-2 text-text-secondary">Actions</th>
 </tr>
 </thead>
 <tbody>
 {bulkRuns.map((run) => (
 <tr key={run.id} className="border-b border-border last:border-b-0">
 <td className="py-2 pr-3 text-foreground">{formatDateIrish(run.created_at)}</td>
 <td className="py-2 pr-3 text-foreground">{run.rearing_batches?.batch_name || 'Unknown batch'}</td>
 <td className="py-2 pr-3 text-foreground">{run.mode === 'numbered' ? 'Numbered' : 'Unnumbered'}</td>
 <td className="py-2 pr-3 text-foreground">{run.requested_count}</td>
 <td className="py-2 pr-3 text-foreground">{run.created_count}</td>
 <td className="py-2">
 <Button
 type="button"
 onClick={() => setActiveBulkBatchId(run.id)}
 className="text-xs px-2 py-1 bg-surface-secondary text-foreground rounded hover:bg-surface-elevated"
 >
 View Nucs
 </Button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Nucs List */}
 {nucs.length === 0 ? (
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-8 text-center border border-border">
 <p className="text-text-secondary">
 {activeBulkBatchId ? 'No nucs found for the selected bulk run.' : 'No mating nucs yet. Create your first nuc above.'}
 </p>
 </div>
 ) : (
 <div className="space-y-2">
 {nucs.map(nuc => (
 <div key={nuc.id} className="bg-surface dark:bg-surface rounded-lg shadow border border-border overflow-hidden">
 {/* Nuc Row */}
 <div className="p-4">
 <div className="flex items-start gap-3">
 {/* Expand/Collapse Button */}
 <Button
 onClick={() => toggleExpand(nuc.id)}
 className="p-2 text-text-secondary hover:text-foreground hover:bg-surface-secondary rounded transition-colors shrink-0"
 title={expandedNucId === nuc.id ? 'Collapse' : 'Expand inspections'}
 >
 {expandedNucId === nuc.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
 </Button>

 {/* Main Content */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center flex-wrap gap-2 mb-2">
 <span className="font-semibold text-foreground text-lg">{nuc.nuc_number || nuc.reference_code || 'Unnumbered Nuc'}</span>
 <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(nuc.status)}`}>
 {NUC_STATUSES.find(s => s.value === nuc.status)?.label}
 </span>
 <span className="text-sm text-text-secondary flex items-center gap-1">
 <ClipboardList size={14} />
 {nuc.mating_nuc_inspections?.[0]?.count || 0} inspections
 </span>
 </div>

 <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
 {nuc.rearing_batches && (
 <span>
 Batch: {nuc.rearing_batches.batch_name}
 {nuc.batch_grafts && ` - Cell #${nuc.batch_grafts.cell_number}`}
 </span>
 )}
 {nuc.queens && (
 <span>Grafted from: {nuc.queens.queen_number}</span>
 )}
 {nuc.mating_location && (
 <span className="flex items-center gap-1">
 <MapPin size={14} /> {nuc.mating_location}
 </span>
 )}
 <span className="flex items-center gap-1">
 <Calendar size={14} /> Setup: {formatDateIrish(nuc.setup_date)}
 </span>
 {nuc.cell_introduced_at && (
 <span>Cell In: {formatDateIrish(nuc.cell_introduced_at)}</span>
 )}
 {nuc.queen_emerged_at && (
 <span>Emerged: {formatDateIrish(nuc.queen_emerged_at)}</span>
 )}
 {nuc.mating_confirmed_at && (
 <span>Mated: {formatDateIrish(nuc.mating_confirmed_at)}</span>
 )}
 {nuc.failed_at && (
 <span className="text-red-600 dark:text-red-400">Dead: {formatDateIrish(nuc.failed_at)}</span>
 )}
 {nuc.queen_last_seen_at && (
 <span>Queen Seen: {formatDateIrish(nuc.queen_last_seen_at)}</span>
 )}
 {nuc.queen_marked_at && (() => {
 const colour = nuc.rearing_batches?.emergence_date ? getQueenColorFromYear(nuc.rearing_batches.emergence_date) : ''
 return (
 <span className="flex items-center gap-1">
 {colour && COLOUR_DOTS[colour] && <span className={`inline-block w-3 h-3 rounded-full ${COLOUR_DOTS[colour]}`} />}
 Marked: {formatDateIrish(nuc.queen_marked_at)}
 {nuc.batch_grafts?.queen_number && ` (#${nuc.batch_grafts.queen_number})`}
 </span>
 )
 })()}
 <span className="text-text-tertiary">
 Updated: {formatDateIrish(nuc.updated_at)}
 </span>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="flex gap-1 shrink-0">
 {nuc.graft_id && NUC_DISTRIBUTABLE_STATUSES.includes(nuc.status) && (
 <Button
 onClick={() => setDistributeNuc(nuc)}
 className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
 title="Distribute"
 >
 <Send size={18} />
 </Button>
 )}
 <Button
 onClick={() => nuc.nuc_number ? fetchHistory(nuc.nuc_number) : null}
 disabled={!nuc.nuc_number}
 className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
 title="View History"
 >
 <History size={18} />
 </Button>
 {nuc.status !== 'sold' && (
 <>
 <Button
 onClick={() => handleEdit(nuc)}
 className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded"
 title="Edit"
 >
 <Edit2 size={18} />
 </Button>
 <Button
 onClick={() => handleDelete(nuc.id)}
 className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
 title="Delete"
 >
 <Trash2 size={18} />
 </Button>
 </>
 )}
 {!nuc.retired_at && (
 <Button
 onClick={() => handleRetire(nuc.id)}
 className="p-2 text-text-secondary hover:bg-surface-secondary rounded"
 title="Retire"
 >
 <Archive size={18} />
 </Button>
 )}
 </div>
 </div>
 </div>

 {/* Expandable Inspection Panel */}
 {expandedNucId === nuc.id && (
 <NucInspectionPanel
 nucId={nuc.id}
 nucNumber={nuc.nuc_number || nuc.reference_code || 'Unnumbered Nuc'}
 userId={userId}
 graftId={nuc.graft_id}
 emergenceDate={nuc.rearing_batches?.emergence_date || null}
 onInspectionChange={fetchNucs}
 readOnly={nuc.status === 'sold'}
 />
 )}
 </div>
 ))}
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
 {distributeNuc && distributeNuc.graft_id && distributeNuc.batch_id && (
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
 />
 )}
 </div>
 )
}

