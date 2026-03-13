import { useState, useCallback, useRef, useEffect } from 'react'

import { toLocalDateString } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase'
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

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchDashboardData = useCallback(async (userId: string) => {
    if (!userId) return

    setError(null)
    setRecentActivityError(null)
    setLoading(true)

    try {
      try {
        // Fetch the dashboard overview data first so the page can still render even if later sections fail.
        const fourteenDaysAgo = toLocalDateString(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
        const twoYearsAgo = toLocalDateString(new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000))

        const [apiariesRes, apiaryListRes, hivesRes, inspectionsRes, queensRes, tasksRes, apiaryTasksRes] = await Promise.all([
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
          supabase.from('tasks_events').select('apiary_id').eq('user_id', userId).eq('completed', false).not('apiary_id', 'is', null),
        ])

        if (!mountedRef.current) return

        const rawApiaries = (apiaryListRes.data || []) as {
          id: string
          name: string
          location: string | null
          city: string | null
          latitude: number | null
          longitude: number | null
        }[]
        const apiaryIds = rawApiaries.map(apiary => apiary.id)

        const taskCountMap: Record<string, number> = {}
        for (const task of (apiaryTasksRes.data || [])) {
          if (task.apiary_id) {
            taskCountMap[task.apiary_id] = (taskCountMap[task.apiary_id] || 0) + 1
          }
        }

        let enrichedApiaries: DashboardApiary[] = rawApiaries.map(apiary => ({
          ...apiary,
          hiveCount: 0,
          lastInspectionDate: null,
          scales: [],
          activeTaskCount: taskCountMap[apiary.id] || 0,
        }))

        if (apiaryIds.length > 0) {
          const { data: hivesData } = await supabase
            .from('hives')
            .select('id, apiary_id, beep_device_id, wolf_scale_id')
            .eq('user_id', userId)
            .is('archived_at', null)
            .in('apiary_id', apiaryIds)

          const hiveIds = (hivesData || []).map(hive => hive.id)
          const inspectionMap: Record<string, string> = {}

          if (hiveIds.length > 0) {
            const { data: inspectionsData } = await supabase
              .from('inspections')
              .select('hive_id, inspection_date')
              .in('hive_id', hiveIds)
              .order('inspection_date', { ascending: false })

            for (const inspection of (inspectionsData || [])) {
              if (!inspectionMap[inspection.hive_id]) {
                inspectionMap[inspection.hive_id] = inspection.inspection_date
              }
            }
          }

          const hiveCountMap: Record<string, number> = {}
          const scaleMap: Record<string, DashboardApiary['scales']> = {}
          const lastInspectionMap: Record<string, string> = {}

          for (const hive of (hivesData || [])) {
            const apiaryId = hive.apiary_id as string
            hiveCountMap[apiaryId] = (hiveCountMap[apiaryId] || 0) + 1
            if (!scaleMap[apiaryId]) scaleMap[apiaryId] = []
            if (hive.beep_device_id) scaleMap[apiaryId].push({ hiveId: hive.id, type: 'beep', deviceId: hive.beep_device_id })
            if (hive.wolf_scale_id) scaleMap[apiaryId].push({ hiveId: hive.id, type: 'wolf', deviceId: hive.wolf_scale_id })

            const inspectionDate = inspectionMap[hive.id]
            if (inspectionDate && (!lastInspectionMap[apiaryId] || inspectionDate > lastInspectionMap[apiaryId])) {
              lastInspectionMap[apiaryId] = inspectionDate
            }
          }

          enrichedApiaries = rawApiaries.map(apiary => ({
            ...apiary,
            hiveCount: hiveCountMap[apiary.id] || 0,
            lastInspectionDate: lastInspectionMap[apiary.id] || null,
            scales: scaleMap[apiary.id] || [],
            activeTaskCount: taskCountMap[apiary.id] || 0,
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

        const todayString = toLocalDateString(new Date())
        const [oldQueensRes, highVarroaRes, activeHivesRes, todayTasksRes] = await Promise.all([
          supabase.from('queens').select('id', { count: 'exact', head: true })
            .eq('user_id', userId).eq('status', 'active').lt('birth_date', twoYearsAgo),
          supabase.from('varroa_checks').select('hive_id')
            .eq('user_id', userId).gt('infestation_rate', 3)
            .gte('check_date', toLocalDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
          supabase.from('hives').select('id')
            .eq('user_id', userId).is('archived_at', null),
          supabase.from('tasks_events').select('id', { count: 'exact', head: true })
            .eq('user_id', userId).eq('completed', false).eq('start_date', todayString),
        ])

        const highVarroaHiveIds = new Set((highVarroaRes.data || []).map(check => check.hive_id))

        let overdueCount = 0
        const activeHives = activeHivesRes.data
        if (activeHives && activeHives.length > 0) {
          const activeHiveIds = activeHives.map(hive => hive.id)
          const { data: recentInspections } = await supabase
            .from('inspections')
            .select('hive_id')
            .in('hive_id', activeHiveIds)
            .gte('inspection_date', fourteenDaysAgo)

          const inspectedHiveIds = new Set((recentInspections || []).map(inspection => inspection.hive_id))
          overdueCount = activeHiveIds.filter(id => !inspectedHiveIds.has(id)).length
        }

        if (!mountedRef.current) return

        setAlerts({
          overdueInspections: overdueCount,
          oldQueens: oldQueensRes.count || 0,
          highVarroa: highVarroaHiveIds.size,
          todayTasks: todayTasksRes.count || 0,
        })
      } catch (err) {
        console.error('Error fetching dashboard overview data:', err)
        if (mountedRef.current) {
          setError('Some dashboard sections could not be loaded. You can still use the links below and retry the dashboard data.')
        }
      }

      try {
        const [activityInspections, activityTreatments, activityChecks, activityFeedings, activityHarvests] = await Promise.all([
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

        const merged: RecentActivityRecord[] = [
          ...((activityInspections.data || []).filter(Boolean) as Inspection[]).map(inspection => ({
            ...inspection,
            record_type: 'inspection' as const,
            date: inspection.inspection_date,
          })),
          ...((activityTreatments.data || []).filter(Boolean) as VarroaTreatment[]).map(treatment => ({
            ...treatment,
            record_type: 'varroa_treatment' as const,
            date: treatment.treatment_date,
          })),
          ...((activityChecks.data || []).filter(Boolean) as VarroaCheck[]).map(check => ({
            ...check,
            record_type: 'varroa_check' as const,
            date: check.check_date,
          })),
          ...((activityFeedings.data || []).filter(Boolean) as Feeding[]).map(feeding => ({
            ...feeding,
            record_type: 'feeding' as const,
            date: feeding.feed_date,
          })),
          ...((activityHarvests.data || []).filter(Boolean) as Harvest[]).map(harvest => ({
            ...harvest,
            record_type: 'harvest' as const,
            date: harvest.harvest_date,
          })),
        ]

        merged.sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          if (isNaN(dateA) && isNaN(dateB)) return 0
          if (isNaN(dateA)) return 1
          if (isNaN(dateB)) return -1
          return dateB - dateA
        })

        if (!mountedRef.current) return

        setRecentActivity(merged.slice(0, 5))
      } catch (err) {
        console.error('Error fetching recent activity:', err)
        if (mountedRef.current) {
          setRecentActivity([])
          setRecentActivityError('Recent activity could not be loaded. Please try again.')
        }
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
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
