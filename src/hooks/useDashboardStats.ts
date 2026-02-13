import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  DashboardStats,
  AttentionAlerts,
  RecentActivityRecord,
  Inspection,
  VarroaTreatment,
  VarroaCheck,
  Feeding,
  Harvest,
} from '@/types/dashboard'

interface UseDashboardStatsReturn {
  stats: DashboardStats
  alerts: AttentionAlerts
  recentActivity: RecentActivityRecord[]
  loading: boolean
  error: string | null
  fetchDashboardData: (userId: string) => Promise<void>
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats>({
    apiaries: 0,
    hives: 0,
    recentInspections: 0,
    queens: 0,
    activeTasks: 0,
  })
  const [alerts, setAlerts] = useState<AttentionAlerts>({
    overdueInspections: 0,
    oldQueens: 0,
    highVarroa: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async (userId: string) => {
    if (!userId) return

    setError(null)
    setLoading(true)

    try {
      // Fetch all stats in parallel
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [apiariesRes, hivesRes, inspectionsRes, queensRes, tasksRes] = await Promise.all([
        supabase.from('apiaries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('hives').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .gte('inspection_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .eq('user_id', userId),
        supabase.from('queens').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
        supabase.from('tasks_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', false),
      ])

      setStats({
        apiaries: apiariesRes.count || 0,
        hives: hivesRes.count || 0,
        recentInspections: inspectionsRes.count || 0,
        queens: queensRes.count || 0,
        activeTasks: tasksRes.count || 0,
      })

      // Fetch attention alerts and overdue hives in parallel
      const [oldQueensRes, highVarroaRes, activeHivesRes] = await Promise.all([
        // Active queens older than 2 years
        supabase.from('queens').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).eq('status', 'active').lt('birth_date', twoYearsAgo),
        // Varroa checks > 3% infestation in last 30 days — fetch hive_ids for dedup
        supabase.from('varroa_checks').select('hive_id')
          .eq('user_id', userId).gt('infestation_rate', 3)
          .gte('check_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
        // Active hives for overdue inspection calculation
        supabase.from('hives').select('id')
          .eq('user_id', userId).is('archived_at', null),
      ])

      // Count unique hives with high varroa
      const highVarroaHiveIds = new Set((highVarroaRes.data || []).map(c => c.hive_id))

      // Count hives needing inspection (no inspection in 14+ days)
      let overdueCount = 0
      const activeHives = activeHivesRes.data
      if (activeHives && activeHives.length > 0) {
        const hiveIds = activeHives.map(h => h.id)
        const { data: recentInspections } = await supabase
          .from('inspections')
          .select('hive_id')
          .in('hive_id', hiveIds)
          .gte('inspection_date', fourteenDaysAgo)

        const inspectedHiveIds = new Set((recentInspections || []).map(i => i.hive_id))
        overdueCount = hiveIds.filter(id => !inspectedHiveIds.has(id)).length
      }

      setAlerts({
        overdueInspections: overdueCount,
        oldQueens: oldQueensRes.count || 0,
        highVarroa: highVarroaHiveIds.size,
      })

      // Fetch recent activity from all record types
      const [activityInspections, activityTreatments, activityChecks, activityFeedings, activityHarvests] =
        await Promise.all([
          supabase
            .from('inspections')
            .select('*, hives(hive_number)')
            .eq('user_id', userId)
            .order('inspection_date', { ascending: false })
            .limit(10),
          supabase
            .from('varroa_treatments')
            .select('*, hives(hive_number)')
            .eq('user_id', userId)
            .order('treatment_date', { ascending: false })
            .limit(10),
          supabase
            .from('varroa_checks')
            .select('*, hives(hive_number)')
            .eq('user_id', userId)
            .order('check_date', { ascending: false })
            .limit(10),
          supabase
            .from('feedings')
            .select('*, hives(hive_number)')
            .eq('user_id', userId)
            .order('feed_date', { ascending: false })
            .limit(10),
          supabase
            .from('harvests')
            .select('*, hives(hive_number)')
            .eq('user_id', userId)
            .order('harvest_date', { ascending: false })
            .limit(10),
        ])

      // Merge all records with their types
      const merged: RecentActivityRecord[] = [
        ...((activityInspections.data as Inspection[]) || []).map((i) => ({
          ...i,
          record_type: 'inspection' as const,
          date: i.inspection_date,
        })),
        ...((activityTreatments.data as VarroaTreatment[]) || []).map((vt) => ({
          ...vt,
          record_type: 'varroa_treatment' as const,
          date: vt.treatment_date,
        })),
        ...((activityChecks.data as VarroaCheck[]) || []).map((vc) => ({
          ...vc,
          record_type: 'varroa_check' as const,
          date: vc.check_date,
        })),
        ...((activityFeedings.data as Feeding[]) || []).map((f) => ({
          ...f,
          record_type: 'feeding' as const,
          date: f.feed_date,
        })),
        ...((activityHarvests.data as Harvest[]) || []).map((h) => ({
          ...h,
          record_type: 'harvest' as const,
          date: h.harvest_date,
        })),
      ]

      // Sort by date descending (most recent first)
      merged.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        if (isNaN(dateA) && isNaN(dateB)) return 0
        if (isNaN(dateA)) return 1
        if (isNaN(dateB)) return -1
        return dateB - dateA
      })

      // Take only the 5 most recent records
      setRecentActivity(merged.slice(0, 5))
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Unable to load dashboard data. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    stats,
    alerts,
    recentActivity,
    loading,
    error,
    fetchDashboardData,
  }
}
