'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { getTeamAccess } from '@/lib/team-access'
import { useToast } from '@/components/ui/Toast'
import { usePersistentState } from './usePersistentState'
import { useSelection } from '@/contexts/SelectionContext'
import { Hive, ActiveTreatment } from '@/types/hive'
import { getTreatmentRemovalState } from '@/lib/treatment-removal'
import { toLocalDateString } from '@/lib/date-utils'

export interface HiveListApiary {
 id: string
 name: string
 user_id?: string
 is_shared?: boolean
}

export interface HiveListQueen {
 id: string
 queen_number: string
 status?: string
 assigned_hive_id?: string | null
}

/**
 * Data layer for the hives list page: fetches the user's own + team-shared
 * hives (with per-hive aggregates), the apiary and queen option lists, and
 * owns the ownership/archive filters that drive the hive query. Extracted
 * verbatim from src/app/dashboard/hives/page.tsx (Phase 6.3 decomposition).
 */
export function useHivesList() {
 const [hives, setHives] = useState<Hive[]>([])
 const [apiaries, setApiaries] = useState<HiveListApiary[]>([])
 const [queens, setQueens] = useState<HiveListQueen[]>([])
 const [loading, setLoading] = useState(true)
 const [userId, setUserId] = useState<string | null>(null)
 const [isTeamMember, setIsTeamMember] = useState(false)
 const [filtersLoaded, setFiltersLoaded] = useState(false)
 const router = useRouter()
 const toast = useToast()

 // Apiary selection comes from the app-wide shared store (carries across pages,
 // survives restart). Both use '' for "all apiaries".
 const { selectedApiaryId: filterApiaryId, setSelectedApiaryId: setFilterApiaryId } = useSelection()
 // Remaining filters persist per-page (localStorage) so they survive navigation/restart.
 const [ownershipFilter, setOwnershipFilter] = usePersistentState<'my' | 'team' | 'all'>(
   'hives:ownership', 'my', (v) => v === 'my' || v === 'team' || v === 'all'
 )
 const [archiveFilter, setArchiveFilter] = usePersistentState<'active' | 'archived' | 'all'>(
   'hives:archive', 'active', (v) => v === 'active' || v === 'archived' || v === 'all'
 )

 const fetchHives = useCallback(async (userIdParam?: string) => {
 const currentUserId = userIdParam || userId
 if (!currentUserId) return

 // One memoised round trip for team membership + shared apiary access
 const { sharedApiaryIds, isTeamMember: hasTeams } = await getTeamAccess(currentUserId)
 setIsTeamMember(hasTeams)

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

 const queensMap = new Map<string, { id: string; queen_number: string; marking_color?: string; status?: string; queen_clipped?: boolean }>()
 if (queenIds.length > 0) {
 const { data: queensData } = await supabase
 .from('queens')
 // queen_clipped is read here because a hive with a linked queen can only
 // have its clipping recorded on the queen — the hive form hides its own
 // toggle in that state. See isQueenClipped in lib/queen-clipped.
 .select('id, queen_number, marking_color, status, queen_clipped')
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
 .select('hive_id, inspection_date, brood_frames, right_sized_frames, brood_pattern_rating, temperament_rating, population_strength, queen_seen, eggs_present, honey_super_fullness')
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
 // Last inspection per hive is derived from allInspections (already
 // fetched newest-first above) instead of re-fetching the inspections table.
 const lastInspections = allInspections
 const [
 { data: lastTreatments },
 { data: lastChecks },
 { data: lastFeedings },
 { data: lastHarvests },
 { data: activeTasks }
 ] = await Promise.all([
 supabase
 .from('varroa_treatments')
 .select('hive_id, treatment_date, treatment_type, planned_removal_date, removed_date')
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

 // Treatments still on the hive: planned to come off, not yet recorded as
 // removed. Every treatment predating this feature has both dates null and so
 // reads as nothing on, which is why no backfill was needed. Rows arrive
 // newest-first, so the first hit per hive is the one worth showing.
 const today = toLocalDateString(new Date())
 const activeTreatmentByHive = new Map<string, ActiveTreatment>()
 lastTreatments?.forEach(treatment => {
 if (!treatment.hive_id || activeTreatmentByHive.has(treatment.hive_id)) return
 const state = getTreatmentRemovalState(treatment, today)
 if (state === 'none') return
 activeTreatmentByHive.set(treatment.hive_id, {
 treatment_type: treatment.treatment_type,
 planned_removal_date: treatment.planned_removal_date,
 overdue: state === 'overdue',
 })
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

 // Last *recorded* per-super fullness: the newest inspection that actually
 // recorded it (fullness is optional, so most inspections leave it null).
 // inspections are ordered newest-first, so find() returns the latest match.
 const fullnessInspections = inspections.filter(i => Array.isArray(i.honey_super_fullness))
 const latestSuperFullness = fullnessInspections[0]
 ? (fullnessInspections[0].honey_super_fullness as number[])
 : null
 const previousSuperFullness = fullnessInspections[1]
 ? (fullnessInspections[1].honey_super_fullness as number[])
 : null
 const previousSuperFullnessDate = fullnessInspections[1]?.inspection_date ?? null

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
 active_treatment: activeTreatmentByHive.get(hive.id) ?? null,
 qr_tag_code: qrTagByHive.get(hive.id) ?? null,
 last_super_fullness: latestSuperFullness,
 previous_super_fullness: previousSuperFullness,
 previous_super_fullness_date: previousSuperFullnessDate,
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

 // One memoised round trip for shared apiary access
 const { sharedApiaryIds } = await getTeamAccess(currentUserId)

 let sharedApiaries: HiveListApiary[] = []
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

 // One memoised round trip: shared apiary owners come from the same RPC
 const { sharedOwnerIds: sharedUserIds } = await getTeamAccess(currentUserId)

 // Fetch my queens + queens from users who share apiaries with me
 let queensQuery = supabase
 .from('queens')
 .select('id, queen_number, status')
 .in('status', ['active', 'virgin', 'cell'])

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

 // Validate the (persisted) shared apiary selection against this account's
 // apiaries. A selection pointing at a deleted apiary is cleared so it can't
 // silently filter out every hive. Persistence is handled by the hooks above.
 useEffect(() => {
 if (!filtersLoaded && apiaries.length > 0) {
 if (filterApiaryId && !apiaries.some(a => a.id === filterApiaryId)) {
 setFilterApiaryId('')
 }
 setFiltersLoaded(true)
 }
 }, [filtersLoaded, apiaries, filterApiaryId, setFilterApiaryId])

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

 // Refetch hives when ownership or archive filter changes. initUser already
 // fetched with the hydrated persisted filter values, so when filtersLoaded
 // first flips true with unchanged filters the fetch chain must not run again
 // (it previously loaded the whole page twice on every visit).
 const initialFetchFilters = useRef<{ ownership: typeof ownershipFilter; archive: typeof archiveFilter } | null>(
 { ownership: ownershipFilter, archive: archiveFilter }
 )
 useEffect(() => {
 if (!userId || !filtersLoaded) return
 const initial = initialFetchFilters.current
 if (initial) {
 initialFetchFilters.current = null
 if (initial.ownership === ownershipFilter && initial.archive === archiveFilter) {
 return
 }
 }
 fetchHives(userId)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [ownershipFilter, archiveFilter, userId, filtersLoaded])

 return {
 hives,
 apiaries,
 queens,
 loading,
 userId,
 isTeamMember,
 filterApiaryId,
 setFilterApiaryId,
 ownershipFilter,
 setOwnershipFilter,
 archiveFilter,
 setArchiveFilter,
 fetchHives,
 fetchApiaries,
 fetchQueens,
 }
}
