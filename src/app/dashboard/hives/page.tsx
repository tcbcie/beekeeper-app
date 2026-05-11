'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, X, Scale, Archive } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { Hive, HiveFormData } from '@/types/hive'
import { QUEENLESS_REASONS, mapReasonToQueenStatus } from '@/lib/queenless'
import HiveListCard from '@/components/hive/HiveListCard'
import Button from '@/components/ui/Button'

interface HiveListApiary {
 id: string
 name: string
 user_id?: string
 is_shared?: boolean
}

interface HiveListQueen {
 id: string
 queen_number: string
 status?: string
 assigned_hive_id?: string | null
}

export default function HivesPage() {
 const [hives, setHives] = useState<Hive[]>([])
 const [apiaries, setApiaries] = useState<HiveListApiary[]>([])
 const [queens, setQueens] = useState<HiveListQueen[]>([])

 const [showForm, setShowForm] = useState(false)
 const [editingHive, setEditingHive] = useState<Hive | null>(null)
 const [loading, setLoading] = useState(true)
 const [userId, setUserId] = useState<string | null>(null)
 const [isTeamMember, setIsTeamMember] = useState(false)
 const router = useRouter()
 const toast = useToast()
 const formRef = useRef<HTMLDivElement>(null)

 // Initialize filters from sessionStorage
 const [filterApiaryId, setFilterApiaryId] = useState<string>('')
 const [ownershipFilter, setOwnershipFilter] = useState<'my' | 'team' | 'all'>('my')
 const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active')
 const [scaleFilter, setScaleFilter] = useState(false)
 const [sortOption, setSortOption] = useState<string>('default')
 const [filtersLoaded, setFiltersLoaded] = useState(false)
 const [openMenuId, setOpenMenuId] = useState<string | null>(null)
 const [formData, setFormData] = useState<HiveFormData>({
 hive_number: '',
 apiary_id: '',
 order_in_apiary: null,
 row_in_apiary: null,
 order_direction: 'entrances',
 queen_id: '',
 queen_marked: false,
 queen_marking_color: '',
 queen_mated: false,
 queen_clipped: false,
 is_queenless: false,
 queenless_reason: '',
 status: 'active',
 notes: '',
 colony_established_date: new Date().toISOString().split('T')[0],
 queen_installed_date: new Date().toISOString().split('T')[0],
 hive_type: '',
 configuration: {
 brood_boxes: 1, // Legacy field
 brood_boxes_full: 1,
 brood_boxes_half: 0,
 honey_supers: 0,
 queen_excluder: false,
 feeder: false,
 feeder_type: '',
 entrance_reducer: false,
 varroa_mesh_floor: 'closed',
 right_sized_broodbox: false,
 frame_orientation: null,
 hive_size: 'full' as 'full' | 'nuc',
 },
 })

 const fetchHives = useCallback(async (userIdParam?: string) => {
 const currentUserId = userIdParam || userId
 if (!currentUserId) return

 // Fetch team memberships first
 const { data: teamMemberships } = await supabase
 .from('team_members')
 .select('team_id')
 .eq('user_id', currentUserId)

 const teamIds = teamMemberships?.map(tm => tm.team_id) || []

 // Update isTeamMember state based on whether user has any team memberships
 setIsTeamMember(teamIds.length > 0)

 // Fetch shared apiaries if user is in any teams
 let sharedApiaryIds: string[] = []
 if (teamIds.length > 0) {
 const { data: sharedApiaries } = await supabase
 .from('team_apiaries')
 .select('apiary_id')
 .in('team_id', teamIds)

 sharedApiaryIds = sharedApiaries?.map(sa => sa.apiary_id) || []
 }

 // Build base query with archive filter applied first (important for PostgREST)
 let query = supabase
 .from('hives')
 .select(`
 *,
 apiaries(name),
 configuration_changer:profiles!configuration_changed_by(full_name, email)
 `)

 // Apply archive filter FIRST (before ownership filter for better SQL generation)
 if (archiveFilter === 'active') {
 query = query.is('archived_at', null)
 } else if (archiveFilter === 'archived') {
 // Filter for hives where archived_at is NOT NULL
 query = query.not('archived_at', 'is', null)
 }
 // 'all' shows both active and archived hives (no archive filter applied)

 // Apply ownership filter
 if (ownershipFilter === 'my') {
 // Only my hives
 query = query.eq('user_id', currentUserId)
 } else if (ownershipFilter === 'team') {
 // Only team hives (hives from shared apiaries that I'm not the owner of)
 if (sharedApiaryIds.length > 0) {
 query = query
 .in('apiary_id', sharedApiaryIds)
 .neq('user_id', currentUserId)
 } else {
 // No shared apiaries, return empty result
 setHives([])
 setLoading(false)
 return
 }
 } else {
 // 'all' = my hives + hives from shared apiaries only
 if (sharedApiaryIds.length > 0) {
 query = query.or(`user_id.eq.${currentUserId},and(apiary_id.in.(${sharedApiaryIds.join(',')}),user_id.neq.${currentUserId})`)
 } else {
 // No shared apiaries, only show my hives
 query = query.eq('user_id', currentUserId)
 }
 }

 const { data, error } = await query.order('hive_number')

 if (error) {
 console.error('Error fetching hives:', error)
 toast.error(`Error loading hives: ${error.message}`)
 setHives([])
 } else if (data && data.length > 0) {
 // Use joined data from query - apiaries and queens are already included
 const hiveIds = data.map(h => h.id)

 // Batch query for team info for ALL apiaries (shared and owned)
 const allApiaryIds = [...new Set(
 data
 .filter(h => h.apiary_id)
 .map(h => h.apiary_id)
 .filter((id): id is string => id !== null)
 )]

 // Map for shared apiaries (viewing others' hives)
 const teamDataMap = new Map<string, { name: string }>()
 // Map for owner's apiaries that are shared with teams
 const ownerSharedMap = new Map<string, { name: string }>()

 if (allApiaryIds.length > 0) {
 const { data: teamApiaryData, error: teamApiaryError } = await supabase
 .from('team_apiaries')
 .select('apiary_id, teams(name)')
 .in('apiary_id', allApiaryIds)

 if (teamApiaryError) {
 console.error('Error fetching team apiary data:', teamApiaryError)
 }

 if (teamApiaryData) {
 teamApiaryData.forEach((ta) => {
 const typedData = ta as { apiary_id: string; teams: { name: string } | { name: string }[] | null }
 if (typedData.teams) {
 const teamName = Array.isArray(typedData.teams)
 ? typedData.teams[0]?.name || ''
 : typedData.teams.name
 if (teamName) {
 // Check if this apiary belongs to current user or someone else
 const hiveForApiary = data.find(h => h.apiary_id === typedData.apiary_id)
 if (hiveForApiary && hiveForApiary.user_id !== currentUserId) {
 teamDataMap.set(typedData.apiary_id, { name: teamName })
 } else {
 ownerSharedMap.set(typedData.apiary_id, { name: teamName })
 }
 }
 }
 })
 }
 }

 // Batch query for queens
 const queenIds = [...new Set(
 data
 .filter(h => h.queen_id)
 .map(h => h.queen_id)
 .filter((id): id is string => id !== null)
 )]

 const queensMap = new Map<string, { id: string; queen_number: string; marking_color?: string }>()
 if (queenIds.length > 0) {
 const { data: queensData } = await supabase
 .from('queens')
 .select('id, queen_number, marking_color')
 .in('id', queenIds)

 queensData?.forEach(queen => {
 queensMap.set(queen.id, queen)
 })
 }

 // Batch query for QR tags assigned to these hives.
 // Order deterministically so the "most recently assigned" tag wins
 // when a hive has multiple rows (prevents flickering codes on reload).
 const { data: qrTagsData, error: qrTagsError } = await supabase
 .from('qr_tags')
 .select('hive_id, code, assigned_at, created_at')
 .in('hive_id', hiveIds)
 .order('assigned_at', { ascending: false, nullsFirst: false })
 .order('created_at', { ascending: false, nullsFirst: false })

 if (qrTagsError) {
 console.error('Error fetching qr_tags for hive cards:', qrTagsError)
 }

 const qrTagByHive = new Map<string, string>()
 qrTagsData?.forEach(tag => {
 if (tag.hive_id && !qrTagByHive.has(tag.hive_id)) {
 qrTagByHive.set(tag.hive_id, tag.code)
 }
 })

 // Batch query for all inspections for these hives.
 // RLS already restricts to records the user can see (own + shared apiary);
 // do NOT add .eq('user_id', currentUserId) here or team-mate inspections on
 // shared hives are hidden from the hive card aggregates.
 const { data: allInspections } = await supabase
 .from('inspections')
 .select('hive_id, inspection_date, brood_frames, right_sized_frames, brood_pattern_rating, temperament_rating, population_strength, queen_seen, eggs_present')
 .in('hive_id', hiveIds)
 .order('inspection_date', { ascending: false })

 // Group inspections by hive_id
 const inspectionsByHive = new Map<string, typeof allInspections>()
 allInspections?.forEach(inspection => {
 if (!inspectionsByHive.has(inspection.hive_id)) {
 inspectionsByHive.set(inspection.hive_id, [])
 }
 inspectionsByHive.get(inspection.hive_id)!.push(inspection)
 })

 // Batch query for last record of each type across all hives.
 // Notes:
 //   - No .eq('user_id', currentUserId): RLS already restricts the result to
 //     records the user is allowed to see (own + shared via team_apiaries).
 //     Filtering client-side on user_id wrongly hides team-mate records on
 //     shared hives (e.g. badges showed "Never" because a team-mate's
 //     inspection was filtered out).
 //   - No .limit(hiveIds.length): PostgREST's limit is a total row cap, not a
 //     per-hive cap. With the limit set, hives whose latest record is older
 //     than the global top N would silently disappear from the dedupe map.
 //     We rely on the dedupe-first-hit loop below to keep one row per hive.
 const [
 { data: lastInspections },
 { data: lastTreatments },
 { data: lastChecks },
 { data: lastFeedings },
 { data: lastHarvests },
 { data: activeTasks }
 ] = await Promise.all([
 supabase
 .from('inspections')
 .select('hive_id, inspection_date')
 .in('hive_id', hiveIds)
 .order('inspection_date', { ascending: false }),
 supabase
 .from('varroa_treatments')
 .select('hive_id, treatment_date')
 .in('hive_id', hiveIds)
 .order('treatment_date', { ascending: false }),
 supabase
 .from('varroa_checks')
 .select('hive_id, check_date')
 .in('hive_id', hiveIds)
 .order('check_date', { ascending: false }),
 supabase
 .from('feedings')
 .select('hive_id, feed_date')
 .in('hive_id', hiveIds)
 .order('feed_date', { ascending: false }),
 supabase
 .from('harvests')
 .select('hive_id, harvest_date')
 .in('hive_id', hiveIds)
 .order('harvest_date', { ascending: false }),
 supabase
 .from('tasks_events')
 .select('hive_id')
 .in('hive_id', hiveIds)
 .eq('completed', false)
 ])

 // Build map of last inspection date per hive
 const lastInspectionByHive = new Map<string, string>()
 lastInspections?.forEach(i => {
 if (!lastInspectionByHive.has(i.hive_id)) {
 lastInspectionByHive.set(i.hive_id, i.inspection_date)
 }
 })

 // Build map of most recent record for each hive
 const lastRecordByHive = new Map<string, { date: string; type: string }>()

 hiveIds.forEach(hiveId => {
 const records: Array<{ date: string; type: string }> = []

 const inspection = lastInspections?.find(i => i.hive_id === hiveId)
 if (inspection) records.push({ date: inspection.inspection_date, type: 'Inspection' })

 const treatment = lastTreatments?.find(t => t.hive_id === hiveId)
 if (treatment) records.push({ date: treatment.treatment_date, type: 'Varroa Treatment' })

 const check = lastChecks?.find(c => c.hive_id === hiveId)
 if (check) records.push({ date: check.check_date, type: 'Varroa Check' })

 const feeding = lastFeedings?.find(f => f.hive_id === hiveId)
 if (feeding) records.push({ date: feeding.feed_date, type: 'Feeding' })

 const harvest = lastHarvests?.find(h => h.hive_id === hiveId)
 if (harvest) records.push({ date: harvest.harvest_date, type: 'Harvest' })

 // Find the most recent record
 if (records.length > 0) {
 records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
 lastRecordByHive.set(hiveId, records[0])
 }
 })

 // Build map of active task counts per hive
 const activeTasksByHive = new Map<string, number>()
 activeTasks?.forEach(task => {
 if (task.hive_id) {
 const count = activeTasksByHive.get(task.hive_id) || 0
 activeTasksByHive.set(task.hive_id, count + 1)
 }
 })

 // Enrich hives with last seen info for each hive
 const enrichedHives = data.map((hive) => {
 const inspections = inspectionsByHive.get(hive.id) || []

 // Find last queen seen and eggs present
 const queenInspection = inspections.find(i => i.queen_seen === true)
 const eggsInspection = inspections.find(i => i.eggs_present === true)

 // Determine team info for shared hives
 const isShared = hive.user_id !== currentUserId
 const teamData = hive.apiary_id ? teamDataMap.get(hive.apiary_id) : undefined
 // Get team info for owner's shared apiaries
 const ownerSharedData = hive.apiary_id ? ownerSharedMap.get(hive.apiary_id) : undefined

 // Get queen data if queen is assigned
 const queenData = hive.queen_id ? queensMap.get(hive.queen_id) : undefined

 // Get last record for this hive
 const lastRecord = lastRecordByHive.get(hive.id) || null

 return {
 ...hive,
 queens: queenData,
 queen_last_seen: queenInspection?.inspection_date || null,
 eggs_last_present: eggsInspection?.inspection_date || null,
 team_name: teamData?.name || null,
 is_shared: isShared,
 shared_with_team: ownerSharedData?.name || null,
 last_record: lastRecord,
 last_inspection_date: lastInspectionByHive.get(hive.id) || null,
 active_tasks_count: activeTasksByHive.get(hive.id) || 0,
 qr_tag_code: qrTagByHive.get(hive.id) ?? null,
 }
 })

 setHives(enrichedHives as Hive[])
 } else {
 setHives([])
 }
 setLoading(false)
 // IMPORTANT: ownershipFilter and archiveFilter MUST be in deps so fetchHives
 // can read their current values. The useEffect that calls fetchHives has
 // eslint-disable to prevent infinite loops.
 }, [userId, ownershipFilter, archiveFilter, toast])

 const fetchApiaries = useCallback(async (userIdParam?: string) => {
 const currentUserId = userIdParam || userId
 if (!currentUserId) return

 // Fetch user's own apiaries
 const { data: ownApiaries, error: ownError } = await supabase
 .from('apiaries')
 .select('id, name, user_id')
 .eq('user_id', currentUserId)
 .order('name')

 if (ownError) {
 console.error('Error fetching own apiaries:', ownError)
 return
 }

 // Fetch team memberships to get shared apiaries
 const { data: teamMemberships } = await supabase
 .from('team_members')
 .select('team_id')
 .eq('user_id', currentUserId)

 const teamIds = teamMemberships?.map(tm => tm.team_id) || []

 let sharedApiaries: HiveListApiary[] = []
 if (teamIds.length > 0) {
 // Get shared apiary IDs
 const { data: teamApiaries } = await supabase
 .from('team_apiaries')
 .select('apiary_id')
 .in('team_id', teamIds)

 const sharedApiaryIds = teamApiaries?.map(ta => ta.apiary_id) || []

 if (sharedApiaryIds.length > 0) {
 // Fetch the actual apiary details for shared apiaries (excluding user's own)
 const { data: sharedApiaryData } = await supabase
 .from('apiaries')
 .select('id, name, user_id')
 .in('id', sharedApiaryIds)
 .neq('user_id', currentUserId)
 .order('name')

 if (sharedApiaryData) {
 sharedApiaries = sharedApiaryData.map(apiary => ({
 ...apiary,
 is_shared: true
 }))
 }
 }
 }

 // Combine own apiaries and shared apiaries
 const allApiaries = [
 ...(ownApiaries || []).map(a => ({ ...a, is_shared: false })),
 ...sharedApiaries
 ]

 setApiaries(allApiaries as HiveListApiary[])
 }, [userId])

 const fetchQueens = useCallback(async (userIdParam?: string) => {
 const currentUserId = userIdParam || userId
 if (!currentUserId) return

 // Get shared apiary IDs
 const { data: teamMemberships } = await supabase
 .from('team_members')
 .select('team_id')
 .eq('user_id', currentUserId)

 const teamIds = teamMemberships?.map(tm => tm.team_id) || []

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
 let queensQuery = supabase
 .from('queens')
 .select('id, queen_number, status')
 .in('status', ['active', 'cell'])

 if (sharedUserIds.length > 0) {
 queensQuery = queensQuery.or(`user_id.eq.${currentUserId},user_id.in.(${sharedUserIds.join(',')})`)
 } else {
 queensQuery = queensQuery.eq('user_id', currentUserId)
 }

 const { data, error } = await queensQuery.order('queen_number')

 if (!error && data) {
 // Fetch all queen IDs to check which ones are assigned to hives
 const queenIds = data.map(q => q.id)

 if (queenIds.length > 0) {
 // Get all hives that have any of these queens assigned
 const { data: assignedHives } = await supabase
 .from('hives')
 .select('id, queen_id')
 .in('queen_id', queenIds)
 .not('queen_id', 'is', null)

 // Create a map of queen_id -> hive_id for quick lookup
 const assignmentMap = new Map<string, string>()
 assignedHives?.forEach(hive => {
 if (hive.queen_id) {
 assignmentMap.set(hive.queen_id, hive.id)
 }
 })

 // Add assignment info to queens
 const queensWithAssignments = data.map(q => ({
 ...q,
 assigned_hive_id: assignmentMap.get(q.id) || null
 }))

 setQueens(queensWithAssignments as HiveListQueen[])
 } else {
 setQueens(data as HiveListQueen[])
 }
 }
 }, [userId])

 // Load filters from sessionStorage on mount and validate against available apiaries
 useEffect(() => {
 if (typeof window !== 'undefined' && !filtersLoaded && apiaries.length > 0) {
 const savedApiary = sessionStorage.getItem('hives_filter_apiary')
 const savedOwnership = sessionStorage.getItem('hives_filter_ownership')

 // Only restore apiary filter if it's valid (exists in current apiaries list)
 if (savedApiary && savedApiary !== '') {
 const apiaryExists = apiaries.some(a => a.id === savedApiary)
 if (apiaryExists) {
 setFilterApiaryId(savedApiary)
 } else {
 // Apiary no longer exists, clear the saved filter
 sessionStorage.removeItem('hives_filter_apiary')
 }
 }

 if (savedOwnership && (savedOwnership === 'my' || savedOwnership === 'team' || savedOwnership === 'all')) {
 setOwnershipFilter(savedOwnership)
 }

 const savedScaleFilter = sessionStorage.getItem('hives_filter_scales')
 if (savedScaleFilter === 'true') {
 setScaleFilter(true)
 }

 const savedSort = sessionStorage.getItem('hives_sort')
 if (savedSort) {
 setSortOption(savedSort)
 }

 setFiltersLoaded(true)
 }
 }, [filtersLoaded, apiaries])

 useEffect(() => {
 const initUser = async () => {
 const id = await getCurrentUserId()
 if (!id) {
 router.push('/login')
 return
 }
 setUserId(id)
 fetchHives(id)
 fetchApiaries(id)
 fetchQueens(id)
 }
 initUser()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [router])

 // Save filter settings to sessionStorage when they change
 useEffect(() => {
 if (typeof window !== 'undefined' && filtersLoaded) {
 sessionStorage.setItem('hives_filter_apiary', filterApiaryId)
 }
 }, [filterApiaryId, filtersLoaded])

 useEffect(() => {
 if (typeof window !== 'undefined' && filtersLoaded) {
 sessionStorage.setItem('hives_filter_ownership', ownershipFilter)
 }
 }, [ownershipFilter, filtersLoaded])

 useEffect(() => {
 if (typeof window !== 'undefined' && filtersLoaded) {
 sessionStorage.setItem('hives_filter_scales', scaleFilter.toString())
 }
 }, [scaleFilter, filtersLoaded])

 // Refetch hives when ownership or archive filter changes
 useEffect(() => {
 if (userId && filtersLoaded) {
 fetchHives(userId)
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [ownershipFilter, archiveFilter, userId, filtersLoaded])

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

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!userId) return

 // Validate: queenless requires a reason
 if (formData.is_queenless && !formData.queenless_reason) {
 toast.warning('Please select a reason for the queenless status before saving.')
 return
 }

 // The queen the workflow needs to "send off" on this save. We only do
 // the queen-status update when we are TRANSITIONING into queenless on
 // this save — re-editing an already-queenless hive (queen_id was cleared
 // on the previous save) must not re-touch the queen.
 const queenIdToReassign =
 formData.is_queenless && !editingHive?.is_queenless
 ? (editingHive?.queen_id || formData.queen_id || null)
 : null

 try {
 type HiveSubmitData = Omit<typeof formData, 'apiary_id' | 'queen_id' | 'queenless_reason'> & {
 apiary_id: string | null
 queen_id: string | null
 queenless_reason: string | null
 configuration_changed_at?: string
 configuration_changed_by?: string
 }

 let dataToSubmit: HiveSubmitData = {
 ...formData,
 apiary_id: formData.apiary_id || null,
 // When queenless, the hive has no current queen — clear the link.
 queen_id: formData.is_queenless ? null : (formData.queen_id || null),
 // Reason only persists when queenless; null it out otherwise so the
 // column never carries a stale value from a prior queenless period.
 queenless_reason: formData.is_queenless ? formData.queenless_reason : null,
 }

 // Check if configuration has changed (for existing hives)
 if (editingHive) {
 const configChanged = JSON.stringify(editingHive.configuration) !== JSON.stringify(formData.configuration)

 if (configChanged) {
 dataToSubmit = {
 ...dataToSubmit,
 configuration_changed_at: new Date().toISOString(),
 configuration_changed_by: userId,
 }
 }
 } else {
 // New hive - set initial configuration tracking
 dataToSubmit = {
 ...dataToSubmit,
 configuration_changed_at: new Date().toISOString(),
 configuration_changed_by: userId,
 }
 }

 // Validate queen assignment: check if queen is already assigned to another active hive (including shared hives)
 // Use RPC function to bypass RLS and check ALL hives in the system
 if (dataToSubmit.queen_id) {
 const { data: assignedHive, error: checkError } = await supabase
 .rpc('check_queen_assignment', {
 p_queen_id: dataToSubmit.queen_id,
 p_exclude_hive_id: editingHive?.id || null
 })

 if (checkError) {
 console.error('Queen assignment check error:', checkError)
 throw new Error('Failed to validate queen assignment')
 }

 // If the function returns a row, the queen is already assigned
 if (assignedHive && assignedHive.length > 0) {
 const hive = assignedHive[0]
 const apiaryText = hive.apiary_name || 'Unknown apiary'
 const selectedQueen = queens.find(q => q.id === dataToSubmit.queen_id)
 const queenName = selectedQueen?.queen_number || 'this queen'
 const ownership = hive.hive_owner_id === userId ? 'your' : 'a team member\'s'

 toast.warning(`Cannot assign queen: ${queenName} is already assigned to ${ownership} active hive "${hive.hive_number}" at ${apiaryText}. A queen can only be in one active hive at a time.`)
 return
 }
 }

 // Validate row + order combination: check if this combination is already used in the same apiary
 if (dataToSubmit.apiary_id && dataToSubmit.row_in_apiary !== null && dataToSubmit.order_in_apiary !== null) {
 let query = supabase
 .from('hives')
 .select('id, hive_number')
 .eq('apiary_id', dataToSubmit.apiary_id)
 .eq('row_in_apiary', dataToSubmit.row_in_apiary)
 .eq('order_in_apiary', dataToSubmit.order_in_apiary)

 // Only exclude current hive when editing (not when creating new)
 if (editingHive?.id) {
 query = query.neq('id', editingHive.id)
 }

 const { data: existingPosition, error: positionError } = await query

 if (positionError) {
 throw new Error('Failed to validate position assignment')
 }

 if (existingPosition && existingPosition.length > 0) {
 toast.warning(`Row ${dataToSubmit.row_in_apiary}, Position ${dataToSubmit.order_in_apiary} is already used by hive "${existingPosition[0].hive_number}" in this apiary. Each hive must have a unique row and order combination within the apiary.`)
 return
 }
 }

 if (editingHive) {
 // Update hive - RLS policies will handle permissions for both owned and shared hives
 // Note: The database trigger will automatically create a history entry if configuration changes
 const { error } = await supabase
 .from('hives')
 .update(dataToSubmit)
 .eq('id', editingHive.id)

 if (error) throw error

 // History tracking is handled by database trigger - no manual insert needed
 } else {
 // Verify apiary ownership before inserting
 if (dataToSubmit.apiary_id) {
 const { data: apiaryCheck, error: apiaryError } = await supabase
 .from('apiaries')
 .select('id, user_id, name')
 .eq('id', dataToSubmit.apiary_id)
 .single()

 if (apiaryError) {
 throw new Error('Failed to verify apiary ownership')
 }

 if (!apiaryCheck || apiaryCheck.user_id !== userId) {
 throw new Error(`Cannot create hive: The selected apiary "${apiaryCheck?.name || 'Unknown'}" does not belong to you. Hives can only be added to your own apiaries.`)
 }
 }

 // Insert with user_id for RLS policy compliance
 const insertData = { ...dataToSubmit, user_id: userId }

 // Verify the session is valid
 const { data: { session }, error: sessionError } = await supabase.auth.getSession()

 if (sessionError) {
 console.error('Session error:', sessionError)
 }

 if (!session) {
 throw new Error('No active session found. Please refresh the page and try again.')
 }

 // Test if we can call the ownership function directly
 if (insertData.apiary_id) {
 const { error: ownershipError } = await supabase
 .rpc('check_user_owns_apiary', {
 apiary_uuid: insertData.apiary_id,
 user_uuid: userId
 })

 if (ownershipError) {
 console.error('Direct ownership check error:', ownershipError)
 }
 }

 const { data: newHive, error } = await supabase
 .from('hives')
 .insert([insertData])
 .select('id')
 .single()

 if (error) {
 console.error('Hive insert error:', error)
 console.error('Error code:', error.code)
 console.error('Error details:', error.details)
 console.error('Error hint:', error.hint)
 throw error
 }

 // Record initial configuration in history for new hive
 // (INSERT trigger doesn't exist, only UPDATE trigger)
 if (newHive) {
 const { error: historyError } = await supabase
 .from('hive_configuration_history')
 .insert([{
 hive_id: newHive.id,
 changed_at: new Date().toISOString(),
 changed_by: userId,
 configuration: formData.configuration,
 apiary_id: formData.apiary_id || null,
 row_in_apiary: formData.row_in_apiary,
 order_in_apiary: formData.order_in_apiary,
 queen_id: formData.queen_id || null,
 queen_marked: formData.queen_marked,
 queen_marking_color: formData.queen_marking_color || null,
 queen_mated: formData.queen_mated,
 queen_clipped: formData.queen_clipped,
 is_queenless: formData.is_queenless
 }])

 if (historyError) {
 console.error('Failed to record initial configuration history:', historyError)
 // Don't throw - hive was created successfully, history is supplementary
 }
 }
 }

 // If the hive just transitioned to queenless and had a linked queen,
 // update that queen's record so her status matches the reason. Lineage
 // queries depend on each queen's own status being truthful.
 if (queenIdToReassign && formData.queenless_reason) {
 const nextQueenStatus = mapReasonToQueenStatus(formData.queenless_reason)

 const { error: queenUpdateError } = await supabase
 .from('queens')
 .update({ status: nextQueenStatus })
 .eq('id', queenIdToReassign)

 if (queenUpdateError) {
 console.error('Failed to update queen status after queenless transition:', queenUpdateError)
 toast.warning('Hive saved, but the linked queen\'s status could not be updated. Open Queens to set it manually.')
 }
 }

 if (userId) fetchHives(userId)
 resetForm()
 } catch (error) {
 if (error instanceof Error) {
 toast.error(`Failed to save hive: ${error.message}`)
 }
 }
 }

 const handleEdit = (hive: Hive) => {
 setEditingHive(hive)
 setFormData({
 hive_number: hive.hive_number,
 apiary_id: hive.apiary_id || '',
 order_in_apiary: hive.order_in_apiary ?? null,
 row_in_apiary: hive.row_in_apiary ?? null,
 order_direction: hive.order_direction || 'entrances',
 queen_id: hive.queen_id || '',
 queen_marked: hive.queen_marked || false,
 queen_marking_color: hive.queen_marking_color || '',
 queen_mated: hive.queen_mated || false,
 queen_clipped: hive.queen_clipped || false,
 is_queenless: hive.is_queenless || false,
 queenless_reason: hive.queenless_reason || '',
 status: hive.status,
 notes: hive.notes || '',
 colony_established_date: hive.colony_established_date || '',
 queen_installed_date: hive.queen_installed_date || '',
 hive_type: hive.hive_type || '',
 configuration: {
 brood_boxes: hive.configuration?.brood_boxes || 1, // Legacy field
 brood_boxes_full: hive.configuration?.brood_boxes_full ?? (hive.configuration?.brood_boxes || 1),
 brood_boxes_half: hive.configuration?.brood_boxes_half ?? 0,
 honey_supers: hive.configuration?.honey_supers || 0,
 queen_excluder: hive.configuration?.queen_excluder || false,
 feeder: hive.configuration?.feeder || false,
 feeder_type: hive.configuration?.feeder_type || '',
 entrance_reducer: hive.configuration?.entrance_reducer || false,
 varroa_mesh_floor: hive.configuration?.varroa_mesh_floor || 'closed',
 right_sized_broodbox: hive.configuration?.right_sized_broodbox || false,
 frame_orientation: hive.configuration?.frame_orientation || null,
 hive_size: (hive.configuration?.hive_size as 'full' | 'nuc') || 'full',
 },
 })
 setShowForm(true)

 // Scroll to the top where the form is
 setTimeout(() => {
 formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
 }, 100)
 }

 const handleDelete = async (id: string) => {
 if (!userId) return
 if (confirm('Are you sure you want to delete this hive?')) {
 const { error } = await supabase
 .from('hives')
 .delete()
 .eq('id', id)
 .eq('user_id', userId)

 if (!error && userId) fetchHives(userId)
 }
 }

 const handleUnarchive = async (hive: Hive) => {
 if (!userId) return

 const confirmed = window.confirm(
 `Are you sure you want to unarchive hive ${hive.hive_number}?\n\n` +
 'This will:\n' +
 '- Set the hive status back to active\n' +
 '- Clear the archive date and reason\n' +
 '- Make the hive visible in your active hives list'
 )

 if (!confirmed) return

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

 const resetForm = () => {
 setShowForm(false)
 setEditingHive(null)
 setFormData({
 hive_number: '',
 apiary_id: '',
 order_in_apiary: null,
 row_in_apiary: null,
 order_direction: 'entrances',
 queen_id: '',
 queen_marked: false,
 queen_marking_color: '',
 queen_mated: false,
 queen_clipped: false,
 is_queenless: false,
 queenless_reason: '',
 status: 'active',
 notes: '',
 colony_established_date: new Date().toISOString().split('T')[0],
 queen_installed_date: new Date().toISOString().split('T')[0],
 hive_type: '',
 configuration: {
 brood_boxes: 1, // Legacy field
 brood_boxes_full: 1,
 brood_boxes_half: 0,
 honey_supers: 0,
 queen_excluder: false,
 feeder: false,
 feeder_type: '',
 entrance_reducer: false,
 varroa_mesh_floor: 'closed',
 right_sized_broodbox: false,
 frame_orientation: null,
 hive_size: 'full' as 'full' | 'nuc',
 },
 })
 }

 // Check if any hives have scales configured
 const hasAnyScales = hives.some(h => h.beep_device_id || h.wolf_scale_id)

 // Filter and sort hives based on selected apiary and position
 const filteredHives = [...hives]
 .filter(hive => {
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

 return (
 <div className="space-y-6">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <h1 className="text-responsive-3xl font-bold text-foreground">Hives</h1>
 <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
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
 onChange={(e) => {
 setSortOption(e.target.value)
 sessionStorage.setItem('hives_sort', e.target.value)
 }}
 className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition-all"
 >
 <option value="default">Sort: Default</option>
 <option value="hive_number">Sort: Hive Number</option>
 <option value="last_inspected">Sort: Last Inspected</option>
 <option value="status">Sort: Status</option>
 </select>
 <Button
 onClick={() => setShowForm(!showForm)}
 className="px-4 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 active:bg-forest-800 dark:active:bg-forest-700 font-medium flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto"
 >
 {showForm ? <X size={18} /> : <Plus size={18} />}
 {showForm ? 'Cancel' : 'Add Hive'}
 </Button>
 </div>
 </div>

 {showForm && (
 <div ref={formRef} className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
 <h3 className="text-xl font-semibold text-foreground">
 {editingHive ? 'Edit Hive' : 'Add New Hive'}
 </h3>
 <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
 <Button
 type="submit"
 form="hive-form"
 className="px-6 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 active:bg-forest-800 dark:active:bg-forest-700 touch-manipulation font-medium"
 >
 {editingHive ? 'Update' : 'Add'} Hive
 </Button>
 <Button
 type="button"
 onClick={resetForm}
 className="px-6 py-3 sm:py-2 min-h-[48px] bg-surface dark:bg-surface-elevated text-text-primary rounded-lg hover:bg-surface-elevated active:bg-surface-elevated touch-manipulation font-medium"
 >
 Cancel
 </Button>
 </div>
 </div>
 <form id="hive-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Hive Number *</label>
 <input
 type="text"
 value={formData.hive_number}
 onChange={(e) => setFormData({...formData, hive_number: e.target.value})}
 placeholder="e.g., A-1, B-3"
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Apiary *
 <span className="block text-xs font-normal text-text-tertiary mt-0.5">
 Required for weather data in inspection records
 </span>
 </label>
 <select
 value={formData.apiary_id}
 onChange={(e) => setFormData({...formData, apiary_id: e.target.value})}
 className="w-full fj-control"
 required
 >
 <option value="">Select apiary</option>
 {apiaries.map((a) => (
 <option key={a.id} value={a.id}>
 {a.name}{a.is_shared ? ' (Shared)' : ''}
 </option>
 ))}
 </select>
 {apiaries.length === 0 && (
 <p className="mt-1 text-xs text-amber-400">
 No apiaries available. Please create an apiary first to enable weather data for inspections.
 </p>
 )}
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Row in Apiary
 <span className="block text-xs font-normal text-text-tertiary mt-0.5 invisible">Placeholder for alignment</span>
 </label>
 <div className="flex gap-2 mb-2 invisible">
 <label className="flex items-center gap-2">
 <input type="radio" className="w-4 h-4" />
 <span className="text-sm">Placeholder</span>
 </label>
 <label className="flex items-center gap-2">
 <input type="radio" className="w-4 h-4" />
 <span className="text-sm">Placeholder</span>
 </label>
 </div>
 <div className="flex gap-2">
 <Button
 type="button"
 onClick={() => setFormData({...formData, row_in_apiary: Math.max(1, (formData.row_in_apiary ?? 1) - 1)})}
 className="px-3 sm:px-4 py-2 font-bold text-lg flex-shrink-0"
 >
 −
 </Button>
 <input
 type="number"
 value={formData.row_in_apiary ?? ''}
 onChange={(e) => setFormData({...formData, row_in_apiary: e.target.value ? parseInt(e.target.value) : null})}
 placeholder="Optional"
 className="flex-1 min-w-0 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-center placeholder-text-tertiary"
 min="1"
 />
 <Button
 type="button"
 onClick={() => setFormData({...formData, row_in_apiary: (formData.row_in_apiary ?? 0) + 1})}
 className="px-3 sm:px-4 py-2 font-bold text-lg flex-shrink-0"
 >
 +
 </Button>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">
 Hive in Row
 <span className="block text-xs font-normal text-text-tertiary mt-0.5">
 For looking left to right choose option
 </span>
 </label>
 <div className="flex gap-2 mb-2">
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="radio"
 name="order_direction"
 value="entrances"
 checked={formData.order_direction === 'entrances'}
 onChange={(e) => setFormData({...formData, order_direction: e.target.value as 'entrances' | 'backs'})}
 className="w-4 h-4 text-forest-600 dark:text-forest-400"
 />
 <span className="text-sm text-text-secondary">Entrances</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="radio"
 name="order_direction"
 value="backs"
 checked={formData.order_direction === 'backs'}
 onChange={(e) => setFormData({...formData, order_direction: e.target.value as 'entrances' | 'backs'})}
 className="w-4 h-4 text-forest-600 dark:text-forest-400"
 />
 <span className="text-sm text-text-secondary">Backs</span>
 </label>
 </div>
 <div className="flex gap-2">
 <Button
 type="button"
 onClick={() => setFormData({...formData, order_in_apiary: Math.max(1, (formData.order_in_apiary ?? 1) - 1)})}
 className="px-3 sm:px-4 py-2 font-bold text-lg flex-shrink-0"
 >
 −
 </Button>
 <input
 type="number"
 value={formData.order_in_apiary ?? ''}
 onChange={(e) => setFormData({...formData, order_in_apiary: e.target.value ? parseInt(e.target.value) : null})}
 placeholder="Optional"
 className="flex-1 min-w-0 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-center placeholder-text-tertiary"
 min="1"
 />
 <Button
 type="button"
 onClick={() => setFormData({...formData, order_in_apiary: (formData.order_in_apiary ?? 0) + 1})}
 className="px-3 sm:px-4 py-2 font-bold text-lg flex-shrink-0"
 >
 +
 </Button>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Queen</label>
 <select
 value={formData.queen_id}
 onChange={(e) => setFormData({...formData, queen_id: e.target.value})}
 className="w-full fj-control"
 >
 <option value="">Record manual</option>
 {queens
 .filter(q => {
 // Show unassigned queens OR the queen currently assigned to this hive (if editing)
 if (!q.assigned_hive_id) {
 return true // Unassigned queen - always show
 }
 // If editing, show the queen if it's assigned to THIS hive
 return editingHive && q.assigned_hive_id === editingHive.id
 })
 .map((q) => (
 <option key={q.id} value={q.id}>{q.queen_number}{q.status === 'cell' ? ' (Cell)' : ''}</option>
 ))
 }
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
 <select
 value={formData.status}
 onChange={(e) => setFormData({...formData, status: e.target.value})}
 className="w-full fj-control"
 >
 <option value="active">Active</option>
 <option value="retired">Retired</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
 <select
 value={formData.hive_type}
 onChange={(e) => setFormData({...formData, hive_type: e.target.value})}
 className="w-full fj-control"
 >
 <option value="">Select type</option>
 <option value="Production">Production</option>
 <option value="Bee production">Bee production</option>
 <option value="Split">Split</option>
 <option value="Swarm">Swarm</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Colony Established Date</label>
 <input
 type="date"
 value={formData.colony_established_date}
 onChange={(e) => setFormData({...formData, colony_established_date: e.target.value})}
 className="w-full fj-control"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Queen Installed Date</label>
 <input
 type="date"
 value={formData.queen_installed_date}
 onChange={(e) => setFormData({...formData, queen_installed_date: e.target.value})}
 className="w-full fj-control"
 />
 </div>

 <div className="md:col-span-2">
 <Button
 type="button"
 onClick={() => {
 const next = !formData.is_queenless
 setFormData({
 ...formData,
 is_queenless: next,
 // Clear the reason when toggling off; preserve any previous reason when toggling back on
 queenless_reason: next ? formData.queenless_reason : '',
 })
 }}
 className={`w-full px-4 py-3 min-h-[48px] rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-2 touch-manipulation ${
 formData.is_queenless
 ? 'bg-red-600 dark:bg-red-700 text-white shadow-md hover:bg-red-700 dark:hover:bg-red-800 active:bg-red-800 dark:active:bg-red-900'
 : 'bg-surface dark:bg-surface-elevated text-text-primary hover:bg-surface-elevated active:bg-surface-elevated border border-border'
 }`}
 >
 <span className="text-lg">{formData.is_queenless ? '✓' : '○'}</span>
 Confirmed Queenless
 </Button>
 <p className="mt-1 text-xs text-text-tertiary">
 Tick this if the colony has no queen (for example, after a swarm). The hive will display a red Queenless badge.
 </p>
 {formData.is_queenless && (
 <div className="mt-3">
 <label htmlFor="queenless-reason" className="block text-sm font-medium text-text-secondary mb-1">
 Reason <span className="text-red-600">*</span>
 </label>
 <select
 id="queenless-reason"
 value={formData.queenless_reason}
 onChange={(e) => setFormData({ ...formData, queenless_reason: e.target.value })}
 required
 className="w-full fj-control"
 >
 <option value="">Select a reason...</option>
 {QUEENLESS_REASONS.map((r) => (
 <option key={r.value} value={r.value}>{r.formLabel}</option>
 ))}
 </select>
 {formData.queen_id && (
 <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
 The linked queen will be updated to reflect this outcome and removed from this hive on save.
 </p>
 )}
 </div>
 )}
 </div>

 {/* Show queen attribute toggles only when there is a queen to describe */}
 {!formData.queen_id && !formData.is_queenless && (
 <>
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-3">Queen Status (if no specific queen assigned)</label>
 <div className="flex flex-col sm:flex-row gap-3">
 <Button
 type="button"
 onClick={() => setFormData({
 ...formData,
 queen_marked: !formData.queen_marked,
 queen_marking_color: !formData.queen_marked ? formData.queen_marking_color : ''
 })}
 className={`px-4 py-3 min-h-[48px] rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-2 touch-manipulation ${
 formData.queen_marked
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md hover:bg-forest-700 dark:hover:bg-forest-600 active:bg-forest-800 dark:active:bg-forest-700'
 : 'bg-surface dark:bg-surface-elevated text-text-primary hover:bg-surface-elevated active:bg-surface-elevated'
 }`}
 >
 <span className="text-lg">{formData.queen_marked ? '✓' : '○'}</span>
 Queen Marked
 </Button>
 <Button
 type="button"
 onClick={() => setFormData({...formData, queen_mated: !formData.queen_mated})}
 className={`px-4 py-3 min-h-[48px] rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-2 touch-manipulation ${
 formData.queen_mated
 ? 'bg-green-600 text-white shadow-md hover:bg-green-700 active:bg-green-800'
 : 'bg-surface dark:bg-surface-elevated text-text-primary hover:bg-surface-elevated active:bg-surface-elevated'
 }`}
 >
 <span className="text-lg">{formData.queen_mated ? '♥' : '○'}</span>
 Queen Mated
 </Button>
 <Button
 type="button"
 onClick={() => setFormData({...formData, queen_clipped: !formData.queen_clipped})}
 className={`px-4 py-3 min-h-[48px] rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-2 touch-manipulation ${
 formData.queen_clipped
 ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:bg-blue-800'
 : 'bg-surface dark:bg-surface-elevated text-text-primary hover:bg-surface-elevated active:bg-surface-elevated'
 }`}
 >
 <span className="text-lg">{formData.queen_clipped ? '✂' : '○'}</span>
 Queen Clipped
 </Button>
 </div>
 </div>

 {/* Show marking color dropdown when Queen Marked is checked */}
 {formData.queen_marked && (
 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-1">Queen Marking Color</label>
 <select
 value={formData.queen_marking_color}
 onChange={(e) => setFormData({...formData, queen_marking_color: e.target.value})}
 className="w-full md:w-1/2 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
 >
 <option value="">Select color</option>
 <option value="White">White</option>
 <option value="Yellow">Yellow</option>
 <option value="Red">Red</option>
 <option value="Green">Green</option>
 <option value="Blue">Blue</option>
 </select>
 <p className="text-xs text-text-tertiary mt-1">
 International standard: White (1,6) | Yellow (2,7) | Red (3,8) | Green (4,9) | Blue (5,0)
 </p>
 </div>
 )}
 </>
 )}

 {/* Hive Configuration Section */}
 <div className="md:col-span-2 p-4 bg-surface dark:bg-surface-elevated rounded-lg border-2 border-forest-200 dark:border-forest-900/50">
 <h4 className="text-md font-semibold text-forest-600 dark:text-forest-400 mb-4">Hive Configuration</h4>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2">
 Full-Size Brood Boxes: {formData.configuration.brood_boxes_full}
 </label>
 <div className="flex gap-2">
 {[0, 1, 2, 3, 4].map((num) => (
 <Button
 key={num}
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, brood_boxes_full: num}})}
 className={`px-4 py-2 rounded-lg font-semibold transition-all ${
 formData.configuration.brood_boxes_full === num
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
 : 'fj-btn-neutral'
 }`}
 >
 {num}
 </Button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2">
 Half-Size Brood Boxes: {formData.configuration.brood_boxes_half}
 </label>
 <div className="flex gap-2">
 {[0, 1, 2, 3, 4].map((num) => (
 <Button
 key={num}
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, brood_boxes_half: num}})}
 className={`px-4 py-2 rounded-lg font-semibold transition-all ${
 formData.configuration.brood_boxes_half === num
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
 : 'fj-btn-neutral'
 }`}
 >
 {num}
 </Button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2">
 Honey Supers: {formData.configuration.honey_supers}
 </label>
 <div className="flex gap-2">
 {[0, 1, 2, 3, 4].map((num) => (
 <Button
 key={num}
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, honey_supers: num}})}
 className={`px-4 py-2 rounded-lg font-semibold transition-all ${
 formData.configuration.honey_supers === num
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
 : 'fj-btn-neutral'
 }`}
 >
 {num}
 </Button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Varroa Mesh Floor</label>
 <select
 value={formData.configuration.varroa_mesh_floor}
 onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, varroa_mesh_floor: e.target.value}})}
 className="w-full fj-control"
 >
 <option value="closed">Closed</option>
 <option value="open">Open</option>
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-text-secondary mb-1">Feeder Type</label>
 <select
 value={formData.configuration.feeder_type}
 onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, feeder_type: e.target.value, feeder: e.target.value !== ''}})}
 className="w-full fj-control"
 >
 <option value="">None</option>
 <option value="top">Top Feeder</option>
 <option value="frame">Frame Feeder</option>
 <option value="entrance">Entrance Feeder</option>
 <option value="boardman">Boardman Feeder</option>
 </select>
 </div>

 <div className="md:col-span-2 flex flex-wrap gap-3">
 <Button
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, queen_excluder: !formData.configuration.queen_excluder}})}
 className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
 formData.configuration.queen_excluder
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
 : 'fj-btn-neutral'
 }`}
 >
 {formData.configuration.queen_excluder ? '✓' : '○'} Queen Excluder
 </Button>

 <Button
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, entrance_reducer: !formData.configuration.entrance_reducer}})}
 className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
 formData.configuration.entrance_reducer
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
 : 'fj-btn-neutral'
 }`}
 >
 {formData.configuration.entrance_reducer ? '✓' : '○'} Entrance Reducer
 </Button>

 <Button
 type="button"
 onClick={() => setFormData({...formData, configuration: {...formData.configuration, right_sized_broodbox: !formData.configuration.right_sized_broodbox}})}
 className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
 formData.configuration.right_sized_broodbox
 ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
 : 'fj-btn-neutral'
 }`}
 >
 {formData.configuration.right_sized_broodbox ? '✓' : '○'} Right-Sized Brood Area
 </Button>
 </div>

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-2">
 Frame Orientation
 <span className="ml-2 text-xs text-text-tertiary font-normal">
 (Warm way: frames parallel to entrance, Cold way: frames perpendicular to entrance)
 </span>
 </label>
 <select
 value={formData.configuration.frame_orientation ?? ''}
 onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, frame_orientation: e.target.value || null}})}
 className="w-full fj-control"
 >
 <option value="">Not specified</option>
 <option value="warm">Warm Way</option>
 <option value="cold">Cold Way</option>
 </select>
 </div>

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-2">
 Hive Size
 </label>
 <select
 value={formData.configuration.hive_size}
 onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, hive_size: e.target.value as 'full' | 'nuc'}})}
 className="w-full fj-control"
 >
 <option value="full">Full Size Hive</option>
 <option value="nuc">Nucleus Colony (Nuc)</option>
 </select>
 </div>
 </div>
 </div>

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({...formData, notes: e.target.value})}
 rows={3}
 placeholder="Special characteristics, equipment, etc..."
 className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
 />
 </div>

 <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
 <Button
 type="submit"
 className="px-6 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 active:bg-forest-800 dark:active:bg-forest-700 touch-manipulation font-medium"
 >
 {editingHive ? 'Update' : 'Add'} Hive
 </Button>
 <Button
 type="button"
 onClick={resetForm}
 className="px-6 py-3 sm:py-2 min-h-[48px] bg-surface dark:bg-surface-elevated text-text-primary rounded-lg hover:bg-surface-elevated active:bg-surface-elevated touch-manipulation font-medium"
 >
 Cancel
 </Button>
 </div>
 </form>
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
 />
 ))}
 </div>

 {filteredHives.length === 0 && (
 <EmptyState
 icon={Archive}
 title="No Hives Found"
 description={filterApiaryId
 ? 'No hives found for this apiary. Select "All Apiaries" or add a new hive.'
 : 'Add your first hive to start tracking colonies, inspections, and queen records.'}
 actionLabel={!filterApiaryId ? 'Add Hive' : undefined}
 actionOnClick={!filterApiaryId ? () => setShowForm(true) : undefined}
 />
 )}
 </div>
 )
}
