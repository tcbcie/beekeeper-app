import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/** Returns YYYY-MM-DD in the user's local timezone (avoids UTC date shift near midnight). */
function toLocalDateString(date: Date): string {
  return date.toLocaleDateString('en-CA') // en-CA locale returns YYYY-MM-DD
}
import type {
  DashboardStats,
  DashboardApiary,
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
  apiaries: DashboardApiary[]
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
    todayTasks: 0,
  })
  const [apiaries, setApiaries] = useState<DashboardApiary[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchDashboardData = useCallback(async (userId: string) => {
    if (!userId) return

    setError(null)
    setLoading(true)

    try {
      // Fetch all stats in parallel
      const fourteenDaysAgo = toLocalDateString(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
      const twoYearsAgo = toLocalDateString(new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000))

      const [apiariesRes, apiaryListRes, hivesRes, inspectionsRes, queensRes, tasksRes] = await Promise.all([
        supabase.from('apiaries').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('apiaries').select('id, name, location, city, latitude, longitude').eq('user_id', userId).order('name'),
        supabase.from('hives').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase
          .from('inspections')
          .select('id', { count: 'exact', head: true })
          .gte('inspection_date', toLocalDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
          .eq('user_id', userId),
        supabase.from('queens').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
        supabase.from('tasks_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', false),
      ])

      if (!mountedRef.current) return

      // Enrich apiaries with hive counts, last inspection, and scale info
      const rawApiaries = (apiaryListRes.data || []) as { id: string; name: string; location: string | null; city: string | null; latitude: number | null; longitude: number | null }[]
      const apiaryIds = rawApiaries.map(a => a.id)

      let enrichedApiaries: DashboardApiary[] = rawApiaries.map(a => ({
        ...a, hiveCount: 0, lastInspectionDate: null, scales: [],
      }))

      if (apiaryIds.length > 0) {
        // Fetch active hives with scale info per apiary
        const { data: hivesData } = await supabase
          .from('hives')
          .select('id, apiary_id, beep_device_id, wolf_scale_id')
          .eq('user_id', userId)
          .is('archived_at', null)
          .in('apiary_id', apiaryIds)

        // Fetch latest inspection per hive
        const hiveIds = (hivesData || []).map(h => h.id)
        let inspectionMap: Record<string, string> = {}
        if (hiveIds.length > 0) {
          const { data: inspData } = await supabase
            .from('inspections')
            .select('hive_id, inspection_date')
            .in('hive_id', hiveIds)
            .order('inspection_date', { ascending: false })
          for (const ins of (inspData || [])) {
            if (!inspectionMap[ins.hive_id]) {
              inspectionMap[ins.hive_id] = ins.inspection_date
            }
          }
        }

        // Build per-apiary maps
        const hiveCountMap: Record<string, number> = {}
        const scaleMap: Record<string, DashboardApiary['scales']> = {}
        const lastInspMap: Record<string, string> = {}

        for (const h of (hivesData || [])) {
          const aid = h.apiary_id as string
          hiveCountMap[aid] = (hiveCountMap[aid] || 0) + 1
          if (!scaleMap[aid]) scaleMap[aid] = []
          if (h.beep_device_id) scaleMap[aid].push({ hiveId: h.id, type: 'beep', deviceId: h.beep_device_id })
          if (h.wolf_scale_id) scaleMap[aid].push({ hiveId: h.id, type: 'wolf', deviceId: h.wolf_scale_id })
          const insDate = inspectionMap[h.id]
          if (insDate && (!lastInspMap[aid] || insDate > lastInspMap[aid])) {
            lastInspMap[aid] = insDate
          }
        }

        enrichedApiaries = rawApiaries.map(a => ({
          ...a,
          hiveCount: hiveCountMap[a.id] || 0,
          lastInspectionDate: lastInspMap[a.id] || null,
          scales: scaleMap[a.id] || [],
        }))
      }

      if (!mountedRef.current) return
      setApiaries(enrichedApiaries)
      setStats({
        apiaries: apiariesRes.count || 0,
        hives: hivesRes.count || 0,
        recentInspections: inspectionsRes.count || 0,
        queens: queensRes.count || 0,
        activeTasks: tasksRes.count || 0,
      })

      // Fetch attention alerts and overdue hives in parallel
      const todayStr = toLocalDateString(new Date())
      const [oldQueensRes, highVarroaRes, activeHivesRes, todayTasksRes] = await Promise.all([
        // Active queens older than 2 years
        supabase.from('queens').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).eq('status', 'active').lt('birth_date', twoYearsAgo),
        // Varroa checks > 3% infestation in last 30 days — fetch hive_ids for dedup
        supabase.from('varroa_checks').select('hive_id')
          .eq('user_id', userId).gt('infestation_rate', 3)
          .gte('check_date', toLocalDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
        // Active hives for overdue inspection calculation
        supabase.from('hives').select('id')
          .eq('user_id', userId).is('archived_at', null),
        // Tasks due today
        supabase.from('tasks_events').select('id', { count: 'exact', head: true })
          .eq('user_id', userId).eq('completed', false).eq('start_date', todayStr),
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

      if (!mountedRef.current) return
      setAlerts({
        overdueInspections: overdueCount,
        oldQueens: oldQueensRes.count || 0,
        highVarroa: highVarroaHiveIds.size,
        todayTasks: todayTasksRes.count || 0,
      })

      // Fetch recent activity from all record types
      const [activityInspections, activityTreatments, activityChecks, activityFeedings, activityHarvests] =
        await Promise.all([
          supabase
            .from('inspections')
            .select('*, hives(hive_number, apiaries(name))')
            .eq('user_id', userId)
            .order('inspection_date', { ascending: false })
            .limit(10),
          supabase
            .from('varroa_treatments')
            .select('*, hives(hive_number, apiaries(name))')
            .eq('user_id', userId)
            .order('treatment_date', { ascending: false })
            .limit(10),
          supabase
            .from('varroa_checks')
            .select('*, hives(hive_number, apiaries(name))')
            .eq('user_id', userId)
            .order('check_date', { ascending: false })
            .limit(10),
          supabase
            .from('feedings')
            .select('*, hives(hive_number, apiaries(name))')
            .eq('user_id', userId)
            .order('feed_date', { ascending: false })
            .limit(10),
          supabase
            .from('harvests')
            .select('*, hives(hive_number, apiaries(name))')
            .eq('user_id', userId)
            .order('harvest_date', { ascending: false })
            .limit(10),
        ])

      // Merge all records with their types
      const merged: RecentActivityRecord[] = [
        ...((activityInspections.data || []).filter(Boolean) as Inspection[]).map((i) => ({
          ...i,
          record_type: 'inspection' as const,
          date: i.inspection_date,
        })),
        ...((activityTreatments.data || []).filter(Boolean) as VarroaTreatment[]).map((vt) => ({
          ...vt,
          record_type: 'varroa_treatment' as const,
          date: vt.treatment_date,
        })),
        ...((activityChecks.data || []).filter(Boolean) as VarroaCheck[]).map((vc) => ({
          ...vc,
          record_type: 'varroa_check' as const,
          date: vc.check_date,
        })),
        ...((activityFeedings.data || []).filter(Boolean) as Feeding[]).map((f) => ({
          ...f,
          record_type: 'feeding' as const,
          date: f.feed_date,
        })),
        ...((activityHarvests.data || []).filter(Boolean) as Harvest[]).map((h) => ({
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
      if (!mountedRef.current) return
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
    apiaries,
    alerts,
    recentActivity,
    loading,
    error,
    fetchDashboardData,
  }
}
