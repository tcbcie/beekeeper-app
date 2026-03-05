import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface TrackedVirginQueen {
  id: string
  graft_id: string
  batch_id: string
  distribution_type: 'virgin_queen' | 'mated_queen'
  distribution_date: string
  mating_confirmed: boolean
  mating_confirmed_date: string | null
  mating_location: string | null
  overwintered: boolean | null
  overwintered_date: string | null
  offspring_hybridised: boolean | null
  hybridisation_date: string | null
  notes: string | null
  // Recipient info
  recipient_user_id: string | null
  recipient_name: string | null
  external_recipient_name: string | null
  external_recipient_location: string | null
  // Cell info
  cell_number: number
  // Batch info
  batch_name: string
  graft_date: string
  rearing_group_id: string
  batch_owner_id: string
  batch_owner_name: string | null
}

export interface VirginQueenStats {
  total: number
  mated: number
  overwintered: number
  failed: number
  hybridised: number
}

export type StatusFilter = 'all' | 'pending' | 'mated' | 'overwintered' | 'failed'

export function useVirginQueenTracker() {
  const [distributions, setDistributions] = useState<TrackedVirginQueen[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchCounter = useRef(0)

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
      // First, get the groups the user is a member of or owns
      const { data: memberships, error: memberError } = await supabase
        .from('rearing_group_members')
        .select('group_id, role')
        .eq('user_id', userId)

      if (memberError) throw memberError

      const groupIds = (memberships || []).map((m) => m.group_id)
      const ownedGroupIds = (memberships || []).filter((m) => m.role === 'owner').map((m) => m.group_id)

      if (groupIds.length === 0) {
        if (requestId === fetchCounter.current) {
          setDistributions([])
          setLoading(false)
        }
        return
      }

      // Fetch distributions from batches linked to these groups
      const { data, error } = await supabase
        .from('graft_distributions')
        .select(`
          *,
          batch_grafts(cell_number),
          profiles!graft_distributions_recipient_profile_id_fkey(full_name, first_name, last_name),
          rearing_batches!inner(
            id, batch_name, graft_date, rearing_group_id, user_id,
            profiles(first_name, last_name)
          )
        `)
        .in('distribution_type', ['virgin_queen', 'mated_queen'])
        .in('rearing_batches.rearing_group_id', groupIds)
        .order('distribution_date', { ascending: false })

      if (error) throw error

      // Map and filter based on visibility rules
      const mapped: TrackedVirginQueen[] = []

      for (const d of data || []) {
        const batch = d.rearing_batches as {
          id: string
          batch_name: string
          graft_date: string
          rearing_group_id: string
          user_id: string
          profiles: { first_name: string | null; last_name: string | null } | null
        }

        // Visibility check: user sees their own distributions OR is a group owner
        const isOwnDistribution = d.user_id === userId
        const isGroupOwner = ownedGroupIds.includes(batch.rearing_group_id)

        if (!isOwnDistribution && !isGroupOwner) continue

        const grafts = d.batch_grafts as { cell_number: number }[] | { cell_number: number } | null
        const recipientProfile = d.profiles as { full_name: string | null; first_name: string | null; last_name: string | null } | null

        // Build batch owner name
        const batchOwnerProfile = batch.profiles
        const batchOwnerName = batchOwnerProfile
          ? `${batchOwnerProfile.first_name || ''} ${batchOwnerProfile.last_name || ''}`.trim() || null
          : null

        // Build recipient name
        const recipientName = recipientProfile
          ? recipientProfile.full_name || `${recipientProfile.first_name || ''} ${recipientProfile.last_name || ''}`.trim() || null
          : null

        mapped.push({
          id: d.id as string,
          graft_id: d.graft_id as string,
          batch_id: d.batch_id as string,
          distribution_type: d.distribution_type as 'virgin_queen' | 'mated_queen',
          distribution_date: d.distribution_date as string,
          mating_confirmed: d.mating_confirmed as boolean,
          mating_confirmed_date: d.mating_confirmed_date as string | null,
          mating_location: d.mating_location as string | null,
          overwintered: d.overwintered as boolean | null,
          overwintered_date: d.overwintered_date as string | null,
          offspring_hybridised: d.offspring_hybridised as boolean | null,
          hybridisation_date: d.hybridisation_date as string | null,
          notes: d.notes as string | null,
          recipient_user_id: d.recipient_user_id as string | null,
          recipient_name: recipientName,
          external_recipient_name: d.external_recipient_name as string | null,
          external_recipient_location: d.external_recipient_location as string | null,
          cell_number: Array.isArray(grafts) ? grafts[0]?.cell_number ?? 0 : grafts?.cell_number ?? 0,
          batch_name: batch.batch_name,
          graft_date: batch.graft_date,
          rearing_group_id: batch.rearing_group_id,
          batch_owner_id: batch.user_id,
          batch_owner_name: batchOwnerName,
        })
      }

      if (requestId !== fetchCounter.current) return
      setDistributions(mapped)
    } catch (err) {
      console.error('Error fetching virgin queen tracker data:', err)
      if (requestId === fetchCounter.current) {
        setDistributions([])
        setError(err instanceof Error ? err.message : 'Failed to load data')
      }
    } finally {
      if (requestId === fetchCounter.current) setLoading(false)
    }
  }, [])

  const updateOverwintered = useCallback(async (id: string, value: boolean | null): Promise<boolean> => {
    // Validate ID before update
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('Invalid distribution ID for overwintered update')
      return false
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      const { error, count } = await supabase
        .from('graft_distributions')
        .update({
          overwintered: value,
          overwintered_date: value !== null ? today : null,
        })
        .eq('id', id)

      if (error) throw error
      // Verify a row was actually updated
      if (count === 0) {
        console.warn('No rows updated for overwintered status - ID may not exist')
      }
      return true
    } catch (err) {
      console.error('Error updating overwintered status:', err)
      return false
    }
  }, [])

  const updateHybridisation = useCallback(async (id: string, value: boolean | null): Promise<boolean> => {
    // Validate ID before update
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('Invalid distribution ID for hybridisation update')
      return false
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      const { error, count } = await supabase
        .from('graft_distributions')
        .update({
          offspring_hybridised: value,
          hybridisation_date: value !== null ? today : null,
        })
        .eq('id', id)

      if (error) throw error
      // Verify a row was actually updated
      if (count === 0) {
        console.warn('No rows updated for hybridisation status - ID may not exist')
      }
      return true
    } catch (err) {
      console.error('Error updating hybridisation status:', err)
      return false
    }
  }, [])

  const calculateStats = useCallback((data: TrackedVirginQueen[]): VirginQueenStats => {
    return {
      total: data.length,
      mated: data.filter((d) => d.mating_confirmed).length,
      overwintered: data.filter((d) => d.overwintered === true).length,
      failed: data.filter((d) => d.overwintered === false).length,
      hybridised: data.filter((d) => d.offspring_hybridised === true).length,
    }
  }, [])

  const filterByStatus = useCallback((data: TrackedVirginQueen[], status: StatusFilter): TrackedVirginQueen[] => {
    switch (status) {
      case 'pending':
        return data.filter((d) => !d.mating_confirmed)
      case 'mated':
        return data.filter((d) => d.mating_confirmed && d.overwintered === null)
      case 'overwintered':
        return data.filter((d) => d.overwintered === true)
      case 'failed':
        return data.filter((d) => d.overwintered === false)
      default:
        return data
    }
  }, [])

  const filterByYear = useCallback((data: TrackedVirginQueen[], year: number | null): TrackedVirginQueen[] => {
    if (!year || !Number.isFinite(year)) return data
    return data.filter((d) => {
      if (!d.distribution_date) return false
      const date = new Date(d.distribution_date + 'T00:00:00')
      if (isNaN(date.getTime())) return false
      return date.getFullYear() === year
    })
  }, [])

  const filterByGroup = useCallback((data: TrackedVirginQueen[], groupId: string | null): TrackedVirginQueen[] => {
    if (!groupId) return data
    return data.filter((d) => d.rearing_group_id === groupId)
  }, [])

  return {
    distributions,
    loading,
    error,
    fetchDistributions,
    updateOverwintered,
    updateHybridisation,
    calculateStats,
    filterByStatus,
    filterByYear,
    filterByGroup,
  }
}
