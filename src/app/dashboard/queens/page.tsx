'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { queenCodeFor } from '@/lib/queen-code'
import { Search, Plus, Edit2, Trash2, X, Download, ExternalLink, Crown, GitBranch, GitCompareArrows, ArrowUp, ArrowDown, ArrowUpDown, Printer } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { Queen, calculateQueenAge, isProductionQueen, queenStatusBadgeClass } from '@/types/queen'
import QueenRoleBadge from '@/components/queens/QueenRoleBadge'
import Button from '@/components/ui/Button'
import PrintLabelsModal from '@/components/labels/PrintLabelsModal'
import { queenToLabelDatum } from '@/components/labels/queenMapping'
import { useLabelPrinting } from '@/hooks/useLabelPrinting'
import { usePersistentState } from '@/hooks/usePersistentState'
import { useQueensList } from '@/hooks/useQueensList'
import QueenFormSection from '@/components/queens/QueenFormSection'

// Module-level so the identity is stable across renders and the limit lives
// in one place. Selection persistence key kept alongside for the same reason.
const COMPARE_MAX = 4
const COMPARE_SELECTION_STORAGE_KEY = 'queen-compare-selection'

// Shared by the mobile card list and the desktop table so the two views can
// never drift apart. Status colours come from the canonical
// queenStatusBadgeClass in @/types/queen.
const queenStatusLabel = (status: string): string => {
 switch (status) {
 case 'cell': return 'Cell'
 case 'virgin': return 'Virgin'
 case 'swarmed': return 'Swarmed'
 case 'superseded': return 'Superseded'
 case 'distributed': return 'Distributed'
 default: return status
 }
}

const markingColorChipClass = (color?: string | null): string => {
 switch (color) {
 case 'Yellow': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-800'
 case 'Red': return 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300 border border-red-300 dark:border-red-800'
 case 'Green': return 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300 border border-green-300 dark:border-green-800'
 case 'Blue': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
 default: return 'bg-surface-secondary text-text-secondary border border-border'
 }
}

// Column keys the queens table supports sorting on. Actions, Colour, and Hive
// are intentionally omitted — they either carry no natural order (actions) or
// would produce a sort the user doesn't think of as "sortable" (marking colour
// is a visual tag, not an ordered attribute).
type SortKey = 'queen_number' | 'mother' | 'age' | 'apiary' | 'status'

// Priority order for status so sorting groups by liveness rather than
// alphabetically. Lower index = "more alive".
const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  virgin: 1,
  cell: 2,
  retired: 3,
  dead: 4,
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


export default function QueensPage() {
 const searchParams = useSearchParams()
 const router = useRouter()
 const toast = useToast()
 const highlightedQueenId = searchParams.get('id')
 const editParam = searchParams.get('edit')
 const queenRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
 const queenCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

 const [showForm, setShowForm] = useState(false)
 const [editingQueen, setEditingQueen] = useState<Queen | null>(null)
 const [searchTerm, setSearchTerm] = useState('')
 const [ownershipFilter, setOwnershipFilter] = usePersistentState<'my' | 'team' | 'all'>(
   'queens:ownership', 'my', (v) => v === 'my' || v === 'team' || v === 'all'
 )
 const [assignmentFilter, setAssignmentFilter] = usePersistentState<'all' | 'assigned' | 'unassigned'>(
   'queens:assignment', 'all', (v) => v === 'all' || v === 'assigned' || v === 'unassigned'
 )
 const [statusFilter, setStatusFilter] = usePersistentState<'active' | 'virgin' | 'cell' | 'retired' | 'dead' | 'swarmed' | 'superseded' | 'distributed' | 'all'>(
   'queens:status', 'active',
   (v) => ['active', 'virgin', 'cell', 'retired', 'dead', 'swarmed', 'superseded', 'distributed', 'all'].includes(v)
 )
 const [roleFilter, setRoleFilter] = usePersistentState<'all' | 'production' | 'breeder'>(
   'queens:role', 'all', (v) => v === 'all' || v === 'production' || v === 'breeder'
 )
 // Apiary filter holds an apiary id, or 'all'. Stays local to this page
 // (consistent with the other queen filters), not the app-wide selection.
 const [apiaryFilter, setApiaryFilter] = usePersistentState<string>(
   'queens:apiary', 'all', (v) => typeof v === 'string'
 )
 const [deleting, setDeleting] = useState(false)
 // Data layer: queens + option lists + breeder context (see useQueensList)
 const {
  queens, loading, userId, isTeamMember,
  subspeciesOptions, sourceOptions, batches, matingStationOptions,
  breederContext, rearedCandidates, fetchQueens, fetchRearedCandidates,
 } = useQueensList()
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


 // Scroll to highlighted queen when data loads
 useEffect(() => {
 if (highlightedQueenId && queens.length > 0) {
 setTimeout(() => {
 // Prefer whichever view is actually visible at this breakpoint:
 // mobile cards or the desktop table row.
 const cardEl = queenCardRefs.current[highlightedQueenId]
 const tableEl = queenRefs.current[highlightedQueenId]
 const queenElement = cardEl && cardEl.offsetParent !== null ? cardEl : tableEl
 queenElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
 }, 100)
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



 const handleEdit = (queen: Queen) => {
 setEditingQueen(queen)
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

 const closeForm = () => {
 setShowForm(false)
 setEditingQueen(null)
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

 // Distinct apiaries present among the loaded queens, for the filter dropdown.
 // Built from the data itself so the options always match what is shown.
 const apiaryOptions = Array.from(
 queens.reduce((map, q) => {
 const ap = q.hives?.apiaries
 if (ap?.id && !map.has(ap.id)) map.set(ap.id, ap.name)
 return map
 }, new Map<string, string>())
 )
 .map(([id, name]) => ({ id, name }))
 .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

 // Guard against a persisted apiary that is no longer present (deleted, or out
 // of the current ownership view) — fall back to "all" rather than show nothing.
 const effectiveApiaryFilter =
 apiaryFilter !== 'all' && apiaryOptions.some((a) => a.id === apiaryFilter)
 ? apiaryFilter
 : 'all'

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

 // Apply role filter (production vs breeder/reference)
 if (roleFilter === 'production' && !isProductionQueen(q.queen_role)) return false
 if (roleFilter === 'breeder' && isProductionQueen(q.queen_role)) return false

 // Apply assignment filter
 if (assignmentFilter === 'assigned' && !q.hives?.id) return false
 if (assignmentFilter === 'unassigned' && q.hives?.id) return false

 // Apply apiary filter (by the assigned hive's apiary)
 if (effectiveApiaryFilter !== 'all' && q.hives?.apiaries?.id !== effectiveApiaryFilter) return false

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

 // Summary stats (computed from ALL queens so user can see what's hidden by filters).
 // Breeder/reference queens are breeding stock, not production colonies, so the Active
 // count and average age cover production queens only; they get their own tally.
 const activeQueens = queens.filter(q => q.status === 'active' && isProductionQueen(q.queen_role)).length
 const virginQueens = queens.filter(q => q.status === 'virgin').length
 const cellQueens = queens.filter(q => q.status === 'cell').length
 const retiredQueens = queens.filter(q => q.status === 'retired').length
 const deadQueens = queens.filter(q => q.status === 'dead').length
 const swarmedQueens = queens.filter(q => q.status === 'swarmed').length
 const supersededQueens = queens.filter(q => q.status === 'superseded').length
 const breederQueens = queens.filter(q => !isProductionQueen(q.queen_role)).length
 const avgAgeMonths = (() => {
 const activeWithDates = queens.filter(q => q.status === 'active' && isProductionQueen(q.queen_role) && q.birth_date)
 if (activeWithDates.length === 0) return 0
 const totalDays = activeWithDates.reduce((sum, q) => {
 return sum + Math.floor((Date.now() - new Date(q.birth_date).getTime()) / (1000 * 60 * 60 * 24))
 }, 0)
 return Math.round(totalDays / activeWithDates.length / 30)
 })()


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
 <QueenFormSection
 userId={userId}
 queens={queens}
 batches={batches}
 subspeciesOptions={subspeciesOptions}
 sourceOptions={sourceOptions}
 matingStationOptions={matingStationOptions}
 rearedCandidates={rearedCandidates}
 editingQueen={editingQueen}
 onSaved={() => { fetchQueens(); fetchRearedCandidates() }}
 onClose={closeForm}
 />
 )}

 {/* Summary stats */}
 {queens.length > 0 && (
 <p className="text-sm text-text-secondary">
 {activeQueens} Active{virginQueens > 0 ? ` | ${virginQueens} Virgin${virginQueens !== 1 ? 's' : ''}` : ''}{cellQueens > 0 ? ` | ${cellQueens} Cell${cellQueens !== 1 ? 's' : ''}` : ''} | {retiredQueens} Retired | {deadQueens} Dead{swarmedQueens > 0 ? ` | ${swarmedQueens} Swarmed` : ''}{supersededQueens > 0 ? ` | ${supersededQueens} Superseded` : ''}{breederQueens > 0 ? ` | ${breederQueens} Breeder` : ''} | Avg Age: {avgAgeMonths} months
 </p>
 )}

 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <div className="mb-4 flex flex-col sm:flex-row sm:flex-wrap gap-3">
 <div className="relative flex-1 sm:min-w-[220px]">
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
 onChange={(e) => setStatusFilter(e.target.value as 'active' | 'virgin' | 'cell' | 'retired' | 'dead' | 'swarmed' | 'superseded' | 'distributed' | 'all')}
 className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500 transition-all"
 >
 <option value="all">All Statuses</option>
 <option value="active">Active</option>
 <option value="virgin">Virgins</option>
 <option value="cell">Cells</option>
 <option value="retired">Retired</option>
 <option value="dead">Dead</option>
 <option value="swarmed">Swarmed</option>
 <option value="superseded">Superseded</option>
 <option value="distributed">Distributed</option>
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
 <select
 value={roleFilter}
 onChange={(e) => setRoleFilter(e.target.value as 'all' | 'production' | 'breeder')}
 className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500 transition-all"
 >
 <option value="all">All Roles</option>
 <option value="production">Production</option>
 <option value="breeder">Breeder/Reference</option>
 </select>
 <select
 value={effectiveApiaryFilter}
 onChange={(e) => setApiaryFilter(e.target.value)}
 className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500 transition-all"
 >
 <option value="all">All Apiaries</option>
 {apiaryOptions.map((a) => (
 <option key={a.id} value={a.id}>{a.name}</option>
 ))}
 </select>
 </div>

 {/* Mobile card list — the table below is desktop-only */}
 <div className="md:hidden space-y-3">
 {sortedQueens.map((queen) => (
 <div
 key={queen.id}
 ref={(el) => {
 queenCardRefs.current[queen.id] = el
 }}
 className={`rounded-lg border p-4 transition-all duration-500 ${
 highlightedQueenId === queen.id
 ? 'bg-forest-100 dark:bg-forest-900/30 border-l-4 border-forest-600 dark:border-forest-500'
 : 'bg-surface dark:bg-surface-elevated border-border'
 }`}
 >
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0">
 <span className="inline-flex items-center gap-1.5 flex-wrap">
 <Link
 href={`/dashboard/queens/${queen.id}`}
 className="text-lg font-semibold text-forest-600 dark:text-forest-400 hover:text-forest-700 dark:hover:text-forest-300 hover:underline"
 >
 {queen.queen_number}
 </Link>
 <QueenRoleBadge role={queen.queen_role} />
 </span>
 {(() => {
 const code = queenCodeFor(queen, queen.user_id === userId ? breederContext : null)
 return code ? <div className="text-xs font-mono text-text-tertiary mt-0.5">{code}</div> : null
 })()}
 </div>
 <span className={`shrink-0 px-2.5 py-1 rounded text-sm font-medium ${queenStatusBadgeClass(queen.status)}`}>
 {queenStatusLabel(queen.status)}
 </span>
 </div>
 <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
 <div>
 <span className="text-text-tertiary">Mother: </span>
 {queen.mother ? (
 <span className="text-forest-600 dark:text-forest-400 font-medium">{queen.mother.queen_number}</span>
 ) : queen.distributed_mother_queen ? (
 <span className="font-medium text-text-secondary" title={queen.distributed_mother_queen}>
 {queen.distributed_mother_queen.split(' (')[0]}
 </span>
 ) : (
 <span className="text-text-secondary">N/A</span>
 )}
 </div>
 <div className="text-text-primary">
 <span className="text-text-tertiary">Age: </span>
 {calculateQueenAge(queen.birth_date)}
 </div>
 <div>
 <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${markingColorChipClass(queen.marking_color)}`}>
 {queen.marking_color || 'No colour'}
 </span>
 </div>
 <div>
 <span className="text-text-tertiary">Hive: </span>
 {queen.hives?.id ? (
 <Link
 href={`/dashboard/hives/${queen.hives.id}`}
 className="text-forest-600 dark:text-forest-400 font-medium hover:underline"
 >
 {queen.hives.hive_number}
 </Link>
 ) : (
 <span className="text-text-secondary">N/A</span>
 )}
 </div>
 {queen.hives?.apiaries?.name && (
 <div className="col-span-2 text-text-secondary">
 <span className="text-text-tertiary">Apiary: </span>
 {queen.hives.apiaries.name}
 </div>
 )}
 {queen.status === 'active' && queen.birth_date && (Date.now() - new Date(queen.birth_date).getTime()) > 2 * 365 * 24 * 60 * 60 * 1000 && (
 <div className="col-span-2">
 <span className="inline-block px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded border border-amber-300 dark:border-amber-700">
 Over 2 years old — replace soon
 </span>
 </div>
 )}
 </div>
 <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
 <label className="flex items-center gap-2 min-h-[44px] px-1 text-sm text-text-secondary cursor-pointer">
 <input
 type="checkbox"
 checked={selectedIds.has(queen.id)}
 onChange={() => toggleSelect(queen.id)}
 aria-label={`Select queen ${queen.queen_number} for comparison`}
 className="w-5 h-5 rounded border-border text-forest-600 focus:ring-2 focus:ring-forest-500 cursor-pointer"
 />
 Compare
 </label>
 {labelPrintingEnabled && (
 <Button
 unstyled
 onClick={() => setPrintQueens([queen])}
 className="min-h-[44px] px-3 rounded-lg border border-border text-text-secondary hover:text-foreground hover:bg-surface-secondary flex items-center gap-1.5 text-sm font-semibold"
 >
 <Printer size={18} />
 Label
 </Button>
 )}
 <Button
 unstyled
 onClick={() => handleEdit(queen)}
 className="flex-1 min-h-[44px] rounded-lg text-sm font-semibold border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center justify-center gap-1.5"
 >
 <Edit2 size={16} />
 Edit
 </Button>
 <Button
 unstyled
 onClick={() => handleDelete(queen.id)}
 className="min-h-[44px] px-4 rounded-lg text-sm font-semibold border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center gap-1.5"
 >
 <Trash2 size={16} />
 Delete
 </Button>
 </div>
 </div>
 ))}
 </div>

 <div className="hidden md:block overflow-x-auto">
 <table className="min-w-full divide-y divide-border">
 <thead className="bg-surface-secondary">
 <tr>
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
 <td className="px-3 py-4 whitespace-nowrap text-sm">
 <div className="flex items-center gap-1">
 <input
 type="checkbox"
 checked={selectedIds.has(queen.id)}
 onChange={() => toggleSelect(queen.id)}
 aria-label={`Select queen ${queen.queen_number} for comparison`}
 className="w-5 h-5 rounded border-border text-forest-600 focus:ring-2 focus:ring-forest-500 cursor-pointer"
 />
 {labelPrintingEnabled && (
 <Button
 unstyled
 onClick={() => setPrintQueens([queen])}
 className="p-2 rounded-lg text-text-secondary hover:text-foreground hover:bg-surface-secondary"
 title="Print label"
 >
 <Printer size={18} />
 </Button>
 )}
 <Button
 unstyled
 onClick={() => handleEdit(queen)}
 className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
 title="Edit queen"
 >
 <Edit2 size={18} />
 </Button>
 <Button
 unstyled
 onClick={() => handleDelete(queen.id)}
 className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
 title="Delete queen"
 >
 <Trash2 size={18} />
 </Button>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
 <span className="inline-flex items-center gap-1.5 flex-wrap">
 <Link
 href={`/dashboard/queens/${queen.id}`}
 className="text-forest-600 dark:text-forest-400 hover:text-forest-700 dark:hover:text-forest-300 hover:underline"
 >
 {queen.queen_number}
 </Link>
 <QueenRoleBadge role={queen.queen_role} />
 </span>
 {(() => {
 // Only stamp the viewer's breeder context on queens they own; shared queens from
 // other beekeepers keep their own provenance (distributed) or show no code.
 const code = queenCodeFor(queen, queen.user_id === userId ? breederContext : null)
 return code ? <div className="text-xs font-mono text-text-tertiary mt-0.5">{code}</div> : null
 })()}
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
 <span className={`px-2 py-1 rounded text-xs font-medium ${markingColorChipClass(queen.marking_color)}`}>
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
 <span className={`px-2 py-1 rounded text-xs font-medium ${queenStatusBadgeClass(queen.status)}`}>
 {queenStatusLabel(queen.status)}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
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

 <PrintLabelsModal
 open={printQueens !== null}
 onClose={() => setPrintQueens(null)}
 data={(printQueens ?? []).map((q) => queenToLabelDatum(q, q.user_id === userId ? breederContext : null))}
 presetId="queen_label"
 title={printQueens && printQueens.length === 1
 ? `Print label — ${printQueens[0].queen_number}`
 : `Print ${printQueens?.length ?? 0} queen labels`}
 />
 </div>
 )
}
