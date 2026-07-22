'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, hasActiveSubscription } from '@/lib/auth'
import { getTeamAccess } from '@/lib/team-access'

// Shared interfaces and date helpers for the batches page, its data hook and
// the batch form. Moved verbatim from src/app/dashboard/batches/page.tsx
// (Phase 6.5 decomposition).
export interface Queen {
 id: string
 queen_number: string
 hives?: Array<{
 queen_id: string
 hive_number: string
 apiaries: {
 name: string
 } | null
 }>
}

export interface Apiary {
 id: string
 name: string
}

export interface Hive {
 id: string
 hive_number: string
 apiary_id: string
}

export interface Batch {
 id: string
 batch_name: string
 mother_queen_id: string | null
 starter_colony_hive_id: string | null
 graft_date: string
 cell_count: number | null
 frame_rows: number | null
 cells_per_row: number | null
 grafts_accepted: number | null
 queens_hatched: number | null
 queens_mated: number | null
 queens_hybridised: number | null
 acceptance_check_date: string | null
 first_option_to_cage_date: string | null
 second_option_to_cage_date: string | null
 emergence_date: string | null
 notes: string | null
 enable_browser_notifications: boolean
 enable_email_digest: boolean
 status: string | null
 mating_apiary_id: string | null
 rearing_group_id: string | null
 enable_batch_event_reminders?: boolean
 batch_reminder_minutes_before?: number
 queens?: {
 queen_number: string
 } | null
 hives?: {
 hive_number: string
 apiaries?: {
 name: string
 }
 } | null
}

export interface FormData {
 batch_name: string
 mother_queen_id: string
 multiple_breeders: boolean
 breeder_queen_ids: string[]
 starter_apiary_id: string
 starter_colony_hive_id: string
 graft_date: string
 cell_count: string
 frame_rows: string
 cells_per_row: string
 grafts_accepted: string
 queens_hatched: string
 queens_mated: string
 acceptance_check_date: string
 first_option_to_cage_date: string
 second_option_to_cage_date: string
 emergence_date: string
 notes: string
 enable_browser_notifications: boolean
 enable_email_digest: boolean
 mating_apiary_id: string
 rearing_group_id: string
 enable_batch_event_reminders: boolean
 batch_reminder_minutes_before: string
}

export interface Inspection {
 inspection_date: string
 brood_pattern_rating: number | null
 population_strength: number | null
 temperament_rating: number | null
 swarming_tendency: number | null
 honey_stores: string | null
 calmness: number | null
 recapping: number | null
 vsh: number | null
 smr: number | null
 chalkbrood_disease: number | null
}

export interface HiveWithInspections {
 id: string
 hive_number: string
 apiary_id: string
 apiaries: {
 name: string
 } | null
 inspections: Inspection[]
}

export interface HiveScore {
 hive_id: string
 hive_number: string
 apiary_name: string
 inspection_count: number
 averages: {
 brood_pattern: number
 population: number
 temperament: number
 swarming: number
 honey_yield: number
 calmness: number
 recapping: number
 vsh: number
 smr: number
 chalkbrood: number
 }
 score: number
}

// Get short day name (Mon, Tue, etc.) from a date string
export const getDayName = (dateString: string): string => {
 if (!dateString) return ''
 const date = new Date(dateString + 'T00:00:00')
 if (isNaN(date.getTime())) return ''
 return date.toLocaleDateString('en-GB', { weekday: 'short' })
}

// Format a local Date object to YYYY-MM-DD string without timezone shift
export const toLocalDateString = (date: Date): string => {
 const year = date.getFullYear()
 const month = (date.getMonth() + 1).toString().padStart(2, '0')
 const day = date.getDate().toString().padStart(2, '0')
 return `${year}-${month}-${day}`
}

// Format date to Irish format (DD/MM/YYYY)
export const formatDateIrish = (dateString: string | null): string => {
 if (!dateString) return '-'
 const date = new Date(dateString + 'T00:00:00')
 const day = date.getDate().toString().padStart(2, '0')
 const month = (date.getMonth() + 1).toString().padStart(2, '0')
 const year = date.getFullYear()
 return `${day}/${month}/${year}`
}


/**
 * Data layer for the batches page: rearing batches (with sealed-cell counts
 * and breeder-queen names), plus the queen/apiary/hive option lists and the
 * subscription flag. `onUserReady` fires once with the signed-in user id so
 * the page can kick off sibling fetches (e.g. rearing groups).
 */
export function useBatchesList(onUserReady?: (userId: string) => void) {
 const [batches, setBatches] = useState<Batch[]>([])
 const [sealedCellCounts, setSealedCellCounts] = useState<Record<string, number>>({})
 const [breederQueenNames, setBreederQueenNames] = useState<Record<string, string>>({})
 const [queens, setQueens] = useState<Queen[]>([])
 const [apiaries, setApiaries] = useState<Apiary[]>([])
 const [hives, setHives] = useState<Hive[]>([])
 const [loading, setLoading] = useState(true)
 const [userId, setUserId] = useState<string | null>(null)
 const [userHasActiveSubscription, setUserHasActiveSubscription] = useState(false)
 const router = useRouter()

 const fetchBatches = useCallback(async (userIdParam?: string) => {
 const currentUserId = userIdParam || userId
 if (!currentUserId) return

 const { data, error } = await supabase
 .from('rearing_batches')
 .select('*, queens!mother_queen_id(queen_number), hives!starter_colony_hive_id(hive_number, apiaries(name))')
 .eq('user_id', currentUserId)
 .order('graft_date', { ascending: false })

 if (error) {
 console.error('Error fetching batches:', error)
 } else if (data) {
 setBatches(data)

 // Fetch sealed queen cell distribution counts per batch
 const batchIds = data.map((b: Batch) => b.id)
 if (batchIds.length > 0) {
 const { data: distData } = await supabase
   .from('graft_distributions')
   .select('batch_id')
   .eq('distribution_type', 'queen_cell')
   .in('batch_id', batchIds)

 const counts: Record<string, number> = {}
 if (distData) {
   for (const d of distData) {
     const bId = d.batch_id as string
     if (bId) counts[bId] = (counts[bId] || 0) + 1
   }
 }
 setSealedCellCounts(counts)
 } else {
 setSealedCellCounts({})
 }

 // Fetch breeder queen names from junction table
 if (batchIds.length > 0) {
 const { data: bbqData } = await supabase
   .from('batch_breeder_queens')
   .select('batch_id, queens(queen_number)')
   .in('batch_id', batchIds)

 const names: Record<string, string> = {}
 if (bbqData) {
   for (const row of bbqData) {
     const bId = row.batch_id as string
     const qRaw = row.queens as unknown
     const qn = Array.isArray(qRaw) ? qRaw[0]?.queen_number : (qRaw as { queen_number?: string })?.queen_number
     if (bId && qn) {
       names[bId] = names[bId] ? `${names[bId]}, ${qn}` : qn
     }
   }
 }
 setBreederQueenNames(names)
 } else {
 setBreederQueenNames({})
 }
 }
 setLoading(false)
 }, [userId])

 const fetchApiaries = useCallback(async (userIdParam?: string) => {
 const currentUserId = userIdParam || userId
 if (!currentUserId) return

 // One memoised round trip for shared apiary access
 const { sharedApiaryIds } = await getTeamAccess(currentUserId)

 let query = supabase.from('apiaries').select('id, name')
 if (sharedApiaryIds.length > 0) {
 query = query.or(`user_id.eq.${currentUserId},id.in.(${sharedApiaryIds.join(',')})`)
 } else {
 query = query.eq('user_id', currentUserId)
 }

 const { data } = await query.order('name')
 if (data) setApiaries(data)
 }, [userId])

 const fetchHives = useCallback(async (userIdParam?: string) => {
 const currentUserId = userIdParam || userId
 if (!currentUserId) return

 const { data } = await supabase
 .from('hives')
 .select('id, hive_number, apiary_id')
 .eq('user_id', currentUserId)
 .is('archived_at', null)
 .order('hive_number')

 if (data) setHives(data)
 }, [userId])

 const fetchQueens = useCallback(async (userIdParam?: string) => {
 const currentUserId = userIdParam || userId
 if (!currentUserId) return

 // First, get all queens
 const { data: queensData, error: queensError } = await supabase
 .from('queens')
 .select('id, queen_number')
 .eq('status', 'active')
 .eq('user_id', currentUserId)
 .order('queen_number')

 if (queensError) {
 console.error('Error fetching queens:', queensError)
 return
 }

 if (!queensData) return

 // Then, get hives with apiaries for these queens (include archived_at to filter)
 const queenIds = queensData.map(q => q.id)
 const { data: hivesData } = await supabase
 .from('hives')
 .select('queen_id, hive_number, archived_at, apiaries(name)')
 .in('queen_id', queenIds)
 .eq('user_id', currentUserId)

 // Queens in archived hives should not be selectable
 const archivedQueenIds = new Set(
 hivesData?.filter(h => h.archived_at).map(h => h.queen_id) || []
 )

 // Merge the data, excluding queens in archived hives
 const queensWithHives: Queen[] = queensData
 .filter(queen => !archivedQueenIds.has(queen.id))
 .map(queen => ({
 ...queen,
 hives: hivesData?.filter(h => h.queen_id === queen.id && !h.archived_at).map(h => ({
 queen_id: h.queen_id,
 hive_number: h.hive_number,
 apiaries: Array.isArray(h.apiaries) ? h.apiaries[0] || null : h.apiaries
 })) || []
 }))

 setQueens(queensWithHives)
 }, [userId])

 useEffect(() => {
 const initUser = async () => {
 const id = await getCurrentUserId()
 if (!id) {
 router.push('/login')
 return
 }
 setUserId(id)
 // Kick off all data loads first so they run while the (non-blocking)
 // subscription check resolves, rather than waiting behind it.
 fetchBatches(id)
 fetchQueens(id)
 fetchApiaries(id)
 fetchHives(id)
 onUserReady?.(id)
 const hasSubscription = await hasActiveSubscription()
 setUserHasActiveSubscription(hasSubscription)
 }
 initUser()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [router, fetchBatches, fetchQueens, fetchApiaries, fetchHives])

 return {
 batches,
 sealedCellCounts,
 breederQueenNames,
 queens,
 apiaries,
 hives,
 loading,
 userId,
 userHasActiveSubscription,
 fetchBatches,
 fetchQueens,
 fetchApiaries,
 fetchHives,
 }
}
