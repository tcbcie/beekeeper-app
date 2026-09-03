import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { buildUnarchiveHivePrompt } from '@/lib/record-delete-prompts'
import type {
  Hive,
  HiveInspection,
  HiveVarroaCheck,
  HiveVarroaTreatment,
  HiveFeeding,
  HiveHarvest,
  HiveTask,
  InspectionAverages,
} from '@/types/hive'

interface UseHiveDetailReturn {
  hive: Hive | null
  inspections: HiveInspection[]
  varroaChecks: HiveVarroaCheck[]
  varroaTreatments: HiveVarroaTreatment[]
  feedings: HiveFeeding[]
  harvests: HiveHarvest[]
  tasks: HiveTask[]
  averages: InspectionAverages | null
  loading: boolean
  isOwner: boolean
  fetchHiveData: (currentUserId: string) => Promise<void>
  handleCompleteTask: (taskId: string) => Promise<void>
  handleUnarchive: () => Promise<void>
}

export function useHiveDetail(hiveId: string): UseHiveDetailReturn {
  const toast = useToast()
  const confirm = useConfirm()
  const [hive, setHive] = useState<Hive | null>(null)
  const [inspections, setInspections] = useState<HiveInspection[]>([])
  const [varroaChecks, setVarroaChecks] = useState<HiveVarroaCheck[]>([])
  const [varroaTreatments, setVarroaTreatments] = useState<HiveVarroaTreatment[]>([])
  const [feedings, setFeedings] = useState<HiveFeeding[]>([])
  const [harvests, setHarvests] = useState<HiveHarvest[]>([])
  const [tasks, setTasks] = useState<HiveTask[]>([])
  const [averages, setAverages] = useState<InspectionAverages | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  const fetchHiveData = useCallback(async (currentUserId: string) => {
    setLoading(true)
    try {
      // Fetch hive details with queen join
      const { data: hiveData, error: hiveError } = await supabase
        .from('hives')
        .select(`
          *,
          apiaries(name),
          archive_reason_value:dropdown_values!archive_reason_id(value),
          queens(id, queen_number, marking_color, status, source, subspecies, birth_date, queen_clipped, performance_notes)
        `)
        .eq('id', hiveId)
        .single()

      if (hiveError) throw hiveError

      // Check if this hive's apiary is shared with teams
      if (hiveData.apiary_id) {
        const { data: teamApiaries } = await supabase
          .from('team_apiaries')
          .select(`
            team_id,
            teams!inner(name)
          `)
          .eq('apiary_id', hiveData.apiary_id)

        if (teamApiaries && teamApiaries.length > 0) {
          const isShared = hiveData.user_id !== currentUserId
          hiveData.is_shared = isShared

          if (teamApiaries[0].teams) {
            const raw = teamApiaries[0].teams as unknown
            const teamName = Array.isArray(raw)
              ? (raw as { name: string }[])[0]?.name
              : (raw as { name: string }).name
            if (teamName) {
              if (isShared) {
                hiveData.team_name = teamName
              } else {
                hiveData.shared_with_team = teamName
              }
            }
          }
        }
      }

      setHive(hiveData)
      setIsOwner(hiveData.user_id === currentUserId)

      // Fetch all records for this hive
      const [
        { data: inspectionsData },
        { data: varroaChecksData },
        { data: varroaTreatmentsData },
        { data: feedingsData },
        { data: harvestsData },
        { data: tasksData }
      ] = await Promise.all([
        supabase
          .from('inspections')
          .select('*')
          .eq('hive_id', hiveId)
          .order('inspection_date', { ascending: false }),
        supabase
          .from('varroa_checks')
          .select('*')
          .eq('hive_id', hiveId)
          .order('check_date', { ascending: false }),
        supabase
          .from('varroa_treatments')
          .select('*')
          .eq('hive_id', hiveId)
          .order('treatment_date', { ascending: false }),
        supabase
          .from('feedings')
          .select('*')
          .eq('hive_id', hiveId)
          .order('feed_date', { ascending: false }),
        supabase
          .from('harvests')
          .select('*')
          .eq('hive_id', hiveId)
          .order('harvest_date', { ascending: false }),
        supabase
          .from('tasks_events')
          .select('*')
          .eq('hive_id', hiveId)
          .eq('completed', false)
          .order('start_date', { ascending: true })
      ])

      setInspections(inspectionsData || [])
      setVarroaChecks(varroaChecksData || [])
      setVarroaTreatments(varroaTreatmentsData || [])
      setFeedings(feedingsData || [])
      setHarvests(harvestsData || [])
      setTasks(tasksData || [])

      // Calculate queen last seen and eggs last present
      if (inspectionsData && inspectionsData.length > 0) {
        const queenSeenInspection = inspectionsData.find(i => i.queen_seen === true)
        const eggsSeenInspection = inspectionsData.find(i => i.eggs_present === true)

        hiveData.queen_last_seen = queenSeenInspection?.inspection_date || null
        hiveData.eggs_last_present = eggsSeenInspection?.inspection_date || null
        setHive(hiveData)
      }

      // Calculate inspection averages in a single pass
      if (inspectionsData && inspectionsData.length > 0) {
        const sums = { brood: 0, rightSized: 0, pattern: 0, temper: 0, pop: 0 }
        const counts = { brood: 0, rightSized: 0, pattern: 0, temper: 0, pop: 0 }
        const inspectionsWithData = new Set<string>()

        for (const i of inspectionsData) {
          let hasData = false
          if (i.brood_frames != null && i.brood_frames > 0) { sums.brood += i.brood_frames; counts.brood++; hasData = true }
          if (i.right_sized_frames != null && i.right_sized_frames > 0) { sums.rightSized += i.right_sized_frames; counts.rightSized++; hasData = true }
          if (i.brood_pattern_rating != null && i.brood_pattern_rating > 0) { sums.pattern += i.brood_pattern_rating; counts.pattern++; hasData = true }
          if (i.temperament_rating != null && i.temperament_rating > 0) { sums.temper += i.temperament_rating; counts.temper++; hasData = true }
          if (i.population_strength != null && i.population_strength > 0) { sums.pop += i.population_strength; counts.pop++; hasData = true }
          if (hasData) inspectionsWithData.add(i.id)
        }

        const avg = (sum: number, count: number) => count > 0 ? sum / count : null
        setAverages({
          brood_frames: avg(sums.brood, counts.brood),
          right_sized_frames: avg(sums.rightSized, counts.rightSized),
          brood_pattern: avg(sums.pattern, counts.pattern),
          temperament: avg(sums.temper, counts.temper),
          population: avg(sums.pop, counts.pop),
          inspection_count: inspectionsWithData.size,
        })
      } else {
        setAverages(null)
      }
    } catch (error) {
      console.error('Error fetching hive data:', error)
      toast.error('Failed to load hive data')
    } finally {
      setLoading(false)
    }
  }, [hiveId, toast])

  const completingTaskIds = useRef(new Set<string>())

  const handleCompleteTask = useCallback(async (taskId: string) => {
    if (completingTaskIds.current.has(taskId)) return
    completingTaskIds.current.add(taskId)
    try {
      const { error } = await supabase
        .from('tasks_events')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) {
        console.error('Error completing task:', error)
        toast.error('Failed to complete task: ' + error.message)
      } else {
        setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId))
      }
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Failed to complete task')
    } finally {
      completingTaskIds.current.delete(taskId)
    }
  }, [toast])

  const handleUnarchive = useCallback(async () => {
    if (!hive) return

    // Same wording as the hives list, so unarchiving asks one question
    // regardless of which screen it is started from.
    if (!(await confirm(buildUnarchiveHivePrompt(hive.hive_number)))) return

    try {
      const userId = await getCurrentUserId()
      if (!userId) {
        toast.error('You must be logged in to unarchive a hive')
        return
      }

      const { error } = await supabase
        .from('hives')
        .update({
          archived_at: null,
          archive_reason_id: null,
          archive_notes: null,
          status: 'active'
        })
        .eq('id', hive.id)
        .eq('user_id', userId)

      if (error) {
        console.error('Error unarchiving hive:', error)
        toast.error('Failed to unarchive hive: ' + error.message)
      } else {
        toast.success(`Hive ${hive.hive_number} has been successfully unarchived!`)
        fetchHiveData(userId)
      }
    } catch (error) {
      console.error('Error unarchiving hive:', error)
      toast.error('Failed to unarchive hive')
    }
  }, [hive, toast, fetchHiveData, confirm])

  return {
    hive,
    inspections,
    varroaChecks,
    varroaTreatments,
    feedings,
    harvests,
    tasks,
    averages,
    loading,
    isOwner,
    fetchHiveData,
    handleCompleteTask,
    handleUnarchive,
  }
}
