import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { parseLocalDate, toLocalDateString } from '@/lib/date-utils'

export interface TrackedQueen {
  id: string
  graft_id: string
  batch_id: string
  can_edit: boolean
  is_group_batch: boolean
  distribution_type: 'queen_cell' | 'virgin_queen' | 'mated_queen'
  distribution_date: string
  mating_confirmed: boolean
  mating_confirmed_date: string | null
  mating_location: string | null
  queen_failed: boolean
  queen_failed_date: string | null
  queen_failure_comment: string | null
  overwintered: boolean | null
  overwintered_date: string | null
  offspring_hybridised: boolean | null
  hybridisation_date: string | null
  notes: string | null
  // Recipient info
  recipient_user_id: string | null
  recipient_name: string | null
  recipient_email: string | null
  recipient_apiary_name: string | null
  recipient_apiary_eircode: string | null
  external_recipient_name: string | null
  external_recipient_email: string | null
  external_recipient_phone: string | null
  external_recipient_location: string | null
  recipient_hive_number: string | null
  recipient_type: 'group_member' | 'app_user' | 'public'
  // Cell info
  cell_number: number
  queen_marked: boolean
  queen_number: string | null
  latest_weight_mg: number | null
  latest_weight_date: string | null
  // Batch info
  batch_name: string
  graft_date: string
  emergence_date: string | null
  rearing_group_id: string | null
  batch_owner_id: string
  batch_owner_name: string | null
  mating_apiary_name: string | null
  mating_apiary_eircode: string | null
  mother_queen_number: string | null
  mother_queen_subspecies: string | null
  mother_queen_marking_color: string | null
  mother_queen_birth_date: string | null
}

export interface QueenTrackerStats {
  total: number
  mated: number
  overwintered: number
  failed: number
  hybridised: number
}

export type StatusFilter = 'all' | 'pending' | 'mated' | 'overwintered' | 'failed'
export const NON_GROUP_LEDGER_SCOPE = '__non_group__' as const
export type GroupFilterValue = string | typeof NON_GROUP_LEDGER_SCOPE | null

type TrackedQueenPatch = {
  id: string
} & Partial<Pick<
  TrackedQueen,
  | 'overwintered'
  | 'overwintered_date'
  | 'offspring_hybridised'
  | 'hybridisation_date'
  | 'queen_failed'
  | 'queen_failed_date'
  | 'queen_failure_comment'
>>

type JoinedRecord<T> = T | T[] | null

type BatchJoinRow = {
  id: string
  batch_name: string
  graft_date: string
  emergence_date: string | null
  rearing_group_id: string | null
  user_id: string
  profiles: JoinedRecord<{
    first_name: string | null
    last_name: string | null
  }>
  apiaries: JoinedRecord<{
    name: string | null
    eircode: string | null
  }>
  queens: JoinedRecord<{
    queen_number: string | null
    subspecies: string | null
    marking_color: string | null
    birth_date: string | null
  }>
}

function firstJoinedRecord<T>(value: JoinedRecord<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = parseLocalDate(value)
  return !Number.isNaN(parsed.getTime()) && toLocalDateString(parsed) === value
}

function getTodayLocalDate(): string {
  return toLocalDateString(new Date())
}

function normaliseDateOnlyInput(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null

  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function useQueenTracker() {
  const [distributions, setDistributions] = useState<TrackedQueen[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchCounter = useRef(0)

  const applyTrackedQueenPatch = useCallback((patch: TrackedQueenPatch) => {
    setDistributions((current) =>
      current.map((distribution) => (
        distribution.id === patch.id
          ? { ...distribution, ...patch }
          : distribution
      ))
    )
  }, [])

  const fetchDistributions = useCallback(async (userId: string) => {
    // Validate userId before making queries
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      setDistributions([])
      setError('Invalid user ID')
      return
    }

    const requestId = ++fetchCounter.current
    setLoading(true)
    setError(null)

    try {
      const { data: ownedGroups, error: ownedGroupsError } = await supabase
        .from('rearing_groups')
        .select('id')
        .eq('owner_id', userId)

      if (ownedGroupsError) throw ownedGroupsError

      if (requestId !== fetchCounter.current) return

      const ownedGroupIds = (ownedGroups || [])
        .map((group) => group.id)
        .filter((groupId): groupId is string => typeof groupId === 'string' && groupId.trim().length > 0)

      const distributionSelect = `
          id,
          user_id,
          graft_id,
          batch_id,
          distribution_type,
          distribution_date,
          mating_confirmed,
          mating_confirmed_date,
          mating_location,
          queen_failed,
          queen_failed_date,
          queen_failure_comment,
          overwintered,
          overwintered_date,
          offspring_hybridised,
          hybridisation_date,
          notes,
          recipient_user_id,
          external_recipient_name,
          external_recipient_email,
          external_recipient_phone,
          external_recipient_location,
          batch_grafts(cell_number, queen_marked, queen_number),
          profiles!graft_distributions_recipient_profile_id_fkey(full_name, first_name, last_name, email),
          apiaries!graft_distributions_recipient_apiary_id_fkey(name, eircode),
          hives!graft_distributions_recipient_hive_id_fkey(hive_number),
          rearing_batches!inner(
            id, batch_name, graft_date, emergence_date, rearing_group_id, user_id,
            profiles(first_name, last_name),
            apiaries!mating_apiary_id(name, eircode),
            queens!mother_queen_id(queen_number, subspecies, marking_color, birth_date)
          )
        `

      const buildDistributionQuery = () =>
        supabase
          .from('graft_distributions')
          .select(distributionSelect)
          .in('distribution_type', ['queen_cell', 'virgin_queen', 'mated_queen'])
          .order('distribution_date', { ascending: false })

      const [ownResult, ownedGroupResult] = await Promise.all([
        buildDistributionQuery().eq('user_id', userId),
        ownedGroupIds.length > 0
          ? buildDistributionQuery()
              .in('rearing_batches.rearing_group_id', ownedGroupIds)
              .neq('user_id', userId)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (ownResult.error) throw ownResult.error
      if (ownedGroupResult.error) throw ownedGroupResult.error

      if (requestId !== fetchCounter.current) return

      const rows = [...(ownResult.data || []), ...(ownedGroupResult.data || [])]
      const groupIds = Array.from(new Set(
        rows
          .map((row) => {
            const batch = firstJoinedRecord(row.rearing_batches as JoinedRecord<{ rearing_group_id: string | null }>)
            return typeof batch?.rearing_group_id === 'string' && batch.rearing_group_id.trim().length > 0
              ? batch.rearing_group_id.trim()
              : null
          })
          .filter((groupId): groupId is string => groupId !== null)
      ))
      const graftIds = Array.from(new Set(
        rows
          .map((row) => (typeof row.graft_id === 'string' && row.graft_id.trim() ? row.graft_id : null))
          .filter((graftId): graftId is string => graftId !== null)
      ))
      const groupMemberIdsByGroupId = new Map<string, Set<string>>()

      if (groupIds.length > 0) {
        const { data: groupMembers, error: groupMembersError } = await supabase
          .from('rearing_group_members')
          .select('group_id, user_id')
          .in('group_id', groupIds)

        if (groupMembersError) {
          console.error('Error fetching rearing group members for tracker:', groupMembersError)
        } else {
          for (const member of groupMembers || []) {
            if (typeof member.group_id !== 'string' || typeof member.user_id !== 'string') continue

            if (!groupMemberIdsByGroupId.has(member.group_id)) {
              groupMemberIdsByGroupId.set(member.group_id, new Set())
            }

            groupMemberIdsByGroupId.get(member.group_id)?.add(member.user_id)
          }
        }
      }

      if (requestId !== fetchCounter.current) return

      const latestWeights = new Map<string, { weight_mg: number; weighed_at: string }>()
      if (graftIds.length > 0) {
        const { data: weightRows, error: weightError } = await supabase
          .from('queen_weights')
          .select('graft_id, weight_mg, weighed_at')
          .in('graft_id', graftIds)
          .order('weighed_at', { ascending: false })

        if (weightError) {
          console.error('Error fetching queen weights for tracker:', weightError)
        } else {
          for (const weight of weightRows || []) {
            if (!latestWeights.has(weight.graft_id)) {
              latestWeights.set(weight.graft_id, {
                weight_mg: weight.weight_mg,
                weighed_at: weight.weighed_at,
              })
            }
          }
        }
      }

      if (requestId !== fetchCounter.current) return

      // Map and filter based on visibility rules
      const mapped: TrackedQueen[] = []

      for (const d of rows) {
        const batch = firstJoinedRecord(d.rearing_batches as JoinedRecord<BatchJoinRow>)

        if (!batch?.id || !batch.user_id || !batch.batch_name) continue

        const distributionType = d.distribution_type
        if (
          distributionType !== 'queen_cell'
          && distributionType !== 'virgin_queen'
          && distributionType !== 'mated_queen'
        ) continue

        const distributionId = typeof d.id === 'string' ? d.id : ''
        const graftId = typeof d.graft_id === 'string' ? d.graft_id : ''
        const batchId = typeof d.batch_id === 'string' ? d.batch_id : ''
        const distributionDate = typeof d.distribution_date === 'string' ? d.distribution_date : ''
        const recipientUserId = typeof d.recipient_user_id === 'string' && d.recipient_user_id.trim().length > 0
          ? d.recipient_user_id
          : null

        if (!distributionId || !graftId || !batchId || !distributionDate) continue

        // Visibility check: user sees their own distributions OR is a group owner
        const isOwnDistribution = d.user_id === userId
        const groupId = typeof batch.rearing_group_id === 'string'
          ? batch.rearing_group_id.trim() || null
          : null
        const isGroupBatch = groupId !== null
        const isGroupOwner = groupId !== null && ownedGroupIds.includes(groupId)
        if (!isOwnDistribution && !isGroupOwner) continue

        const graft = firstJoinedRecord(d.batch_grafts as JoinedRecord<{
          cell_number: number
          queen_marked: boolean
          queen_number: string | null
        }>)
        const recipientProfile = firstJoinedRecord(d.profiles as JoinedRecord<{
          full_name: string | null
          first_name: string | null
          last_name: string | null
          email: string | null
        }>)
        const apiary = firstJoinedRecord(d.apiaries as JoinedRecord<{ name: string | null; eircode: string | null }>)
        const hive = firstJoinedRecord(d.hives as JoinedRecord<{ hive_number: string | null }>)
        const batchOwnerProfile = firstJoinedRecord(batch.profiles as JoinedRecord<{
          first_name: string | null
          last_name: string | null
        }>)
        const batchMatingApiary = firstJoinedRecord(batch.apiaries as JoinedRecord<{ name: string | null; eircode: string | null }>)
        const motherQueen = firstJoinedRecord(batch.queens as JoinedRecord<{
          queen_number: string | null
          subspecies: string | null
          marking_color: string | null
          birth_date: string | null
        }>)
        const latestWeight = latestWeights.get(graftId)
        const cellNumber = typeof graft?.cell_number === 'number'
          && Number.isFinite(graft.cell_number)
          && graft.cell_number > 0
          ? graft.cell_number
          : null

        if (cellNumber === null) {
          console.warn('Skipping queen tracker row without a valid cell number', { distributionId, graftId })
          continue
        }

        // Build batch owner name
        const batchOwnerName = batchOwnerProfile
          ? `${batchOwnerProfile.first_name || ''} ${batchOwnerProfile.last_name || ''}`.trim() || null
          : null

        // Build recipient name
        const recipientName = recipientProfile
          ? recipientProfile.full_name || `${recipientProfile.first_name || ''} ${recipientProfile.last_name || ''}`.trim() || null
          : null
        const recipientType = recipientUserId === null
          ? 'public'
          : groupId !== null && groupMemberIdsByGroupId.get(groupId)?.has(recipientUserId)
            ? 'group_member'
            : 'app_user'

        mapped.push({
          id: distributionId,
          graft_id: graftId,
          batch_id: batchId,
          can_edit: isOwnDistribution,
          is_group_batch: isGroupBatch,
          distribution_type: distributionType,
          distribution_date: distributionDate,
          mating_confirmed: d.mating_confirmed === true,
          mating_confirmed_date: d.mating_confirmed_date as string | null,
          mating_location: d.mating_location as string | null,
          queen_failed: d.queen_failed === true,
          queen_failed_date: d.queen_failed_date as string | null,
          queen_failure_comment: d.queen_failure_comment as string | null,
          overwintered: d.overwintered as boolean | null,
          overwintered_date: d.overwintered_date as string | null,
          offspring_hybridised: d.offspring_hybridised as boolean | null,
          hybridisation_date: d.hybridisation_date as string | null,
          notes: d.notes as string | null,
          recipient_user_id: recipientUserId,
          recipient_name: recipientName,
          recipient_email: recipientProfile?.email ?? null,
          recipient_apiary_name: apiary?.name ?? null,
          recipient_apiary_eircode: apiary?.eircode ?? null,
          external_recipient_name: d.external_recipient_name as string | null,
          external_recipient_email: d.external_recipient_email as string | null,
          external_recipient_phone: d.external_recipient_phone as string | null,
          external_recipient_location: d.external_recipient_location as string | null,
          recipient_hive_number: hive?.hive_number ?? null,
          recipient_type: recipientType,
          cell_number: cellNumber,
          queen_marked: graft?.queen_marked ?? false,
          queen_number: graft?.queen_number ?? null,
          latest_weight_mg: latestWeight?.weight_mg ?? null,
          latest_weight_date: latestWeight?.weighed_at ?? null,
          batch_name: batch.batch_name,
          graft_date: batch.graft_date,
          emergence_date: batch.emergence_date ?? null,
          rearing_group_id: groupId,
          batch_owner_id: batch.user_id,
          batch_owner_name: batchOwnerName,
          mating_apiary_name: batchMatingApiary?.name ?? null,
          mating_apiary_eircode: batchMatingApiary?.eircode ?? null,
          mother_queen_number: motherQueen?.queen_number ?? null,
          mother_queen_subspecies: motherQueen?.subspecies ?? null,
          mother_queen_marking_color: motherQueen?.marking_color ?? null,
          mother_queen_birth_date: motherQueen?.birth_date ?? null,
        })
      }

      if (requestId !== fetchCounter.current) return
      setDistributions(mapped)
    } catch (err) {
      console.error('Error fetching queen tracker data:', err)
      if (requestId === fetchCounter.current) {
        setDistributions([])
        setError(err instanceof Error ? err.message : 'Failed to load data')
      }
    } finally {
      if (requestId === fetchCounter.current) setLoading(false)
    }
  }, [])

  const updateOverwintered = useCallback(async (id: string, value: boolean | null, date?: string | null): Promise<boolean> => {
    // Validate ID before update
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('Invalid distribution ID for overwintered update')
      return false
    }
    const normalisedDate = normaliseDateOnlyInput(date)
    if (value !== null && typeof normalisedDate === 'string' && !isValidDateOnly(normalisedDate)) {
      console.error('Invalid overwintered date provided:', normalisedDate)
      return false
    }

    try {
      const today = getTodayLocalDate()
      const resolvedDate = value === null
        ? null
        : normalisedDate === undefined
          ? today
          : normalisedDate
      const { data, error } = await supabase
        .from('graft_distributions')
        .update({
          overwintered: value,
          overwintered_date: resolvedDate,
        })
        .eq('id', id)
        .select('id, overwintered, overwintered_date')
        .maybeSingle()

      if (error) throw error
      if (!data?.id) {
        console.warn('No permitted distribution row found for overwintered update:', id)
        return false
      }

      applyTrackedQueenPatch({
        id: data.id,
        overwintered: data.overwintered as boolean | null,
        overwintered_date: data.overwintered_date as string | null,
      })

      return true
    } catch (err) {
      console.error('Error updating overwintered status:', err)
      return false
    }
  }, [applyTrackedQueenPatch])

  const updateOverwinteredDate = useCallback(async (id: string, date: string | null): Promise<boolean> => {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('Invalid distribution ID for overwintered date update')
      return false
    }

    const normalisedDate = normaliseDateOnlyInput(date)
    if (typeof normalisedDate === 'string' && !isValidDateOnly(normalisedDate)) {
      console.error('Invalid overwintered date provided:', normalisedDate)
      return false
    }

    try {
      const { data, error } = await supabase
        .from('graft_distributions')
        .update({
          overwintered_date: normalisedDate,
        })
        .eq('id', id)
        .not('overwintered', 'is', null)
        .eq('queen_failed', false)
        .select('id, overwintered_date')
        .maybeSingle()

      if (error) throw error
      if (!data?.id) {
        console.warn('No permitted distribution row found for overwintered date update:', id)
        return false
      }

      applyTrackedQueenPatch({
        id: data.id,
        overwintered_date: data.overwintered_date as string | null,
      })

      return true
    } catch (err) {
      console.error('Error updating overwintered date:', err)
      return false
    }
  }, [applyTrackedQueenPatch])

  const updateHybridisation = useCallback(async (id: string, value: boolean | null, date?: string | null): Promise<boolean> => {
    // Validate ID before update
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('Invalid distribution ID for hybridisation update')
      return false
    }
    const normalisedDate = normaliseDateOnlyInput(date)
    if (value === true && typeof normalisedDate === 'string' && !isValidDateOnly(normalisedDate)) {
      console.error('Invalid hybridisation date provided:', normalisedDate)
      return false
    }

    try {
      const today = getTodayLocalDate()
      const resolvedDate = value === true
        ? normalisedDate === undefined
          ? today
          : normalisedDate
        : null
      const { data, error } = await supabase
        .from('graft_distributions')
        .update({
          offspring_hybridised: value,
          hybridisation_date: resolvedDate,
        })
        .eq('id', id)
        .select('id, offspring_hybridised, hybridisation_date')
        .maybeSingle()

      if (error) throw error
      if (!data?.id) {
        console.warn('No permitted distribution row found for hybridisation update:', id)
        return false
      }

      applyTrackedQueenPatch({
        id: data.id,
        offspring_hybridised: data.offspring_hybridised as boolean | null,
        hybridisation_date: data.hybridisation_date as string | null,
      })

      return true
    } catch (err) {
      console.error('Error updating hybridisation status:', err)
      return false
    }
  }, [applyTrackedQueenPatch])

  const updateHybridisationDate = useCallback(async (id: string, date: string | null): Promise<boolean> => {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('Invalid distribution ID for hybridisation date update')
      return false
    }

    const normalisedDate = normaliseDateOnlyInput(date)
    if (typeof normalisedDate === 'string' && !isValidDateOnly(normalisedDate)) {
      console.error('Invalid hybridisation date provided:', normalisedDate)
      return false
    }

    try {
      const { data, error } = await supabase
        .from('graft_distributions')
        .update({
          hybridisation_date: normalisedDate,
        })
        .eq('id', id)
        .eq('offspring_hybridised', true)
        .eq('queen_failed', false)
        .select('id, hybridisation_date')
        .maybeSingle()

      if (error) throw error
      if (!data?.id) {
        console.warn('No permitted distribution row found for hybridisation date update:', id)
        return false
      }

      applyTrackedQueenPatch({
        id: data.id,
        hybridisation_date: data.hybridisation_date as string | null,
      })

      return true
    } catch (err) {
      console.error('Error updating hybridisation date:', err)
      return false
    }
  }, [applyTrackedQueenPatch])

  const updateFailure = useCallback(async (id: string, value: boolean): Promise<boolean> => {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('Invalid distribution ID for failure update')
      return false
    }

    try {
      const today = getTodayLocalDate()
      const { data, error } = await supabase
        .from('graft_distributions')
        .update({
          queen_failed: value,
          queen_failed_date: value ? today : null,
          queen_failure_comment: null,
        })
        .eq('id', id)
        .select('id, queen_failed, queen_failed_date, queen_failure_comment')
        .maybeSingle()

      if (error) throw error
      if (!data?.id) {
        console.warn('No permitted distribution row found for failure update:', id)
        return false
      }

      applyTrackedQueenPatch({
        id: data.id,
        queen_failed: data.queen_failed === true,
        queen_failed_date: data.queen_failed_date as string | null,
        queen_failure_comment: data.queen_failure_comment as string | null,
      })

      return true
    } catch (err) {
      console.error('Error updating queen failure status:', err)
      return false
    }
  }, [applyTrackedQueenPatch])

  const updateFailureDate = useCallback(async (id: string, date: string | null): Promise<boolean> => {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('Invalid distribution ID for failure date update')
      return false
    }

    const normalisedDate = normaliseDateOnlyInput(date)
    if (typeof normalisedDate === 'string' && !isValidDateOnly(normalisedDate)) {
      console.error('Invalid failure date provided:', normalisedDate)
      return false
    }

    try {
      const { data, error } = await supabase
        .from('graft_distributions')
        .update({
          queen_failed_date: normalisedDate,
        })
        .eq('id', id)
        .eq('queen_failed', true)
        .select('id, queen_failed_date')
        .maybeSingle()

      if (error) throw error
      if (!data?.id) {
        console.warn('No permitted distribution row found for failure date update:', id)
        return false
      }

      applyTrackedQueenPatch({
        id: data.id,
        queen_failed_date: data.queen_failed_date as string | null,
      })

      return true
    } catch (err) {
      console.error('Error updating queen failure date:', err)
      return false
    }
  }, [applyTrackedQueenPatch])

  const updateFailureComment = useCallback(async (id: string, comment: string | null): Promise<boolean> => {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('Invalid distribution ID for failure comment update')
      return false
    }

    const normalisedComment = typeof comment === 'string'
      ? comment.trim() || null
      : null

    if (normalisedComment && normalisedComment.length > 280) {
      console.error('Failure comment exceeds 280 characters')
      return false
    }

    try {
      const { data, error } = await supabase
        .from('graft_distributions')
        .update({
          queen_failure_comment: normalisedComment,
        })
        .eq('id', id)
        .eq('queen_failed', true)
        .select('id, queen_failure_comment')
        .maybeSingle()

      if (error) throw error
      if (!data?.id) {
        console.warn('No permitted distribution row found for failure comment update:', id)
        return false
      }

      applyTrackedQueenPatch({
        id: data.id,
        queen_failure_comment: data.queen_failure_comment as string | null,
      })

      return true
    } catch (err) {
      console.error('Error updating queen failure comment:', err)
      return false
    }
  }, [applyTrackedQueenPatch])

  const calculateStats = useCallback((data: TrackedQueen[]): QueenTrackerStats => {
    return {
      total: data.length,
      mated: data.filter((d) => d.mating_confirmed || d.distribution_type === 'mated_queen').length,
      overwintered: data.filter((d) => d.overwintered === true).length,
      failed: data.filter((d) => d.queen_failed === true).length,
      hybridised: data.filter((d) => d.offspring_hybridised === true).length,
    }
  }, [])

  const filterByStatus = useCallback((data: TrackedQueen[], status: StatusFilter): TrackedQueen[] => {
    switch (status) {
      case 'pending':
        return data.filter((d) => !d.queen_failed && !d.mating_confirmed && d.distribution_type !== 'mated_queen' && d.overwintered === null)
      case 'mated':
        return data.filter((d) => !d.queen_failed && (d.mating_confirmed || d.distribution_type === 'mated_queen') && d.overwintered === null)
      case 'overwintered':
        return data.filter((d) => !d.queen_failed && d.overwintered === true)
      case 'failed':
        return data.filter((d) => d.queen_failed === true)
      default:
        return data
    }
  }, [])

  const filterByYear = useCallback((data: TrackedQueen[], year: number | null): TrackedQueen[] => {
    if (!year || !Number.isFinite(year)) return data
    return data.filter((d) => {
      if (!d.distribution_date) return false
      const date = parseLocalDate(d.distribution_date)
      if (Number.isNaN(date.getTime())) return false
      return date.getFullYear() === year
    })
  }, [])

  const filterByGroup = useCallback((data: TrackedQueen[], groupId: GroupFilterValue): TrackedQueen[] => {
    if (!groupId) return data
    if (groupId === NON_GROUP_LEDGER_SCOPE) {
      return data.filter((d) => !d.is_group_batch)
    }
    return data.filter((d) => d.rearing_group_id === groupId)
  }, [])

  const filterByMember = useCallback((data: TrackedQueen[], memberId: string | null): TrackedQueen[] => {
    if (!memberId) return data
    return data.filter((d) => d.batch_owner_id === memberId)
  }, [])

  const filterByBatch = useCallback((data: TrackedQueen[], batchId: string | null): TrackedQueen[] => {
    if (!batchId) return data
    return data.filter((d) => d.batch_id === batchId)
  }, [])

  return {
    distributions,
    loading,
    error,
    fetchDistributions,
    updateOverwintered,
    updateOverwinteredDate,
    updateHybridisation,
    updateHybridisationDate,
    updateFailure,
    updateFailureDate,
    updateFailureComment,
    calculateStats,
    filterByStatus,
    filterByYear,
    filterByGroup,
    filterByMember,
    filterByBatch,
  }
}
