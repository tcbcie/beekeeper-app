import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface MatingApiaryInfo {
  id: string
  apiary_id: string
  apiary_name: string
  grid_reference: string | null
  elevation: number | null
}

export interface MonthlyApiaryData {
  apiary_id: string
  batch_count: number
  cell_count: number
  grafts_accepted: number
  queens_hatched: number
  queens_mated: number
}

export interface MonthlyData {
  month: number
  year: number
  total: MonthlyApiaryData
  byApiary: Map<string, MonthlyApiaryData>
  hybridised_offspring: number
  virgins_distributed_external: number
  virgins_external_mated: number
}

export interface NIHBSReportData {
  group_id: string
  group_name: string
  year: number
  member_count: number
  experience_counts: { experienced: number; intermediate: number; novice: number }
  first_graft_date: string | null
  last_graft_date: string | null
  mating_apiaries: MatingApiaryInfo[]
  months: MonthlyData[]
}

export interface ManualFields {
  hybridised_offspring: number
  virgins_distributed_external: number
  virgins_external_mated: number
}

export function useNIHBSReport() {
  const [reportData, setReportData] = useState<NIHBSReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async (groupId: string, groupName: string, year: number) => {
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch members with experience levels
      const { data: members, error: membersError } = await supabase
        .from('rearing_group_members')
        .select('user_id, experience_level')
        .eq('group_id', groupId)

      if (membersError) throw membersError

      const userIds = (members || []).map((m) => m.user_id)
      const experience_counts = { experienced: 0, intermediate: 0, novice: 0 }
      for (const m of (members || [])) {
        if (m.experience_level === 'experienced') experience_counts.experienced++
        else if (m.experience_level === 'intermediate') experience_counts.intermediate++
        else if (m.experience_level === 'novice') experience_counts.novice++
      }

      // 2. Fetch batches for all members in the year
      const startDate = `${year}-01-01`
      const endDate = `${year + 1}-01-01`

      let first_graft_date: string | null = null
      let last_graft_date: string | null = null
      const monthlyMap = new Map<number, MonthlyData>()

      if (userIds.length > 0) {
        const { data: batches, error: batchesError } = await supabase
          .from('rearing_batches')
          .select('graft_date, cell_count, grafts_accepted, queens_hatched, queens_mated, mating_apiary_id')
          .in('user_id', userIds)
          .gte('graft_date', startDate)
          .lt('graft_date', endDate)
          .order('graft_date')

        if (batchesError) throw batchesError

        for (const batch of (batches || [])) {
          const graftDate = batch.graft_date
          if (!graftDate) continue

          if (!first_graft_date || graftDate < first_graft_date) first_graft_date = graftDate
          if (!last_graft_date || graftDate > last_graft_date) last_graft_date = graftDate

          // Parse date string directly to avoid timezone shift (DATE "2026-05-01" parsed as UTC midnight shifts to April in BST)
          const month = parseInt(graftDate.split('-')[1], 10)

          if (!monthlyMap.has(month)) {
            monthlyMap.set(month, {
              month,
              year,
              total: { apiary_id: 'total', batch_count: 0, cell_count: 0, grafts_accepted: 0, queens_hatched: 0, queens_mated: 0 },
              byApiary: new Map(),
              hybridised_offspring: 0,
              virgins_distributed_external: 0,
              virgins_external_mated: 0,
            })
          }

          const md = monthlyMap.get(month)!

          // Update totals
          md.total.batch_count++
          md.total.cell_count += batch.cell_count || 0
          md.total.grafts_accepted += batch.grafts_accepted || 0
          md.total.queens_hatched += batch.queens_hatched || 0
          md.total.queens_mated += batch.queens_mated || 0

          // Update per-apiary
          const apiaryId = batch.mating_apiary_id || 'unassigned'
          if (!md.byApiary.has(apiaryId)) {
            md.byApiary.set(apiaryId, { apiary_id: apiaryId, batch_count: 0, cell_count: 0, grafts_accepted: 0, queens_hatched: 0, queens_mated: 0 })
          }
          const ad = md.byApiary.get(apiaryId)!
          ad.batch_count++
          ad.cell_count += batch.cell_count || 0
          ad.grafts_accepted += batch.grafts_accepted || 0
          ad.queens_hatched += batch.queens_hatched || 0
          ad.queens_mated += batch.queens_mated || 0
        }
      }

      // 3. Derive mating apiaries from batch data
      const batchApiaryIds = new Set<string>()
      for (const [, md] of monthlyMap) {
        for (const [apiaryId] of md.byApiary) {
          if (apiaryId !== 'unassigned') {
            batchApiaryIds.add(apiaryId)
          }
        }
      }

      const mating_apiaries: MatingApiaryInfo[] = []
      if (batchApiaryIds.size > 0) {
        const { data: batchApiariesRaw } = await supabase
          .from('apiaries')
          .select('id, name, grid_reference, elevation')
          .in('id', Array.from(batchApiaryIds))
          .order('name')

        if (batchApiariesRaw) {
          for (const a of batchApiariesRaw) {
            mating_apiaries.push({
              id: a.id,
              apiary_id: a.id,
              apiary_name: a.name || 'Unknown',
              grid_reference: a.grid_reference || null,
              elevation: a.elevation ?? null,
            })
          }
        }
      }

      // 4. Fetch manual fields from nihbs_monthly_returns
      const { data: returns, error: returnsError } = await supabase
        .from('nihbs_monthly_returns')
        .select('month, hybridised_offspring, virgins_distributed_external, virgins_external_mated')
        .eq('group_id', groupId)
        .eq('year', year)

      if (!returnsError && returns) {
        for (const r of returns) {
          if (!monthlyMap.has(r.month)) {
            // Create month entry for manual-only data (no batches in this month)
            monthlyMap.set(r.month, {
              month: r.month,
              year,
              total: { apiary_id: 'total', batch_count: 0, cell_count: 0, grafts_accepted: 0, queens_hatched: 0, queens_mated: 0 },
              byApiary: new Map(),
              hybridised_offspring: 0,
              virgins_distributed_external: 0,
              virgins_external_mated: 0,
            })
          }
          const md = monthlyMap.get(r.month)!
          md.hybridised_offspring = r.hybridised_offspring || 0
          md.virgins_distributed_external = r.virgins_distributed_external || 0
          md.virgins_external_mated = r.virgins_external_mated || 0
        }
      }

      const months = Array.from(monthlyMap.values()).sort((a, b) => a.month - b.month)

      setReportData({
        group_id: groupId,
        group_name: groupName,
        year,
        member_count: userIds.length,
        experience_counts,
        first_graft_date,
        last_graft_date,
        mating_apiaries: mating_apiaries,
        months,
      })
    } catch (err) {
      console.error('Error fetching NIHBS report:', err)
      setError('Failed to load report data. Please try again.')
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveManualFields = useCallback(async (
    groupId: string,
    month: number,
    year: number,
    fields: ManualFields,
    userId: string
  ) => {
    try {
      const { error } = await supabase
        .from('nihbs_monthly_returns')
        .upsert({
          group_id: groupId,
          month,
          year,
          hybridised_offspring: fields.hybridised_offspring,
          virgins_distributed_external: fields.virgins_distributed_external,
          virgins_external_mated: fields.virgins_external_mated,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        }, { onConflict: 'group_id,month,year' })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error saving manual fields:', error)
      return false
    }
  }, [])

  return {
    reportData,
    loading,
    error,
    fetchReport,
    saveManualFields,
  }
}
