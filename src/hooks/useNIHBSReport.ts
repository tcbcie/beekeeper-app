import { useState, useCallback, useRef } from 'react'
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
  auto_virgins_distributed_external: number
  auto_virgins_external_mated: number
  auto_hybridised_offspring: number
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
  const fetchGenRef = useRef(0)

  const fetchReport = useCallback(async (groupId: string, groupName: string, year: number) => {
    const gen = ++fetchGenRef.current
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
          .select('id, graft_date, emergence_date, cell_count, grafts_accepted, queens_hatched, queens_mated, mating_apiary_id')
          .in('user_id', userIds)
          // Keep NIHBS totals strictly group-linked; non-group batches stay out of these counts.
          .eq('rearing_group_id', groupId)
          .gte('graft_date', startDate)
          .lt('graft_date', endDate)
          .order('graft_date')

        if (batchesError) throw batchesError

        // 2a. Fetch graft statuses + distributions + nuc timestamps in one round trip.
        //     Filtering all three by batch_id keeps the URL bounded (batches are typically
        //     small in count) and avoids a sequential round trip on graft_id IN (…).
        const batchIdList = (batches || []).map((b: { id: string }) => b.id).filter(Boolean)
        const derivedCounts = new Map<string, { grafts_accepted: number; queens_hatched: number; queens_mated: number }>()
        // Also store distributions for reuse in step 2b
        let allDists: { graft_id: string; batch_id: string; distribution_type: string; recipient_user_id: string | null; mating_confirmed: boolean | null; distribution_date: string | null; offspring_hybridised: boolean | null; hybridisation_date: string | null }[] = []
        if (batchIdList.length > 0) {
          type GraftRow = { id: string; batch_id: string; status: string }
          type NucRow = { graft_id: string | null; queen_emerged_at: string | null; mating_confirmed_at: string | null }

          const [graftsRes, distsRes, nucsRes] = await Promise.all([
            supabase.from('batch_grafts').select('id, batch_id, status').in('batch_id', batchIdList),
            supabase.from('graft_distributions').select('graft_id, batch_id, distribution_type, recipient_user_id, mating_confirmed, distribution_date, offspring_hybridised, hybridisation_date').in('batch_id', batchIdList),
            supabase.from('mating_nucs').select('graft_id, queen_emerged_at, mating_confirmed_at').in('batch_id', batchIdList),
          ])

          if (graftsRes.error) throw graftsRes.error
          if (distsRes.error) throw distsRes.error
          if (nucsRes.error) throw nucsRes.error
          allDists = distsRes.data || []

          // Build graft_id → distribution_type lookup for sold grafts
          const graftDistType = new Map<string, string>()
          for (const d of allDists) {
            graftDistType.set(d.graft_id, d.distribution_type)
          }

          // Fallback: a graft is "hatched" / "mated" if its linked mating_nuc has the
          // corresponding inspection timestamp set. This catches cases where a sealed
          // cell was placed in a nuc (graft.status = 'in_nuc') and later confirmed via
          // a nuc inspection, without the graft status itself moving to 'emerged'/'mated'.
          // Aggregated as sets so multiple nuc rows per graft (no UNIQUE constraint on
          // graft_id) OR together — any signal wins.
          const hatchedViaNuc = new Set<string>()
          const matedViaNuc = new Set<string>()
          for (const n of (nucsRes.data || []) as NucRow[]) {
            if (!n.graft_id) continue
            if (n.queen_emerged_at || n.mating_confirmed_at) hatchedViaNuc.add(n.graft_id)
            if (n.mating_confirmed_at) matedViaNuc.add(n.graft_id)
          }
          const graftRows = (graftsRes.data || []) as GraftRow[]

          for (const g of graftRows) {
            if (!derivedCounts.has(g.batch_id)) {
              derivedCounts.set(g.batch_id, { grafts_accepted: 0, queens_hatched: 0, queens_mated: 0 })
            }
            const dc = derivedCounts.get(g.batch_id)!
            if (!['grafted', 'failed'].includes(g.status)) dc.grafts_accepted++

            let isHatched = false
            let isMated = false

            if (g.status === 'sold') {
              // For sold grafts, use distribution_type to determine what stage was reached
              const distType = graftDistType.get(g.id)
              if (distType === 'mated_queen') { isHatched = true; isMated = true }
              else if (distType === 'virgin_queen') { isHatched = true }
              // queen_cell → don't count as hatched or mated
            } else {
              // 'in_nuc' on its own is NOT a hatched signal — it just means the cell
              // was placed in a nuc. Hatching is confirmed via an inspection (which
              // auto-promotes status to 'emerged'/'mated' and stamps the nuc).
              if (g.status === 'emerged' || g.status === 'mated') isHatched = true
              if (g.status === 'mated') isMated = true
            }

            if (hatchedViaNuc.has(g.id)) isHatched = true
            if (matedViaNuc.has(g.id)) isMated = true

            if (isHatched) dc.queens_hatched++
            if (isMated) dc.queens_mated++
          }
        }

        // Helper: get or create a monthly bucket
        const getMonth = (m: number): MonthlyData => {
          if (!monthlyMap.has(m)) {
            monthlyMap.set(m, {
              month: m,
              year,
              total: { apiary_id: 'total', batch_count: 0, cell_count: 0, grafts_accepted: 0, queens_hatched: 0, queens_mated: 0 },
              byApiary: new Map(),
              hybridised_offspring: 0,
              virgins_distributed_external: 0,
              virgins_external_mated: 0,
              auto_virgins_distributed_external: 0,
              auto_virgins_external_mated: 0,
              auto_hybridised_offspring: 0,
            })
          }
          return monthlyMap.get(m)!
        }

        // Helper: get or create a per-apiary bucket within a month
        const getApiary = (md: MonthlyData, apiaryId: string): MonthlyApiaryData => {
          if (!md.byApiary.has(apiaryId)) {
            md.byApiary.set(apiaryId, { apiary_id: apiaryId, batch_count: 0, cell_count: 0, grafts_accepted: 0, queens_hatched: 0, queens_mated: 0 })
          }
          return md.byApiary.get(apiaryId)!
        }

        // Helper: derive emergence month/year from emergence_date or graft_date + 12 days
        const getEmergenceMonthYear = (batch: { emergence_date?: string | null; graft_date: string }): { month: number; year: number } => {
          if (batch.emergence_date) {
            const parts = batch.emergence_date.split('-')
            return { month: parseInt(parts[1], 10), year: parseInt(parts[0], 10) }
          }
          // Fallback: graft_date + 12 days
          const graft = new Date(batch.graft_date + 'T00:00:00')
          graft.setDate(graft.getDate() + 12)
          return { month: graft.getMonth() + 1, year: graft.getFullYear() }
        }

        for (const batch of (batches || [])) {
          const graftDate = batch.graft_date
          if (!graftDate) continue

          if (!first_graft_date || graftDate < first_graft_date) first_graft_date = graftDate
          if (!last_graft_date || graftDate > last_graft_date) last_graft_date = graftDate

          // Parse date string directly to avoid timezone shift
          const graftMonth = parseInt(graftDate.split('-')[1], 10)
          if (isNaN(graftMonth) || graftMonth < 1 || graftMonth > 12) continue
          const emergence = getEmergenceMonthYear(batch)
          const apiaryId = batch.mating_apiary_id || 'unassigned'

          // Prefer derived counts (from actual graft statuses) over batch-level counters
          // which can become stale when cells are distributed before hatching
          const dc = derivedCounts.get(batch.id)
          const accepted = dc ? dc.grafts_accepted : (batch.grafts_accepted ?? 0)
          const hatched = dc ? dc.queens_hatched : (batch.queens_hatched ?? 0)
          const mated = dc ? dc.queens_mated : (batch.queens_mated ?? 0)

          // Graft-time metrics → graft month
          const graftMd = getMonth(graftMonth)
          graftMd.total.batch_count++
          graftMd.total.cell_count += batch.cell_count || 0
          graftMd.total.grafts_accepted += accepted

          const graftAd = getApiary(graftMd, apiaryId)
          graftAd.batch_count++
          graftAd.cell_count += batch.cell_count || 0
          graftAd.grafts_accepted += accepted

          // Post-emergence metrics → emergence month (only if within the report year)
          if (emergence.year === year) {
            const emergMd = getMonth(emergence.month)
            emergMd.total.queens_hatched += hatched
            emergMd.total.queens_mated += mated

            const emergAd = getApiary(emergMd, apiaryId)
            emergAd.queens_hatched += hatched
            emergAd.queens_mated += mated
          }
        }

        // 2b. Process distributions for queen_cell adjustments and external distribution counts
        // (distributions already fetched in step 2a)
        if (allDists.length > 0) {
          const memberIdSet = new Set(userIds)

          // Auto-calculate external distribution counts (all types including queen_cell)
          for (const d of allDists) {
            // Only count external distributions (recipient not in the group)
            if (d.recipient_user_id && memberIdSet.has(d.recipient_user_id)) continue

            const distDate = d.distribution_date
            if (!distDate) continue
            const distMonth = parseInt(distDate.split('-')[1], 10)
            const distYear = parseInt(distDate.split('-')[0], 10)
            if (distYear !== year) continue

            const md = getMonth(distMonth)
            md.auto_virgins_distributed_external++
            // Mated queens are already mated when distributed; virgin queens need mating_confirmed
            if (d.distribution_type === 'mated_queen' || d.mating_confirmed) {
              md.auto_virgins_external_mated++
            }
          }

          // Auto-calculate hybridised offspring from individual distribution records
          for (const d of allDists) {
            if (d.offspring_hybridised !== true) continue
            const hybDate = d.hybridisation_date
            if (!hybDate) continue
            const hybMonth = parseInt(hybDate.split('-')[1], 10)
            const hybYear = parseInt(hybDate.split('-')[0], 10)
            if (hybYear !== year) continue
            const md = getMonth(hybMonth)
            md.auto_hybridised_offspring++
          }
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
        const { data: batchApiariesRaw, error: apiariesError } = await supabase
          .from('apiaries')
          .select('id, name, grid_reference, elevation')
          .in('id', Array.from(batchApiaryIds))
          .order('name')

        if (apiariesError) throw apiariesError
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

      // Before applying manual overrides, set auto-calculated values as defaults
      for (const [, md] of monthlyMap) {
        md.virgins_distributed_external = md.auto_virgins_distributed_external
        md.virgins_external_mated = md.auto_virgins_external_mated
        md.hybridised_offspring = md.auto_hybridised_offspring
      }

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
              auto_virgins_distributed_external: 0,
              auto_virgins_external_mated: 0,
              auto_hybridised_offspring: 0,
            })
          }
          const md = monthlyMap.get(r.month)!
          // Only override auto-calculated hybridised_offspring if a manual value was explicitly saved
          if (r.hybridised_offspring != null) {
            md.hybridised_offspring = r.hybridised_offspring
          }
          // Manual overrides take precedence over auto-calculated values when explicitly saved
          if (r.virgins_distributed_external != null) {
            md.virgins_distributed_external = r.virgins_distributed_external
          }
          if (r.virgins_external_mated != null) {
            md.virgins_external_mated = r.virgins_external_mated
          }
        }
      }

      const months = Array.from(monthlyMap.values()).sort((a, b) => a.month - b.month)

      // Discard result if a newer fetch was started while this one was in-flight
      if (gen !== fetchGenRef.current) return

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
      if (gen !== fetchGenRef.current) return
      console.error('Error fetching NIHBS report:', err)
      setError('Failed to load report data. Please try again.')
      setReportData(null)
    } finally {
      if (gen === fetchGenRef.current) setLoading(false)
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
