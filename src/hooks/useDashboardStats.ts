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

interface DashboardInspectionSummaryRow {
  hive_id: string | null
  inspection_date: string
  queen_seen: boolean | null
  eggs_present: boolean | null
  brood_frames: number | null
}

interface DashboardHiveHealthSummary {
  lastQueenrightDate: string | null
  broodAbsentSinceDate: string | null
  broodInferenceClosed: boolean
}

const QUEEN_STATUS_WARNING_DAYS = 21

function getLocalDateDaysAgo(days: number): string {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return toLocalDateString(date)
}

function hasQueenrightSignal(inspection: DashboardInspectionSummaryRow): boolean {
  return inspection.queen_seen === true || inspection.eggs_present === true
}

function hasBroodSignal(inspection: DashboardInspectionSummaryRow): boolean {
  return inspection.eggs_present === true || (inspection.brood_frames ?? 0) > 0
}

function hasExplicitBroodAbsence(inspection: DashboardInspectionSummaryRow): boolean {
  return inspection.brood_frames === 0
}

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
        // Fetch the dashboard overview data first so the page can still render even if later sections fail.
        const fourteenDaysAgo = toLocalDateString(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
        const twoYearsAgo = toLocalDateString(new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000))
        const queenStatusCutoff = getLocalDateDaysAgo(QUEEN_STATUS_WARNING_DAYS)

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

        const overviewError = apiariesRes.error
          ?? apiaryListRes.error
          ?? hivesRes.error
          ?? inspectionsRes.error
          ?? queensRes.error
          ?? tasksRes.error
          ?? apiaryTasksRes.error
        if (overviewError) throw overviewError

        if (!isCurrentRequest()) return

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
          lastQueenrightDate: null,
          queenIssueHiveCount: 0,
          queenrightAtRiskHiveCount: 0,
          broodAtRiskHiveCount: 0,
          scales: [],
          activeTaskCount: taskCountMap[apiary.id] || 0,
        }))

        if (apiaryIds.length > 0) {
          const { data: hivesData, error: hivesDataError } = await supabase
            .from('hives')
            .select('id, apiary_id, beep_device_id, wolf_scale_id')
            .eq('user_id', userId)
            .is('archived_at', null)
            .in('apiary_id', apiaryIds)
          if (hivesDataError) throw hivesDataError

          const hiveIds = (hivesData || []).map(hive => hive.id)
          const hiveCountMap: Record<string, number> = {}
          const scaleMap: Record<string, DashboardApiary['scales']> = {}
          const hiveApiaryMap: Record<string, string> = {}
          const hiveHealthMap: Record<string, DashboardHiveHealthSummary> = {}
          const lastInspectionMap: Record<string, string> = {}
          const lastQueenrightMap: Record<string, string> = {}
          const queenIssueHiveCountMap: Record<string, number> = {}
          const queenrightAtRiskHiveCountMap: Record<string, number> = {}
          const broodAtRiskHiveCountMap: Record<string, number> = {}

          for (const hive of (hivesData || [])) {
            const apiaryId = hive.apiary_id as string
            hiveApiaryMap[hive.id] = apiaryId
            hiveHealthMap[hive.id] = {
              lastQueenrightDate: null,
              broodAbsentSinceDate: null,
              broodInferenceClosed: false,
            }
            hiveCountMap[apiaryId] = (hiveCountMap[apiaryId] || 0) + 1
            if (!scaleMap[apiaryId]) scaleMap[apiaryId] = []
            if (hive.beep_device_id) scaleMap[apiaryId].push({ hiveId: hive.id, type: 'beep', deviceId: hive.beep_device_id })
            if (hive.wolf_scale_id) scaleMap[apiaryId].push({ hiveId: hive.id, type: 'wolf', deviceId: hive.wolf_scale_id })
          }

          if (hiveIds.length > 0) {
            const { data: inspectionsData, error: inspectionsDataError } = await supabase
              .from('inspections')
              .select('hive_id, inspection_date, queen_seen, eggs_present, brood_frames')
              .in('hive_id', hiveIds)
              .order('inspection_date', { ascending: false })
            if (inspectionsDataError) throw inspectionsDataError

            for (const inspection of (inspectionsData || []) as DashboardInspectionSummaryRow[]) {
              const hiveId = inspection.hive_id
              const inspectionDate = inspection.inspection_date

              if (!hiveId || !inspectionDate) continue

              const apiaryId = hiveApiaryMap[hiveId]
              const hiveHealth = hiveHealthMap[hiveId]
              if (!apiaryId || !hiveHealth) continue

              if (!lastInspectionMap[apiaryId] || inspectionDate > lastInspectionMap[apiaryId]) {
                lastInspectionMap[apiaryId] = inspectionDate
              }

              const queenrightSeen = hasQueenrightSignal(inspection)
              const broodSeen = hasBroodSignal(inspection)
              const broodExplicitlyAbsent = hasExplicitBroodAbsence(inspection)

              if (queenrightSeen && !hiveHealth.lastQueenrightDate) {
                hiveHealth.lastQueenrightDate = inspectionDate
              }

              if (queenrightSeen && (!lastQueenrightMap[apiaryId] || inspectionDate > lastQueenrightMap[apiaryId])) {
                lastQueenrightMap[apiaryId] = inspectionDate
              }

              // Treat null brood fields as unknown. Only an explicit 0 brood frame reading
              // should start a broodless run that can age into a warning.
              if (!hiveHealth.broodInferenceClosed) {
                if (broodSeen) {
                  hiveHealth.broodInferenceClosed = true
                } else if (broodExplicitlyAbsent) {
                  hiveHealth.broodAbsentSinceDate = inspectionDate
                } else {
                  hiveHealth.broodInferenceClosed = true
                }
              }
            }
          }

          for (const hiveId of hiveIds) {
            const apiaryId = hiveApiaryMap[hiveId]
            const hiveHealth = hiveHealthMap[hiveId]
            if (!apiaryId || !hiveHealth) continue

            const queenrightAtRisk = !hiveHealth.lastQueenrightDate || hiveHealth.lastQueenrightDate < queenStatusCutoff
            const broodAtRisk = Boolean(
              hiveHealth.broodAbsentSinceDate
              && hiveHealth.broodAbsentSinceDate < queenStatusCutoff
            )

            if (queenrightAtRisk) {
              queenrightAtRiskHiveCountMap[apiaryId] = (queenrightAtRiskHiveCountMap[apiaryId] || 0) + 1
            }
            if (broodAtRisk) {
              broodAtRiskHiveCountMap[apiaryId] = (broodAtRiskHiveCountMap[apiaryId] || 0) + 1
            }
            if (queenrightAtRisk || broodAtRisk) {
              queenIssueHiveCountMap[apiaryId] = (queenIssueHiveCountMap[apiaryId] || 0) + 1
            }
          }

          enrichedApiaries = rawApiaries.map(apiary => ({
            ...apiary,
            hiveCount: hiveCountMap[apiary.id] || 0,
            lastInspectionDate: lastInspectionMap[apiary.id] || null,
            lastQueenrightDate: lastQueenrightMap[apiary.id] || null,
            queenIssueHiveCount: queenIssueHiveCountMap[apiary.id] || 0,
            queenrightAtRiskHiveCount: queenrightAtRiskHiveCountMap[apiary.id] || 0,
            broodAtRiskHiveCount: broodAtRiskHiveCountMap[apiary.id] || 0,
            scales: scaleMap[apiary.id] || [],
            activeTaskCount: taskCountMap[apiary.id] || 0,
          }))
        }

        if (!isCurrentRequest()) return

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

        const alertsError = oldQueensRes.error
          ?? highVarroaRes.error
          ?? activeHivesRes.error
          ?? todayTasksRes.error
        if (alertsError) throw alertsError

        const highVarroaHiveIds = new Set((highVarroaRes.data || []).map(check => check.hive_id))

        let overdueCount = 0
        const activeHives = activeHivesRes.data
        if (activeHives && activeHives.length > 0) {
          const activeHiveIds = activeHives.map(hive => hive.id)
          const { data: recentInspections, error: recentInspectionsError } = await supabase
            .from('inspections')
            .select('hive_id')
            .in('hive_id', activeHiveIds)
            .gte('inspection_date', fourteenDaysAgo)
          if (recentInspectionsError) throw recentInspectionsError

          const inspectedHiveIds = new Set((recentInspections || []).map(inspection => inspection.hive_id))
          overdueCount = activeHiveIds.filter(id => !inspectedHiveIds.has(id)).length
        }

        // Single checkpoint: set all overview state atomically
        if (!isCurrentRequest()) return

        setApiaries(enrichedApiaries)
        setStats({
          apiaries: apiariesRes.count || 0,
          hives: hivesRes.count || 0,
          recentInspections: inspectionsRes.count || 0,
          queens: queensRes.count || 0,
          activeTasks: tasksRes.count || 0,
        })
        setAlerts({
          overdueInspections: overdueCount,
          oldQueens: oldQueensRes.count || 0,
          highVarroa: highVarroaHiveIds.size,
          todayTasks: todayTasksRes.count || 0,
        })
      } catch (err) {
        console.error('Error fetching dashboard overview data:', err)
        if (isCurrentRequest()) {
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

        const recentActivityFetchError = activityInspections.error
          ?? activityTreatments.error
          ?? activityChecks.error
          ?? activityFeedings.error
          ?? activityHarvests.error
        if (recentActivityFetchError) throw recentActivityFetchError

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

        if (!isCurrentRequest()) return

        setRecentActivity(merged.slice(0, 5))
      } catch (err) {
        console.error('Error fetching recent activity:', err)
        if (isCurrentRequest()) {
          setRecentActivity([])
          setRecentActivityError('Recent activity could not be loaded. Please try again.')
        }
      }
    } finally {
      if (isCurrentRequest()) {
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
