import { useState, useCallback, useRef, useEffect } from 'react'

import { supabase } from '@/lib/supabase'
import type {
  DashboardStats,
  DashboardApiary,
  AttentionAlerts,
  RecentActivityRecord,
} from '@/types/dashboard'

interface UseDashboardStatsReturn {
  stats: DashboardStats
  apiaries: DashboardApiary[]
  alerts: AttentionAlerts
  recentActivity: RecentActivityRecord[]
  loading: boolean
  error: string | null
  recentActivityError: string | null
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
    todayTasks: 0,
  })
  const [apiaries, setApiaries] = useState<DashboardApiary[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentActivityError, setRecentActivityError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchDashboardData = useCallback(async (userId: string) => {
    if (!userId) return

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const isCurrentRequest = () => mountedRef.current && requestIdRef.current === requestId

    setError(null)
    setRecentActivityError(null)
    setLoading(true)

    try {
      try {
        // Single RPC replaces 16+ individual Supabase queries
        const { data, error: rpcError } = await supabase.rpc('get_dashboard_overview', { p_user_id: userId })
        if (rpcError) throw rpcError
        if (!isCurrentRequest()) return

        if (!data || typeof data !== 'object') {
          throw new Error('Dashboard overview RPC returned an unexpected response')
        }

        const result = data as {
          stats?: DashboardStats
          alerts?: AttentionAlerts
          apiaries?: DashboardApiary[]
        }

        if (result.stats) setStats(result.stats)
        if (result.alerts) setAlerts(result.alerts)
        setApiaries(Array.isArray(result.apiaries) ? result.apiaries : [])

        // Overview + alerts are ready — unblock the page render immediately
        if (isCurrentRequest()) {
          setLoading(false)
        }
      } catch (err) {
        console.error('Error fetching dashboard overview data:', err)
        if (isCurrentRequest()) {
          setError('Some dashboard sections could not be loaded. You can still use the links below and retry the dashboard data.')
          setLoading(false)
        }
      }

      try {
        const { data: activityRows, error: activityError } = await supabase
          .rpc('get_recent_activity', { p_user_id: userId, p_limit: 5 })

        if (activityError) throw activityError

        if (!isCurrentRequest()) return

        const mapped: RecentActivityRecord[] = (activityRows || []).map((row: {
          id: string
          record_type: string
          activity_date: string
          hive_id: string
          hive_number: string | null
          apiary_name: string | null
          queen_seen: boolean | null
          treatment_type: string | null
          infestation_rate: number | null
          feed_type: string | null
          honey_weight: number | null
        }) => ({
          id: row.id,
          hive_id: row.hive_id,
          record_type: row.record_type as RecentActivityRecord['record_type'],
          date: row.activity_date,
          // Map flat fields back to the nested shape components expect
          hives: row.hive_number ? [{ hive_number: row.hive_number, apiaries: row.apiary_name ? [{ name: row.apiary_name }] : null }] : [],
          // Type-specific fields
          inspection_date: row.activity_date,
          queen_seen: row.queen_seen,
          treatment_date: row.activity_date,
          treatment_type: row.treatment_type ?? '',
          check_date: row.activity_date,
          infestation_rate: row.infestation_rate,
          feed_date: row.activity_date,
          feed_type: row.feed_type ?? '',
          honey_weight: row.honey_weight,
          harvest_date: row.activity_date,
        })) as RecentActivityRecord[]

        setRecentActivity(mapped)
      } catch (err) {
        console.error('Error fetching recent activity:', err)
        if (isCurrentRequest()) {
          setRecentActivity([])
          setRecentActivityError('Recent activity could not be loaded. Please try again.')
        }
      }
    } catch {
      // Outer catch: guard against unexpected throws from the sequential try blocks.
      // Individual section errors are already handled above.
    }
  }, [])

  return {
    stats,
    apiaries,
    alerts,
    recentActivity,
    loading,
    error,
    recentActivityError,
    fetchDashboardData,
  }
}
