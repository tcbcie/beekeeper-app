'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getCurrentUserId } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { DashboardApiary } from '@/types/dashboard'

export interface ApiaryTask {
  id: string
  title: string
  /** The due date, YYYY-MM-DD */
  start_date: string
  hive_id: string | null
  /** Set on a treatment's removal task, which is closed by recording the removal */
  treatment_id: string | null
}

export interface ApiaryJobsData {
  /** This apiary in the dashboard overview; null for an apiary shared by someone else */
  overview: DashboardApiary | null
  /** Open tasks, soonest first; rearing-batch milestones left out, as on the dashboard */
  tasks: ApiaryTask[]
  loading: boolean
  /** Something did not load, so an empty list here does not mean nothing is due */
  failed: boolean
  removeTask: (taskId: string) => void
}

export function useApiaryJobs(apiaryId: string): ApiaryJobsData {
  const [overview, setOverview] = useState<DashboardApiary | null>(null)
  const [tasks, setTasks] = useState<ApiaryTask[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  // Only the latest load may update state, and unmounting retires them all
  const loadSeqRef = useRef(0)

  useEffect(() => {
    const seq = ++loadSeqRef.current
    const isCurrent = () => seq === loadSeqRef.current
    setLoading(true)
    setFailed(false)
    ;(async () => {
      const userId = await getCurrentUserId()
      if (!userId) throw new Error('Not signed in')
      const [tasksRes, overviewRes] = await Promise.all([
        supabase
          .from('tasks_events')
          .select('id, title, start_date, hive_id, treatment_id')
          .eq('apiary_id', apiaryId)
          .eq('completed', false)
          .is('batch_id', null)
          .order('start_date')
          .order('title'),
        supabase.rpc('get_dashboard_overview', { p_user_id: userId }),
      ])
      if (!isCurrent()) return
      setTasks(tasksRes.error ? [] : (tasksRes.data ?? []) as ApiaryTask[])
      const apiaries = (overviewRes.data as { apiaries?: DashboardApiary[] } | null)?.apiaries
      setOverview(Array.isArray(apiaries) ? apiaries.find(a => a.id === apiaryId) ?? null : null)
      setFailed(Boolean(tasksRes.error || overviewRes.error))
    })()
      .catch(() => { if (isCurrent()) setFailed(true) })
      .finally(() => { if (isCurrent()) setLoading(false) })
    const seqRef = loadSeqRef
    return () => { seqRef.current += 1 }
  }, [apiaryId])

  const removeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }, [])

  return { overview, tasks, loading, failed, removeTask }
}
