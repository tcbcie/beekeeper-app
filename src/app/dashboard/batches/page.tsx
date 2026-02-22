'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, Edit2, Trash2, X, Minus, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import NotificationPermissionBanner from '@/components/NotificationPermissionBanner'
import NotificationStatusCard from '@/components/NotificationStatusCard'
import { initializeNotifications, scheduleBatchNotifications } from '@/lib/notifications'
import MatingNucsTab from '@/components/batches/MatingNucsTab'
import BatchGraftsSection from '@/components/batches/BatchGraftsSection'
import { useRearingGroups } from '@/hooks/useRearingGroups'

interface Queen {
  id: string
  queen_number: string
  hives?: Array<{
    queen_id: string
    hive_number: string
    apiaries: {
      name: string
    } | null
  }>
}

interface Apiary {
  id: string
  name: string
}

interface Hive {
  id: string
  hive_number: string
  apiary_id: string
}

interface Batch {
  id: string
  batch_name: string
  mother_queen_id: string | null
  starter_colony_hive_id: string | null
  graft_date: string
  cell_count: number | null
  frame_rows: number | null
  cells_per_row: number | null
  grafts_accepted: number | null
  queens_hatched: number | null
  queens_mated: number | null
  queens_hybridised: number | null
  acceptance_check_date: string | null
  first_option_to_cage_date: string | null
  second_option_to_cage_date: string | null
  emergence_date: string | null
  notes: string | null
  enable_browser_notifications: boolean
  enable_email_digest: boolean
  mating_apiary_id: string | null
  rearing_group_id: string | null
  enable_batch_event_reminders?: boolean
  batch_reminder_minutes_before?: number
  queens?: {
    queen_number: string
  } | null
  hives?: {
    hive_number: string
    apiaries?: {
      name: string
    }
  } | null
}

interface FormData {
  batch_name: string
  mother_queen_id: string
  starter_apiary_id: string
  starter_colony_hive_id: string
  graft_date: string
  cell_count: string
  frame_rows: string
  cells_per_row: string
  grafts_accepted: string
  queens_hatched: string
  queens_mated: string
  queens_hybridised: string
  acceptance_check_date: string
  first_option_to_cage_date: string
  second_option_to_cage_date: string
  emergence_date: string
  notes: string
  enable_browser_notifications: boolean
  enable_email_digest: boolean
  mating_apiary_id: string
  rearing_group_id: string
  enable_batch_event_reminders: boolean
  batch_reminder_minutes_before: string
}

interface Inspection {
  inspection_date: string
  brood_pattern_rating: number | null
  population_strength: number | null
  temperament_rating: number | null
  swarming_tendency: number | null
  honey_stores: string | null
  calmness: number | null
  recapping: number | null
  vsh: number | null
  smr: number | null
  chalkbrood_disease: number | null
}

interface HiveWithInspections {
  id: string
  hive_number: string
  apiary_id: string
  apiaries: {
    name: string
  } | null
  inspections: Inspection[]
}

interface HiveScore {
  hive_id: string
  hive_number: string
  apiary_name: string
  inspection_count: number
  averages: {
    brood_pattern: number
    population: number
    temperament: number
    swarming: number
    honey_yield: number
    calmness: number
    recapping: number
    vsh: number
    smr: number
    chalkbrood: number
  }
  score: number
}

// Get short day name (Mon, Tue, etc.) from a date string
const getDayName = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString + 'T00:00:00')
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { weekday: 'short' })
}

// Format a local Date object to YYYY-MM-DD string without timezone shift
const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Format date to Irish format (DD/MM/YYYY)
const formatDateIrish = (dateString: string | null): string => {
  if (!dateString) return '-'
  const date = new Date(dateString + 'T00:00:00')
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default function BatchesPage() {
  const router = useRouter()
  const toast = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [queens, setQueens] = useState<Queen[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [filteredHives, setFilteredHives] = useState<Hive[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'planning' | 'nucs' | 'selection'>('planning')

  // Selection tab states
  const [selectedApiary, setSelectedApiary] = useState<string>('all')
  const [timePeriod, setTimePeriod] = useState<string>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [weights, setWeights] = useState({
    brood_pattern: 3,
    population: 3,
    temperament: 3,
    swarming: 3,
    honey_yield: 3,
    calmness: 3,
    recapping: 3,
    vsh: 3,
    smr: 3,
    chalkbrood: 3,
  })
  const [optionalColumns, setOptionalColumns] = useState({
    calmness: false,
    recapping: false,
    vsh: false,
    smr: false,
    chalkbrood: false,
  })
  const [hiveScores, setHiveScores] = useState<HiveScore[]>([])
  const [loadingScores, setLoadingScores] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    batch_name: '',
    mother_queen_id: '',
    starter_apiary_id: '',
    starter_colony_hive_id: '',
    graft_date: toLocalDateString(new Date()),
    cell_count: '',
    frame_rows: '',
    cells_per_row: '',
    grafts_accepted: '',
    queens_hatched: '',
    queens_mated: '',
    queens_hybridised: '',
    acceptance_check_date: '',
    first_option_to_cage_date: '',
    second_option_to_cage_date: '',
    emergence_date: '',
    notes: '',
    mating_apiary_id: '',
    rearing_group_id: '',
    enable_browser_notifications: false,
    enable_email_digest: false,
    enable_batch_event_reminders: false,
    batch_reminder_minutes_before: '60',
  })

  // Rearing groups
  const { ownedRearingGroups, memberRearingGroups, fetchRearingGroups } = useRearingGroups()
  const allRearingGroups = [...ownedRearingGroups, ...memberRearingGroups]
  const isInRearingGroup = allRearingGroups.length > 0
  const isGroupBatch = formData.rearing_group_id !== ''

  const fetchBatches = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data, error } = await supabase
      .from('rearing_batches')
      .select('*, queens!mother_queen_id(queen_number), hives!starter_colony_hive_id(hive_number, apiaries(name))')
      .eq('user_id', currentUserId)
      .order('graft_date', { ascending: false })

    if (error) {
      console.error('Error fetching batches:', error)
    } else if (data) {
      setBatches(data)
    }
    setLoading(false)
  }, [userId])

  const fetchApiaries = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // Fetch team memberships to include shared apiaries
    const { data: teamMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', currentUserId)

    const teamIds = teamMemberships?.map(tm => tm.team_id) || []

    let sharedApiaryIds: string[] = []
    if (teamIds.length > 0) {
      const { data: sharedApiaries } = await supabase
        .from('team_apiaries')
        .select('apiary_id')
        .in('team_id', teamIds)

      sharedApiaryIds = sharedApiaries?.map(sa => sa.apiary_id) || []
    }

    let query = supabase.from('apiaries').select('id, name')
    if (sharedApiaryIds.length > 0) {
      query = query.or(`user_id.eq.${currentUserId},id.in.(${sharedApiaryIds.join(',')})`)
    } else {
      query = query.eq('user_id', currentUserId)
    }

    const { data } = await query.order('name')
    if (data) setApiaries(data)
  }, [userId])

  const fetchHives = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('hives')
      .select('id, hive_number, apiary_id')
      .eq('user_id', currentUserId)
      .is('archived_at', null)
      .order('hive_number')

    if (data) setHives(data)
  }, [userId])

  const fetchQueens = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // First, get all queens
    const { data: queensData, error: queensError } = await supabase
      .from('queens')
      .select('id, queen_number')
      .eq('status', 'active')
      .eq('user_id', currentUserId)
      .order('queen_number')

    if (queensError) {
      console.error('Error fetching queens:', queensError)
      return
    }

    if (!queensData) return

    // Then, get hives with apiaries for these queens (include archived_at to filter)
    const queenIds = queensData.map(q => q.id)
    const { data: hivesData } = await supabase
      .from('hives')
      .select('queen_id, hive_number, archived_at, apiaries(name)')
      .in('queen_id', queenIds)
      .eq('user_id', currentUserId)

    // Queens in archived hives should not be selectable
    const archivedQueenIds = new Set(
      hivesData?.filter(h => h.archived_at).map(h => h.queen_id) || []
    )

    // Merge the data, excluding queens in archived hives
    const queensWithHives: Queen[] = queensData
      .filter(queen => !archivedQueenIds.has(queen.id))
      .map(queen => ({
        ...queen,
        hives: hivesData?.filter(h => h.queen_id === queen.id && !h.archived_at).map(h => ({
          queen_id: h.queen_id,
          hive_number: h.hive_number,
          apiaries: Array.isArray(h.apiaries) ? h.apiaries[0] || null : h.apiaries
        })) || []
      }))

    setQueens(queensWithHives)
  }, [userId])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
      fetchBatches(id)
      fetchQueens(id)
      fetchApiaries(id)
      fetchHives(id)
      fetchRearingGroups(id)
    }
    initUser()
  }, [router, fetchBatches, fetchQueens, fetchApiaries, fetchHives, fetchRearingGroups])

  // Initialize browser notifications
  useEffect(() => {
    initializeNotifications()
  }, [])

  // Schedule notifications for batches with browser notifications enabled
  useEffect(() => {
    if (batches.length === 0) return

    batches.forEach(batch => {
      if (batch.enable_browser_notifications) {
        scheduleBatchNotifications({
          batchName: batch.batch_name,
          acceptanceCheckDate: batch.acceptance_check_date,
          firstCageDate: batch.first_option_to_cage_date,
          secondCageDate: batch.second_option_to_cage_date,
          hatchDate: batch.emergence_date,
        })
      }
    })
  }, [batches])

  // Filter hives based on selected apiary
  useEffect(() => {
    if (formData.starter_apiary_id) {
      const filtered = hives.filter(h => h.apiary_id === formData.starter_apiary_id)
      setFilteredHives(filtered)
    } else {
      setFilteredHives([])
    }
  }, [formData.starter_apiary_id, hives])

  // Auto-calculate all timeline dates from graft_date
  useEffect(() => {
    if (!formData.graft_date) return

    const graft = new Date(formData.graft_date + 'T00:00:00')

    const addDays = (d: Date, days: number): string => {
      const result = new Date(d)
      result.setDate(result.getDate() + days)
      return toLocalDateString(result)
    }

    const acceptance = addDays(graft, 1)
    const firstCage = addDays(graft, 5)
    const secondCage = addDays(graft, 10)
    const emergence = addDays(graft, 12)

    // Only update if any date differs to prevent unnecessary re-renders
    if (
      formData.acceptance_check_date !== acceptance ||
      formData.first_option_to_cage_date !== firstCage ||
      formData.second_option_to_cage_date !== secondCage ||
      formData.emergence_date !== emergence
    ) {
      setFormData(prev => ({
        ...prev,
        acceptance_check_date: acceptance,
        first_option_to_cage_date: firstCage,
        second_option_to_cage_date: secondCage,
        emergence_date: emergence,
      }))
    }
  }, [formData.graft_date, formData.acceptance_check_date, formData.first_option_to_cage_date, formData.second_option_to_cage_date, formData.emergence_date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    if (isGroupBatch && !formData.mating_apiary_id) {
      toast.error('Mating Location (Apiary) is required for group batches.')
      return
    }

    try {
      const dataToSubmit = {
        batch_name: formData.batch_name,
        mother_queen_id: formData.mother_queen_id || null,
        starter_colony_hive_id: formData.starter_colony_hive_id || null,
        graft_date: formData.graft_date,
        cell_count: formData.cell_count ? parseInt(formData.cell_count, 10) || null : null,
        frame_rows: formData.frame_rows ? parseInt(formData.frame_rows, 10) || null : null,
        cells_per_row: formData.cells_per_row ? parseInt(formData.cells_per_row, 10) || null : null,
        grafts_accepted: formData.grafts_accepted ? parseInt(formData.grafts_accepted, 10) || null : null,
        queens_hatched: formData.queens_hatched ? parseInt(formData.queens_hatched, 10) || null : null,
        queens_mated: formData.queens_mated ? parseInt(formData.queens_mated, 10) || null : null,
        queens_hybridised: formData.queens_hybridised ? parseInt(formData.queens_hybridised, 10) || null : null,
        acceptance_check_date: formData.acceptance_check_date || null,
        first_option_to_cage_date: formData.first_option_to_cage_date || null,
        second_option_to_cage_date: formData.second_option_to_cage_date || null,
        emergence_date: formData.emergence_date || null,
        notes: formData.notes || null,
        mating_apiary_id: formData.mating_apiary_id || null,
        rearing_group_id: formData.rearing_group_id || null,
        enable_browser_notifications: formData.enable_browser_notifications,
        enable_email_digest: formData.enable_email_digest,
        enable_batch_event_reminders: formData.enable_batch_event_reminders,
        batch_reminder_minutes_before: formData.batch_reminder_minutes_before ? parseInt(formData.batch_reminder_minutes_before, 10) || 60 : 60,
      }

      if (editingBatch) {
        const { error } = await supabase
          .from('rearing_batches')
          .update(dataToSubmit)
          .eq('id', editingBatch.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('rearing_batches')
          .insert([{ ...dataToSubmit, user_id: userId }])

        if (error) throw error
      }

      fetchBatches()
      resetForm()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      toast.error(errorMessage)
    }
  }

  const handleEdit = (batch: Batch) => {
    setEditingBatch(batch)
    // Find the apiary_id from the hive if it exists
    const hive = hives.find(h => h.id === batch.starter_colony_hive_id)
    setFormData({
      batch_name: batch.batch_name,
      mother_queen_id: batch.mother_queen_id || '',
      starter_apiary_id: hive?.apiary_id || '',
      starter_colony_hive_id: batch.starter_colony_hive_id || '',
      graft_date: batch.graft_date,
      cell_count: batch.cell_count?.toString() || '',
      frame_rows: batch.frame_rows?.toString() || '',
      cells_per_row: batch.cells_per_row?.toString() || '',
      grafts_accepted: batch.grafts_accepted?.toString() || '',
      queens_hatched: batch.queens_hatched?.toString() || '',
      queens_mated: batch.queens_mated?.toString() || '',
      queens_hybridised: batch.queens_hybridised?.toString() || '',
      acceptance_check_date: batch.acceptance_check_date || '',
      first_option_to_cage_date: batch.first_option_to_cage_date || '',
      second_option_to_cage_date: batch.second_option_to_cage_date || '',
      emergence_date: batch.emergence_date || '',
      notes: batch.notes || '',
      mating_apiary_id: batch.mating_apiary_id || '',
      rearing_group_id: batch.rearing_group_id || '',
      enable_browser_notifications: batch.enable_browser_notifications || false,
      enable_email_digest: batch.enable_email_digest || false,
      enable_batch_event_reminders: batch.enable_batch_event_reminders || false,
      batch_reminder_minutes_before: batch.batch_reminder_minutes_before?.toString() || '60',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this batch?')) {
      const { error } = await supabase
        .from('rearing_batches')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (!error) fetchBatches()
    }
  }

  // Calculate date range based on time period
  const getDateRange = useCallback(() => {
    const today = new Date()
    const currentYear = today.getFullYear()
    let startDate: Date | null = null

    switch (timePeriod) {
      case 'currentyear':
        startDate = new Date(currentYear, 0, 1) // January 1st of current year
        break
      case '6months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
        break
      case '1year':
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
        break
      case 'custom':
        return customStartDate ? new Date(customStartDate) : null
      case 'all':
      default:
        return null
    }

    return startDate
  }, [timePeriod, customStartDate])

  // Calculate hive scores based on inspection data
  const calculateHiveScores = useCallback(async () => {
    if (!userId) return
    setLoadingScores(true)

    try {
      const startDate = getDateRange()

      // Fetch all hives with their inspections
      let query = supabase
        .from('hives')
        .select(`
          id,
          hive_number,
          apiary_id,
          apiaries (name),
          inspections (
            inspection_date,
            brood_pattern_rating,
            population_strength,
            temperament_rating,
            swarming_tendency,
            honey_stores,
            calmness,
            recapping,
            vsh,
            smr,
            chalkbrood_disease
          )
        `)
        .eq('user_id', userId)
        .is('archived_at', null)

      // Apply apiary filter
      if (selectedApiary !== 'all') {
        query = query.eq('apiary_id', selectedApiary)
      }

      const { data: hivesData, error } = await query

      if (error) throw error

      // Calculate averages and scores for each hive
      const scored = (hivesData as unknown as HiveWithInspections[])?.map((hive) => {
        let inspections = hive.inspections || []

        // Filter inspections by date range
        if (startDate) {
          inspections = inspections.filter((i) => {
            const inspectionDate = new Date(i.inspection_date)
            // For custom range, check both start and end dates
            if (timePeriod === 'custom' && customEndDate) {
              const endDate = new Date(customEndDate)
              return inspectionDate >= startDate && inspectionDate <= endDate
            }
            // For predefined periods, just check if after start date
            return inspectionDate >= startDate
          })
        }

        // Require minimum of 3 inspections for reliable averages
        if (inspections.length < 3) {
          return null // Skip hives with insufficient inspection data
        }

        // Calculate averages
        const avg = {
          brood_pattern: inspections.reduce((sum: number, i) => sum + (i.brood_pattern_rating || 0), 0) / inspections.length,
          population: inspections.reduce((sum: number, i) => sum + (i.population_strength || 0), 0) / inspections.length,
          temperament: inspections.reduce((sum: number, i) => sum + (i.temperament_rating || 0), 0) / inspections.length,
          swarming: inspections.reduce((sum: number, i) => sum + (i.swarming_tendency || 0), 0) / inspections.length, // Average swarming tendency
          honey_yield: inspections.reduce((sum: number, i) => {
            const stores = i.honey_stores?.toLowerCase() || ''
            if (stores.includes('full')) return sum + 5
            if (stores.includes('good')) return sum + 4
            if (stores.includes('moderate')) return sum + 3
            if (stores.includes('low')) return sum + 2
            return sum + 1
          }, 0) / inspections.length,
          calmness: inspections.reduce((sum: number, i) => sum + (i.calmness || 0), 0) / inspections.length,
          recapping: inspections.reduce((sum: number, i) => sum + (i.recapping || 0), 0) / inspections.length,
          vsh: inspections.reduce((sum: number, i) => sum + (i.vsh || 0), 0) / inspections.length,
          smr: inspections.reduce((sum: number, i) => sum + (i.smr || 0), 0) / inspections.length,
          chalkbrood: inspections.reduce((sum: number, i) => sum + (i.chalkbrood_disease || 0), 0) / inspections.length,
        }

        // Calculate weighted score (lower swarming and chalkbrood are better, so invert them)
        let score =
          (avg.brood_pattern * weights.brood_pattern) +
          (avg.population * weights.population) +
          (avg.temperament * weights.temperament) +
          ((6 - avg.swarming) * weights.swarming) + // Invert swarming tendency (1-5 scale, so 6 - value)
          (avg.honey_yield * weights.honey_yield)

        // Add optional criteria to score if selected
        if (optionalColumns.calmness) {
          score += avg.calmness * weights.calmness
        }
        if (optionalColumns.recapping) {
          score += avg.recapping * weights.recapping
        }
        if (optionalColumns.vsh) {
          score += avg.vsh * weights.vsh
        }
        if (optionalColumns.smr) {
          score += avg.smr * weights.smr
        }
        if (optionalColumns.chalkbrood) {
          // Lower chalkbrood is better, so invert it (assuming 1-5 scale)
          score += (6 - avg.chalkbrood) * weights.chalkbrood
        }

        return {
          hive_id: hive.id,
          hive_number: hive.hive_number,
          apiary_name: hive.apiaries?.name || 'Unknown',
          inspection_count: inspections.length,
          averages: avg,
          score: score,
        }
      }).filter((item): item is HiveScore => item !== null) // Remove null entries

      // Sort by score descending
      scored?.sort((a, b) => b.score - a.score)

      setHiveScores(scored || [])
    } catch (error) {
      console.error('Error calculating hive scores:', error)
      // Silently fail - user will see empty state message instead of alert
      setHiveScores([])
    } finally {
      setLoadingScores(false)
    }
  }, [userId, selectedApiary, timePeriod, customEndDate, weights, optionalColumns, getDateRange])

  // Recalculate when filters or weights change
  useEffect(() => {
    if (activeTab === 'selection') {
      calculateHiveScores()
    }
  }, [activeTab, selectedApiary, timePeriod, customStartDate, customEndDate, weights, optionalColumns, calculateHiveScores])

  const resetForm = () => {
    setShowForm(false)
    setEditingBatch(null)
    setFormData({
      batch_name: '',
      mother_queen_id: '',
      starter_apiary_id: '',
      starter_colony_hive_id: '',
      graft_date: toLocalDateString(new Date()),
      cell_count: '',
      frame_rows: '',
      cells_per_row: '',
      grafts_accepted: '',
      queens_hatched: '',
      queens_mated: '',
      queens_hybridised: '',
      acceptance_check_date: '',
      first_option_to_cage_date: '',
      second_option_to_cage_date: '',
      emergence_date: '',
      notes: '',
      mating_apiary_id: '',
      rearing_group_id: '',
      enable_browser_notifications: false,
      enable_email_digest: false,
      enable_batch_event_reminders: false,
      batch_reminder_minutes_before: '60',
    })
  }

  if (loading) return <LoadingSpinner text="Loading Queen Rearing..." />

  return (
    <>
      <NotificationPermissionBanner />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Queen Rearing 🥚</h1>
          <p className="text-sm text-text-secondary mt-1">3-5-8 - The Queen is made!</p>
        </div>
        {activeTab === 'planning' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancel' : 'New Batch'}
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border">
        <div className="border-b border-border">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('planning')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'planning'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              Planning
            </button>
            <button
              onClick={() => setActiveTab('nucs')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'nucs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              Mating Nucs
            </button>
            <button
              onClick={() => setActiveTab('selection')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'selection'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              Selection
            </button>
          </nav>
        </div>
      </div>

      {/* Planning Tab Content */}
      {activeTab === 'planning' && (
        <>
          {showForm && (
            <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
              <h3 className="text-xl font-semibold mb-4 text-foreground">
                {editingBatch ? 'Edit Batch' : 'Create New Batch'}
              </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Batch Name *</label>
              <input
                type="text"
                value={formData.batch_name}
                onChange={(e) => setFormData({...formData, batch_name: e.target.value})}
                placeholder="e.g., Spring 2024 - Batch 1"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Breeder Queen</label>
              <select
                value={formData.mother_queen_id}
                onChange={(e) => setFormData({...formData, mother_queen_id: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
              >
                <option value="">Select breeder queen (optional)</option>
                {queens.map((q: Queen) => {
                  const hive = q.hives && q.hives.length > 0 ? q.hives[0] : null
                  const apiary = hive?.apiaries?.name || ''
                  const hiveNumber = hive?.hive_number || ''
                  const location = apiary && hiveNumber ? ` (${apiary} - ${hiveNumber})` : ''
                  return (
                    <option key={q.id} value={q.id}>
                      {q.queen_number}{location}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Timeline Dates - Grouped */}
            <div className="md:col-span-2 bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
              <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3">Timeline</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Graft Date *
                  </label>
                  <input
                    type="date"
                    value={formData.graft_date}
                    onChange={(e) => setFormData({...formData, graft_date: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
                    required
                  />
                  {formData.graft_date && <p className="text-xs text-text-tertiary mt-1">{getDayName(formData.graft_date)}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Acceptance Check</label>
                  <input
                    type="date"
                    value={formData.acceptance_check_date}
                    onChange={(e) => setFormData({...formData, acceptance_check_date: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
                  />
                  <p className="text-xs text-text-tertiary mt-1">Graft + 1 day{formData.acceptance_check_date ? ` · ${getDayName(formData.acceptance_check_date)}` : ''}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">1st Option to Cage</label>
                  <input
                    type="date"
                    value={formData.first_option_to_cage_date}
                    onChange={(e) => setFormData({...formData, first_option_to_cage_date: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
                  />
                  <p className="text-xs text-text-tertiary mt-1">Graft + 5 days{formData.first_option_to_cage_date ? ` · ${getDayName(formData.first_option_to_cage_date)}` : ''}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">2nd Option to Cage</label>
                  <input
                    type="date"
                    value={formData.second_option_to_cage_date}
                    onChange={(e) => setFormData({...formData, second_option_to_cage_date: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
                  />
                  <p className="text-xs text-text-tertiary mt-1">Graft + 10 days{formData.second_option_to_cage_date ? ` · ${getDayName(formData.second_option_to_cage_date)}` : ''}</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-1">
                    Expected Day to Hatch
                    <div className="group relative">
                      <MessageCircle size={14} className="text-purple-600 dark:text-purple-300 cursor-help" />
                      <div className="invisible group-hover:visible absolute left-0 top-6 w-64 p-2 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded shadow-lg z-10">
                        Assuming the larvae are approximately four days after the egg was laid, they should all be of the same age and ideally no more than 12 hours old at the time of grafting.
                      </div>
                    </div>
                  </label>
                  <input
                    type="date"
                    value={formData.emergence_date}
                    onChange={(e) => setFormData({...formData, emergence_date: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
                  />
                  <p className="text-xs text-text-tertiary mt-1">Graft + 12 days{formData.emergence_date ? ` · ${getDayName(formData.emergence_date)}` : ''}</p>
                </div>
              </div>
            </div>

            {/* Starter Colony Selection - Grouped */}
            <div className="md:col-span-2 bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-3">Starter Colony</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Apiary</label>
                  <select
                    value={formData.starter_apiary_id}
                    onChange={(e) => {
                      setFormData({...formData, starter_apiary_id: e.target.value, starter_colony_hive_id: ''})
                    }}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
                  >
                    <option value="">Select apiary (optional)</option>
                    {apiaries.map((apiary) => (
                      <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Hive</label>
                  <select
                    value={formData.starter_colony_hive_id}
                    onChange={(e) => setFormData({...formData, starter_colony_hive_id: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground disabled:bg-sage-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
                    disabled={!formData.starter_apiary_id}
                  >
                    <option value="">Select hive (optional)</option>
                    {filteredHives.map((hive) => (
                      <option key={hive.id} value={hive.id}>{hive.hive_number}</option>
                    ))}
                  </select>
                  {!formData.starter_apiary_id && (
                    <p className="text-xs text-text-tertiary mt-1">Select an apiary first</p>
                  )}
                </div>
              </div>
            </div>

            {/* Rearing Group Toggle */}
            {isInRearingGroup && (
              <div className="md:col-span-2 bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Group Batch</h4>
                    <p className="text-xs text-text-tertiary">Link this batch to a rearing group</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGroupBatch}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Default to first group
                          setFormData({...formData, rearing_group_id: allRearingGroups[0]?.id || ''})
                        } else {
                          setFormData({...formData, rearing_group_id: '', mating_apiary_id: ''})
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-sage-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-sage-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {/* Group Selector - only if 2+ groups */}
                {isGroupBatch && allRearingGroups.length > 1 && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Rearing Group</label>
                    <select
                      value={formData.rearing_group_id}
                      onChange={(e) => setFormData({...formData, rearing_group_id: e.target.value})}
                      className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
                    >
                      {allRearingGroups.map((group) => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Mating Location (Apiary) - shown when group batch toggle is ON, or always if not in any group */}
            {(isGroupBatch || !isInRearingGroup) && (
              <div className="md:col-span-2 bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">Mating Location (Apiary)</h4>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Apiary</label>
                  <select
                    value={formData.mating_apiary_id}
                    onChange={(e) => setFormData({...formData, mating_apiary_id: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
                  >
                    <option value="">{isGroupBatch ? 'Select mating location (required)' : 'Select mating location (optional)'}</option>
                    {apiaries.map((apiary) => (
                      <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-text-tertiary mt-1">If your mating location (apiary) is not listed, please set one up in the Apiary section.</p>
                  <p className="text-xs text-text-tertiary mt-1">This is the intended mating location and will be used as the default for the NIHBS report unless the location is overwritten by the [placeholder].</p>
                </div>
              </div>
            )}

            {/* Batch Quantities - Grouped Vertically */}
            <div className="md:col-span-2 bg-surface-elevated dark:bg-surface-elevated p-4 rounded-lg border border-border">
              <h4 className="text-sm font-semibold text-foreground mb-3">Batch Quantities</h4>
              <div className="space-y-3">
                {/* Frame Layout: Rows × Cells per Row */}
                <div className="p-3 rounded-lg border-2 border-amber-600 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 space-y-3">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Grafting Frame Layout</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Rows</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseInt(formData.frame_rows || '0')
                          if (val > 0) {
                            const newRows = (val - 1).toString()
                            const total = (val - 1) * (parseInt(formData.cells_per_row || '0'))
                            setFormData({...formData, frame_rows: newRows, cell_count: total > 0 ? total.toString() : ''})
                          }
                        }}
                        className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        value={formData.frame_rows}
                        onChange={(e) => {
                          const rows = Math.max(0, parseInt(e.target.value) || 0)
                          const cols = Math.max(0, parseInt(formData.cells_per_row) || 0)
                          const total = rows * cols
                          setFormData({...formData, frame_rows: rows.toString(), cell_count: total > 0 ? total.toString() : ''})
                        }}
                        className="flex-1 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground text-center"
                        min="0"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseInt(formData.frame_rows || '0')
                          const newRows = (val + 1).toString()
                          const total = (val + 1) * (parseInt(formData.cells_per_row || '0'))
                          setFormData({...formData, frame_rows: newRows, cell_count: total > 0 ? total.toString() : ''})
                        }}
                        className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Cells per Row</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseInt(formData.cells_per_row || '0')
                          if (val > 0) {
                            const newCols = (val - 1).toString()
                            const total = (parseInt(formData.frame_rows || '0')) * (val - 1)
                            setFormData({...formData, cells_per_row: newCols, cell_count: total > 0 ? total.toString() : ''})
                          }
                        }}
                        className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        value={formData.cells_per_row}
                        onChange={(e) => {
                          const cols = Math.max(0, parseInt(e.target.value) || 0)
                          const rows = Math.max(0, parseInt(formData.frame_rows) || 0)
                          const total = rows * cols
                          setFormData({...formData, cells_per_row: cols.toString(), cell_count: total > 0 ? total.toString() : ''})
                        }}
                        className="flex-1 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground text-center"
                        min="0"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseInt(formData.cells_per_row || '0')
                          const newCols = (val + 1).toString()
                          const total = (parseInt(formData.frame_rows || '0')) * (val + 1)
                          setFormData({...formData, cells_per_row: newCols, cell_count: total > 0 ? total.toString() : ''})
                        }}
                        className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Total Grafts (auto-calculated but editable) */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Total Grafts</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.cell_count || '0')
                        if (val > 0) setFormData({...formData, cell_count: (val - 1).toString()})
                      }}
                      className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.cell_count}
                      onChange={(e) => setFormData({...formData, cell_count: e.target.value})}
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.cell_count || '0')
                        setFormData({...formData, cell_count: (val + 1).toString()})
                      }}
                      className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                </div>

                {/* Grafts Accepted */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Grafts Accepted</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.grafts_accepted || '0')
                        if (val > 0) setFormData({...formData, grafts_accepted: (val - 1).toString()})
                      }}
                      className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.grafts_accepted}
                      onChange={(e) => setFormData({...formData, grafts_accepted: e.target.value})}
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.grafts_accepted || '0')
                        setFormData({...formData, grafts_accepted: (val + 1).toString()})
                      }}
                      className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Queens Hatched */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Queens Hatched</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_hatched || '0')
                        if (val > 0) setFormData({...formData, queens_hatched: (val - 1).toString()})
                      }}
                      className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.queens_hatched}
                      onChange={(e) => setFormData({...formData, queens_hatched: e.target.value})}
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_hatched || '0')
                        setFormData({...formData, queens_hatched: (val + 1).toString()})
                      }}
                      className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Queens Mated */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Queens Mated</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_mated || '0')
                        if (val > 0) setFormData({...formData, queens_mated: (val - 1).toString()})
                      }}
                      className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.queens_mated}
                      onChange={(e) => setFormData({...formData, queens_mated: e.target.value})}
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_mated || '0')
                        setFormData({...formData, queens_mated: (val + 1).toString()})
                      }}
                      className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Queens Showing Hybridised Offspring */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Queens Showing Hybridised Offspring</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_hybridised || '0')
                        if (val > 0) setFormData({...formData, queens_hybridised: (val - 1).toString()})
                      }}
                      className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.queens_hybridised}
                      onChange={(e) => setFormData({...formData, queens_hybridised: e.target.value})}
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_hybridised || '0')
                        setFormData({...formData, queens_hybridised: (val + 1).toString()})
                      }}
                      className="px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground hover:bg-sage-50 dark:hover:bg-slate-700"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Weather conditions, acceptance rate, observations..."
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
              />
            </div>

            {/* Individual Grafts Section - Only show when editing existing batch */}
            {editingBatch && userId && (
              <div className="md:col-span-2 bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <BatchGraftsSection
                  batchId={editingBatch.id}
                  userId={userId}
                  cellCount={formData.cell_count ? parseInt(formData.cell_count) : null}
                  frameRows={formData.frame_rows ? parseInt(formData.frame_rows) : null}
                  cellsPerRow={formData.cells_per_row ? parseInt(formData.cells_per_row) : null}
                  groupId={editingBatch.rearing_group_id}
                  batchCounters={{
                    grafts_accepted: formData.grafts_accepted ? parseInt(formData.grafts_accepted, 10) : null,
                    queens_hatched: formData.queens_hatched ? parseInt(formData.queens_hatched, 10) : null,
                    queens_mated: formData.queens_mated ? parseInt(formData.queens_mated, 10) : null,
                  }}
                />
              </div>
            )}

            {/* Notification Preferences - Grouped */}
            <div className="md:col-span-2 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3">Notification Preferences</h4>

              {/* Notification Status Card */}
              <div className="mb-4">
                <NotificationStatusCard />
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="browser-notifications"
                    checked={formData.enable_browser_notifications}
                    onChange={(e) => setFormData({...formData, enable_browser_notifications: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-border rounded focus:ring-blue-500"
                  />
                  <label htmlFor="browser-notifications" className="ml-2 text-sm text-amber-900 dark:text-amber-200">
                    Send Browser Notifications for This Batch
                    <span className="block text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      Get notified on the day of important dates (acceptance check, cage dates, hatch date)
                    </span>
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="email-digest"
                    checked={formData.enable_email_digest}
                    onChange={(e) => setFormData({...formData, enable_email_digest: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-border rounded focus:ring-blue-500"
                  />
                  <label htmlFor="email-digest" className="ml-2 text-sm text-amber-900 dark:text-amber-200">
                    Include This Batch in Weekly Email Digest
                    <span className="block text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      Receive a weekly summary of upcoming dates for this batch
                    </span>
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="batch-event-reminders"
                      checked={formData.enable_batch_event_reminders}
                      onChange={(e) => setFormData({...formData, enable_batch_event_reminders: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-border rounded focus:ring-blue-500"
                    />
                    <label htmlFor="batch-event-reminders" className="ml-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                      Enable Email Reminders for Batch Events
                      <span className="block text-xs font-normal text-amber-700 dark:text-amber-300 mt-0.5">
                        Send individual email reminders for all auto-created batch events (acceptance check, cage dates, emergence)
                      </span>
                    </label>
                  </div>

                  {formData.enable_batch_event_reminders && (
                    <div className="ml-6 flex items-center gap-2">
                      <label htmlFor="batch-reminder-minutes" className="text-sm text-amber-900 dark:text-amber-200">
                        Remind me (minutes before):
                      </label>
                      <input
                        type="number"
                        id="batch-reminder-minutes"
                        value={formData.batch_reminder_minutes_before}
                        onChange={(e) => setFormData({...formData, batch_reminder_minutes_before: e.target.value})}
                        min="0"
                        step="15"
                        className="w-24 px-3 py-1 border border-sage-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-foreground"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editingBatch ? 'Update' : 'Create'} Batch
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-sage-200 dark:bg-slate-700 rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600">
                Cancel
              </button>
            </div>
          </form>
            </div>
          )}

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {batches.map((batch: Batch) => (
              <div key={batch.id} className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-foreground text-lg">{batch.batch_name}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(batch)}
                      className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                      aria-label="Edit batch"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(batch.id)}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                      aria-label="Delete batch"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Breeder Queen:</span>
                    <span className="text-foreground font-medium">{batch.queens?.queen_number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Graft Date:</span>
                    <span className="text-foreground">{formatDateIrish(batch.graft_date)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                    <div>
                      <span className="text-text-tertiary block">Grafts:</span>
                      <span className="text-foreground font-medium">{batch.cell_count || '-'}</span>
                    </div>
                    <div>
                      <span className="text-text-tertiary block">Accepted:</span>
                      <span className="text-foreground font-medium">{batch.grafts_accepted || '-'}</span>
                    </div>
                    <div>
                      <span className="text-text-tertiary block">Hatched:</span>
                      <span className="text-foreground font-medium">{batch.queens_hatched || '-'}</span>
                    </div>
                    <div>
                      <span className="text-text-tertiary block">Mated:</span>
                      <span className="text-foreground font-medium">{batch.queens_mated || '-'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-text-tertiary">Acceptance Check:</span>
                    <span className="text-foreground">{formatDateIrish(batch.acceptance_check_date)}</span>
                  </div>
                </div>
              </div>
            ))}
            {batches.length === 0 && (
              <div className="text-center py-8 text-text-tertiary">No rearing batch found. Create your first!</div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-surface dark:bg-surface rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-sage-50 dark:bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Actions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Batch Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Breeder Queen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Graft Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Grafts</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Accepted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Hatched</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Mated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Acceptance Check</th>
            </tr>
          </thead>
          <tbody className="bg-surface dark:bg-surface divide-y divide-border">
            {batches.map((batch: Batch) => (
              <tr key={batch.id} className="hover:bg-sage-50 dark:hover:bg-slate-800">
                <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                  <button onClick={() => handleEdit(batch)} className="text-blue-600 hover:text-blue-900">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(batch.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 size={16} />
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{batch.batch_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.queens?.queen_number || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatDateIrish(batch.graft_date)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.cell_count || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.grafts_accepted || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.queens_hatched || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.queens_mated || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatDateIrish(batch.acceptance_check_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {batches.length === 0 && (
          <div className="text-center py-8 text-text-tertiary">No rearing batch found. Create your first!</div>
        )}
          </div>
        </>
      )}

      {/* Mating Nucs Tab Content */}
      {activeTab === 'nucs' && userId && (
        <MatingNucsTab userId={userId} />
      )}

      {/* Selection Tab Content */}
      {activeTab === 'selection' && (
        <div className="space-y-6">
          {/* Filters Row */}
          <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Breeder Queen Selection Filters</h3>

            {/* Apiary Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">Apiary</label>
              <select
                value={selectedApiary}
                onChange={(e) => setSelectedApiary(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">All Apiaries</option>
                {apiaries.map((apiary) => (
                  <option key={apiary.id} value={apiary.id}>
                    {apiary.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Period Filter */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Time Period</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTimePeriod('currentyear')}
                  className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                    timePeriod === 'currentyear'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-sage-100 dark:bg-slate-700 text-text-secondary hover:bg-sage-200 dark:hover:bg-slate-600 active:bg-sage-300 dark:active:bg-slate-500'
                  }`}
                >
                  Current Year ({new Date().getFullYear()})
                </button>
                <button
                  onClick={() => setTimePeriod('6months')}
                  className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                    timePeriod === '6months'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-sage-100 dark:bg-slate-700 text-text-secondary hover:bg-sage-200 dark:hover:bg-slate-600 active:bg-sage-300 dark:active:bg-slate-500'
                  }`}
                >
                  Last 6 Months
                </button>
                <button
                  onClick={() => setTimePeriod('1year')}
                  className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                    timePeriod === '1year'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-sage-100 dark:bg-slate-700 text-text-secondary hover:bg-sage-200 dark:hover:bg-slate-600 active:bg-sage-300 dark:active:bg-slate-500'
                  }`}
                >
                  Last Year
                </button>
                <button
                  onClick={() => setTimePeriod('all')}
                  className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                    timePeriod === 'all'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-sage-100 dark:bg-slate-700 text-text-secondary hover:bg-sage-200 dark:hover:bg-slate-600 active:bg-sage-300 dark:active:bg-slate-500'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setTimePeriod('custom')}
                  className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                    timePeriod === 'custom'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-sage-100 dark:bg-slate-700 text-text-secondary hover:bg-sage-200 dark:hover:bg-slate-600 active:bg-sage-300 dark:active:bg-slate-500'
                  }`}
                >
                  Custom Range
                </button>
              </div>
            </div>

            {/* Custom Date Range Inputs */}
            {timePeriod === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 mt-4 pl-0 md:pl-0">
                <label className="text-sm font-medium text-text-secondary">From:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <label className="text-sm font-medium text-text-secondary">To:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <button
                  onClick={() => {
                    setCustomStartDate('')
                    setCustomEndDate('')
                  }}
                  className="px-3 py-2 text-sm text-text-secondary hover:text-foreground underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Weights Row */}
          <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Weight Criterias (1-5)</h3>
            <p className="text-sm text-text-secondary mb-4">Assign importance to each trait. Higher weights = more influence on ranking.</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Brood Pattern Weight */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Brood Pattern</label>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => setWeights({ ...weights, brood_pattern: weight })}
                      className={`w-10 h-10 rounded-md font-semibold transition-all ${
                        weights.brood_pattern === weight
                          ? 'bg-blue-600 text-white shadow-md scale-110'
                          : 'bg-sage-200 dark:bg-slate-700 text-text-secondary hover:bg-sage-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>

              {/* Population Weight */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Population</label>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => setWeights({ ...weights, population: weight })}
                      className={`w-10 h-10 rounded-md font-semibold transition-all ${
                        weights.population === weight
                          ? 'bg-blue-600 text-white shadow-md scale-110'
                          : 'bg-sage-200 dark:bg-slate-700 text-text-secondary hover:bg-sage-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperament Weight */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Temperament</label>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => setWeights({ ...weights, temperament: weight })}
                      className={`w-10 h-10 rounded-md font-semibold transition-all ${
                        weights.temperament === weight
                          ? 'bg-blue-600 text-white shadow-md scale-110'
                          : 'bg-sage-200 dark:bg-slate-700 text-text-secondary hover:bg-sage-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>

              {/* Swarming Weight */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Swarming (Low=Good)</label>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => setWeights({ ...weights, swarming: weight })}
                      className={`w-10 h-10 rounded-md font-semibold transition-all ${
                        weights.swarming === weight
                          ? 'bg-blue-600 text-white shadow-md scale-110'
                          : 'bg-sage-200 dark:bg-slate-700 text-text-secondary hover:bg-sage-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>

              {/* Honey Yield Weight */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Honey Yield</label>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => setWeights({ ...weights, honey_yield: weight })}
                      className={`w-10 h-10 rounded-md font-semibold transition-all ${
                        weights.honey_yield === weight
                          ? 'bg-blue-600 text-white shadow-md scale-110'
                          : 'bg-sage-200 dark:bg-slate-700 text-text-secondary hover:bg-sage-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Criteria Weights - Only show if selected */}
              {optionalColumns.calmness && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Calmness</label>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((weight) => (
                      <button
                        key={weight}
                        onClick={() => setWeights({ ...weights, calmness: weight })}
                        className={`w-10 h-10 rounded-md font-semibold transition-all ${
                          weights.calmness === weight
                            ? 'bg-blue-600 text-white shadow-md scale-110'
                            : 'bg-sage-200 dark:bg-slate-700 text-text-secondary hover:bg-sage-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        {weight}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {optionalColumns.recapping && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Recapping</label>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((weight) => (
                      <button
                        key={weight}
                        onClick={() => setWeights({ ...weights, recapping: weight })}
                        className={`w-10 h-10 rounded-md font-semibold transition-all ${
                          weights.recapping === weight
                            ? 'bg-blue-600 text-white shadow-md scale-110'
                            : 'bg-sage-200 dark:bg-slate-700 text-text-secondary hover:bg-sage-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        {weight}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {optionalColumns.vsh && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2 text-center">VSH</label>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((weight) => (
                      <button
                        key={weight}
                        onClick={() => setWeights({ ...weights, vsh: weight })}
                        className={`w-10 h-10 rounded-md font-semibold transition-all ${
                          weights.vsh === weight
                            ? 'bg-blue-600 text-white shadow-md scale-110'
                            : 'bg-sage-200 dark:bg-slate-700 text-text-secondary hover:bg-sage-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        {weight}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {optionalColumns.smr && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2 text-center">SMR</label>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((weight) => (
                      <button
                        key={weight}
                        onClick={() => setWeights({ ...weights, smr: weight })}
                        className={`w-10 h-10 rounded-md font-semibold transition-all ${
                          weights.smr === weight
                            ? 'bg-blue-600 text-white shadow-md scale-110'
                            : 'bg-sage-200 dark:bg-slate-700 text-text-secondary hover:bg-sage-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        {weight}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {optionalColumns.chalkbrood && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2 text-center">Chalkbrood (Low=Good)</label>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((weight) => (
                      <button
                        key={weight}
                        onClick={() => setWeights({ ...weights, chalkbrood: weight })}
                        className={`w-10 h-10 rounded-md font-semibold transition-all ${
                          weights.chalkbrood === weight
                            ? 'bg-blue-600 text-white shadow-md scale-110'
                            : 'bg-sage-200 dark:bg-slate-700 text-text-secondary hover:bg-sage-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        {weight}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Optional Criteria */}
          <div className="bg-surface dark:bg-surface rounded-lg shadow p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Optional Criteria</h3>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalColumns.calmness}
                  onChange={(e) => setOptionalColumns({ ...optionalColumns, calmness: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-text-secondary">Calmness</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalColumns.recapping}
                  onChange={(e) => setOptionalColumns({ ...optionalColumns, recapping: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-text-secondary">Recapping</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalColumns.vsh}
                  onChange={(e) => setOptionalColumns({ ...optionalColumns, vsh: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-text-secondary">VSH</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalColumns.smr}
                  onChange={(e) => setOptionalColumns({ ...optionalColumns, smr: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-text-secondary">SMR</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalColumns.chalkbrood}
                  onChange={(e) => setOptionalColumns({ ...optionalColumns, chalkbrood: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-text-secondary">Chalkbrood</span>
              </label>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-surface dark:bg-surface rounded-lg shadow overflow-hidden border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Ranked Hives</h3>
              <p className="text-sm text-text-secondary mt-1">Based on inspection averages and weighted scores</p>
            </div>

            {loadingScores ? (
              <div className="p-12">
                <LoadingSpinner text="Calculating scores..." />
              </div>
            ) : hiveScores.length === 0 ? (
              <div className="text-center py-12 text-text-tertiary">
                <p className="text-lg mb-2">Not enough data to calculate scores</p>
                <p className="text-sm">Each hive requires at least 3 inspection records in the selected period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-sage-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Hive</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Apiary</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Inspections</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Brood Pattern</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Population</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Temperament</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Swarming (Low=Good)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Honey Yield</th>
                      {optionalColumns.calmness && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Calmness</th>
                      )}
                      {optionalColumns.recapping && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Recapping</th>
                      )}
                      {optionalColumns.vsh && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">VSH</th>
                      )}
                      {optionalColumns.smr && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">SMR</th>
                      )}
                      {optionalColumns.chalkbrood && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Chalkbrood</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-surface dark:bg-surface divide-y divide-border">
                    {hiveScores.map((hive, index) => (
                      <tr key={hive.hive_id} className={index < 3 ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {index === 0 && <span className="text-yellow-500">🥇</span>}
                          {index === 1 && <span className="text-text-tertiary">🥈</span>}
                          {index === 2 && <span className="text-orange-400">🥉</span>}
                          {index > 2 && <span className="text-text-tertiary">{index + 1}</span>}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {hive.hive_number}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {hive.apiary_name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {hive.inspection_count}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                          {hive.score.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {hive.averages.brood_pattern.toFixed(1)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {hive.averages.population.toFixed(1)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {hive.averages.temperament.toFixed(1)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {hive.averages.swarming.toFixed(1)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {hive.averages.honey_yield.toFixed(1)}
                        </td>
                        {optionalColumns.calmness && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                            {hive.averages.calmness.toFixed(1)}
                          </td>
                        )}
                        {optionalColumns.recapping && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                            {hive.averages.recapping.toFixed(1)}
                          </td>
                        )}
                        {optionalColumns.vsh && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                            {hive.averages.vsh.toFixed(1)}
                          </td>
                        )}
                        {optionalColumns.smr && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                            {hive.averages.smr.toFixed(1)}
                          </td>
                        )}
                        {optionalColumns.chalkbrood && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-text-secondary">
                            {hive.averages.chalkbrood.toFixed(1)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  )
}