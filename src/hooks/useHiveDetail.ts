import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
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
      // Fetch hive details
      const { data: hiveData, error: hiveError } = await supabase
        .from('hives')
        .select(`
          *,
          apiaries(name),
          archive_reason_value:dropdown_values!archive_reason_id(value)
        `)
        .eq('id', hiveId)
        .single()

      if (hiveError) throw hiveError

      // Fetch queen separately if needed
      if (hiveData.queen_id) {
        const { data: queenData } = await supabase
          .from('queens')
          .select('id, queen_number, marking_color, status, source, subspecies, birth_date, queen_clipped, performance_notes')
          .eq('id', hiveData.queen_id)
          .single()

        if (queenData) {
          hiveData.queens = queenData
        }
      }

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

          if (!isShared && teamApiaries[0].teams) {
            const teamData = teamApiaries[0].teams as unknown as { name: string }
            hiveData.shared_with_team = teamData.name
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

      // Calculate inspection averages
      if (inspectionsData && inspectionsData.length > 0) {
        const broodFrames = inspectionsData.filter(i => i.brood_frames !== null && i.brood_frames > 0).map(i => i.brood_frames!)
        const rightSizedFrames = inspectionsData.filter(i => i.right_sized_frames !== null && i.right_sized_frames > 0).map(i => i.right_sized_frames!)
        const broodPatterns = inspectionsData.filter(i => i.brood_pattern_rating !== null && i.brood_pattern_rating > 0).map(i => i.brood_pattern_rating!)
        const temperaments = inspectionsData.filter(i => i.temperament_rating !== null && i.temperament_rating > 0).map(i => i.temperament_rating!)
        const populations = inspectionsData.filter(i => i.population_strength !== null && i.population_strength > 0).map(i => i.population_strength!)

        const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null

        const inspectionsWithData = new Set<string>()
        inspectionsData.forEach(inspection => {
          if ((inspection.brood_frames !== null && inspection.brood_frames > 0) ||
              (inspection.right_sized_frames !== null && inspection.right_sized_frames > 0) ||
              (inspection.brood_pattern_rating !== null && inspection.brood_pattern_rating > 0) ||
              (inspection.temperament_rating !== null && inspection.temperament_rating > 0) ||
              (inspection.population_strength !== null && inspection.population_strength > 0)) {
            inspectionsWithData.add(inspection.id)
          }
        })

        setAverages({
          brood_frames: avg(broodFrames),
          right_sized_frames: avg(rightSizedFrames),
          brood_pattern: avg(broodPatterns),
          temperament: avg(temperaments),
          population: avg(populations),
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

  const handleCompleteTask = useCallback(async (taskId: string) => {
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
    }
  }, [toast])

  const handleUnarchive = useCallback(async () => {
    if (!hive) return

    const confirmed = await confirm({
      title: 'Unarchive Hive',
      message: `Are you sure you want to unarchive hive ${hive.hive_number}? This will set the hive status back to active, clear the archive date and reason, and make it visible in your active hives list.`,
      confirmLabel: 'Unarchive',
      variant: 'warning',
    })

    if (!confirmed) return

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
