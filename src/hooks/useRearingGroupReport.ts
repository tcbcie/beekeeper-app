import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface RearingGroupMemberReport {
  user_id: string
  member_name: string
  grafts_accepted: number
  queens_hatched: number
  queens_mated: number
  batch_count: number
}

export interface RearingGroupReport {
  group_id: string
  group_name: string
  month: number
  year: number
  members: RearingGroupMemberReport[]
  totals: {
    grafts_accepted: number
    queens_hatched: number
    queens_mated: number
    batch_count: number
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
          totals: { grafts_accepted: 0, queens_hatched: 0, queens_mated: 0, batch_count: 0 },
        })
        setLoadingReport(false)
        return
      }

      // Calculate date range for the selected month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endMonth = month === 12 ? 1 : month + 1
      const endYear = month === 12 ? year + 1 : year
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

      // Fetch rearing batches for those user_ids within the month
      const { data: batches, error: batchesError } = await supabase
        .from('rearing_batches')
        .select('user_id, grafts_accepted, queens_hatched, queens_mated')
        .in('user_id', userIds)
        .gte('graft_date', startDate)
        .lt('graft_date', endDate)

      if (batchesError) throw batchesError

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
          grafts_accepted: 0,
          queens_hatched: 0,
          queens_mated: 0,
          batch_count: 0,
        })
      }

      for (const batch of (batches || [])) {
        const entry = memberAgg.get(batch.user_id)
        if (entry) {
          entry.grafts_accepted += batch.grafts_accepted || 0
          entry.queens_hatched += batch.queens_hatched || 0
          entry.queens_mated += batch.queens_mated || 0
          entry.batch_count += 1
        }
      }

      const memberReports = Array.from(memberAgg.values())

      const totals = memberReports.reduce(
        (acc, m) => ({
          grafts_accepted: acc.grafts_accepted + m.grafts_accepted,
          queens_hatched: acc.queens_hatched + m.queens_hatched,
          queens_mated: acc.queens_mated + m.queens_mated,
          batch_count: acc.batch_count + m.batch_count,
        }),
        { grafts_accepted: 0, queens_hatched: 0, queens_mated: 0, batch_count: 0 }
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
