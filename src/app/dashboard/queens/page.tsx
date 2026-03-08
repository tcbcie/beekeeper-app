'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Search, Plus, Edit2, Trash2, X, Download, ExternalLink, Crown } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import QueenLineageTree from '@/components/QueenLineageTree'
import { Queen, QueenFormData, Batch, getQueenColorFromYear, calculateQueenAge } from '@/types/queen'
import Button from '@/components/ui/Button'

export default function QueensPage() {
 const searchParams = useSearchParams()
 const router = useRouter()
 const toast = useToast()
 const highlightedQueenId = searchParams.get('id')
 const editParam = searchParams.get('edit')
 const queenRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

 const [queens, setQueens] = useState<Queen[]>([])
 const [showForm, setShowForm] = useState(false)
 const [editingQueen, setEditingQueen] = useState<Queen | null>(null)
 const [searchTerm, setSearchTerm] = useState('')
 const [ownershipFilter, setOwnershipFilter] = useState<'my' | 'team' | 'all'>('my')
 const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all')
 const [statusFilter, setStatusFilter] = useState<'active' | 'retired' | 'dead' | 'all'>('active')
 const [loading, setLoading] = useState(true)
 const [userId, setUserId] = useState<string | null>(null)
 const [isTeamMember, setIsTeamMember] = useState(false)
 const [subspeciesOptions, setSubspeciesOptions] = useState<string[]>([])
 const [sourceOptions, setSourceOptions] = useState<string[]>([])
 const [batches, setBatches] = useState<Batch[]>([])
 const [showLineage, setShowLineage] = useState(false)
 const [deleting, setDeleting] = useState(false)
 const [formData, setFormData] = useState<QueenFormData>({
 queen_number: '',
 birth_date: '',
 marking_color: '',
 source: '',
 subspecies: '',
 lineage: '',
 queen_clipped: false,
 status: 'active',
 performance_notes: '',
 mated_at_eircode: '',
 mother_id: '',
 father_id: '',
 batch_id: '',
 })

 const fetchQueens = useCallback(async (userIdParam?: string) => {
 const currentUserId = userIdParam || userId
 if (!currentUserId) return

 // Get shared apiary IDs
 const { data: teamMemberships } = await supabase
 .from('team_members')
 .select('team_id')
 .eq('user_id', currentUserId)

 const teamIds = teamMemberships?.map(tm => tm.team_id) || []

 // Update isTeamMember state based on whether user has any team memberships
 setIsTeamMember(teamIds.length > 0)

 let sharedApiaryIds: string[] = []
 if (teamIds.length > 0) {
 const { data: sharedApiaries } = await supabase
 .from('team_apiaries')
 .select('apiary_id')
 .in('team_id', teamIds)

 sharedApiaryIds = sharedApiaries?.map(sa => sa.apiary_id) || []
 }

 // Get user IDs who share apiaries with me (owners of shared apiaries)
 let sharedUserIds: string[] = []
 if (sharedApiaryIds.length > 0) {
 const { data: sharedApiaries } = await supabase
 .from('apiaries')
 .select('user_id')
 .in('id', sharedApiaryIds)
 .neq('user_id', currentUserId)

 sharedUserIds = sharedApiaries
 ? [...new Set(sharedApiaries.map(a => a.user_id).filter(Boolean) as string[])]
 : []
 }

 // Fetch my queens + queens from users who share apiaries with me
 // Note: Self-referencing joins (mother/father) are handled separately due to Supabase limitations
 let queensQuery = supabase
 .from('queens')
 .select(`
 *,
 batch:rearing_batches!queens_batch_id_fkey(id, batch_name)
 `)

 if (sharedUserIds.length > 0) {
 queensQuery = queensQuery.or(`user_id.eq.${currentUserId},user_id.in.(${sharedUserIds.join(',')})`)
 } else {
 queensQuery = queensQuery.eq('user_id', currentUserId)
 }

 const { data: queensData, error: queensError } = await queensQuery
 .order('created_at', { ascending: false })

 if (queensError) {
 console.error('Error fetching queens:', queensError)
 setLoading(false)
 return
 }

 // Then enrich with hive, mother, and father data
 if (queensData && queensData.length > 0) {
 // Create a map of all queens for quick lookup of mother/father
 const queensMap = new Map(queensData.map(q => [q.id, q]))

 const enrichedQueens = await Promise.all(
 queensData.map(async (queen) => {
 if (!queen.id) return queen

 // Find hive that has this queen (either my hive or shared hive)
 // Include all hives regardless of status (Active, Weak, Queenless, etc.)
 const { data: hiveData, error: hiveError } = await supabase
 .from('hives')
 .select(`
 id,
 hive_number,
 apiaries (
 name
 )
 `)
 .eq('queen_id', queen.id)
 .maybeSingle()

 if (hiveError) {
 console.error(`Error fetching hive for queen ${queen.queen_number}:`, hiveError)
 }

 // Get mother from map or fetch if not in current results
 let mother = null
 if (queen.mother_id) {
 const motherFromMap = queensMap.get(queen.mother_id)
 if (motherFromMap) {
 mother = {
 id: motherFromMap.id,
 queen_number: motherFromMap.queen_number,
 marking_color: motherFromMap.marking_color,
 }
 } else {
 const { data: motherData } = await supabase
 .from('queens')
 .select('id, queen_number, marking_color')
 .eq('id', queen.mother_id)
 .maybeSingle()
 mother = motherData
 }
 }

 // Get father from map or fetch if not in current results
 let father = null
 if (queen.father_id) {
 const fatherFromMap = queensMap.get(queen.father_id)
 if (fatherFromMap) {
 father = {
 id: fatherFromMap.id,
 queen_number: fatherFromMap.queen_number,
 marking_color: fatherFromMap.marking_color,
 }
 } else {
 const { data: fatherData } = await supabase
 .from('queens')
 .select('id, queen_number, marking_color')
 .eq('id', queen.father_id)
 .maybeSingle()
 father = fatherData
 }
 }

 return {
 ...queen,
 hives: hiveData || undefined,
 mother,
 father,
 }
 })
 )
 setQueens(enrichedQueens as Queen[])
 } else {
 setQueens([])
 }

 setLoading(false)
 }, [userId])

 const fetchSubspeciesOptions = useCallback(async () => {
 const { data, error } = await supabase
 .from('dropdown_categories')
 .select(`
 id,
 dropdown_values (
 value,
 is_active,
 display_order
 )
 `)
 .eq('category_key', 'bee_subspecies')
 .single()

 if (!error && data && data.dropdown_values) {
 interface DropdownValue {
 is_active: boolean
 display_order: number
 value: string
 }
 const activeValues = (data.dropdown_values as DropdownValue[])
 .filter((v) => v.is_active)
 .sort((a, b) => a.display_order - b.display_order)
 .map((v) => v.value)
 setSubspeciesOptions(activeValues)
 }
 }, [])

 const fetchSourceOptions = useCallback(async () => {
 const { data, error } = await supabase
 .from('dropdown_categories')
 .select(`
 id,
 dropdown_values (
 value,
 is_active,
 display_order
 )
 `)
 .eq('category_key', 'queen_source')
 .single()

 if (!error && data && data.dropdown_values) {
 interface DropdownValue {
 is_active: boolean
 display_order: number
 value: string
 }
 const activeValues = (data.dropdown_values as DropdownValue[])
 .filter((v) => v.is_active)
 .sort((a, b) => a.display_order - b.display_order)
 .map((v) => v.value)
 setSourceOptions(activeValues)
 }
 }, [])

 const fetchBatches = useCallback(async (userIdParam?: string) => {
 const currentUserId = userIdParam || userId
 if (!currentUserId) return

 const { data, error } = await supabase
 .from('rearing_batches')
 .select('id, batch_name')
 .eq('user_id', currentUserId)
 .order('created_at', { ascending: false })

 if (!error && data) {
 setBatches(data)
 }
 }, [userId])

 useEffect(() => {
 const initUser = async () => {
 const id = await getCurrentUserId()
 if (!id) {
 router.push('/login')
 return
 }
 setUserId(id)
 fetchQueens(id)
 fetchSubspeciesOptions()
 fetchSourceOptions()
 fetchBatches(id)
 }
 initUser()
 }, [router, fetchQueens, fetchSubspeciesOptions, fetchSourceOptions, fetchBatches])

 // Scroll to highlighted queen when data loads
 useEffect(() => {
 if (highlightedQueenId && queens.length > 0) {
 const queenElement = queenRefs.current[highlightedQueenId]
 if (queenElement) {
 setTimeout(() => {
 queenElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
 }, 100)
 }
 }
 }, [highlightedQueenId, queens])

 // Auto-open edit form when navigating from detail page with ?edit=true
 useEffect(() => {
 if (editParam === 'true' && highlightedQueenId && queens.length > 0 && !editingQueen) {
 const queen = queens.find(q => q.id === highlightedQueenId)
 if (queen) {
 handleEdit(queen)
 }
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [editParam, highlightedQueenId, queens])

 // Auto-calculate color when birth date changes (skip for distributed queens — preserve breeder data)
 useEffect(() => {
 if (formData.birth_date && !editingQueen?.distributed_by_name) {
 const calculatedColor = getQueenColorFromYear(formData.birth_date)
 if (calculatedColor && calculatedColor !== formData.marking_color) {
 setFormData(prev => ({ ...prev, marking_color: calculatedColor }))
 }
 }
 }, [formData.birth_date, formData.marking_color, editingQueen?.distributed_by_name])

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!userId) return

 // Convert empty strings to null for optional UUID fields
 const dataToSubmit = {
 ...formData,
 mother_id: formData.mother_id || null,
 father_id: formData.father_id || null,
 batch_id: formData.batch_id || null,
 }

 try {
 if (editingQueen) {
 // For distributed queens, strip locked fields to preserve breeder provenance
 const updateData = editingQueen.distributed_by_name
 ? {
 queen_number: dataToSubmit.queen_number,
 subspecies: dataToSubmit.subspecies,
 lineage: dataToSubmit.lineage,
 queen_clipped: dataToSubmit.queen_clipped,
 status: dataToSubmit.status,
 performance_notes: dataToSubmit.performance_notes,
 mother_id: dataToSubmit.mother_id,
 father_id: dataToSubmit.father_id,
 }
 : dataToSubmit

 const { error } = await supabase
 .from('queens')
 .update(updateData)
 .eq('id', editingQueen.id)
 .eq('user_id', userId)

 if (error) throw error
 } else {
 const { error } = await supabase.from('queens').insert([{ ...dataToSubmit, user_id: userId }])
 if (error) throw error
 }

 fetchQueens()
 resetForm()
 } catch (error) {
 if (error instanceof Error) {
 toast.error(error.message)
 }
 }
 }

 const handleEdit = (queen: Queen) => {
 setEditingQueen(queen)
 setFormData({
 queen_number: queen.queen_number,
 birth_date: queen.birth_date,
 marking_color: queen.marking_color,
 source: queen.source,
 subspecies: queen.subspecies,
 lineage: queen.lineage,
 queen_clipped: queen.queen_clipped || false,
 status: queen.status,
 performance_notes: queen.performance_notes,
 mated_at_eircode: queen.mated_at_eircode || '',
 mother_id: queen.mother_id || '',
 father_id: queen.father_id || '',
 batch_id: queen.batch_id || '',
 })
 setShowForm(true)
 }

 const handleDelete = async (id: string) => {
 if (!userId || deleting) return
 setDeleting(true)

 try {
 // Check all FK references that would block deletion (NO ACTION constraints)
 const [offspringResult, configHistoryResult, batchResult] = await Promise.all([
 supabase.from('queens').select('id', { count: 'exact', head: true }).or(`mother_id.eq.${id},father_id.eq.${id}`),
 supabase.from('hive_configuration_history').select('id', { count: 'exact', head: true }).eq('queen_id', id),
 supabase.from('rearing_batches').select('id', { count: 'exact', head: true }).eq('mother_queen_id', id),
 ])

 if (offspringResult.error || configHistoryResult.error || batchResult.error) {
 toast.error('Failed to check queen references. Please try again.')
 return
 }

 const offspringCount = offspringResult.count ?? 0
 const configHistoryCount = configHistoryResult.count ?? 0
 const batchCount = batchResult.count ?? 0

 if (offspringCount > 0) {
 toast.warning(
 `This queen has ${offspringCount} offspring in the lineage tree. Consider retiring her instead to preserve breeding records.`,
 8000
 )
 return
 }

 if (configHistoryCount > 0 || batchCount > 0) {
 toast.warning(
 'This queen has hive history or batch records. Consider retiring her instead to preserve historical data.',
 8000
 )
 return
 }

 if (confirm('Are you sure you want to delete this queen?')) {
 const { error } = await supabase.from('queens').delete().eq('id', id).eq('user_id', userId)
 if (error) {
 toast.error('Failed to delete queen. She may be referenced by other records.')
 } else {
 toast.success('Queen deleted successfully.')
 fetchQueens()
 }
 }
 } finally {
 setDeleting(false)
 }
 }

 const resetForm = () => {
 setShowForm(false)
 setEditingQueen(null)
 setShowLineage(false)
 setFormData({
 queen_number: '',
 birth_date: '',
 marking_color: '',
 source: '',
 subspecies: '',
 lineage: '',
 queen_clipped: false,
 status: 'active',
 performance_notes: '',
 mated_at_eircode: '',
 mother_id: '',
 father_id: '',
 batch_id: '',
 })
 }

 const exportCSV = () => {
 // Helper to escape CSV values containing commas or quotes
 const escapeCSV = (value: string | null | undefined): string => {
 if (value === null || value === undefined) return ''
 const str = String(value)
 if (str.includes(',') || str.includes('"') || str.includes('\n')) {
 return `"${str.replace(/"/g, '""')}"`
 }
 return str
 }

 const csv = [
 [
 'Queen Number',
 'Birth Date',
 'Age',
 'Marking Color',
 'Source',
 'Subspecies',
 'Lineage',
 'Mother',
 'Father',
 'Source Batch',
 'Hive',
 'Apiary',
 'Mated At (Eircode)',
 'Queen Clipped',
 'Status',
 'Performance Notes',
 ],
 ...filteredQueens.map((q) => [
 escapeCSV(q.queen_number),
 escapeCSV(q.birth_date),
 escapeCSV(calculateQueenAge(q.birth_date)),
 escapeCSV(q.marking_color),
 escapeCSV(q.source),
 escapeCSV(q.subspecies),
 escapeCSV(q.lineage),
 escapeCSV(q.mother?.queen_number || ''),
 escapeCSV(q.father?.queen_number || ''),
 escapeCSV(q.batch?.batch_name || ''),
 escapeCSV(q.hives?.hive_number || ''),
 escapeCSV(q.hives?.apiaries?.name || ''),
 escapeCSV(q.mated_at_eircode),
 q.queen_clipped ? 'Yes' : 'No',
 escapeCSV(q.status),
 escapeCSV(q.performance_notes),
 ]),
 ]
 .map((row) => row.join(','))
 .join('\n')

 const blob = new Blob([csv], { type: 'text/csv' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url
 a.download = `queens-${new Date().toISOString().split('T')[0]}.csv`
 a.click()
 }

 const filteredQueens = queens.filter((q) => {
 // Apply search filter
 const matchesSearch =
 q.queen_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
 (q.subspecies && q.subspecies.toLowerCase().includes(searchTerm.toLowerCase()))

 if (!matchesSearch) return false

 // Apply status filter
 if (statusFilter !== 'all' && q.status !== statusFilter) return false

 // Apply assignment filter
 if (assignmentFilter === 'assigned' && !q.hives?.id) return false
 if (assignmentFilter === 'unassigned' && q.hives?.id) return false

 // Apply ownership filter
 if (ownershipFilter === 'my') {
 return q.user_id === userId
 } else if (ownershipFilter === 'team') {
 return q.user_id !== userId
 } else {
 // 'all' shows both
 return true
 }
 })

 // Summary stats (computed from ALL queens so user can see what's hidden by filters)
 const activeQueens = queens.filter(q => q.status === 'active').length
 const retiredQueens = queens.filter(q => q.status === 'retired').length
 const deadQueens = queens.filter(q => q.status === 'dead').length
 const avgAgeMonths = (() => {
 const activeWithDates = queens.filter(q => q.status === 'active' && q.birth_date)
 if (activeWithDates.length === 0) return 0
 const totalDays = activeWithDates.reduce((sum, q) => {
 return sum + Math.floor((Date.now() - new Date(q.birth_date).getTime()) / (1000 * 60 * 60 * 24))
 }, 0)
 return Math.round(totalDays / activeWithDates.length / 30)
 })()

 const colorOptions = ['White', 'Yellow', 'Red', 'Green', 'Blue', 'None']

 if (loading) return <LoadingSpinner text="Loading queens..." />

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h1 className="text-3xl font-bold text-foreground">Queens 👑</h1>
 <div className="flex gap-2">
 <Button
 onClick={exportCSV}
 className="px-4 py-2 bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated font-medium flex items-center gap-2 min-h-[48px] border border-border"
 >
 <Download size={16} /> Export CSV
 </Button>
 <Button
 onClick={() => setShowForm(!showForm)}
 className="px-4 py-2 bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 font-medium flex items-center gap-2 min-h-[48px]"
 >
 {showForm ? <X size={16} /> : <Plus size={16} />}
 {showForm ? 'Cancel' : 'Add Queen'}
 </Button>
 </div>
 </div>

 {showForm && (
 <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
 <h3 className="text-xl font-semibold mb-4 text-foreground">
 {editingQueen ? 'Edit Queen' : 'Add New Queen'}
 </h3>
 {editingQueen?.distributed_by_name && (
 <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-200">
 <p className="font-medium">Distributed Queen</p>
 <p>Breeder: {editingQueen.distributed_by_name}</p>
 {editingQueen.distributed_batch_name && (
 <p>Batch: {editingQueen.distributed_batch_name}</p>
 )}
 <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
 Birth date, marking colour, source, mated at, and source batch fields are locked for distributed queens.
 </p>
 </div>
 )}
 <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Queen Number
 </label>
 <input
 type="text"
 value={formData.queen_number}
 onChange={(e) => setFormData({ ...formData, queen_number: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Birth Date</label>
 <input
 type="date"
 value={formData.birth_date}
 onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
 disabled={!!editingQueen?.distributed_by_name}
 className={`w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500 ${editingQueen?.distributed_by_name ? 'opacity-60 cursor-not-allowed' : ''}`}
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Marking Color
 {formData.birth_date && (
 <span className="ml-2 text-xs text-forest-600 dark:text-forest-400 font-normal">
 (Auto-set based on birth year)
 </span>
 )}
 </label>
 <select
 value={formData.marking_color}
 onChange={(e) => setFormData({ ...formData, marking_color: e.target.value })}
 disabled={!!editingQueen?.distributed_by_name}
 className={`w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500 ${editingQueen?.distributed_by_name ? 'opacity-60 cursor-not-allowed' : ''}`}
 >
 <option value="">Select color</option>
 {colorOptions.map((color) => (
 <option key={color} value={color}>
 {color}
 </option>
 ))}
 </select>
 <p className="text-xs text-text-tertiary mt-1">
 International standard: White (1,6) | Yellow (2,7) | Red (3,8) | Green (4,9) | Blue (5,0)
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Source</label>
 <select
 value={formData.source}
 onChange={(e) => setFormData({ ...formData, source: e.target.value })}
 disabled={!!editingQueen?.distributed_by_name}
 className={`w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500 ${editingQueen?.distributed_by_name ? 'opacity-60 cursor-not-allowed' : ''}`}
 >
 <option value="">Select source</option>
 {sourceOptions.map((source) => (
 <option key={source} value={source}>
 {source}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Subspecies</label>
 <select
 value={formData.subspecies}
 onChange={(e) => setFormData({ ...formData, subspecies: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="">Select subspecies</option>
 {subspeciesOptions.map((subspecies) => (
 <option key={subspecies} value={subspecies}>
 {subspecies}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Lineage</label>
 <input
 type="text"
 value={formData.lineage}
 onChange={(e) => setFormData({ ...formData, lineage: e.target.value })}
 placeholder="e.g., Queen's mother/breeder line"
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Mother Queen</label>
 <select
 value={formData.mother_id}
 onChange={(e) => setFormData({ ...formData, mother_id: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="">Select mother queen (optional)</option>
 {queens
 .filter((q) => q.id !== editingQueen?.id)
 .map((q) => (
 <option key={q.id} value={q.id}>
 {q.queen_number} {q.marking_color ? `(${q.marking_color})` : ''}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Father Queen</label>
 <select
 value={formData.father_id}
 onChange={(e) => setFormData({ ...formData, father_id: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="">Select father queen (optional)</option>
 {queens
 .filter((q) => q.id !== editingQueen?.id)
 .map((q) => (
 <option key={q.id} value={q.id}>
 {q.queen_number} {q.marking_color ? `(${q.marking_color})` : ''}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Source Batch</label>
 {editingQueen?.distributed_by_name ? (
 <input
 type="text"
 value={editingQueen.distributed_batch_name || ''}
 disabled
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground opacity-60 cursor-not-allowed"
 />
 ) : (
 <select
 value={formData.batch_id}
 onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="">Select source batch (optional)</option>
 {batches.map((b) => (
 <option key={b.id} value={b.id}>
 {b.batch_name}
 </option>
 ))}
 </select>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Mated at (Eircode)
 </label>
 <input
 type="text"
 value={formData.mated_at_eircode}
 onChange={(e) => setFormData({ ...formData, mated_at_eircode: e.target.value.toUpperCase() })}
 placeholder="e.g., H91 E6K2"
 maxLength={8}
 disabled={!!editingQueen?.distributed_by_name}
 className={`w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary uppercase focus:ring-2 focus:ring-forest-500 focus:border-forest-500 ${editingQueen?.distributed_by_name ? 'opacity-60 cursor-not-allowed' : ''}`}
 />
 <p className="text-xs text-text-tertiary mt-1">
 Irish postcode where the queen was mated
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
 <select
 value={formData.status}
 onChange={(e) => setFormData({ ...formData, status: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="active">Active</option>
 <option value="retired">Retired</option>
 <option value="dead">Dead</option>
 </select>
 </div>

 <div className="flex items-center">
 <input
 type="checkbox"
 id="queen_clipped"
 checked={formData.queen_clipped}
 onChange={(e) => setFormData({ ...formData, queen_clipped: e.target.checked })}
 className="w-4 h-4 text-forest-600 dark:text-emerald-600 border-border rounded focus:ring-forest-500 dark:focus:ring-emerald-500 bg-surface dark:bg-surface-elevated"
 />
 <label htmlFor="queen_clipped" className="ml-2 text-sm font-medium text-text-secondary">
 Queen Clipped
 </label>
 </div>

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Performance Notes
 </label>
 <textarea
 value={formData.performance_notes}
 onChange={(e) =>
 setFormData({ ...formData, performance_notes: e.target.value })
 }
 rows={3}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 </div>

 <div className="md:col-span-2 flex gap-3">
 <Button
 type="submit"
 className="px-6 py-2 bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 min-h-[48px]"
 >
 {editingQueen ? 'Update' : 'Add'} Queen
 </Button>
 <Button
 type="button"
 onClick={resetForm}
 className="px-6 py-2 bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated min-h-[48px]"
 >
 Cancel
 </Button>
 </div>
 </form>

 {/* Lineage Tree - only show when editing an existing queen */}
 {editingQueen && (
 <QueenLineageTree
 queenId={editingQueen.id}
 expanded={showLineage}
 onToggle={() => setShowLineage(!showLineage)}
 />
 )}
 </div>
 )}

 {/* Summary stats */}
 {queens.length > 0 && (
 <p className="text-sm text-text-secondary">
 {activeQueens} Active | {retiredQueens} Retired | {deadQueens} Dead | Avg Age: {avgAgeMonths} months
 </p>
 )}

 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <div className="mb-4 flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <Search
 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary"
 size={20}
 />
 <input
 type="text"
 placeholder="Search by queen number or subspecies..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 px-4 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 </div>
 {isTeamMember && (
 <select
 value={ownershipFilter}
 onChange={(e) => setOwnershipFilter(e.target.value as 'my' | 'team' | 'all')}
 className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500 transition-all"
 >
 <option value="my">My Queens</option>
 <option value="team">Team Queens</option>
 <option value="all">All Queens</option>
 </select>
 )}
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value as 'active' | 'retired' | 'dead' | 'all')}
 className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500 transition-all"
 >
 <option value="active">Active</option>
 <option value="retired">Retired</option>
 <option value="dead">Dead</option>
 <option value="all">All Statuses</option>
 </select>
 <select
 value={assignmentFilter}
 onChange={(e) => setAssignmentFilter(e.target.value as 'all' | 'assigned' | 'unassigned')}
 className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500 transition-all"
 >
 <option value="all">All Queens</option>
 <option value="assigned">Assigned</option>
 <option value="unassigned">Unassigned</option>
 </select>
 </div>

 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-border">
 <thead className="bg-surface-secondary">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
 Actions
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
 Queen Number
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
 Mother
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
 Age
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
 Color
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
 Hive
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
 Apiary
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
 Status
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filteredQueens.map((queen) => (
 <tr
 key={queen.id}
 ref={(el) => {
 queenRefs.current[queen.id] = el
 }}
 className={`transition-all duration-500 ${
 highlightedQueenId === queen.id
 ? 'bg-forest-100 dark:bg-forest-900/30 hover:bg-forest-200 dark:hover:bg-forest-900/40 border-l-4 border-forest-600 dark:border-forest-500'
 : 'hover:bg-surface-secondary'
 }`}
 >
 <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
 <Button
 onClick={() => handleEdit(queen)}
 className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
 >
 <Edit2 size={16} />
 </Button>
 <Button
 onClick={() => handleDelete(queen.id)}
 className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
 >
 <Trash2 size={16} />
 </Button>
 </td>
 <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
 <Link
 href={`/dashboard/queens/${queen.id}`}
 className="text-forest-600 dark:text-forest-400 hover:text-forest-700 dark:hover:text-forest-300 hover:underline"
 >
 {queen.queen_number}
 </Link>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-text-secondary">
 {queen.mother ? (
 <span className="text-forest-600 dark:text-forest-400 font-medium">
 {queen.mother.queen_number}
 </span>
 ) : (
 'N/A'
 )}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-text-primary font-medium">
 <span className="flex items-center gap-1.5">
 {calculateQueenAge(queen.birth_date)}
 {queen.status === 'active' && queen.birth_date && (Date.now() - new Date(queen.birth_date).getTime()) > 2 * 365 * 24 * 60 * 60 * 1000 && (
 <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-700">
 Replace soon
 </span>
 )}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span
 className={`px-2 py-1 rounded text-xs font-medium ${
 queen.marking_color === 'Yellow'
 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-foreground dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800'
 : queen.marking_color === 'Red'
 ? 'bg-red-100 dark:bg-red-900/30 text-foreground dark:text-red-300 border border-red-300 dark:border-red-800'
 : queen.marking_color === 'Green'
 ? 'bg-green-100 dark:bg-green-900/30 text-foreground dark:text-green-300 border border-green-300 dark:border-green-800'
 : queen.marking_color === 'Blue'
 ? 'bg-blue-100 dark:bg-blue-900/30 text-foreground dark:text-blue-300 border border-blue-300 dark:border-blue-800'
 : 'bg-surface-secondary text-text-secondary border border-border'
 }`}
 >
 {queen.marking_color || 'None'}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-text-secondary">
 {queen.hives?.id ? (
 <Link
 href={`/dashboard/hives/${queen.hives.id}`}
 className="text-forest-600 dark:text-forest-400 hover:text-forest-700 dark:hover:text-forest-300 hover:underline flex items-center gap-1 font-medium"
 >
 {queen.hives.hive_number}
 <ExternalLink size={12} />
 </Link>
 ) : (
 'N/A'
 )}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-text-secondary">
 {queen.hives?.apiaries?.name || 'N/A'}
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span
 className={`px-2 py-1 rounded text-xs font-medium ${
 queen.status === 'active'
 ? 'bg-green-100 dark:bg-green-900/30 text-foreground dark:text-green-300 border border-green-300 dark:border-green-800'
 : 'bg-surface-secondary text-text-secondary border border-border'
 }`}
 >
 {queen.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 {filteredQueens.length === 0 && (
 <div className="py-4">
 <EmptyState
 icon={Crown}
 title="No Queens Found"
 description="Track your queens, their lineage, marking colours, and performance records."
 actionLabel="Add Queen"
 actionOnClick={() => setShowForm(true)}
 />
 </div>
 )}
 </div>
 </div>
 </div>
 )
}
