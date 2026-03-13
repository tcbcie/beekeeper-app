import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { getQueenColorFromYear } from '@/types/queen'

export interface GraftDistribution {
  id: string
  graft_id: string
  batch_id: string
  distribution_type: 'queen_cell' | 'virgin_queen' | 'mated_queen'
  recipient_user_id: string | null
  recipient_apiary_id: string | null
  recipient_hive_id: string | null
  distribution_date: string
  mating_confirmed: boolean
  mating_confirmed_date: string | null
  notes: string | null
  previous_graft_status: string | null
  created_at: string
  // Joined fields (app users)
  recipient_name: string | null
  recipient_email: string | null
  recipient_apiary_name: string | null
  recipient_apiary_latitude: number | null
  recipient_apiary_longitude: number | null
  recipient_apiary_elevation: number | null
  recipient_apiary_grid_reference: string | null
  recipient_hive_number: string | null
  cell_number: number
  // External recipient fields
  external_recipient_name: string | null
  external_recipient_email: string | null
  external_recipient_phone: string | null
  external_recipient_location: string | null
  mating_location: string | null
}

export interface RecipientUser {
  id: string
  full_name: string | null
  email: string | null
}

export interface RecipientApiary {
  id: string
  name: string
}

export interface RecipientHive {
  id: string
  hive_number: string
}

export interface CreateDistributionData {
  graft_id: string
  batch_id: string
  distribution_type: 'queen_cell' | 'virgin_queen' | 'mated_queen'
  recipient_user_id: string | null
  recipient_apiary_id: string | null
  recipient_hive_id: string | null
  distribution_date: string
  notes: string | null
  user_id: string
  previous_graft_status: string
  external_recipient_name: string | null
  external_recipient_email: string | null
  external_recipient_phone: string | null
  external_recipient_location: string | null
  mating_location: string | null
}

export interface BulkDistributionData {
  batch_id: string
  distribution_type: 'queen_cell' | 'virgin_queen' | 'mated_queen'
  recipient_user_id: string | null
  recipient_apiary_id: string | null
  recipient_hive_id: string | null
  distribution_date: string
  notes: string | null
  user_id: string
  grafts: { id: string; previous_graft_status: string }[]
  external_recipient_name: string | null
  external_recipient_email: string | null
  external_recipient_phone: string | null
  external_recipient_location: string | null
  mating_location: string | null
}

interface BatchDetails {
  emergence_date: string | null
  batch_name: string
  graft_date: string | null
  mating_apiary_eircode: string | null
  mating_apiary_name: string | null
  batchId: string | null
  distributedByName: string | null
  motherQueenSnapshot: string | null
  motherQueenSubspecies: string | null
}

/** Derive queen birth date: emergence_date, falling back to graft_date + 12 days. */
function deriveBirthDate(batch: BatchDetails): string | null {
  if (batch.emergence_date) return batch.emergence_date
  if (batch.graft_date) {
    const d = new Date(batch.graft_date + 'T00:00:00')
    d.setDate(d.getDate() + 12)
    return d.toISOString().split('T')[0]
  }
  return null
}

/** Create a queen record for the recipient after distribution to an app user. Non-blocking. */
async function createQueenForRecipient(
  recipientUserId: string,
  graftId: string,
  batch: BatchDetails,
  distributionType: 'queen_cell' | 'virgin_queen' | 'mated_queen'
): Promise<void> {
  try {
    const { data: graft, error: graftError } = await supabase
      .from('batch_grafts')
      .select('queen_number, cell_number')
      .eq('id', graftId)
      .single()

    if (graftError || !graft) {
      console.error('Non-blocking: failed to fetch graft for queen creation:', graftError)
      return
    }

    const queenNumber = (graft as { queen_number: string | null; cell_number: number }).queen_number
      || `Cell #${(graft as { cell_number: number }).cell_number}`
    const birthDate = deriveBirthDate(batch)
    const markingColor = birthDate ? getQueenColorFromYear(birthDate) : null
    const eircode = batch.mating_apiary_eircode || null

    // Build drone source description
    const droneSource = batch.mating_apiary_name
      ? `Open-mated at ${batch.mating_apiary_name}${eircode ? ` (${eircode})` : ''}`
      : eircode ? `Open-mated at ${eircode}` : null

    // Build human-readable lineage summary
    const lineageParts: string[] = []
    if (batch.motherQueenSnapshot) lineageParts.push(`Mother: ${batch.motherQueenSnapshot}`)
    if (droneSource) lineageParts.push(droneSource)
    if (batch.distributedByName) lineageParts.push(`Breeder: ${batch.distributedByName}`)
    const lineage = lineageParts.length > 0 ? lineageParts.join('. ') + '.' : null

    await supabase.rpc('create_queen_for_distribution', {
      p_recipient_user_id: recipientUserId,
      p_queen_number: queenNumber,
      p_birth_date: birthDate,
      p_marking_color: markingColor,
      p_source: 'Bred',
      p_status: distributionType === 'queen_cell' ? 'cell' : 'active',
      p_mated_at_eircode: eircode,
      p_batch_id: batch.batchId ?? null,
      p_distributed_by_name: batch.distributedByName ?? null,
      p_distributed_batch_name: batch.batch_name ?? null,
      p_distributed_mother_queen: batch.motherQueenSnapshot ?? null,
      p_distributed_drone_source: droneSource ?? null,
      p_subspecies: batch.motherQueenSubspecies ?? null,
      p_lineage: lineage,
    })
  } catch (err) {
    console.error('Non-blocking: failed to create queen for recipient:', err)
  }
}

/** Fetch batch details once, then create queen records for one or more grafts. Non-blocking. */
async function createQueensForRecipient(
  recipientUserId: string,
  batchId: string,
  graftIds: string[],
  distributionType: 'queen_cell' | 'virgin_queen' | 'mated_queen'
): Promise<void> {
  try {
    // Resolve auth user ID first so a failure doesn't abort the entire batch fetch
    const { data: authData } = await supabase.auth.getUser()
    const callerId = authData?.user?.id ?? ''

    // Fetch batch details (with mother queen + mating apiary) and current user's profile in parallel
    const [batchRes, profileRes] = await Promise.all([
      supabase.from('rearing_batches').select('id, emergence_date, batch_name, graft_date, apiaries!mating_apiary_id(name, eircode), queens!mother_queen_id(queen_number, marking_color, birth_date, subspecies)').eq('id', batchId).single(),
      supabase.from('profiles').select('full_name, first_name, last_name, email').eq('id', callerId).single(),
    ])

    if (batchRes.error || !batchRes.data) {
      console.error('Non-blocking: failed to fetch batch for queen creation:', batchRes.error)
      return
    }

    const raw = batchRes.data as {
      id: string; emergence_date: string | null; batch_name: string; graft_date: string | null;
      apiaries: { name: string | null; eircode: string | null }[] | { name: string | null; eircode: string | null } | null;
      queens: { queen_number: string; marking_color: string | null; birth_date: string | null; subspecies: string | null }[] | { queen_number: string; marking_color: string | null; birth_date: string | null; subspecies: string | null } | null;
    }
    const apiary = Array.isArray(raw.apiaries) ? raw.apiaries[0] : raw.apiaries
    const motherQueen = Array.isArray(raw.queens) ? raw.queens[0] : raw.queens
    if (profileRes.error) {
      console.error('Non-blocking: failed to fetch breeder profile:', profileRes.error)
    }
    const profile = profileRes.data as { full_name: string | null; first_name: string | null; last_name: string | null; email: string | null } | null
    const displayName = profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || 'Unknown breeder'

    // Build mother queen snapshot: "Queen #5 (Blue 2025, AMM)"
    let motherQueenSnapshot: string | null = null
    if (motherQueen) {
      const parts = [motherQueen.queen_number]
      const details: string[] = []
      if (motherQueen.marking_color) details.push(motherQueen.marking_color)
      if (motherQueen.birth_date) {
        const year = new Date(motherQueen.birth_date).getFullYear()
        if (!isNaN(year)) details.push(year.toString())
      }
      if (motherQueen.subspecies) details.push(motherQueen.subspecies)
      if (details.length > 0) parts.push(`(${details.join(' ')})`)
      motherQueenSnapshot = parts.join(' ')
    }

    const batchDetails: BatchDetails = {
      emergence_date: raw.emergence_date,
      batch_name: raw.batch_name,
      graft_date: raw.graft_date,
      mating_apiary_eircode: apiary?.eircode ?? null,
      mating_apiary_name: apiary?.name ?? null,
      batchId: raw.id,
      distributedByName: displayName,
      motherQueenSnapshot,
      motherQueenSubspecies: motherQueen?.subspecies ?? null,
    }
    await Promise.allSettled(
      graftIds.map(id => createQueenForRecipient(recipientUserId, id, batchDetails, distributionType))
    )
  } catch (err) {
    console.error('Non-blocking: failed to create queens for recipient:', err)
  }
}

export function useGraftDistributions() {
  const toast = useToast()
  const [distributions, setDistributions] = useState<GraftDistribution[]>([])
  const [loading, setLoading] = useState(false)
  const fetchCounter = useRef(0)

  const fetchDistributions = useCallback(async (batchId: string) => {
    const requestId = ++fetchCounter.current
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('graft_distributions')
        .select(`
          *,
          batch_grafts(cell_number),
          profiles!graft_distributions_recipient_profile_id_fkey(full_name, first_name, last_name, email),
          apiaries!graft_distributions_recipient_apiary_id_fkey(name, latitude, longitude, elevation, grid_reference),
          hives!graft_distributions_recipient_hive_id_fkey(hive_number)
        `)
        .eq('batch_id', batchId)
        .order('distribution_date', { ascending: false })

      if (error) throw error

      const mapped: GraftDistribution[] = (data || []).map((d: Record<string, unknown>) => {
        const grafts = d.batch_grafts as { cell_number: number }[] | { cell_number: number } | null
        const profile = d.profiles as { full_name: string | null; first_name: string | null; last_name: string | null; email: string | null }[] | { full_name: string | null; first_name: string | null; last_name: string | null; email: string | null } | null
        const apiary = d.apiaries as { name: string; latitude: number | null; longitude: number | null; elevation: number | null; grid_reference: string | null }[] | { name: string; latitude: number | null; longitude: number | null; elevation: number | null; grid_reference: string | null } | null
        const hive = d.hives as { hive_number: string }[] | { hive_number: string } | null

        const p = Array.isArray(profile) ? profile[0] : profile
        const a = Array.isArray(apiary) ? apiary[0] : apiary

        // Best available display name: full_name → first+last → email
        const firstName = p?.first_name ?? null
        const lastName = p?.last_name ?? null
        const fullName = p?.full_name ?? null
        const combinedName = (firstName || lastName) ? `${firstName ?? ''} ${lastName ?? ''}`.trim() : null
        const recipientName = fullName || combinedName || p?.email || null

        return {
          id: d.id as string,
          graft_id: d.graft_id as string,
          batch_id: d.batch_id as string,
          distribution_type: d.distribution_type as GraftDistribution['distribution_type'],
          recipient_user_id: d.recipient_user_id as string | null,
          recipient_apiary_id: d.recipient_apiary_id as string | null,
          recipient_hive_id: d.recipient_hive_id as string | null,
          distribution_date: d.distribution_date as string,
          mating_confirmed: d.mating_confirmed as boolean,
          mating_confirmed_date: d.mating_confirmed_date as string | null,
          notes: d.notes as string | null,
          previous_graft_status: d.previous_graft_status as string | null,
          created_at: d.created_at as string,
          cell_number: Array.isArray(grafts) ? grafts[0]?.cell_number ?? 0 : grafts?.cell_number ?? 0,
          recipient_name: recipientName,
          recipient_email: p?.email ?? null,
          recipient_apiary_name: a?.name ?? null,
          recipient_apiary_latitude: a?.latitude ?? null,
          recipient_apiary_longitude: a?.longitude ?? null,
          recipient_apiary_elevation: a?.elevation ?? null,
          recipient_apiary_grid_reference: a?.grid_reference ?? null,
          recipient_hive_number: Array.isArray(hive) ? hive[0]?.hive_number ?? null : hive?.hive_number ?? null,
          external_recipient_name: d.external_recipient_name as string | null,
          external_recipient_email: d.external_recipient_email as string | null,
          external_recipient_phone: d.external_recipient_phone as string | null,
          external_recipient_location: d.external_recipient_location as string | null,
          mating_location: d.mating_location as string | null,
        }
      })

      if (requestId !== fetchCounter.current) return // stale response — discard
      setDistributions(mapped)
    } catch (err) {
      console.error('Error fetching distributions:', err)
      if (requestId === fetchCounter.current) setDistributions([])
    } finally {
      if (requestId === fetchCounter.current) setLoading(false)
    }
  }, [])

  const createDistribution = useCallback(async (data: CreateDistributionData): Promise<boolean | null> => {
    try {
      // Mated queens are already mated at distribution time
      const insertData = data.distribution_type === 'mated_queen'
        ? { ...data, mating_confirmed: true, mating_confirmed_date: data.distribution_date }
        : data
      const { error } = await supabase
        .from('graft_distributions')
        .insert(insertData)

      if (error) throw error

      // Update graft status to 'sold'
      const today = new Date().toISOString().split('T')[0]
      const { error: graftError } = await supabase
        .from('batch_grafts')
        .update({ status: 'sold', status_date: today })
        .eq('id', data.graft_id)

      if (graftError) {
        const { error: rollbackError } = await supabase.from('graft_distributions').delete().eq('graft_id', data.graft_id)
        if (rollbackError) {
          console.error('Rollback failed — orphaned distribution for graft:', data.graft_id, rollbackError)
        } else {
          console.error('Error updating graft status, distribution rolled back:', graftError)
        }
        throw graftError
      }

      // Create queen record for recipient (non-blocking)
      if (data.recipient_user_id) {
        createQueensForRecipient(data.recipient_user_id, data.batch_id, [data.graft_id], data.distribution_type)
      }

      return true
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const pgError = err as { code: string }
        if (pgError.code === '23505') {
          console.error('Distribution already exists for this graft')
          return false
        }
      }
      console.error('Error creating distribution:', err)
      return null
    }
  }, [])

  const createBulkDistributions = useCallback(async (data: BulkDistributionData): Promise<boolean | null> => {
    try {
      // Mated queens are already mated at distribution time
      const isMatedQueen = data.distribution_type === 'mated_queen'
      const rows = data.grafts.map((g) => ({
        graft_id: g.id,
        batch_id: data.batch_id,
        distribution_type: data.distribution_type,
        recipient_user_id: data.recipient_user_id,
        recipient_apiary_id: data.recipient_apiary_id,
        recipient_hive_id: data.recipient_hive_id,
        distribution_date: data.distribution_date,
        notes: data.notes,
        user_id: data.user_id,
        previous_graft_status: g.previous_graft_status,
        external_recipient_name: data.external_recipient_name,
        external_recipient_email: data.external_recipient_email,
        external_recipient_phone: data.external_recipient_phone,
        external_recipient_location: data.external_recipient_location,
        mating_location: data.mating_location,
        ...(isMatedQueen ? { mating_confirmed: true, mating_confirmed_date: data.distribution_date } : {}),
      }))

      const { error } = await supabase
        .from('graft_distributions')
        .insert(rows)

      if (error) throw error

      const graftIds = data.grafts.map((g) => g.id)
      const today = new Date().toISOString().split('T')[0]
      const { error: graftError } = await supabase
        .from('batch_grafts')
        .update({ status: 'sold', status_date: today })
        .in('id', graftIds)

      if (graftError) {
        const { error: rollbackError } = await supabase.from('graft_distributions').delete().in('graft_id', graftIds)
        if (rollbackError) {
          console.error('Rollback failed — orphaned distributions for grafts:', graftIds, rollbackError)
        } else {
          console.error('Error bulk-updating graft statuses, distributions rolled back:', graftError)
        }
        throw graftError
      }

      // Create queen records for recipient (non-blocking, single batch fetch)
      if (data.recipient_user_id) {
        createQueensForRecipient(data.recipient_user_id, data.batch_id, graftIds, data.distribution_type)
      }

      return true
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const pgError = err as { code: string }
        if (pgError.code === '23505') {
          console.error('One or more grafts have already been distributed')
          return false
        }
      }
      console.error('Error creating bulk distributions:', err)
      return null
    }
  }, [])

  const deleteDistribution = useCallback(async (id: string, graftId: string, previousStatus: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('graft_distributions')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Revert graft status
      const { error: revertError } = await supabase
        .from('batch_grafts')
        .update({ status: previousStatus ?? 'mated' })
        .eq('id', graftId)

      if (revertError) {
        console.error('Distribution deleted but graft status revert failed — graft may be stuck as sold:', revertError)
        toast.error('Distribution removed but graft status could not be reverted. Please update manually.')
        return true // distribution IS deleted; surface warning but don't pretend it failed
      }

      return true
    } catch (err) {
      console.error('Error deleting distribution:', err)
      return false
    }
  }, [toast])

  const confirmMatingWithLocation = useCallback(async (
    id: string,
    matingDate: string,
    matingLocation: string
  ): Promise<boolean> => {
    // Validate required fields
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('Invalid distribution ID for mating confirmation')
      return false
    }
    if (!matingDate || typeof matingDate !== 'string') {
      console.error('Invalid mating date')
      return false
    }
    // Validate date format (YYYY-MM-DD)
    const dateObj = new Date(matingDate + 'T00:00:00')
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date format for mating confirmation')
      return false
    }
    if (!matingLocation || !matingLocation.trim()) {
      console.error('Missing mating location')
      return false
    }

    try {
      const { error } = await supabase
        .from('graft_distributions')
        .update({
          mating_confirmed: true,
          mating_confirmed_date: matingDate,
          mating_location: matingLocation.trim(),
        })
        .eq('id', id)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Error confirming mating with location:', err)
      return false
    }
  }, [])

  const clearMatingConfirmation = useCallback(async (id: string): Promise<boolean> => {
    // Validate ID before update
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('Invalid distribution ID for clearing mating confirmation')
      return false
    }

    try {
      const { error } = await supabase
        .from('graft_distributions')
        .update({
          mating_confirmed: false,
          mating_confirmed_date: null,
          mating_location: null,
        })
        .eq('id', id)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Error clearing mating confirmation:', err)
      return false
    }
  }, [])

  const searchUsers = useCallback(async (searchText: string): Promise<RecipientUser[]> => {
    if (!searchText || searchText.length < 2) return []
    try {
      const { data, error } = await supabase
        .rpc('search_users_for_distribution', { search_text: searchText })

      if (error) throw error
      return (data || []) as RecipientUser[]
    } catch (err) {
      console.error('Error searching users:', err)
      return []
    }
  }, [])

  const fetchRecipientApiaries = useCallback(async (userId: string): Promise<RecipientApiary[]> => {
    try {
      const { data, error } = await supabase
        .rpc('get_recipient_apiaries', { recipient_uuid: userId })

      if (error) throw error
      return (data || []) as RecipientApiary[]
    } catch (err) {
      console.error('Error fetching recipient apiaries:', err)
      return []
    }
  }, [])

  const fetchRecipientHives = useCallback(async (userId: string, apiaryId: string): Promise<RecipientHive[]> => {
    try {
      const { data, error } = await supabase
        .rpc('get_recipient_hives', { recipient_uuid: userId, apiary_uuid: apiaryId })

      if (error) throw error
      return (data || []) as RecipientHive[]
    } catch (err) {
      console.error('Error fetching recipient hives:', err)
      return []
    }
  }, [])

  return {
    distributions,
    loading,
    fetchDistributions,
    createDistribution,
    createBulkDistributions,
    deleteDistribution,
    confirmMatingWithLocation,
    clearMatingConfirmation,
    searchUsers,
    fetchRecipientApiaries,
    fetchRecipientHives,
  }
}
