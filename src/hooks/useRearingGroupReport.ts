import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface RearingGroupMemberReport {
  user_id: string
  member_name: string
  queens_hatched: number
  queens_mated: number
  queen_cells_distributed: number
  batch_count: number
  cell_count: number
}

export interface RearingGroupReport {
  group_id: string
  group_name: string
  month: number
  year: number
  members: RearingGroupMemberReport[]
  totals: {
    queens_hatched: number
    queens_mated: number
    queen_cells_distributed: number
    batch_count: number
    cell_count: number
  }
}

export function useRearingGroupReport() {
  const [report, setReport] = useState<RearingGroupReport | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)

  const fetchReport = useCallback(async (groupId: string, groupName: string, month: number, year: number) => {
    setLoadingReport(true)
    try {
      // Get all member user_ids for this group
      const { data: members, error: membersError } = await supabase
        .from('rearing_group_members')
        .select('user_id')
        .eq('group_id', groupId)

      if (membersError) throw membersError

      const userIds = (members || []).map((m) => m.user_id)

      if (userIds.length === 0) {
        setReport({
          group_id: groupId,
          group_name: groupName,
          month,
          year,
          members: [],
          totals: { queens_hatched: 0, queens_mated: 0, queen_cells_distributed: 0, batch_count: 0, cell_count: 0 },
        })
        setLoadingReport(false)
        return
      }

      // Calculate date range for the selected month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endMonth = month === 12 ? 1 : month + 1
      const endYear = month === 12 ? year + 1 : year
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

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

      // Fetch rearing batches for those user_ids - need batches that either:
      // 1. Were grafted in the selected month (for batch counts, cell counts)
      // 2. Have emergence in the selected month (for hatched/mated counts)
      // We fetch a wider range and filter accordingly
      const { data: groupBatchRows, error: groupBatchRowsError } = await supabase
        .from('rearing_batches')
        .select('id')
        .in('user_id', userIds)
        .eq('rearing_group_id', groupId)

      if (groupBatchRowsError) throw groupBatchRowsError

      const groupBatchIds = (groupBatchRows || []).map((b) => b.id).filter(Boolean)

      const widerStartDate = `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, '0')}-01`
      const { data: batches, error: batchesError } = await supabase
        .from('rearing_batches')
        .select('id, user_id, graft_date, emergence_date, cell_count, queens_hatched, queens_mated, mating_apiary_id, rearing_group_id')
        .in('user_id', userIds)
        .eq('rearing_group_id', groupId)
        .gte('graft_date', widerStartDate)
        .lt('graft_date', endDate)

      if (batchesError) throw batchesError

      // Fetch graft statuses + distributions + nuc timestamps in one round trip.
      // See useNIHBSReport for rationale on the batch_id filter and Set aggregation.
      const batchIds = (batches || []).map((b) => b.id).filter(Boolean)
      const derivedCounts = new Map<string, { queens_hatched: number; queens_mated: number }>()
      if (batchIds.length > 0) {
        type GraftRow = { id: string; batch_id: string; status: string }
        type DistRow = { graft_id: string; batch_id: string; distribution_type: string }
        type NucRow = { graft_id: string | null; queen_emerged_at: string | null; mating_confirmed_at: string | null }

        const [graftsRes, distsRes, nucsRes] = await Promise.all([
          supabase.from('batch_grafts').select('id, batch_id, status').in('batch_id', batchIds),
          supabase.from('graft_distributions').select('graft_id, batch_id, distribution_type').in('batch_id', batchIds),
          supabase.from('mating_nucs').select('graft_id, queen_emerged_at, mating_confirmed_at').in('batch_id', batchIds),
        ])

        if (graftsRes.error) throw graftsRes.error
        if (distsRes.error) throw distsRes.error
        if (nucsRes.error) throw nucsRes.error

        // Build graft_id → distribution_type lookup for sold grafts
        const graftDistType = new Map<string, string>()
        for (const d of (distsRes.data || []) as DistRow[]) {
          graftDistType.set(d.graft_id, d.distribution_type)
        }

        // Aggregate nuc timestamps as sets so multiple nuc rows per graft OR together.
        const hatchedViaNuc = new Set<string>()
        const matedViaNuc = new Set<string>()
        for (const n of (nucsRes.data || []) as NucRow[]) {
          if (!n.graft_id) continue
          if (n.queen_emerged_at || n.mating_confirmed_at) hatchedViaNuc.add(n.graft_id)
          if (n.mating_confirmed_at) matedViaNuc.add(n.graft_id)
        }

        for (const g of (graftsRes.data || []) as GraftRow[]) {
          if (!derivedCounts.has(g.batch_id)) {
            derivedCounts.set(g.batch_id, { queens_hatched: 0, queens_mated: 0 })
          }
          const dc = derivedCounts.get(g.batch_id)!

          let isHatched = false
          let isMated = false

          if (g.status === 'sold') {
            const distType = graftDistType.get(g.id)
            if (distType === 'mated_queen') { isHatched = true; isMated = true }
            else if (distType === 'virgin_queen') { isHatched = true }
            // queen_cell → don't count as hatched or mated
          } else {
            // 'in_nuc' alone is not a hatched signal; see useNIHBSReport for rationale.
            if (g.status === 'emerged' || g.status === 'mated') isHatched = true
            if (g.status === 'mated') isMated = true
          }

          if (hatchedViaNuc.has(g.id)) isHatched = true
          if (matedViaNuc.has(g.id)) isMated = true

          if (isHatched) dc.queens_hatched++
          if (isMated) dc.queens_mated++
        }
      }

      // Fetch queen_cell distributions by distribution_date, scoped to this group's batches.
      const queenCellCountPerMember = new Map<string, number>()
      if (groupBatchIds.length > 0) {
        const { data: qcDists, error: qcError } = await supabase
          .from('graft_distributions')
          .select('user_id')
          .eq('distribution_type', 'queen_cell')
          .in('user_id', userIds)
          .in('batch_id', groupBatchIds)
          .gte('distribution_date', startDate)
          .lt('distribution_date', endDate)

        if (qcError) throw qcError
        for (const d of (qcDists || [])) {
          queenCellCountPerMember.set(d.user_id, (queenCellCountPerMember.get(d.user_id) || 0) + 1)
        }
      }

      // Fetch profiles for display names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds)

      if (profilesError) throw profilesError

      const profilesMap = new Map(
        (profiles || []).map((p) => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown'])
      )

      // Aggregate per member
      const memberAgg = new Map<string, RearingGroupMemberReport>()
      for (const uid of userIds) {
        memberAgg.set(uid, {
          user_id: uid,
          member_name: profilesMap.get(uid) || 'Unknown',
          queens_hatched: 0,
          queens_mated: 0,
          queen_cells_distributed: 0,
          batch_count: 0,
          cell_count: 0,
        })
      }

      for (const batch of (batches || [])) {
        const entry = memberAgg.get(batch.user_id)
        if (!entry) continue

        const dc = derivedCounts.get(batch.id)

        // Check if batch was grafted in the selected month (for batch/cell counts)
        const graftMonth = parseInt(batch.graft_date.split('-')[1], 10)
        const graftYear = parseInt(batch.graft_date.split('-')[0], 10)
        const isGraftedInMonth = graftMonth === month && graftYear === year

        // Check if batch emerged in the selected month (for hatched/mated counts)
        const emergence = getEmergenceMonthYear(batch)
        const isEmergedInMonth = emergence.month === month && emergence.year === year

        // Graft-time metrics: only count if grafted in selected month
        if (isGraftedInMonth) {
          entry.cell_count += batch.cell_count || 0
          entry.batch_count += 1
        }

        // Post-emergence metrics: only count if emerged in selected month
        // Prefer derived counts (from actual graft statuses) over batch-level counters
        // which can become stale when cells are distributed before hatching
        if (isEmergedInMonth) {
          entry.queens_hatched += dc ? dc.queens_hatched : (batch.queens_hatched ?? 0)
          entry.queens_mated += dc ? dc.queens_mated : (batch.queens_mated ?? 0)
        }
      }

      // Apply queen_cell distribution counts (queried by distribution_date, not batch)
      for (const [uid, count] of queenCellCountPerMember) {
        const entry = memberAgg.get(uid)
        if (entry) entry.queen_cells_distributed = count
      }

      const memberReports = Array.from(memberAgg.values())

      const totals = memberReports.reduce(
        (acc, m) => ({
          queens_hatched: acc.queens_hatched + m.queens_hatched,
          queens_mated: acc.queens_mated + m.queens_mated,
          queen_cells_distributed: acc.queen_cells_distributed + m.queen_cells_distributed,
          batch_count: acc.batch_count + m.batch_count,
          cell_count: acc.cell_count + m.cell_count,
        }),
        { queens_hatched: 0, queens_mated: 0, queen_cells_distributed: 0, batch_count: 0, cell_count: 0 }
      )

      setReport({
        group_id: groupId,
        group_name: groupName,
        month,
        year,
        members: memberReports,
        totals,
      })
    } catch (error) {
      console.error('Error fetching rearing group report:', error)
      setReport(null)
    } finally {
      setLoadingReport(false)
    }
  }, [])

  return {
    report,
    loadingReport,
    fetchReport,
  }
}
