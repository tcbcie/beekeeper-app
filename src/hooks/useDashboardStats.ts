import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  DashboardStats,
  RecentActivityRecord,
  Inspection,
  VarroaTreatment,
  VarroaCheck,
  Feeding,
  Harvest,
} from '@/types/dashboard'

interface UseDashboardStatsReturn {
  stats: DashboardStats
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
      const [apiariesRes, hivesRes, inspectionsRes] = await Promise.all([
        supabase.from('apiaries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('hives').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .gte('inspection_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .eq('user_id', userId),
      ])

      setStats({
        apiaries: apiariesRes.count || 0,
        hives: hivesRes.count || 0,
        recentInspections: inspectionsRes.count || 0,
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
    recentActivity,
    loading,
    error,
    fetchDashboardData,
  }
}
