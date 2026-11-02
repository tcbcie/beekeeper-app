import { useState, useCallback, useRef, useEffect } from 'react'

import { supabase } from '@/lib/supabase'
import { openScreenCache } from '@/lib/screen-cache'
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
  /** The user's first name, for the dashboard greeting */
  firstName: string | null
  recentActivity: RecentActivityRecord[]
  loading: boolean
  error: string | null
  recentActivityError: string | null
  /** When the latest load failed and older data is showing: when that data was saved. */
  staleSince: number | null
  fetchDashboardData: (userId: string) => Promise<void>
}

/** Enough records to group the latest visits; a visit can hold a record for every hive */
export const RECENT_ACTIVITY_LIMIT = 50

interface DashboardSnapshot {
  stats: DashboardStats
  alerts: AttentionAlerts
  apiaries: DashboardApiary[]
  firstName: string | null
  recentActivity: RecentActivityRecord[]
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
  const [firstName, setFirstName] = useState<string | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentActivityError, setRecentActivityError] = useState<string | null>(null)
  const [staleSince, setStaleSince] = useState<number | null>(null)
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

    const showSnapshot = (snapshot: DashboardSnapshot) => {
      setStats(snapshot.stats)
      setAlerts(snapshot.alerts)
      setApiaries(snapshot.apiaries)
      setFirstName(snapshot.firstName)
      setRecentActivity(snapshot.recentActivity)
    }

    // The last overview shows at once, on any signal, while the fresh one loads behind it.
    const cache = openScreenCache<DashboardSnapshot>(userId, 'dashboard')
    let freshArrived = false
    cache.read().then((entry) => {
      if (!entry || freshArrived || !isCurrentRequest()) return
      showSnapshot(entry.data)
      setLoading(false)
    })
    let freshOverview: Omit<DashboardSnapshot, 'recentActivity'> | null = null

    // Supabase query builders are lazy -- the request only fires when awaited /
    // then()'d. Trigger both RPCs now (via .then) so recent activity loads in
    // parallel with the overview instead of starting only after it resolves;
    // we still await the overview first to unblock the page as early as possible.
    const overviewRequest = supabase.rpc('get_dashboard_overview', { p_user_id: userId }).then(res => res)
    const activityRequest = supabase.rpc('get_recent_activity', { p_user_id: userId, p_limit: RECENT_ACTIVITY_LIMIT }).then(res => res)

    try {
      try {
        // Single RPC replaces 16+ individual Supabase queries
        const { data, error: rpcError } = await overviewRequest
        if (rpcError) throw rpcError
        if (!isCurrentRequest()) return

        if (!data || typeof data !== 'object') {
          throw new Error('Dashboard overview RPC returned an unexpected response')
        }

        const result = data as {
          stats?: DashboardStats
          alerts?: AttentionAlerts
          apiaries?: DashboardApiary[]
          firstName?: unknown
        }

        freshArrived = true
        setStaleSince(null)
        if (result.stats) setStats(result.stats)
        if (result.alerts) setAlerts(result.alerts)
        const freshApiaries = Array.isArray(result.apiaries) ? result.apiaries : []
        const freshFirstName = typeof result.firstName === 'string' && result.firstName.trim() ? result.firstName.trim() : null
        setApiaries(freshApiaries)
        setFirstName(freshFirstName)
        if (result.stats && result.alerts) {
          freshOverview = { stats: result.stats, alerts: result.alerts, apiaries: freshApiaries, firstName: freshFirstName }
        }

        // Overview + alerts are ready — unblock the page render immediately
        if (isCurrentRequest()) {
          setLoading(false)
        }
      } catch (err) {
        console.error('Error fetching dashboard overview data:', err)
        // A failed load keeps the last overview, and says so, rather than showing zeros.
        freshArrived = true
        const entry = await cache.read()
        if (entry && isCurrentRequest()) {
          showSnapshot(entry.data)
          setStaleSince(entry.savedAt)
          setLoading(false)
          return
        }
        if (isCurrentRequest()) {
          setStats({ apiaries: 0, hives: 0, recentInspections: 0, queens: 0, activeTasks: 0 })
          setAlerts({ overdueInspections: 0, oldQueens: 0, highVarroa: 0, todayTasks: 0 })
          setApiaries([])
          setError('Some dashboard sections could not be loaded. You can still use the links below and retry the dashboard data.')
          setLoading(false)
        }
      }

      try {
        const { data: activityRows, error: activityError } = await activityRequest

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
        if (freshOverview) cache.save({ ...freshOverview, recentActivity: mapped })
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
    firstName,
    recentActivity,
    loading,
    error,
    recentActivityError,
    staleSince,
    fetchDashboardData,
  }
}
