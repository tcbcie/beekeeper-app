'use client'
import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus, X, Scale, Archive, CheckSquare, Copy, FolderInput, Search } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import TextInput from '@/components/ui/TextInput'
import FilterDisclosure from '@/components/ui/FilterDisclosure'
import { useToast } from '@/components/ui/Toast'
import { Hive } from '@/types/hive'
import HiveFormSection from '@/components/hive/HiveFormSection'
import HiveListCard from '@/components/hive/HiveListCard'
import MoveHivesModal from '@/components/hive/MoveHivesModal'
import Button from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { buildDeleteHivePrompt, buildUnarchiveHivePrompt } from '@/lib/record-delete-prompts'
import { usePersistentState } from '@/hooks/usePersistentState'
import { useHivesList } from '@/hooks/useHivesList'
import { useListPositionMemory } from '@/hooks/useListPositionMemory'

export default function HivesPage() {

 // Free-text search is deliberately not persisted: filters describe a lasting
 // preference, a search term describes a moment. Matches crm/customers.
 const [search, setSearch] = useState('')
 const [showForm, setShowForm] = useState(false)
 const [editingHive, setEditingHive] = useState<Hive | null>(null)
 const toast = useToast()
 // Named confirmDialog rather than confirm. No native window.confirm()
 // remains on this page, but the name stays: renaming back would be churn.
 const confirmDialog = useConfirm()
 const formRef = useRef<HTMLDivElement>(null)

 // Bulk select + group actions (move / clone)
 const [selectionMode, setSelectionMode] = useState(false)
 const [selectedIds, setSelectedIds] = useState<string[]>([])
 const [showMoveModal, setShowMoveModal] = useState(false)


 // Data layer: fetching + ownership/archive filters (see useHivesList)
 const {
 hives, apiaries, queens, loading, userId, isTeamMember,
 filterApiaryId, setFilterApiaryId,
 ownershipFilter, setOwnershipFilter,
 archiveFilter, setArchiveFilter,
 fetchHives,
 } = useHivesList()
 const [scaleFilter, setScaleFilter] = usePersistentState<boolean>('hives:scales', false, (v) => typeof v === 'boolean')
 const [sortOption, setSortOption] = usePersistentState<string>('hives:sort', 'default')
 const [openMenuId, setOpenMenuId] = useState<string | null>(null)

 // An apiary deep link (e.g. "View hives" on an apiary) selects that apiary, then the parameter
 // is stripped so it cannot re-apply and override a later manual change to the filter.
 const router = useRouter()
 const pathname = usePathname()
 const searchParams = useSearchParams()
 const apiaryParamAppliedRef = useRef(false)

 useEffect(() => {
 if (apiaryParamAppliedRef.current) return
 const apiaryParam = searchParams.get('apiary')
 if (!apiaryParam) return

 apiaryParamAppliedRef.current = true
 setFilterApiaryId(apiaryParam)

 // Strip only this parameter, so any other query state on the URL survives. An id that no
 // longer exists is cleared by the stale-selection check in useHivesList once apiaries load.
 const params = new URLSearchParams(searchParams.toString())
 params.delete('apiary')
 const nextSearch = params.toString()
 router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false })
 }, [searchParams, pathname, router, setFilterApiaryId])

 // Close context menu when clicking outside
 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 const target = event.target as HTMLElement
 if (openMenuId && !target.closest('.context-menu-container')) {
 setOpenMenuId(null)
 }
 }

 if (openMenuId) {
 document.addEventListener('mousedown', handleClickOutside)
 return () => document.removeEventListener('mousedown', handleClickOutside)
 }
 }, [openMenuId])


 const handleEdit = (hive: Hive) => {
 // Editable by the owner or a team member of the shared apiary (mirrors the hives
 // RLS UPDATE policy and the card). RLS is the real boundary enforced on save.
 if (hive.user_id !== userId && !hive.is_shared) return
 setEditingHive(hive)
 setShowForm(true)

 // Scroll to the top where the form is
 setTimeout(() => {
 formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
 }, 100)
 }

 const handleDelete = async (id: string) => {
 if (!userId) return
 const hive = hives.find((row) => row.id === id)
 if (!(await confirmDialog(buildDeleteHivePrompt(hive?.hive_number)))) return

 const { error } = await supabase
 .from('hives')
 .delete()
 .eq('id', id)
 .eq('user_id', userId)

 if (error) {
 toast.error('Failed to delete hive: ' + error.message)
 return
 }
 fetchHives(userId)
 }

 const handleUnarchive = async (hive: Hive) => {
 if (!userId) return

 if (!(await confirmDialog(buildUnarchiveHivePrompt(hive.hive_number)))) return

 try {
 // Unarchive hive - RLS policies will handle permissions for both owned and shared hives
 const { error } = await supabase
 .from('hives')
 .update({
 archived_at: null,
 archive_reason_id: null,
 archive_notes: null,
 status: 'active'
 })
 .eq('id', hive.id)

 if (error) {
 console.error('Error unarchiving hive:', error)
 toast.error('Failed to unarchive hive: ' + error.message)
 } else {
 toast.success(`Hive ${hive.hive_number} has been successfully unarchived!`)
 setOpenMenuId(null) // Close the menu
 fetchHives(userId) // Refresh hives list
 }
 } catch (error) {
 console.error('Error unarchiving hive:', error)
 toast.error('Failed to unarchive hive')
 }
 }

 // --- Bulk select + group actions ---------------------------------------

 const toggleSelect = (id: string) => {
 setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
 }

 const exitSelection = () => {
 setSelectionMode(false)
 setSelectedIds([])
 }

 // Only act on the user's own hives that are still loaded — RLS rejects writes to
 // others' hives, and a hive hidden by a filter change should not be touched.
 const selectedOwnedHives = hives.filter((h) => selectedIds.includes(h.id) && h.user_id === userId)

 const handleBulkMove = async (apiaryId: string | null) => {
 if (!userId) return
 const ids = selectedOwnedHives.map((h) => h.id)
 if (ids.length === 0) return

 // Clear row/order so old positions can't collide with the destination's
 // unique (apiary, row, order) rule; the user re-places hives afterwards.
 const { error } = await supabase
 .from('hives')
 .update({ apiary_id: apiaryId, row_in_apiary: null, order_in_apiary: null })
 .in('id', ids)
 .eq('user_id', userId)

 if (error) {
 console.error('Bulk move error:', error)
 toast.error('Failed to move hives: ' + error.message)
 return
 }

 toast.success(`Moved ${ids.length} hive${ids.length === 1 ? '' : 's'}.`)
 setShowMoveModal(false)
 exitSelection()
 fetchHives(userId)
 }

 const handleBulkClone = async () => {
 if (!userId) return
 const sources = selectedOwnedHives
 if (sources.length === 0) return

 const ok = await confirmDialog({
 title: `Clone ${sources.length} hive${sources.length === 1 ? '' : 's'}?`,
 message:
 'Each clone copies the box setup and apiary, with a new hive number. Queens, ' +
 'position and history are not copied.',
 confirmLabel: 'Clone',
 variant: 'info',
 })
 if (!ok) return

 // Build a set of existing hive numbers for this account so generated
 // "-copy" numbers never clash (includes archived hives not in the list).
 const { data: existingRows, error: existingError } = await supabase
 .from('hives')
 .select('hive_number')
 .eq('user_id', userId)

 if (existingError) {
 console.error('Bulk clone lookup error:', existingError)
 toast.error('Failed to clone hives: ' + existingError.message)
 return
 }

 const usedNumbers = new Set((existingRows || []).map((r) => r.hive_number))
 const today = new Date().toISOString().split('T')[0]
 const nowIso = new Date().toISOString()

 const newRows = sources.map((h) => {
 let num = `${h.hive_number}-copy`
 let n = 2
 while (usedNumbers.has(num)) {
 num = `${h.hive_number}-copy-${n}`
 n++
 }
 usedNumbers.add(num)
 return {
 hive_number: num,
 apiary_id: h.apiary_id,
 order_direction: h.order_direction || 'entrances',
 hive_type: h.hive_type,
 configuration: h.configuration,
 status: 'active',
 is_queenless: false,
 queen_id: null,
 queen_marked: false,
 queen_marking_color: null,
 queen_mated: false,
 queen_clipped: false,
 row_in_apiary: null,
 order_in_apiary: null,
 colony_established_date: today,
 queen_installed_date: null,
 user_id: userId,
 configuration_changed_at: nowIso,
 configuration_changed_by: userId,
 }
 })

 const { data: inserted, error } = await supabase
 .from('hives')
 .insert(newRows)
 .select('id, configuration, apiary_id')

 if (error) {
 console.error('Bulk clone error:', error)
 toast.error('Failed to clone hives: ' + error.message)
 return
 }

 // Mirror the single-hive create path: record the initial configuration in
 // history (there is no INSERT trigger, only an UPDATE one).
 if (inserted && inserted.length > 0) {
 const historyRows = inserted.map((h) => ({
 hive_id: h.id,
 changed_at: nowIso,
 changed_by: userId,
 configuration: h.configuration,
 apiary_id: h.apiary_id,
 row_in_apiary: null,
 order_in_apiary: null,
 queen_id: null,
 queen_marked: false,
 queen_marking_color: null,
 queen_mated: false,
 queen_clipped: false,
 is_queenless: false,
 }))
 const { error: historyError } = await supabase
 .from('hive_configuration_history')
 .insert(historyRows)
 if (historyError) {
 console.error('Failed to record cloned configuration history:', historyError)
 // Hives were created successfully; history is supplementary.
 }
 }

 toast.success(`Created ${newRows.length} cloned hive${newRows.length === 1 ? '' : 's'}.`)
 exitSelection()
 fetchHives(userId)
 }

 // Check if any hives have scales configured
 const hasAnyScales = hives.some(h => h.beep_device_id || h.wolf_scale_id)
 const hiveSearch = search.trim().toLowerCase()

 // Counts exactly what the collapsed panel holds, so the badge and the Clear
 // action agree. Apiary is excluded: it stays visible above.
 const activeFilterCount = [
 ownershipFilter !== 'my',
 archiveFilter !== 'active',
 scaleFilter,
 sortOption !== 'default',
 ].filter(Boolean).length

 const clearCollapsedFilters = () => {
 setOwnershipFilter('my')
 setArchiveFilter('active')
 setScaleFilter(false)
 setSortOption('default')
 }

 // Filter and sort hives based on selected apiary and position
 const filteredHives = [...hives]
 .filter(hive => {
 if (hiveSearch) {
 const matches = [
 hive.hive_number,
 hive.apiaries?.name,
 hive.qr_tag_code,
 hive.queens?.queen_number,
 hive.status,
 hive.notes,
 ].some((field) => field?.toString().toLowerCase().includes(hiveSearch))
 if (!matches) return false
 }
 if (filterApiaryId && hive.apiary_id !== filterApiaryId) {
 return false
 }
 if (scaleFilter && !hive.beep_device_id && !hive.wolf_scale_id) {
 return false
 }
 return true
 })
 .sort((a, b) => {
 switch (sortOption) {
 case 'hive_number':
 return a.hive_number.localeCompare(b.hive_number, undefined, { numeric: true })
 case 'last_inspected': {
 const dateA = a.last_inspection_date ? new Date(a.last_inspection_date).getTime() : 0
 const dateB = b.last_inspection_date ? new Date(b.last_inspection_date).getTime() : 0
 return dateB - dateA
 }
 case 'status':
 return (a.status || '').localeCompare(b.status || '')
 default: {
 // Default: Apiary > Row > Order > Hive Number
 const apiaryA = a.apiaries?.name || ''
 const apiaryB = b.apiaries?.name || ''
 if (apiaryA !== apiaryB) return apiaryA.localeCompare(apiaryB)
 const rowA = a.row_in_apiary ?? Number.MAX_SAFE_INTEGER
 const rowB = b.row_in_apiary ?? Number.MAX_SAFE_INTEGER
 if (rowA !== rowB) return rowA - rowB
 const orderA = a.order_in_apiary ?? Number.MAX_SAFE_INTEGER
 const orderB = b.order_in_apiary ?? Number.MAX_SAFE_INTEGER
 if (orderA !== orderB) return orderA - orderB
 return a.hive_number.localeCompare(b.hive_number)
 }
 }
 })

 // Puts the user back on the hive they were just working on (returning from its detail page,
 // or closing its edit form) instead of at the top of the list.
 const { remember: rememberHivePosition, highlightedId } = useListPositionMemory({
 scope: 'hives',
 items: filteredHives,
 ready: !loading,
 elementIdPrefix: 'hive-card-',
 })

 const closeForm = () => {
 // Saving refetches the list behind a spinner, so the card cannot be scrolled to directly —
 // remembering it lets the restore run once the list is rendered again.
 const returnToHiveId = editingHive?.id
 setShowForm(false)
 setEditingHive(null)
 if (returnToHiveId) rememberHivePosition(returnToHiveId)
 }

 // Summary stats
 const activeCount = filteredHives.filter(h => !h.archived_at).length
 const archivedCount = filteredHives.filter(h => h.archived_at).length
 const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000
 const needInspectionCount = filteredHives.filter(h => {
 if (h.archived_at) return false
 if (!h.last_inspection_date) return true
 return new Date(h.last_inspection_date).getTime() < fourteenDaysAgo
 }).length

 if (loading) return <LoadingSpinner text="Loading hives..." />

 // Reserve space at the bottom so the fixed bulk-action bar never covers the
 // last hive cards (taller reserve on mobile where the bar may wrap to 2 rows).
 // The md breakpoint matters: the bar now clears the bottom navigation,
 // which is itself visible until md, so dropping to a smaller reserve at
 // sm would let the bar cover the last row between 640px and 768px.
 const bulkBarVisible = selectionMode && selectedOwnedHives.length > 0

 return (
<div className={`space-y-6 ${bulkBarVisible ? 'pb-40 md:pb-24' : ''}`}>
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <h1 className="text-responsive-3xl font-bold text-foreground">Hives</h1>
 <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-end gap-3 w-full md:w-auto min-w-0">
 <div className="relative w-full sm:w-64">
 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
 <TextInput
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search hive, apiary, tag or queen"
 aria-label="Search hives"
 className="rounded-lg"
 style={{ paddingLeft: '2.25rem' }}
 />
 </div>
 <select
 value={filterApiaryId}
 onChange={(e) => setFilterApiaryId(e.target.value)}
 className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition-all"
 >
 <option value="">All Apiaries</option>
 {apiaries.map((apiary) => (
 <option key={apiary.id} value={apiary.id}>
 {apiary.name}{apiary.is_shared ? ' (Shared)' : ''}
 </option>
 ))}
 </select>
 {/* Apiary and the search box stay visible: they are how the list is
     usually narrowed. Ownership, archive state, scales and sort are one
     control away, with a count so a hidden filter never silently explains
     a short list. */}
 <FilterDisclosure
 activeCount={activeFilterCount}
 storageKey="hives:filtersOpen"
 onClear={clearCollapsedFilters}
 >
 <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
 {isTeamMember && (
 <select
 value={ownershipFilter}
 onChange={(e) => {
 setOwnershipFilter(e.target.value as 'my' | 'team' | 'all')
 if (userId) fetchHives(userId)
 }}
 className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition-all"
 >
 <option value="my">My Hives</option>
 <option value="team">Team Hives</option>
 <option value="all">All Hives</option>
 </select>
 )}
 <select
 value={archiveFilter}
 onChange={(e) => {
 setArchiveFilter(e.target.value as 'active' | 'archived' | 'all')
 }}
 className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-border focus:border-border focus:ring-2 focus:ring-border/20 transition-all"
 >
 <option value="active">Active Hives</option>
 <option value="archived">Archived Hives</option>
 <option value="all">All (Active + Archived)</option>
 </select>
 {hasAnyScales && (
 <label className="flex items-center gap-2 px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground cursor-pointer hover:border-forest-500 transition-all">
 <input
 type="checkbox"
 checked={scaleFilter}
 onChange={(e) => setScaleFilter(e.target.checked)}
 className="w-4 h-4 rounded border-border text-forest-600 focus:ring-forest-500"
 />
 <Scale size={16} className="text-blue-600" />
 <span className="text-sm whitespace-nowrap">With Scales</span>
 </label>
 )}
 <select
 value={sortOption}
 onChange={(e) => setSortOption(e.target.value)}
 className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition-all"
 >
 <option value="default">Sort: Default</option>
 <option value="hive_number">Sort: Hive Number</option>
 <option value="last_inspected">Sort: Last Inspected</option>
 <option value="status">Sort: Status</option>
 </select>
 </div>
 </FilterDisclosure>
 <Button
 onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
 className={`px-4 py-3 sm:py-2 min-h-[48px] rounded-lg font-medium flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto border ${
 selectionMode
 ? 'bg-forest-600 dark:bg-forest-500 text-white border-forest-600 dark:border-forest-500 hover:bg-forest-700 dark:hover:bg-forest-600'
 : 'bg-surface dark:bg-surface-elevated text-foreground border-border hover:border-forest-500'
 }`}
 >
 <CheckSquare size={18} />
 {selectionMode ? 'Done' : 'Select'}
 </Button>
 <Button
 onClick={() => (showForm ? closeForm() : setShowForm(true))}
 className="px-4 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 active:bg-forest-800 dark:active:bg-forest-700 font-medium flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto"
 >
 {showForm ? <X size={18} /> : <Plus size={18} />}
 {showForm ? 'Cancel' : 'Add Hive'}
 </Button>
 </div>
 </div>

 {showForm && (
 <div ref={formRef}>
 <HiveFormSection
 userId={userId}
 apiaries={apiaries}
 queens={queens}
 editingHive={editingHive}
 onSaved={() => { if (userId) fetchHives(userId) }}
 onClose={closeForm}
 />
 </div>
 )}

 {/* Summary stats bar */}
 {filteredHives.length > 0 && (
 <p className="text-sm text-text-secondary">
 {activeCount} Active | {archivedCount} Archived | {needInspectionCount} Need Inspection (14+ days)
 </p>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filteredHives.map((hive) => (
 <HiveListCard
 key={hive.id}
 hive={hive}
 userId={userId}
 onEdit={handleEdit}
 onDelete={handleDelete}
 onUnarchive={handleUnarchive}
 openMenuId={openMenuId}
 setOpenMenuId={setOpenMenuId}
 selectionMode={selectionMode}
 selected={selectedIds.includes(hive.id)}
 onToggleSelect={toggleSelect}
 highlighted={highlightedId === hive.id}
 onOpen={rememberHivePosition}
 />
 ))}
 </div>

 {filteredHives.length === 0 && (
 <EmptyState
 icon={Archive}
 title="No Hives Found"
 description={search.trim()
 ? `No hives match "${search.trim()}". Try a shorter term, or clear the search.`
 : filterApiaryId
 ? 'No hives found for this apiary. Select "All Apiaries" or add a new hive.'
 : 'Add your first hive to start tracking colonies, inspections, and queen records.'}
 actionLabel={!filterApiaryId ? 'Add Hive' : undefined}
 actionOnClick={!filterApiaryId ? () => setShowForm(true) : undefined}
 />
 )}

 {/* Floating bulk action bar — shown while hives are selected */}
 {bulkBarVisible && (
 <div className="fixed above-bottom-nav md:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1rem)] sm:w-auto max-w-2xl">
 <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-surface dark:bg-surface-elevated border border-border rounded-xl shadow-xl px-3 py-3 sm:px-4">
 <span className="w-full sm:w-auto text-sm font-semibold text-text-primary text-center sm:text-left">
 {selectedOwnedHives.length} selected
 </span>
 <Button
 onClick={() => setShowMoveModal(true)}
 className="flex-1 sm:flex-none px-3 sm:px-4 py-3 sm:py-2 min-h-[48px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 whitespace-nowrap"
 >
 <FolderInput size={18} className="flex-shrink-0" />
 <span>Move<span className="hidden sm:inline"> to apiary</span></span>
 </Button>
 <Button
 onClick={handleBulkClone}
 className="flex-1 sm:flex-none px-3 sm:px-4 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 font-medium flex items-center justify-center gap-2 whitespace-nowrap"
 >
 <Copy size={18} className="flex-shrink-0" />
 Clone
 </Button>
 <Button
 onClick={exitSelection}
 className="flex-1 sm:flex-none px-3 sm:px-4 py-3 sm:py-2 min-h-[48px] bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated font-medium whitespace-nowrap"
 >
 Clear
 </Button>
 </div>
 </div>
 )}

 {showMoveModal && (
 <MoveHivesModal
 count={selectedOwnedHives.length}
 apiaries={apiaries}
 onClose={() => setShowMoveModal(false)}
 onMove={handleBulkMove}
 />
 )}
 </div>
 )
}
