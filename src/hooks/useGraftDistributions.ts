import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

export interface GraftDistribution {
  id: string
  graft_id: string
  batch_id: string
  distribution_type: 'queen_cell' | 'virgin_queen' | 'mated_queen'
  recipient_user_id: string
  recipient_apiary_id: string | null
  recipient_hive_id: string | null
  distribution_date: string
  mating_confirmed: boolean
  notes: string | null
  previous_graft_status: string | null
  created_at: string
  // Joined fields
  recipient_name: string | null
  recipient_email: string | null
  recipient_apiary_name: string | null
  recipient_hive_number: string | null
  cell_number: number
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
  recipient_user_id: string
  recipient_apiary_id: string | null
  recipient_hive_id: string | null
  distribution_date: string
  notes: string | null
  user_id: string
  previous_graft_status: string
}

export interface BulkDistributionData {
  batch_id: string
  distribution_type: 'queen_cell' | 'virgin_queen' | 'mated_queen'
  recipient_user_id: string
  recipient_apiary_id: string | null
  recipient_hive_id: string | null
  distribution_date: string
  notes: string | null
  user_id: string
  grafts: { id: string; previous_graft_status: string }[]
}

export function useGraftDistributions() {
  const toast = useToast()
  const [distributions, setDistributions] = useState<GraftDistribution[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDistributions = useCallback(async (batchId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('graft_distributions')
        .select(`
          *,
          batch_grafts(cell_number),
          profiles!graft_distributions_recipient_profile_id_fkey(full_name, email),
          apiaries!graft_distributions_recipient_apiary_id_fkey(name),
          hives!graft_distributions_recipient_hive_id_fkey(hive_number)
        `)
        .eq('batch_id', batchId)
        .order('distribution_date', { ascending: false })

      if (error) throw error

      const mapped: GraftDistribution[] = (data || []).map((d: Record<string, unknown>) => {
        const grafts = d.batch_grafts as { cell_number: number }[] | { cell_number: number } | null
        const profile = d.profiles as { full_name: string; email: string }[] | { full_name: string; email: string } | null
        const apiary = d.apiaries as { name: string }[] | { name: string } | null
        const hive = d.hives as { hive_number: string }[] | { hive_number: string } | null

        return {
          id: d.id as string,
          graft_id: d.graft_id as string,
          batch_id: d.batch_id as string,
          distribution_type: d.distribution_type as GraftDistribution['distribution_type'],
          recipient_user_id: d.recipient_user_id as string,
          recipient_apiary_id: d.recipient_apiary_id as string | null,
          recipient_hive_id: d.recipient_hive_id as string | null,
          distribution_date: d.distribution_date as string,
          mating_confirmed: d.mating_confirmed as boolean,
          notes: d.notes as string | null,
          previous_graft_status: d.previous_graft_status as string | null,
          created_at: d.created_at as string,
          cell_number: Array.isArray(grafts) ? grafts[0]?.cell_number ?? 0 : grafts?.cell_number ?? 0,
          recipient_name: Array.isArray(profile) ? profile[0]?.full_name ?? null : profile?.full_name ?? null,
          recipient_email: Array.isArray(profile) ? profile[0]?.email ?? null : profile?.email ?? null,
          recipient_apiary_name: Array.isArray(apiary) ? apiary[0]?.name ?? null : apiary?.name ?? null,
          recipient_hive_number: Array.isArray(hive) ? hive[0]?.hive_number ?? null : hive?.hive_number ?? null,
        }
      })

      setDistributions(mapped)
    } catch (err) {
      console.error('Error fetching distributions:', err)
      setDistributions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createDistribution = useCallback(async (data: CreateDistributionData): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('graft_distributions')
        .insert(data)

      if (error) throw error

      // Update graft status to 'sold'
      const today = new Date().toISOString().split('T')[0]
      const { error: graftError } = await supabase
        .from('batch_grafts')
        .update({ status: 'sold', status_date: today })
        .eq('id', data.graft_id)

      if (graftError) {
        // Rollback: remove the distribution we just inserted
        await supabase.from('graft_distributions').delete().eq('graft_id', data.graft_id)
        console.error('Error updating graft status, distribution rolled back:', graftError)
        throw graftError
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
      return false
    }
  }, [])

  const createBulkDistributions = useCallback(async (data: BulkDistributionData): Promise<boolean> => {
    try {
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
        // Rollback: remove all distributions just inserted
        await supabase.from('graft_distributions').delete().in('graft_id', graftIds)
        console.error('Error bulk-updating graft statuses, distributions rolled back:', graftError)
        throw graftError
      }

      return true
    } catch (err) {
      console.error('Error creating bulk distributions:', err)
      return false
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
        .update({ status: previousStatus || 'mated' })
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

  const toggleMatingConfirmed = useCallback(async (id: string, confirmed: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('graft_distributions')
        .update({ mating_confirmed: confirmed })
        .eq('id', id)

      if (error) throw error
      return true
    } catch (err) {
      console.error('Error toggling mating confirmed:', err)
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
    toggleMatingConfirmed,
    searchUsers,
    fetchRecipientApiaries,
    fetchRecipientHives,
  }
}
