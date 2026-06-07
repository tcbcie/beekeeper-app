'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { isValidEircode } from '@/lib/eircode'
import { buildLineageString, damLabelFromQueen, damLabelFromSnapshot, lineageYear, DRONE_SOURCE_OPTIONS, type DroneSourceType } from '@/lib/lineage'
import { Search, Plus, Edit2, Trash2, X, Download, ExternalLink, Crown, GitBranch, GitCompareArrows, ArrowUp, ArrowDown, ArrowUpDown, Printer } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import QueenLineageTree from '@/components/QueenLineageTree'
import { Queen, QueenFormData, Batch, getQueenColorFromYear, calculateQueenAge } from '@/types/queen'
import Button from '@/components/ui/Button'
import PrintLabelsModal from '@/components/labels/PrintLabelsModal'
import { queenToLabelDatum } from '@/components/labels/queenMapping'
import { useLabelPrinting } from '@/hooks/useLabelPrinting'

// Module-level so the identity is stable across renders and the limit lives
// in one place. Selection persistence key kept alongside for the same reason.
const COMPARE_MAX = 4
const COMPARE_SELECTION_STORAGE_KEY = 'queen-compare-selection'

// Column keys the queens table supports sorting on. Actions, Colour, and Hive
// are intentionally omitted — they either carry no natural order (actions) or
// would produce a sort the user doesn't think of as "sortable" (marking colour
// is a visual tag, not an ordered attribute).
type SortKey = 'queen_number' | 'mother' | 'age' | 'apiary' | 'status'

// Priority order for status so sorting groups by liveness rather than
// alphabetically. Lower index = "more alive".
const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  cell: 1,
  retired: 2,
  dead: 3,
}

interface SortableThProps {
  label: string
  colKey: SortKey
  sortKey: SortKey | null
  sortDir: 'asc' | 'desc'
  onToggle: (key: SortKey) => void
  paddingClass?: string
}

// A <th> that owns its click handler and draws the current sort state as an
// inline arrow. Extracted so the five sortable headers stay terse and the
// keyboard/ARIA wiring lives in exactly one place.
function SortableTh({ label, colKey, sortKey, sortDir, onToggle, paddingClass = 'px-6' }: SortableThProps) {
  const isActive = sortKey === colKey
  const ariaSort = !isActive ? 'none' : sortDir === 'asc' ? 'ascending' : 'descending'
  const Icon = !isActive ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`${paddingClass} py-3 text-left text-xs font-medium text-text-tertiary uppercase`}
    >
      <button
        type="button"
        onClick={() => onToggle(colKey)}
        className={`inline-flex items-center gap-1.5 min-h-[32px] hover:text-foreground focus:outline-none focus:text-foreground transition-colors ${
          isActive ? 'text-foreground' : ''
        }`}
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        <Icon size={14} className={isActive ? 'text-forest-600 dark:text-forest-400' : 'text-text-tertiary/60'} />
      </button>
    </th>
  )
}

const getInvalidLineageParentIds = (queens: Queen[], queenId: string): Set<string> => {
 const invalidIds = new Set<string>([queenId])
 const queue = [queenId]

 // Walk down visible lineage links so descendants cannot be re-used as parents.
 while (queue.length > 0) {
 const currentId = queue.shift()
 if (!currentId) continue

 queens.forEach((queen) => {
 const isDescendant = queen.mother_id === currentId || queen.father_id === currentId
 if (isDescendant && !invalidIds.has(queen.id)) {
 invalidIds.add(queen.id)
 queue.push(queen.id)
 }
 })
 }

 return invalidIds
}

// Derive the canonical lineage string from the form's structured fields. The dam comes from
// the local mother queen when linked, else the distributed snapshot; the breeder is the
// distributing breeder for distributed queens (implicit owner otherwise).
const deriveLineage = (fd: QueenFormData, editingQueen: Queen | null, queens: Queen[]): string => {
 let damLabel = ''
 if (fd.mother_id) {
 const mother = queens.find((q) => q.id === fd.mother_id)
 if (mother) damLabel = damLabelFromQueen(mother.queen_number, mother.marking_color, mother.birth_date, mother.subspecies)
 }
 if (!damLabel && editingQueen?.distributed_mother_queen) {
 damLabel = damLabelFromSnapshot(editingQueen.distributed_mother_queen)
 }

 const droneSourceType = (fd.drone_source_type as DroneSourceType) || 'open'
 const droneLine = droneSourceType === 'ii' && fd.father_id
 ? queens.find((q) => q.id === fd.father_id)?.queen_number ?? null
 : null

 return buildLineageString({
 damLabel,
 droneSourceType,
 droneLine,
 matingStation: fd.mating_station,
 eircode: fd.mated_at_eircode,
 year: lineageYear(fd.mated_date, fd.birth_date),
 subspecies: fd.subspecies,
 breeder: editingQueen?.distributed_by_name ?? null,
 })
}

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
 const [statusFilter, setStatusFilter] = useState<'active' | 'cell' | 'retired' | 'dead' | 'swarmed' | 'superseded' | 'all'>('active')
 const [loading, setLoading] = useState(true)
 const [userId, setUserId] = useState<string | null>(null)
 const [isTeamMember, setIsTeamMember] = useState(false)
 const [subspeciesOptions, setSubspeciesOptions] = useState<string[]>([])
 const [sourceOptions, setSourceOptions] = useState<string[]>([])
 const [batches, setBatches] = useState<Batch[]>([])
 const [matingStationOptions, setMatingStationOptions] = useState<string[]>([])
 const [showLineage, setShowLineage] = useState(false)
 const [deleting, setDeleting] = useState(false)
 const { enabled: labelPrintingEnabled } = useLabelPrinting()
 const [printQueens, setPrintQueens] = useState<Queen[] | null>(null)
 // Table sorting — null key means "natural order from the fetch query".
 const [sortKey, setSortKey] = useState<SortKey | null>(null)
 const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
 // Comparison selection — persisted in sessionStorage so it survives
 // back-navigation from the compare page without leaking across tabs.
 const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
  if (typeof window === 'undefined') return new Set()
  try {
   const raw = sessionStorage.getItem(COMPARE_SELECTION_STORAGE_KEY)
   if (!raw) return new Set()
   const parsed = JSON.parse(raw)
   return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
   return new Set()
  }
 })
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
 mated_date: '',
 mother_id: '',
 father_id: '',
 batch_id: '',
 drone_source_type: 'open',
 mating_station: '',
 lineage_overridden: false,
 })

 // Persist selection so back-navigation from /compare restores the same ticks.
 useEffect(() => {
  if (typeof window === 'undefined') return
  try {
   sessionStorage.setItem(COMPARE_SELECTION_STORAGE_KEY, JSON.stringify([...selectedIds]))
  } catch {
   // sessionStorage full or unavailable — selection just won't persist.
  }
 }, [selectedIds])

 // Prune selection IDs that no longer exist in the loaded queen set (e.g. a
 // queen deleted in another tab between visits). Without this the Compare
 // button counts ghost selections and the compare page surfaces them as
 // "Unavailable" columns. Only fires once queens have actually loaded.
 useEffect(() => {
  if (queens.length === 0) return
  const liveIds = new Set(queens.map((q) => q.id))
  setSelectedIds((prev) => {
   let changed = false
   const next = new Set<string>()
   prev.forEach((id) => {
    if (liveIds.has(id)) next.add(id)
    else changed = true
   })
   return changed ? next : prev
  })
 }, [queens])

 const toggleSelect = useCallback((id: string) => {
  setSelectedIds((prev) => {
   const next = new Set(prev)
   if (next.has(id)) {
    next.delete(id)
   } else {
    if (next.size >= COMPARE_MAX) {
     toast.error(`You can compare up to ${COMPARE_MAX} queens at once`)
     return prev
    }
    next.add(id)
   }
   return next
  })
 }, [toast])

 const handleCompare = useCallback(() => {
  if (selectedIds.size < 2) return
  const ids = [...selectedIds].slice(0, COMPARE_MAX).join(',')
  router.push(`/dashboard/queens/compare?ids=${ids}`)
 }, [selectedIds, router])

 // Click a column header: first click sorts ascending, clicking the same
 // header again flips direction, clicking a different header resets to asc.
 const toggleSort = useCallback((key: SortKey) => {
  setSortKey((prevKey) => {
   if (prevKey === key) {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    return prevKey
   }
   setSortDir('asc')
   return key
  })
 }, [])

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
 .select('id, batch_name, mother_queen_id')
 .eq('user_id', currentUserId)
 .order('created_at', { ascending: false })

 if (!error && data) {
 setBatches(data)
 }
 }, [userId])

 // Mating-station suggestions for the lineage station picker: the user's apiaries,
 // preferring mating apiaries, plus any stations already recorded on queens.
 const fetchMatingStations = useCallback(async (userIdParam?: string) => {
 const currentUserId = userIdParam || userId
 if (!currentUserId) return

 const [apiaryRes, queenRes] = await Promise.all([
 supabase.from('apiaries').select('name, is_mating_apiary').eq('user_id', currentUserId),
 supabase.from('queens').select('mating_station').eq('user_id', currentUserId).not('mating_station', 'is', null),
 ])

 const names = new Set<string>()
 ;(apiaryRes.data as { name: string | null; is_mating_apiary: boolean | null }[] | null)
 ?.sort((a, b) => Number(b.is_mating_apiary) - Number(a.is_mating_apiary))
 .forEach((a) => { if (a.name) names.add(a.name) })
 ;(queenRes.data as { mating_station: string | null }[] | null)
 ?.forEach((q) => { if (q.mating_station) names.add(q.mating_station) })

 setMatingStationOptions(Array.from(names))
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
 fetchMatingStations(id)
 }
 initUser()
 }, [router, fetchQueens, fetchSubspeciesOptions, fetchSourceOptions, fetchBatches, fetchMatingStations])

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

 // Lineage is derived from the structured fields unless the user has overridden it.
 const lineageToSave = formData.lineage_overridden
 ? formData.lineage
 : deriveLineage(formData, editingQueen, queens)

 // Convert empty strings to null for optional UUID fields
 const dataToSubmit = {
 ...formData,
 mother_id: formData.mother_id || null,
 father_id: formData.father_id || null,
 batch_id: formData.batch_id || null,
 mated_date: formData.mated_date || null,
 mating_station: formData.mating_station || null,
 lineage: lineageToSave,
 }

 const invalidParentIds = editingQueen
 ? getInvalidLineageParentIds(queens, editingQueen.id)
 : new Set<string>()
 const selectedParentIds = [dataToSubmit.mother_id, dataToSubmit.father_id].filter(
 (parentId): parentId is string => Boolean(parentId)
 )

 if (selectedParentIds.some((parentId) => invalidParentIds.has(parentId))) {
 toast.error('A queen cannot use herself or one of her descendants as a parent.')
 return
 }

 // Eircode is optional, but reject malformed values rather than storing junk.
 if (formData.mated_at_eircode.trim() && !isValidEircode(formData.mated_at_eircode)) {
 toast.error('Enter a valid Eircode (e.g. H91 E6K2) or leave it blank.')
 return
 }

 try {
 if (editingQueen) {
 // For distributed queens, strip locked fields to preserve breeder provenance
 const updateData = editingQueen.distributed_by_name
 ? {
 queen_number: dataToSubmit.queen_number,
 lineage: dataToSubmit.lineage,
 queen_clipped: dataToSubmit.queen_clipped,
 status: dataToSubmit.status,
 performance_notes: dataToSubmit.performance_notes,
 mated_date: dataToSubmit.mated_date,
 // Editable for distributed queens: the recipient may mate elsewhere, and the
 // mother link can be recovered from the source batch.
 mated_at_eircode: dataToSubmit.mated_at_eircode || null,
 mother_id: dataToSubmit.mother_id,
 drone_source_type: dataToSubmit.drone_source_type,
 mating_station: dataToSubmit.mating_station,
 lineage_overridden: dataToSubmit.lineage_overridden,
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

 // For distributed queens the mother link is not stored, but the source batch is.
 // Auto-fill the mother queen FK from the batch when it is one of the user's own queens,
 // so it links to a real dam without writing a cross-user reference. The lineage string
 // itself is derived (see derivedLineage) rather than hand-assembled here.
 let motherId = queen.mother_id || ''
 if (queen.distributed_by_name && !motherId && queen.batch_id) {
 const batchMotherId = batches.find((b) => b.id === queen.batch_id)?.mother_queen_id
 if (batchMotherId && queens.some((q) => q.id === batchMotherId)) motherId = batchMotherId
 }

 setFormData({
 queen_number: queen.queen_number,
 birth_date: queen.birth_date,
 marking_color: queen.marking_color,
 source: queen.source,
 subspecies: queen.subspecies,
 lineage: queen.lineage || '',
 queen_clipped: queen.queen_clipped || false,
 status: queen.status,
 performance_notes: queen.performance_notes,
 mated_at_eircode: queen.mated_at_eircode || '',
 mated_date: queen.mated_date || '',
 mother_id: motherId,
 father_id: queen.father_id || '',
 batch_id: queen.batch_id || '',
 drone_source_type: (queen.drone_source_type as DroneSourceType) || 'open',
 mating_station: queen.mating_station || '',
 lineage_overridden: queen.lineage_overridden ?? false,
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
 mated_date: '',
 mother_id: '',
 father_id: '',
 batch_id: '',
 drone_source_type: 'open',
 mating_station: '',
 lineage_overridden: false,
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
 ...sortedQueens.map((q) => [
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
 // Apply search filter — queen number, subspecies, or mother's queen number
 const needle = searchTerm.toLowerCase()
 const matchesSearch =
 needle === '' ||
 q.queen_number.toLowerCase().includes(needle) ||
 (q.subspecies && q.subspecies.toLowerCase().includes(needle)) ||
 (q.mother?.queen_number && q.mother.queen_number.toLowerCase().includes(needle))

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

 // Apply column sort. Rows with a null/blank sort value always sink to the
 // bottom regardless of direction, so direction only flips the comparison
 // between rows that actually have data — otherwise "asc" and "desc" would
 // shuffle blanks to the top, which users never want.
 const sortedQueens = sortKey
 ? [...filteredQueens].sort((a, b) => {
 const dir = sortDir === 'asc' ? 1 : -1
 let av: string | number | null = null
 let bv: string | number | null = null
 switch (sortKey) {
 case 'queen_number':
 av = a.queen_number || null
 bv = b.queen_number || null
 break
 case 'mother':
 av = a.mother?.queen_number || null
 bv = b.mother?.queen_number || null
 break
 case 'age':
 // Older birth = larger age. Sort on the timestamp and invert so
 // "asc" reads as youngest-first (smallest age).
 av = a.birth_date ? -new Date(a.birth_date).getTime() : null
 bv = b.birth_date ? -new Date(b.birth_date).getTime() : null
 break
 case 'apiary':
 av = a.hives?.apiaries?.name || null
 bv = b.hives?.apiaries?.name || null
 break
 case 'status':
 av = a.status ? (STATUS_PRIORITY[a.status] ?? 99) : null
 bv = b.status ? (STATUS_PRIORITY[b.status] ?? 99) : null
 break
 }
 if (av == null && bv == null) return 0
 if (av == null) return 1 // nulls last
 if (bv == null) return -1
 if (typeof av === 'number' && typeof bv === 'number') {
 return (av - bv) * dir
 }
 return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir
 })
 : filteredQueens

 // Summary stats (computed from ALL queens so user can see what's hidden by filters)
 const activeQueens = queens.filter(q => q.status === 'active').length
 const cellQueens = queens.filter(q => q.status === 'cell').length
 const retiredQueens = queens.filter(q => q.status === 'retired').length
 const deadQueens = queens.filter(q => q.status === 'dead').length
 const swarmedQueens = queens.filter(q => q.status === 'swarmed').length
 const supersededQueens = queens.filter(q => q.status === 'superseded').length
 const avgAgeMonths = (() => {
 const activeWithDates = queens.filter(q => q.status === 'active' && q.birth_date)
 if (activeWithDates.length === 0) return 0
 const totalDays = activeWithDates.reduce((sum, q) => {
 return sum + Math.floor((Date.now() - new Date(q.birth_date).getTime()) / (1000 * 60 * 60 * 24))
 }, 0)
 return Math.round(totalDays / activeWithDates.length / 30)
 })()

 const invalidParentIds = editingQueen
 ? getInvalidLineageParentIds(queens, editingQueen.id)
 : new Set<string>()
 const availableParentQueens = queens.filter((q) => !invalidParentIds.has(q.id))

 // Live preview of the auto-generated lineage from the current form values.
 const derivedLineage = deriveLineage(formData, editingQueen, queens)

 const colorOptions = ['White', 'Yellow', 'Red', 'Green', 'Blue', 'None']

 if (loading) return <LoadingSpinner text="Loading queens..." />

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h1 className="text-3xl font-bold text-foreground">Queens 👑</h1>
 <div className="flex gap-2">
 <Button
 onClick={handleCompare}
 disabled={selectedIds.size < 2}
 tone="neutral"
 className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 min-h-[48px] border ${
  selectedIds.size >= 2
   ? 'bg-forest-600 dark:bg-forest-500 text-white border-forest-700 dark:border-forest-600 hover:bg-forest-700 dark:hover:bg-forest-600'
   : 'bg-surface-secondary text-text-tertiary border-border cursor-not-allowed opacity-60'
 }`}
 >
 <GitCompareArrows size={16} /> Compare{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
 </Button>
 {labelPrintingEnabled && selectedIds.size > 0 && (
 <Button
 onClick={() => setPrintQueens(queens.filter(q => selectedIds.has(q.id)))}
 tone="neutral"
 className="px-4 py-2 bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated font-medium flex items-center gap-2 min-h-[48px] border border-border"
 >
 <Printer size={16} /> Print ({selectedIds.size})
 </Button>
 )}
 <Link href="/dashboard/queens/lineage">
 <Button
 tone="neutral"
 className="px-4 py-2 bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated font-medium flex items-center gap-2 min-h-[48px] border border-border"
 >
 <GitBranch size={16} /> Lineage
 </Button>
 </Link>
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
 <p className="font-medium">Distributed Queen — Provenance</p>
 <p>Breeder: {editingQueen.distributed_by_name}</p>
 {editingQueen.distributed_batch_name && (
 <p>Batch: {editingQueen.distributed_batch_name}</p>
 )}
 {editingQueen.distributed_mother_queen && (
 <p>Mother Queen: {editingQueen.distributed_mother_queen}</p>
 )}
 {editingQueen.distributed_drone_source && (
 <p>Drone Source: {editingQueen.distributed_drone_source}</p>
 )}
 <p className="text-xs mt-1 text-amber-600 dark:text-amber-400">
 Birth date, marking colour, source, subspecies, father queen, and source batch are locked for distributed queens. Mother queen, mated at, and lineage stay editable so you can record where the queen was actually mated.
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
 disabled={!!editingQueen?.distributed_by_name}
 className={`w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500 ${editingQueen?.distributed_by_name ? 'opacity-60 cursor-not-allowed' : ''}`}
 >
 <option value="">Select subspecies</option>
 {subspeciesOptions.map((subspecies) => (
 <option key={subspecies} value={subspecies}>
 {subspecies}
 </option>
 ))}
 </select>
 </div>

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-1">Lineage</label>
 <input
 type="text"
 value={formData.lineage_overridden ? formData.lineage : derivedLineage}
 onChange={(e) => setFormData({ ...formData, lineage: e.target.value })}
 readOnly={!formData.lineage_overridden}
 placeholder="Auto-generated from dam, drone source, mating site and year"
 className={`w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500 ${formData.lineage_overridden ? '' : 'opacity-70'}`}
 />
 <label className="flex items-center gap-2 mt-2 text-sm text-text-secondary cursor-pointer">
 <input
 type="checkbox"
 checked={formData.lineage_overridden}
 onChange={(e) => {
 const overridden = e.target.checked
 setFormData((prev) => ({
 ...prev,
 lineage_overridden: overridden,
 // Seed the editable text with the current derived value when switching to manual.
 lineage: overridden ? (prev.lineage || derivedLineage) : prev.lineage,
 }))
 }}
 className="w-4 h-4 text-forest-600 border-border rounded focus:ring-forest-500"
 />
 Edit manually
 </label>
 <p className="text-xs text-text-tertiary mt-1">
 Auto-generated as <span className="italic">Dam × drone-source @ station (year)</span>. Tick &quot;Edit manually&quot; to override.
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Mother Queen</label>
 <select
 value={formData.mother_id}
 onChange={(e) => setFormData({ ...formData, mother_id: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="">Select mother queen (optional)</option>
 {availableParentQueens
 .map((q) => (
 <option key={q.id} value={q.id}>
 {q.queen_number} {q.marking_color ? `(${q.marking_color})` : ''}
 </option>
 ))}
 </select>
 </div>

 {/* Father (drone-source) queen only applies to instrumental insemination; for open or
 station mating the sire is a drone population, not a single queen. */}
 {formData.drone_source_type === 'ii' && (
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Father (drone-line) Queen</label>
 <select
 value={formData.father_id}
 onChange={(e) => setFormData({ ...formData, father_id: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="">Select drone-line queen (optional)</option>
 {availableParentQueens
 .map((q) => (
 <option key={q.id} value={q.id}>
 {q.queen_number} {q.marking_color ? `(${q.marking_color})` : ''}
 </option>
 ))}
 </select>
 </div>
 )}

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
 <label className="block text-sm font-medium text-text-secondary mb-1">Drone Source</label>
 <select
 value={formData.drone_source_type}
 onChange={(e) => setFormData({ ...formData, drone_source_type: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 {DRONE_SOURCE_OPTIONS.map((opt) => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </select>
 <p className="text-xs text-text-tertiary mt-1">How she was mated — the sire side of the pedigree.</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Mating Station</label>
 <input
 type="text"
 list="mating-station-options"
 value={formData.mating_station}
 onChange={(e) => setFormData({ ...formData, mating_station: e.target.value })}
 placeholder="e.g., TBKA Kilcornan"
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 <datalist id="mating-station-options">
 {matingStationOptions.map((name) => (
 <option key={name} value={name} />
 ))}
 </datalist>
 <p className="text-xs text-text-tertiary mt-1">Pick a site or type a new one.</p>
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
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary uppercase focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 <p className="text-xs text-text-tertiary mt-1">
 Irish postcode where the queen was mated
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Mated Date</label>
 <input
 type="date"
 value={formData.mated_date}
 onChange={(e) => setFormData({ ...formData, mated_date: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
 <select
 value={formData.status}
 onChange={(e) => setFormData({ ...formData, status: e.target.value })}
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 >
 <option value="active">Active</option>
 <option value="cell">Cell</option>
 <option value="retired">Retired</option>
 <option value="dead">Dead</option>
 <option value="swarmed">Swarmed</option>
 <option value="superseded">Superseded</option>
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

 {/* Lineage tree. Distributed queens have no local mother FK, so we feed the
 mother snapshot as a fallback; the tree still shows any daughters bred locally. */}
 {editingQueen && (
 <QueenLineageTree
 queenId={editingQueen.id}
 expanded={showLineage}
 onToggle={() => setShowLineage(!showLineage)}
 motherFallback={editingQueen.distributed_mother_queen ?? undefined}
 />
 )}
 </div>
 )}

 {/* Summary stats */}
 {queens.length > 0 && (
 <p className="text-sm text-text-secondary">
 {activeQueens} Active{cellQueens > 0 ? ` | ${cellQueens} Cell${cellQueens !== 1 ? 's' : ''}` : ''} | {retiredQueens} Retired | {deadQueens} Dead{swarmedQueens > 0 ? ` | ${swarmedQueens} Swarmed` : ''}{supersededQueens > 0 ? ` | ${supersededQueens} Superseded` : ''} | Avg Age: {avgAgeMonths} months
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
 placeholder="Search by queen number, mother, or subspecies..."
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
 onChange={(e) => setStatusFilter(e.target.value as 'active' | 'cell' | 'retired' | 'dead' | 'swarmed' | 'superseded' | 'all')}
 className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500 transition-all"
 >
 <option value="all">All Statuses</option>
 <option value="active">Active</option>
 <option value="cell">Cells</option>
 <option value="retired">Retired</option>
 <option value="dead">Dead</option>
 <option value="swarmed">Swarmed</option>
 <option value="superseded">Superseded</option>
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
 <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase w-12">
 <span className="sr-only">Select for comparison</span>
 </th>
 <th className="px-3 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
 Actions
 </th>
 <SortableTh label="Queen Number" colKey="queen_number" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
 <SortableTh label="Mother" colKey="mother" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
 <SortableTh label="Age" colKey="age" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
 <th className="px-3 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
 Color
 </th>
 <th className="px-3 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
 Hive
 </th>
 <SortableTh label="Apiary" colKey="apiary" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} paddingClass="px-3" />
 <SortableTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} paddingClass="px-3" />
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {sortedQueens.map((queen) => (
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
 <td className="px-4 py-4 whitespace-nowrap w-12">
 <input
 type="checkbox"
 checked={selectedIds.has(queen.id)}
 onChange={() => toggleSelect(queen.id)}
 aria-label={`Select queen ${queen.queen_number} for comparison`}
 className="w-5 h-5 rounded border-border text-forest-600 focus:ring-2 focus:ring-forest-500 cursor-pointer"
 />
 </td>
 <td className="px-3 py-4 whitespace-nowrap text-sm flex gap-2">
 {labelPrintingEnabled && (
 <Button
 onClick={() => setPrintQueens([queen])}
 className="text-text-secondary hover:text-foreground"
 title="Print label"
 >
 <Printer size={16} />
 </Button>
 )}
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
 ) : queen.distributed_mother_queen ? (
 // Distributed queens carry the breeder's mother as a text snapshot (no local FK).
 <span className="font-medium" title={queen.distributed_mother_queen}>
 {queen.distributed_mother_queen.split(' (')[0]}
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
 <td className="px-3 py-4 whitespace-nowrap">
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
 <td className="px-3 py-4 whitespace-nowrap text-text-secondary">
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
 <td className="px-3 py-4 text-text-secondary">
 {queen.hives?.apiaries?.name || 'N/A'}
 </td>
 <td className="px-3 py-4 whitespace-nowrap">
 <span
 className={`px-2 py-1 rounded text-xs font-medium ${
 queen.status === 'active'
 ? 'bg-green-100 dark:bg-green-900/30 text-foreground dark:text-green-300 border border-green-300 dark:border-green-800'
 : queen.status === 'cell'
 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
 : queen.status === 'swarmed'
 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700'
 : queen.status === 'superseded'
 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
 : 'bg-surface-secondary text-text-secondary border border-border'
 }`}
 >
 {queen.status === 'cell'
 ? 'Cell'
 : queen.status === 'swarmed'
 ? 'Swarmed'
 : queen.status === 'superseded'
 ? 'Superseded'
 : queen.status}
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

 <PrintLabelsModal
 open={printQueens !== null}
 onClose={() => setPrintQueens(null)}
 data={(printQueens ?? []).map(queenToLabelDatum)}
 presetId="queen_label"
 title={printQueens && printQueens.length === 1
 ? `Print label — ${printQueens[0].queen_number}`
 : `Print ${printQueens?.length ?? 0} queen labels`}
 />
 </div>
 )
}
