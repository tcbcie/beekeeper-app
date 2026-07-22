'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { getTeamAccess } from '@/lib/team-access'
import { Queen, Batch } from '@/types/queen'
import type { BreederContext } from '@/lib/queen-code'

/**
 * Data layer for the queens list page: the user's own + shared queens
 * (enriched with hive assignment and parents via batched lookups), the
 * dropdown option lists, rearing batches, and the breeder context used by
 * the composite queen code. Extracted verbatim from
 * src/app/dashboard/queens/page.tsx (Phase 6.4 decomposition).
 */
export function useQueensList() {
 const [queens, setQueens] = useState<Queen[]>([])
 const [loading, setLoading] = useState(true)
 const [userId, setUserId] = useState<string | null>(null)
 const [isTeamMember, setIsTeamMember] = useState(false)
 const [subspeciesOptions, setSubspeciesOptions] = useState<string[]>([])
 const [sourceOptions, setSourceOptions] = useState<string[]>([])
 const [batches, setBatches] = useState<Batch[]>([])
 const [matingStationOptions, setMatingStationOptions] = useState<string[]>([])
 const [breederContext, setBreederContext] = useState<BreederContext | null>(null)
 const router = useRouter()

 const fetchQueens = useCallback(async (userIdParam?: string) => {
 const currentUserId = userIdParam || userId
 if (!currentUserId) return

 // One memoised round trip for team membership + shared apiary owners
 const { isTeamMember: hasTeams, sharedOwnerIds: sharedUserIds } = await getTeamAccess(currentUserId)
 setIsTeamMember(hasTeams)

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

 // Then enrich with hive, mother, and father data using two batched queries
 // (previously one hive query + up to two parent queries PER QUEEN)
 if (queensData && queensData.length > 0) {
 // Create a map of all queens for quick lookup of mother/father
 const queensMap = new Map(queensData.map(q => [q.id, q]))
 const queenIds = queensData.map(q => q.id).filter(Boolean)

 // Find hives housing these queens (mine or shared), any status,
 // in a single query
 const { data: hivesData, error: hivesError } = await supabase
 .from('hives')
 .select(`
 id,
 hive_number,
 queen_id,
 apiaries (
 id,
 name
 )
 `)
 .in('queen_id', queenIds)

 if (hivesError) {
 console.error('Error fetching hives for queens:', hivesError)
 }

 const hivesByQueenId = new Map(
 (hivesData || []).map(h => [h.queen_id, h])
 )

 // Fetch any mother/father not already in the current results,
 // batched (never embed queens->queens self-joins)
 const missingParentIds = [...new Set(
 queensData
 .flatMap(q => [q.mother_id, q.father_id])
 .filter((id): id is string => Boolean(id) && !queensMap.has(id))
 )]

 if (missingParentIds.length > 0) {
 const { data: parentsData } = await supabase
 .from('queens')
 .select('id, queen_number, marking_color')
 .in('id', missingParentIds)
 for (const parent of parentsData || []) {
 queensMap.set(parent.id, parent)
 }
 }

 const toParentRef = (parentId: string | null) => {
 if (!parentId) return null
 const parent = queensMap.get(parentId)
 if (!parent) return null
 return {
 id: parent.id,
 queen_number: parent.queen_number,
 marking_color: parent.marking_color,
 }
 }

 const enrichedQueens = queensData.map(queen => ({
 ...queen,
 hives: hivesByQueenId.get(queen.id) || undefined,
 mother: toParentRef(queen.mother_id),
 father: toParentRef(queen.father_id),
 }))
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
 // Breeder context for the composite queen code (list + labels).
 supabase
 .from('profiles')
 .select('full_name, first_name, last_name, is_uk_ni_resident, breeder_code')
 .eq('id', id)
 .maybeSingle()
 .then(({ data }) => {
 if (!data) return
 const name = data.full_name || [data.first_name, data.last_name].filter(Boolean).join(' ')
 setBreederContext({ name, isUkNi: !!data.is_uk_ni_resident, breederCode: data.breeder_code })
 })
 }
 initUser()
 }, [router, fetchQueens, fetchSubspeciesOptions, fetchSourceOptions, fetchBatches, fetchMatingStations])

 return {
 queens,
 loading,
 userId,
 isTeamMember,
 subspeciesOptions,
 sourceOptions,
 batches,
 matingStationOptions,
 breederContext,
 fetchQueens,
 }
}
