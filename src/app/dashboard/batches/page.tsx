'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Skeleton } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import NavTabButton from '@/components/ui/NavTabButton'
import NotificationPermissionBanner from '@/components/NotificationPermissionBanner'
import { initializeNotifications, scheduleBatchNotifications } from '@/lib/notifications'
import MatingNucsTab from '@/components/batches/MatingNucsTab'
import ManageNucsTab from '@/components/batches/ManageNucsTab'
import QueenTrackerTab from '@/components/batches/QueenTrackerTab'
import QueenRearingPlanningTab from '@/components/batches/QueenRearingPlanningTab'
import NucReportsTab from '@/components/batches/NucReportsTab'
import { useRearingGroups } from '@/hooks/useRearingGroups'
import { usePersistentState } from '@/hooks/usePersistentState'
import { useBatchesList, Batch, HiveWithInspections, HiveScore, formatDateIrish } from '@/hooks/useBatchesList'
import BatchFormSection from '@/components/batches/BatchFormSection'

type TabId = 'grafting' | 'nucs' | 'manage_nucs' | 'queens' | 'selection' | 'planning' | 'reports'

const TAB_CONFIG = [
 { id: 'grafting', label: 'Grafting Batch' },
 { id: 'nucs', label: 'Nuc Setup' },
 { id: 'manage_nucs', label: 'Manage Nucs' },
 { id: 'queens', label: 'Queen Tracker' },
 { id: 'selection', label: 'Selection' },
 { id: 'planning', label: 'Planning' },
 { id: 'reports', label: 'Reports' },
] as const satisfies ReadonlyArray<{ id: TabId; label: string }>

const VALID_TABS = new Set<TabId>(TAB_CONFIG.map((tab) => tab.id))
const getValidTab = (tabParam: string | null): TabId =>
 tabParam && VALID_TABS.has(tabParam as TabId) ? tabParam as TabId : 'grafting'

export default function BatchesPage() {
 const pathname = usePathname()
 const router = useRouter()
 const searchParams = useSearchParams()
 // Rearing groups (fetched once the user id is known via useBatchesList)
 const { ownedRearingGroups, memberRearingGroups, fetchRearingGroups } = useRearingGroups()

 // Data layer: batches + option lists + subscription flag (see useBatchesList)
 const {
  batches, sealedCellCounts, breederQueenNames, queens, apiaries, hives,
  loading, userId, userHasActiveSubscription, fetchBatches,
 } = useBatchesList(fetchRearingGroups)
 const [showForm, setShowForm] = useState(false)
 const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
 const [filterStatus, setFilterStatus] = usePersistentState<'all' | 'active' | 'completed'>(
 'batches:status', 'active', (v) => v === 'all' || v === 'active' || v === 'completed'
 )
 const [filterYear, setFilterYear] = usePersistentState<string>(
 'batches:year', 'all', (v) => typeof v === 'string'
 )

 const availableYears = useMemo(() => {
 const years = [...new Set(batches.map(b => b.graft_date?.split('-')[0]).filter(Boolean))]
 return years.sort((a, b) => b.localeCompare(a))
 }, [batches])

 const filteredBatches = useMemo(() => {
 return batches.filter(b => {
 if (filterStatus === 'completed' && b.status !== 'completed') return false
 if (filterStatus === 'active' && b.status === 'completed') return false
 if (filterYear !== 'all' && !b.graft_date?.startsWith(filterYear)) return false
 return true
 })
 }, [batches, filterStatus, filterYear])

 const [activeTab, setActiveTab] = useState<TabId>(() => getValidTab(searchParams.get('tab')))

 const setTab = useCallback((tab: TabId) => {
 setActiveTab(tab)

 const params = new URLSearchParams(searchParams.toString())
 params.set('tab', tab)
 const nextSearch = params.toString()
 router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false })
 }, [pathname, router, searchParams])

 useEffect(() => {
 const rawTab = searchParams.get('tab')
 const nextTab = getValidTab(rawTab)
 if (nextTab !== activeTab) {
 setActiveTab(nextTab)
 }

 if (rawTab && rawTab !== nextTab) {
 const params = new URLSearchParams(searchParams.toString())
 params.set('tab', nextTab)
 router.replace(`${pathname}?${params.toString()}`, { scroll: false })
 }
 }, [activeTab, pathname, router, searchParams])

 // Selection tab states. Persisted so the tab is not reset every time the page is revisited;
 // the custom dates travel with timePeriod because 'custom' is meaningless without them.
 const [selectedApiary, setSelectedApiary] = usePersistentState<string>(
 'batches:apiary', 'all', (v) => typeof v === 'string'
 )
 const [timePeriod, setTimePeriod] = usePersistentState<string>(
 'batches:period', 'all', (v) => typeof v === 'string'
 )
 const [customStartDate, setCustomStartDate] = usePersistentState<string>(
 'batches:customStart', '', (v) => typeof v === 'string'
 )
 const [customEndDate, setCustomEndDate] = usePersistentState<string>(
 'batches:customEnd', '', (v) => typeof v === 'string'
 )

 // A persisted year or apiary can point at data that no longer exists (the last batch for that
 // year deleted, the apiary removed). Left alone it silently filters everything out while the
 // dropdown shows no matching option, so clear it once the data it validates against has loaded.
 useEffect(() => {
 if (batches.length > 0 && filterYear !== 'all' && !availableYears.includes(filterYear)) {
 setFilterYear('all')
 }
 }, [batches.length, availableYears, filterYear, setFilterYear])

 useEffect(() => {
 if (apiaries.length > 0 && selectedApiary !== 'all' && !apiaries.some(a => a.id === selectedApiary)) {
 setSelectedApiary('all')
 }
 }, [apiaries, selectedApiary, setSelectedApiary])
 const [weights, setWeights] = useState({
 brood_pattern: 3,
 population: 3,
 temperament: 3,
 swarming: 3,
 honey_yield: 3,
 calmness: 3,
 recapping: 3,
 vsh: 3,
 smr: 3,
 chalkbrood: 3,
 })
 const [optionalColumns, setOptionalColumns] = useState({
 calmness: false,
 recapping: false,
 vsh: false,
 smr: false,
 chalkbrood: false,
 })
 const [hiveScores, setHiveScores] = useState<HiveScore[]>([])
 const [loadingScores, setLoadingScores] = useState(false)



 // Initialize browser notifications
 useEffect(() => {
 initializeNotifications()
 }, [])


 // Schedule notifications for batches with browser notifications enabled
 useEffect(() => {
 if (batches.length === 0) return

 batches.forEach(batch => {
 if (batch.enable_browser_notifications) {
 scheduleBatchNotifications({
 batchName: batch.batch_name,
 acceptanceCheckDate: batch.acceptance_check_date,
 firstCageDate: batch.first_option_to_cage_date,
 secondCageDate: batch.second_option_to_cage_date,
 hatchDate: batch.emergence_date,
 })
 }
 })
 }, [batches])



 const handleEdit = useCallback((batch: Batch) => {
 setEditingBatch(batch)
 setShowForm(true)
 }, [])

 // Deep-link: /dashboard/batches?batch=<id> opens that batch directly (used by the
 // "View Batch" links on a queen). Runs once, after batches have loaded.
 const batchDeepLinkRef = useRef(false)
 useEffect(() => {
 if (batchDeepLinkRef.current || loading) return
 const batchId = searchParams.get('batch')
 if (!batchId) return
 const target = batches.find(b => b.id === batchId)
 if (!target) return // not loaded yet, or not this user's batch
 batchDeepLinkRef.current = true
 setActiveTab('grafting')
 handleEdit(target)
 // Drop the batch param so tab changes / re-renders don't reopen it.
 const params = new URLSearchParams(searchParams.toString())
 params.delete('batch')
 params.set('tab', 'grafting')
 router.replace(`${pathname}?${params.toString()}`, { scroll: false })
 }, [loading, batches, searchParams, handleEdit, router, pathname])

 const handleDelete = async (id: string) => {
 if (!userId) return
 if (confirm('Are you sure you want to delete this batch?')) {
 const { error } = await supabase
 .from('rearing_batches')
 .delete()
 .eq('id', id)
 .eq('user_id', userId)

 if (!error) fetchBatches()
 }
 }

 // Calculate date range based on time period
 const getDateRange = useCallback(() => {
 const today = new Date()
 const currentYear = today.getFullYear()
 let startDate: Date | null = null

 switch (timePeriod) {
 case 'currentyear':
 startDate = new Date(currentYear, 0, 1) // January 1st of current year
 break
 case '6months':
 startDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
 break
 case '1year':
 startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
 break
 case 'custom':
 return customStartDate ? new Date(customStartDate) : null
 case 'all':
 default:
 return null
 }

 return startDate
 }, [timePeriod, customStartDate])

 // Calculate hive scores based on inspection data
 const calculateHiveScores = useCallback(async () => {
 if (!userId) return
 setLoadingScores(true)

 try {
 const startDate = getDateRange()

 // Fetch all hives with their inspections
 let query = supabase
 .from('hives')
 .select(`
 id,
 hive_number,
 apiary_id,
 apiaries (name),
 inspections (
 inspection_date,
 brood_pattern_rating,
 population_strength,
 temperament_rating,
 swarming_tendency,
 honey_stores,
 calmness,
 recapping,
 vsh,
 smr,
 chalkbrood_disease
 )
 `)
 .eq('user_id', userId)
 .is('archived_at', null)

 // Apply apiary filter
 if (selectedApiary !== 'all') {
 query = query.eq('apiary_id', selectedApiary)
 }

 const { data: hivesData, error } = await query

 if (error) throw error

 // Calculate averages and scores for each hive
 const scored = (hivesData as unknown as HiveWithInspections[])?.map((hive) => {
 let inspections = hive.inspections || []

 // Filter inspections by date range
 if (startDate) {
 inspections = inspections.filter((i) => {
 const inspectionDate = new Date(i.inspection_date)
 // For custom range, check both start and end dates
 if (timePeriod === 'custom' && customEndDate) {
 const endDate = new Date(customEndDate)
 return inspectionDate >= startDate && inspectionDate <= endDate
 }
 // For predefined periods, just check if after start date
 return inspectionDate >= startDate
 })
 }

 // Require minimum of 3 inspections for reliable averages
 if (inspections.length < 3) {
 return null // Skip hives with insufficient inspection data
 }

 // Calculate averages
 const avg = {
 brood_pattern: inspections.reduce((sum: number, i) => sum + (i.brood_pattern_rating || 0), 0) / inspections.length,
 population: inspections.reduce((sum: number, i) => sum + (i.population_strength || 0), 0) / inspections.length,
 temperament: inspections.reduce((sum: number, i) => sum + (i.temperament_rating || 0), 0) / inspections.length,
 swarming: inspections.reduce((sum: number, i) => sum + (i.swarming_tendency || 0), 0) / inspections.length, // Average swarming tendency
 honey_yield: inspections.reduce((sum: number, i) => {
 const stores = i.honey_stores?.toLowerCase() || ''
 if (stores.includes('full')) return sum + 5
 if (stores.includes('good')) return sum + 4
 if (stores.includes('moderate')) return sum + 3
 if (stores.includes('low')) return sum + 2
 return sum + 1
 }, 0) / inspections.length,
 calmness: inspections.reduce((sum: number, i) => sum + (i.calmness || 0), 0) / inspections.length,
 recapping: inspections.reduce((sum: number, i) => sum + (i.recapping || 0), 0) / inspections.length,
 vsh: inspections.reduce((sum: number, i) => sum + (i.vsh || 0), 0) / inspections.length,
 smr: inspections.reduce((sum: number, i) => sum + (i.smr || 0), 0) / inspections.length,
 chalkbrood: inspections.reduce((sum: number, i) => sum + (i.chalkbrood_disease || 0), 0) / inspections.length,
 }

 // Calculate weighted score (lower swarming and chalkbrood are better, so invert them)
 let score =
 (avg.brood_pattern * weights.brood_pattern) +
 (avg.population * weights.population) +
 (avg.temperament * weights.temperament) +
 ((6 - avg.swarming) * weights.swarming) + // Invert swarming tendency (1-5 scale, so 6 - value)
 (avg.honey_yield * weights.honey_yield)

 // Add optional criteria to score if selected
 if (optionalColumns.calmness) {
 score += avg.calmness * weights.calmness
 }
 if (optionalColumns.recapping) {
 score += avg.recapping * weights.recapping
 }
 if (optionalColumns.vsh) {
 score += avg.vsh * weights.vsh
 }
 if (optionalColumns.smr) {
 score += avg.smr * weights.smr
 }
 if (optionalColumns.chalkbrood) {
 // Lower chalkbrood is better, so invert it (assuming 1-5 scale)
 score += (6 - avg.chalkbrood) * weights.chalkbrood
 }

 return {
 hive_id: hive.id,
 hive_number: hive.hive_number,
 apiary_name: hive.apiaries?.name || 'Unknown',
 inspection_count: inspections.length,
 averages: avg,
 score: score,
 }
 }).filter((item): item is HiveScore => item !== null) // Remove null entries

 // Sort by score descending
 scored?.sort((a, b) => b.score - a.score)

 setHiveScores(scored || [])
 } catch (error) {
 console.error('Error calculating hive scores:', error)
 // Silently fail - user will see empty state message instead of alert
 setHiveScores([])
 } finally {
 setLoadingScores(false)
 }
 }, [userId, selectedApiary, timePeriod, customEndDate, weights, optionalColumns, getDateRange])

 // Recalculate when filters or weights change
 useEffect(() => {
 if (activeTab === 'selection') {
 calculateHiveScores()
 }
 }, [activeTab, selectedApiary, timePeriod, customStartDate, customEndDate, weights, optionalColumns, calculateHiveScores])


 const closeForm = () => {
 setShowForm(false)
 setEditingBatch(null)
 }

 if (loading) return (
 <div className="space-y-4" aria-hidden="true">
 <Skeleton className="h-8 w-56" />
 <Skeleton className="h-12 w-full !rounded-lg" />
 <Skeleton className="h-40 w-full !rounded-lg" />
 </div>
 )

 const timePeriodButtonClassName = 'min-h-[44px] text-sm touch-manipulation'
 const weightButtonClassName = 'w-10 h-10 !min-h-10 !px-0 !py-0 rounded-md font-semibold transition-all'

 return (
 <>
 <NotificationPermissionBanner />
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-3xl font-bold text-foreground">Queen Rearing 🥚</h1>
 <p className="text-sm text-text-secondary mt-1">3-5-8 - The Queen is made!</p>
 </div>
 {activeTab === 'grafting' && (
 <Button
 onClick={() => (showForm ? closeForm() : (setEditingBatch(null), setShowForm(true)))}
 tone="blue"
 className="font-medium"
 >
 {showForm ? <X size={16} /> : <Plus size={16} />}
 {showForm ? 'Cancel' : 'New Batch'}
 </Button>
 )}
 </div>

 {/* Tab Navigation */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border">
 <div className="border-b border-border">
 <div className="overflow-x-auto">
 <nav className="flex -mb-px min-w-max">
 {TAB_CONFIG.map((tab) => (
 <NavTabButton
 key={tab.id}
 onClick={() => setTab(tab.id)}
 tone="blue"
 size="lg"
 active={activeTab === tab.id}
 >
 {tab.label}
 </NavTabButton>
 ))}
 </nav>
 </div>
 </div>
 </div>

 {/* Grafting Batch Tab Content */}
 {activeTab === 'grafting' && (
 <>
 {showForm && (
 <BatchFormSection
 userId={userId}
 queens={queens}
 apiaries={apiaries}
 hives={hives}
 sealedCellCounts={sealedCellCounts}
 userHasActiveSubscription={userHasActiveSubscription}
 ownedRearingGroups={ownedRearingGroups}
 memberRearingGroups={memberRearingGroups}
 editingBatch={editingBatch}
 onSaved={() => fetchBatches()}
 onClose={closeForm}
 />
 )}

 {/* Batch Filters */}
 <div className="flex flex-wrap items-center gap-3 mb-4">
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'completed')}
 className="px-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
 >
 <option value="all">All Batches</option>
 <option value="active">Active</option>
 <option value="completed">Completed</option>
 </select>
 <select
 value={filterYear}
 onChange={(e) => setFilterYear(e.target.value)}
 className="px-3 py-2 border border-border rounded-md bg-surface text-foreground text-sm"
 >
 <option value="all">All Years</option>
 {availableYears.map(y => (
 <option key={y} value={y}>{y}</option>
 ))}
 </select>
 <span className="text-sm text-text-tertiary">{filteredBatches.length} of {batches.length} batches</span>
 </div>

 {/* Mobile Card View */}
 <div className="md:hidden space-y-4">
 {filteredBatches.map((batch: Batch) => (
 <div key={batch.id} className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-4">
 <div className="flex justify-between items-start mb-3">
 <div className="flex items-center gap-2">
 <h4 className="font-semibold text-foreground text-lg">{batch.batch_name}</h4>
 {batch.status === 'completed' && (
 <span className="px-2 py-0.5 rounded text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-800">Completed</span>
 )}
 </div>
 <div className="flex gap-2">
 <IconButton
 onClick={() => handleEdit(batch)}
 tone="blue"
 className="min-h-[44px] min-w-[44px] touch-manipulation"
 aria-label="Edit batch"
 >
 <Edit2 size={20} />
 </IconButton>
 <IconButton
 onClick={() => handleDelete(batch.id)}
 tone="danger"
 className="min-h-[44px] min-w-[44px] touch-manipulation"
 aria-label="Delete batch"
 >
 <Trash2 size={20} />
 </IconButton>
 </div>
 </div>
 <div className="space-y-2 text-sm">
 <div className="flex justify-between">
 <span className="text-text-tertiary">Breeder Queen:</span>
 <span className="text-foreground font-medium">{batch.queens?.queen_number || breederQueenNames[batch.id] || 'N/A'}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-text-tertiary">Graft Date:</span>
 <span className="text-foreground">{formatDateIrish(batch.graft_date)}</span>
 </div>
 <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
 <div>
 <span className="text-text-tertiary block">Grafts:</span>
 <span className="text-foreground font-medium">{batch.cell_count || '-'}</span>
 </div>
 <div>
 <span className="text-text-tertiary block">Accepted:</span>
 <span className="text-foreground font-medium">{batch.grafts_accepted || '-'}</span>
 </div>
 <div>
 <span className="text-text-tertiary block">Hatched:</span>
 <span className="text-foreground font-medium">{batch.queens_hatched || '-'}</span>
 </div>
 <div>
 <span className="text-text-tertiary block">Mated:</span>
 <span className="text-foreground font-medium">{batch.queens_mated || '-'}</span>
 </div>
 {sealedCellCounts[batch.id] > 0 && (
 <div className="col-span-2">
 <span className="text-text-tertiary block">Sealed Cells Distributed:</span>
 <span className="text-foreground font-medium">{sealedCellCounts[batch.id]}</span>
 </div>
 )}
 </div>
 </div>
 </div>
 ))}
 {filteredBatches.length === 0 && (
 <div className="text-center py-8 text-text-tertiary">
 {batches.length === 0 ? 'No rearing batch found. Create your first!' : 'No batches match the current filters.'}
 </div>
 )}
 </div>

 {/* Desktop Table View */}
 <div className="hidden md:block bg-surface dark:bg-surface rounded-lg shadow overflow-x-auto">
 <table className="min-w-full divide-y divide-border">
 <thead className="bg-surface-secondary">
 <tr>
 <th className="px-3 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Actions</th>
 <th className="px-3 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Batch Name</th>
 <th className="px-3 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Breeder Queen</th>
 <th className="px-3 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Graft Date</th>
 <th className="px-3 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Grafts</th>
 <th className="px-3 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Accepted</th>
 <th className="px-3 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Hatched</th>
 <th className="px-3 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Mated</th>
 <th className="px-3 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Sealed Dist.</th>
 </tr>
 </thead>
 <tbody className="bg-surface dark:bg-surface divide-y divide-border">
 {filteredBatches.map((batch: Batch) => (
 <tr key={batch.id} className="hover:bg-surface-secondary">
 <td className="px-3 py-4 whitespace-nowrap flex gap-2">
 <IconButton onClick={() => handleEdit(batch)} tone="blue" size="xs" aria-label="Edit batch">
 <Edit2 size={16} />
 </IconButton>
 <IconButton onClick={() => handleDelete(batch.id)} tone="danger" size="xs" aria-label="Delete batch">
 <Trash2 size={16} />
 </IconButton>
 </td>
 <td className="px-3 py-4 whitespace-nowrap font-medium">
 <span className="inline-flex items-center gap-2">
 {batch.batch_name}
 {batch.status === 'completed' && (
 <span className="px-2 py-0.5 rounded text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-800">Completed</span>
 )}
 </span>
 </td>
 <td className="px-3 py-4 whitespace-nowrap">{batch.queens?.queen_number || breederQueenNames[batch.id] || 'N/A'}</td>
 <td className="px-3 py-4 whitespace-nowrap">{formatDateIrish(batch.graft_date)}</td>
 <td className="px-3 py-4 whitespace-nowrap">{batch.cell_count || '-'}</td>
 <td className="px-3 py-4 whitespace-nowrap">{batch.grafts_accepted || '-'}</td>
 <td className="px-3 py-4 whitespace-nowrap">{batch.queens_hatched || '-'}</td>
 <td className="px-3 py-4 whitespace-nowrap">{batch.queens_mated || '-'}</td>
 <td className="px-3 py-4 whitespace-nowrap">{sealedCellCounts[batch.id] || '-'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 {filteredBatches.length === 0 && (
 <div className="text-center py-8 text-text-tertiary">
 {batches.length === 0 ? 'No rearing batch found. Create your first!' : 'No batches match the current filters.'}
 </div>
 )}
 </div>
 </>
 )}

 {/* Nuc Setup Tab Content */}
 {activeTab === 'nucs' && userId && (
 <MatingNucsTab userId={userId} />
 )}

 {/* Manage Nucs Tab Content */}
 {activeTab === 'manage_nucs' && userId && (
 <ManageNucsTab userId={userId} />
 )}

 {/* Selection Tab Content */}
 {activeTab === 'selection' && (
 <div className="space-y-6">
 {/* Filters Row */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <h3 className="text-lg font-semibold text-foreground mb-4">Breeder Queen Selection Filters</h3>

 {/* Apiary Filter */}
 <div className="mb-6">
 <label className="block text-sm font-medium text-text-secondary mb-2">Apiary</label>
 <select
 value={selectedApiary}
 onChange={(e) => setSelectedApiary(e.target.value)}
 className="w-full md:w-64 px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
 >
 <option value="all">All Apiaries</option>
 {apiaries.map((apiary) => (
 <option key={apiary.id} value={apiary.id}>
 {apiary.name}
 </option>
 ))}
 </select>
 </div>

 {/* Time Period Filter */}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2">Time Period</label>
 <div className="flex flex-wrap gap-2">
 <Button
 onClick={() => setTimePeriod('currentyear')}
 tone={timePeriod === 'currentyear' ? 'blue' : 'neutral'}
 className={timePeriod === 'currentyear' ? `${timePeriodButtonClassName} shadow-md` : timePeriodButtonClassName}
 >
 Current Year ({new Date().getFullYear()})
 </Button>
 <Button
 onClick={() => setTimePeriod('6months')}
 tone={timePeriod === '6months' ? 'blue' : 'neutral'}
 className={timePeriod === '6months' ? `${timePeriodButtonClassName} shadow-md` : timePeriodButtonClassName}
 >
 Last 6 Months
 </Button>
 <Button
 onClick={() => setTimePeriod('1year')}
 tone={timePeriod === '1year' ? 'blue' : 'neutral'}
 className={timePeriod === '1year' ? `${timePeriodButtonClassName} shadow-md` : timePeriodButtonClassName}
 >
 Last Year
 </Button>
 <Button
 onClick={() => setTimePeriod('all')}
 tone={timePeriod === 'all' ? 'blue' : 'neutral'}
 className={timePeriod === 'all' ? `${timePeriodButtonClassName} shadow-md` : timePeriodButtonClassName}
 >
 All Time
 </Button>
 <Button
 onClick={() => setTimePeriod('custom')}
 tone={timePeriod === 'custom' ? 'blue' : 'neutral'}
 className={timePeriod === 'custom' ? `${timePeriodButtonClassName} shadow-md` : timePeriodButtonClassName}
 >
 Custom Range
 </Button>
 </div>
 </div>

 {/* Custom Date Range Inputs */}
 {timePeriod === 'custom' && (
 <div className="flex flex-wrap items-center gap-3 mt-4 pl-0 md:pl-0">
 <label className="text-sm font-medium text-text-secondary">From:</label>
 <input
 type="date"
 value={customStartDate}
 onChange={(e) => setCustomStartDate(e.target.value)}
 className="px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
 />
 <label className="text-sm font-medium text-text-secondary">To:</label>
 <input
 type="date"
 value={customEndDate}
 onChange={(e) => setCustomEndDate(e.target.value)}
 className="px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
 />
 <Button
 onClick={() => {
 setCustomStartDate('')
 setCustomEndDate('')
 }}
 tone="neutral"
 size="sm"
 className="underline"
 >
 Clear
 </Button>
 </div>
 )}
 </div>

 {/* Weights Row */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <h3 className="text-lg font-semibold text-foreground mb-4">Weight Criterias (1-5)</h3>
 <p className="text-sm text-text-secondary mb-4">Assign importance to each trait. Higher weights = more influence on ranking.</p>
 <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
 {/* Brood Pattern Weight */}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Brood Pattern</label>
 <div className="flex gap-1 justify-center">
 {[1, 2, 3, 4, 5].map((weight) => (
 <Button
 key={weight}
 onClick={() => setWeights({ ...weights, brood_pattern: weight })}
 tone={weights.brood_pattern === weight ? 'blue' : 'neutral'}
 className={`${weightButtonClassName} ${weights.brood_pattern === weight ? 'shadow-md scale-110' : ''}`}
 >
 {weight}
 </Button>
 ))}
 </div>
 </div>

 {/* Population Weight */}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Population</label>
 <div className="flex gap-1 justify-center">
 {[1, 2, 3, 4, 5].map((weight) => (
 <Button
 key={weight}
 onClick={() => setWeights({ ...weights, population: weight })}
 tone={weights.population === weight ? 'blue' : 'neutral'}
 className={`${weightButtonClassName} ${weights.population === weight ? 'shadow-md scale-110' : ''}`}
 >
 {weight}
 </Button>
 ))}
 </div>
 </div>

 {/* Temperament Weight */}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Temperament</label>
 <div className="flex gap-1 justify-center">
 {[1, 2, 3, 4, 5].map((weight) => (
 <Button
 key={weight}
 onClick={() => setWeights({ ...weights, temperament: weight })}
 tone={weights.temperament === weight ? 'blue' : 'neutral'}
 className={`${weightButtonClassName} ${weights.temperament === weight ? 'shadow-md scale-110' : ''}`}
 >
 {weight}
 </Button>
 ))}
 </div>
 </div>

 {/* Swarming Weight */}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Swarming (Low=Good)</label>
 <div className="flex gap-1 justify-center">
 {[1, 2, 3, 4, 5].map((weight) => (
 <Button
 key={weight}
 onClick={() => setWeights({ ...weights, swarming: weight })}
 tone={weights.swarming === weight ? 'blue' : 'neutral'}
 className={`${weightButtonClassName} ${weights.swarming === weight ? 'shadow-md scale-110' : ''}`}
 >
 {weight}
 </Button>
 ))}
 </div>
 </div>

 {/* Honey Yield Weight */}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Honey Yield</label>
 <div className="flex gap-1 justify-center">
 {[1, 2, 3, 4, 5].map((weight) => (
 <Button
 key={weight}
 onClick={() => setWeights({ ...weights, honey_yield: weight })}
 tone={weights.honey_yield === weight ? 'blue' : 'neutral'}
 className={`${weightButtonClassName} ${weights.honey_yield === weight ? 'shadow-md scale-110' : ''}`}
 >
 {weight}
 </Button>
 ))}
 </div>
 </div>

 {/* Optional Criteria Weights - Only show if selected */}
 {optionalColumns.calmness && (
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Calmness</label>
 <div className="flex gap-1 justify-center">
 {[1, 2, 3, 4, 5].map((weight) => (
 <Button
 key={weight}
 onClick={() => setWeights({ ...weights, calmness: weight })}
 tone={weights.calmness === weight ? 'blue' : 'neutral'}
 className={`${weightButtonClassName} ${weights.calmness === weight ? 'shadow-md scale-110' : ''}`}
 >
 {weight}
 </Button>
 ))}
 </div>
 </div>
 )}

 {optionalColumns.recapping && (
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Recapping</label>
 <div className="flex gap-1 justify-center">
 {[1, 2, 3, 4, 5].map((weight) => (
 <Button
 key={weight}
 onClick={() => setWeights({ ...weights, recapping: weight })}
 tone={weights.recapping === weight ? 'blue' : 'neutral'}
 className={`${weightButtonClassName} ${weights.recapping === weight ? 'shadow-md scale-110' : ''}`}
 >
 {weight}
 </Button>
 ))}
 </div>
 </div>
 )}

 {optionalColumns.vsh && (
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2 text-center">VSH</label>
 <div className="flex gap-1 justify-center">
 {[1, 2, 3, 4, 5].map((weight) => (
 <Button
 key={weight}
 onClick={() => setWeights({ ...weights, vsh: weight })}
 tone={weights.vsh === weight ? 'blue' : 'neutral'}
 className={`${weightButtonClassName} ${weights.vsh === weight ? 'shadow-md scale-110' : ''}`}
 >
 {weight}
 </Button>
 ))}
 </div>
 </div>
 )}

 {optionalColumns.smr && (
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2 text-center">SMR</label>
 <div className="flex gap-1 justify-center">
 {[1, 2, 3, 4, 5].map((weight) => (
 <Button
 key={weight}
 onClick={() => setWeights({ ...weights, smr: weight })}
 tone={weights.smr === weight ? 'blue' : 'neutral'}
 className={`${weightButtonClassName} ${weights.smr === weight ? 'shadow-md scale-110' : ''}`}
 >
 {weight}
 </Button>
 ))}
 </div>
 </div>
 )}

 {optionalColumns.chalkbrood && (
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Chalkbrood (Low=Good)</label>
 <div className="flex gap-1 justify-center">
 {[1, 2, 3, 4, 5].map((weight) => (
 <Button
 key={weight}
 onClick={() => setWeights({ ...weights, chalkbrood: weight })}
 tone={weights.chalkbrood === weight ? 'blue' : 'neutral'}
 className={`${weightButtonClassName} ${weights.chalkbrood === weight ? 'shadow-md scale-110' : ''}`}
 >
 {weight}
 </Button>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Optional Criteria */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
 <h3 className="text-lg font-semibold text-foreground mb-4">Optional Criteria</h3>
 <div className="flex flex-wrap gap-4">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={optionalColumns.calmness}
 onChange={(e) => setOptionalColumns({ ...optionalColumns, calmness: e.target.checked })}
 className="w-4 h-4 text-blue-600 rounded"
 />
 <span className="text-sm text-text-secondary">Calmness</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={optionalColumns.recapping}
 onChange={(e) => setOptionalColumns({ ...optionalColumns, recapping: e.target.checked })}
 className="w-4 h-4 text-blue-600 rounded"
 />
 <span className="text-sm text-text-secondary">Recapping</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={optionalColumns.vsh}
 onChange={(e) => setOptionalColumns({ ...optionalColumns, vsh: e.target.checked })}
 className="w-4 h-4 text-blue-600 rounded"
 />
 <span className="text-sm text-text-secondary">VSH</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={optionalColumns.smr}
 onChange={(e) => setOptionalColumns({ ...optionalColumns, smr: e.target.checked })}
 className="w-4 h-4 text-blue-600 rounded"
 />
 <span className="text-sm text-text-secondary">SMR</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={optionalColumns.chalkbrood}
 onChange={(e) => setOptionalColumns({ ...optionalColumns, chalkbrood: e.target.checked })}
 className="w-4 h-4 text-blue-600 rounded"
 />
 <span className="text-sm text-text-secondary">Chalkbrood</span>
 </label>
 </div>
 </div>

 {/* Results Table */}
 <div className="bg-surface dark:bg-surface rounded-lg shadow overflow-hidden border border-border">
 <div className="p-6 border-b border-border">
 <h3 className="text-lg font-semibold text-foreground">Ranked Hives</h3>
 <p className="text-sm text-text-secondary mt-1">Based on inspection averages and weighted scores</p>
 </div>

 {loadingScores ? (
 <div className="p-12">
 <LoadingSpinner text="Calculating scores..." />
 </div>
 ) : hiveScores.length === 0 ? (
 <div className="text-center py-12 text-text-tertiary">
 <p className="text-lg mb-2">Not enough data to calculate scores</p>
 <p className="text-sm">Each hive requires at least 3 inspection records in the selected period</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-border">
 <thead className="bg-surface-secondary">
 <tr>
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Rank</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Hive</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Apiary</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Inspections</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Score</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Brood Pattern</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Population</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Temperament</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Swarming (Low=Good)</th>
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Honey Yield</th>
 {optionalColumns.calmness && (
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Calmness</th>
 )}
 {optionalColumns.recapping && (
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Recapping</th>
 )}
 {optionalColumns.vsh && (
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">VSH</th>
 )}
 {optionalColumns.smr && (
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">SMR</th>
 )}
 {optionalColumns.chalkbrood && (
 <th className="px-4 py-3 text-left text-sm font-medium text-text-tertiary uppercase">Chalkbrood</th>
 )}
 </tr>
 </thead>
 <tbody className="bg-surface dark:bg-surface divide-y divide-border">
 {hiveScores.map((hive, index) => (
 <tr key={hive.hive_id} className={index < 3 ? 'bg-green-50 dark:bg-green-950/20' : ''}>
 <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">
 {index === 0 && <span className="text-yellow-500">🥇</span>}
 {index === 1 && <span className="text-text-tertiary">🥈</span>}
 {index === 2 && <span className="text-orange-400">🥉</span>}
 {index > 2 && <span className="text-text-tertiary">{index + 1}</span>}
 </td>
 <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">
 {hive.hive_number}
 </td>
 <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
 {hive.apiary_name}
 </td>
 <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
 {hive.inspection_count}
 </td>
 <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
 {hive.score.toFixed(2)}
 </td>
 <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
 {hive.averages.brood_pattern.toFixed(1)}
 </td>
 <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
 {hive.averages.population.toFixed(1)}
 </td>
 <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
 {hive.averages.temperament.toFixed(1)}
 </td>
 <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
 {hive.averages.swarming.toFixed(1)}
 </td>
 <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
 {hive.averages.honey_yield.toFixed(1)}
 </td>
 {optionalColumns.calmness && (
 <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
 {hive.averages.calmness.toFixed(1)}
 </td>
 )}
 {optionalColumns.recapping && (
 <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
 {hive.averages.recapping.toFixed(1)}
 </td>
 )}
 {optionalColumns.vsh && (
 <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
 {hive.averages.vsh.toFixed(1)}
 </td>
 )}
 {optionalColumns.smr && (
 <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
 {hive.averages.smr.toFixed(1)}
 </td>
 )}
 {optionalColumns.chalkbrood && (
 <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
 {hive.averages.chalkbrood.toFixed(1)}
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Queen Tracker Tab Content */}
 {activeTab === 'queens' && userId && (
 <QueenTrackerTab userId={userId} />
 )}

 {/* Planning Tab Content */}
 {activeTab === 'planning' && (
 <QueenRearingPlanningTab />
 )}

 {/* Reports Tab Content */}
 {activeTab === 'reports' && userId && (
 <NucReportsTab userId={userId} />
 )}
 </div>
 </>
 )
}
