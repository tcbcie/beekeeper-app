'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, Edit2, Trash2, X, Minus, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { initializeNotifications, scheduleBatchNotifications } from '@/lib/notifications'

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
  grafts_accepted: number | null
  queens_hatched: number | null
  queens_mated: number | null
  acceptance_check_date: string | null
  first_option_to_cage_date: string | null
  second_option_to_cage_date: string | null
  emergence_date: string | null
  notes: string | null
  enable_browser_notifications: boolean
  enable_email_digest: boolean
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
  grafts_accepted: string
  queens_hatched: string
  queens_mated: string
  acceptance_check_date: string
  first_option_to_cage_date: string
  second_option_to_cage_date: string
  emergence_date: string
  notes: string
  enable_browser_notifications: boolean
  enable_email_digest: boolean
}

// Format date to Irish format (DD/MM/YYYY)
const formatDateIrish = (dateString: string | null): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default function BatchesPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<Batch[]>([])
  const [queens, setQueens] = useState<Queen[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [filteredHives, setFilteredHives] = useState<Hive[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'planning' | 'selection'>('planning')

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
  })
  const [optionalColumns, setOptionalColumns] = useState({
    calmness: false,
    recapping: false,
    vsh: false,
    smr: false,
    chalkbrood: false,
  })
  const [hiveScores, setHiveScores] = useState<any[]>([])
  const [loadingScores, setLoadingScores] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    batch_name: '',
    mother_queen_id: '',
    starter_apiary_id: '',
    starter_colony_hive_id: '',
    graft_date: new Date().toISOString().split('T')[0],
    cell_count: '',
    grafts_accepted: '',
    queens_hatched: '',
    queens_mated: '',
    acceptance_check_date: '',
    first_option_to_cage_date: '',
    second_option_to_cage_date: '',
    emergence_date: '',
    notes: '',
    enable_browser_notifications: false,
    enable_email_digest: false,
  })

  const fetchBatches = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('rearing_batches')
      .select('*, queens(queen_number), hives(hive_number, apiaries(name))')
      .eq('user_id', currentUserId)
      .order('graft_date', { ascending: false })

    if (data) setBatches(data)
    setLoading(false)
  }, [userId])

  const fetchApiaries = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('apiaries')
      .select('id, name')
      .eq('user_id', currentUserId)
      .order('name')

    if (data) setApiaries(data)
  }, [userId])

  const fetchHives = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('hives')
      .select('id, hive_number, apiary_id')
      .eq('user_id', currentUserId)
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

    // Then, get hives with apiaries for these queens
    const queenIds = queensData.map(q => q.id)
    const { data: hivesData } = await supabase
      .from('hives')
      .select('queen_id, hive_number, apiaries(name)')
      .in('queen_id', queenIds)
      .eq('user_id', currentUserId)

    // Merge the data
    const queensWithHives: Queen[] = queensData.map(queen => ({
      ...queen,
      hives: hivesData?.filter(h => h.queen_id === queen.id).map(h => ({
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
    }
    initUser()
  }, [router, fetchBatches, fetchQueens, fetchApiaries, fetchHives])

  // Initialize browser notifications
  useEffect(() => {
    const setupNotifications = async () => {
      const isGranted = await initializeNotifications()
      if (isGranted) {
        console.log('Browser notifications initialized successfully')
      }
    }
    setupNotifications()
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

  // Auto-calculate acceptance check date (graft_date + 1 day)
  useEffect(() => {
    if (formData.graft_date) {
      const graftDate = new Date(formData.graft_date)
      const acceptanceDate = new Date(graftDate)
      acceptanceDate.setDate(acceptanceDate.getDate() + 1)
      const calculatedDate = acceptanceDate.toISOString().split('T')[0]

      // Only update if the calculated date is different from current acceptance_check_date
      // This prevents infinite loops
      if (formData.acceptance_check_date !== calculatedDate && !editingBatch) {
        setFormData(prev => ({
          ...prev,
          acceptance_check_date: calculatedDate
        }))
      }
    }
  }, [formData.graft_date, formData.acceptance_check_date, editingBatch])

  // Auto-calculate first option to cage date (graft_date + 5 days)
  useEffect(() => {
    if (formData.graft_date) {
      const graftDate = new Date(formData.graft_date)
      const cageDate = new Date(graftDate)
      cageDate.setDate(cageDate.getDate() + 5)
      const calculatedDate = cageDate.toISOString().split('T')[0]

      if (formData.first_option_to_cage_date !== calculatedDate && !editingBatch) {
        setFormData(prev => ({
          ...prev,
          first_option_to_cage_date: calculatedDate
        }))
      }
    }
  }, [formData.graft_date, formData.first_option_to_cage_date, editingBatch])

  // Auto-calculate second option to cage date (graft_date + 10 days)
  useEffect(() => {
    if (formData.graft_date) {
      const graftDate = new Date(formData.graft_date)
      const cageDate = new Date(graftDate)
      cageDate.setDate(cageDate.getDate() + 10)
      const calculatedDate = cageDate.toISOString().split('T')[0]

      if (formData.second_option_to_cage_date !== calculatedDate && !editingBatch) {
        setFormData(prev => ({
          ...prev,
          second_option_to_cage_date: calculatedDate
        }))
      }
    }
  }, [formData.graft_date, formData.second_option_to_cage_date, editingBatch])

  // Auto-calculate emergence date (graft_date + 12 days)
  useEffect(() => {
    if (formData.graft_date) {
      const graftDate = new Date(formData.graft_date)
      const emergenceDate = new Date(graftDate)
      emergenceDate.setDate(emergenceDate.getDate() + 12)
      const calculatedDate = emergenceDate.toISOString().split('T')[0]

      // Only update if the calculated date is different from current emergence_date
      // This prevents infinite loops
      if (formData.emergence_date !== calculatedDate && !editingBatch) {
        setFormData(prev => ({
          ...prev,
          emergence_date: calculatedDate
        }))
      }
    }
  }, [formData.graft_date, formData.emergence_date, editingBatch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      const dataToSubmit = {
        batch_name: formData.batch_name,
        mother_queen_id: formData.mother_queen_id || null,
        starter_colony_hive_id: formData.starter_colony_hive_id || null,
        graft_date: formData.graft_date,
        cell_count: formData.cell_count ? parseInt(formData.cell_count) : null,
        grafts_accepted: formData.grafts_accepted ? parseInt(formData.grafts_accepted) : null,
        queens_hatched: formData.queens_hatched ? parseInt(formData.queens_hatched) : null,
        queens_mated: formData.queens_mated ? parseInt(formData.queens_mated) : null,
        acceptance_check_date: formData.acceptance_check_date || null,
        first_option_to_cage_date: formData.first_option_to_cage_date || null,
        second_option_to_cage_date: formData.second_option_to_cage_date || null,
        emergence_date: formData.emergence_date || null,
        notes: formData.notes || null,
        enable_browser_notifications: formData.enable_browser_notifications,
        enable_email_digest: formData.enable_email_digest,
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
      alert(errorMessage)
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
      grafts_accepted: batch.grafts_accepted?.toString() || '',
      queens_hatched: batch.queens_hatched?.toString() || '',
      queens_mated: batch.queens_mated?.toString() || '',
      acceptance_check_date: batch.acceptance_check_date || '',
      first_option_to_cage_date: batch.first_option_to_cage_date || '',
      second_option_to_cage_date: batch.second_option_to_cage_date || '',
      emergence_date: batch.emergence_date || '',
      notes: batch.notes || '',
      enable_browser_notifications: batch.enable_browser_notifications || false,
      enable_email_digest: batch.enable_email_digest || false,
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
            brood_pattern_rating,
            population_strength,
            temperament_rating,
            swarming_signs,
            honey_stores,
            calmness_rating,
            recapping_speed,
            vsh_score,
            smr_percentage,
            chalkbrood_severity
          )
        `)
        .eq('user_id', userId)

      // Apply apiary filter
      if (selectedApiary !== 'all') {
        query = query.eq('apiary_id', selectedApiary)
      }

      const { data: hivesData, error } = await query

      if (error) throw error

      // Calculate averages and scores for each hive
      const scored = hivesData?.map((hive: any) => {
        let inspections = hive.inspections || []

        // Filter inspections by date range
        if (startDate) {
          inspections = inspections.filter((i: any) => {
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
          brood_pattern: inspections.reduce((sum: number, i: any) => sum + (i.brood_pattern_rating || 0), 0) / inspections.length,
          population: inspections.reduce((sum: number, i: any) => sum + (i.population_strength || 0), 0) / inspections.length,
          temperament: inspections.reduce((sum: number, i: any) => sum + (i.temperament_rating || 0), 0) / inspections.length,
          swarming: inspections.filter((i: any) => i.swarming_signs).length / inspections.length, // Percentage
          honey_yield: inspections.reduce((sum: number, i: any) => {
            const stores = i.honey_stores?.toLowerCase() || ''
            if (stores.includes('full')) return sum + 5
            if (stores.includes('good')) return sum + 4
            if (stores.includes('moderate')) return sum + 3
            if (stores.includes('low')) return sum + 2
            return sum + 1
          }, 0) / inspections.length,
          calmness: inspections.reduce((sum: number, i: any) => sum + (i.calmness_rating || 0), 0) / inspections.length,
          recapping: inspections.reduce((sum: number, i: any) => sum + (i.recapping_speed || 0), 0) / inspections.length,
          vsh: inspections.reduce((sum: number, i: any) => sum + (i.vsh_score || 0), 0) / inspections.length,
          smr: inspections.reduce((sum: number, i: any) => sum + (i.smr_percentage || 0), 0) / inspections.length,
          chalkbrood: inspections.reduce((sum: number, i: any) => sum + (i.chalkbrood_severity || 0), 0) / inspections.length,
        }

        // Calculate weighted score (lower swarming is better, so invert it)
        const score =
          (avg.brood_pattern * weights.brood_pattern) +
          (avg.population * weights.population) +
          (avg.temperament * weights.temperament) +
          ((1 - avg.swarming) * 5 * weights.swarming) + // Invert swarming tendency
          (avg.honey_yield * weights.honey_yield)

        return {
          hive_id: hive.id,
          hive_number: hive.hive_number,
          apiary_name: hive.apiaries?.name || 'Unknown',
          inspection_count: inspections.length,
          averages: avg,
          score: score,
        }
      }).filter(Boolean) as any[] // Remove null entries

      // Sort by score descending
      scored?.sort((a: any, b: any) => b.score - a.score)

      setHiveScores(scored || [])
    } catch (error) {
      console.error('Error calculating hive scores:', error)
      // Silently fail - user will see empty state message instead of alert
      setHiveScores([])
    } finally {
      setLoadingScores(false)
    }
  }, [userId, selectedApiary, timePeriod, customStartDate, customEndDate, weights, getDateRange])

  // Recalculate when filters or weights change
  useEffect(() => {
    if (activeTab === 'selection') {
      calculateHiveScores()
    }
  }, [activeTab, selectedApiary, timePeriod, customStartDate, customEndDate, weights, calculateHiveScores])

  const resetForm = () => {
    setShowForm(false)
    setEditingBatch(null)
    setFormData({
      batch_name: '',
      mother_queen_id: '',
      starter_apiary_id: '',
      starter_colony_hive_id: '',
      graft_date: new Date().toISOString().split('T')[0],
      cell_count: '',
      grafts_accepted: '',
      queens_hatched: '',
      queens_mated: '',
      acceptance_check_date: '',
      first_option_to_cage_date: '',
      second_option_to_cage_date: '',
      emergence_date: '',
      notes: '',
      enable_browser_notifications: false,
      enable_email_digest: false,
    })
  }

  if (loading) return <LoadingSpinner text="Loading Queen Rearing..." />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Queen Rearing 🥚</h1>
          <p className="text-sm text-gray-600 mt-1">3-5-8 - The Queen is made!</p>
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
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('planning')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'planning'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Planning
            </button>
            <button
              onClick={() => setActiveTab('selection')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'selection'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">
                {editingBatch ? 'Edit Batch' : 'Create New Batch'}
              </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name *</label>
              <input
                type="text"
                value={formData.batch_name}
                onChange={(e) => setFormData({...formData, batch_name: e.target.value})}
                placeholder="e.g., Spring 2024 - Batch 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Breeder Queen</label>
              <select
                value={formData.mother_queen_id}
                onChange={(e) => setFormData({...formData, mother_queen_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
            <div className="md:col-span-2 bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Graft Date *
                  </label>
                  <input
                    type="date"
                    value={formData.graft_date}
                    onChange={(e) => setFormData({...formData, graft_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Check</label>
                  <input
                    type="date"
                    value={formData.acceptance_check_date}
                    onChange={(e) => setFormData({...formData, acceptance_check_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Graft + 1 day</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">1st Option to Cage</label>
                  <input
                    type="date"
                    value={formData.first_option_to_cage_date}
                    onChange={(e) => setFormData({...formData, first_option_to_cage_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Graft + 5 days</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">2nd Option to Cage</label>
                  <input
                    type="date"
                    value={formData.second_option_to_cage_date}
                    onChange={(e) => setFormData({...formData, second_option_to_cage_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Graft + 10 days</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    Expected Day to Hatch
                    <div className="group relative">
                      <MessageCircle size={14} className="text-gray-400 cursor-help" />
                      <div className="invisible group-hover:visible absolute left-0 top-6 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                        Assuming the larvae are approximately four days after the egg was laid, they should all be of the same age and ideally no more than 12 hours old at the time of grafting.
                      </div>
                    </div>
                  </label>
                  <input
                    type="date"
                    value={formData.emergence_date}
                    onChange={(e) => setFormData({...formData, emergence_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Graft + 12 days</p>
                </div>
              </div>
            </div>

            {/* Starter Colony Selection - Grouped */}
            <div className="md:col-span-2 bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Starter Colony</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apiary</label>
                  <select
                    value={formData.starter_apiary_id}
                    onChange={(e) => {
                      setFormData({...formData, starter_apiary_id: e.target.value, starter_colony_hive_id: ''})
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select apiary (optional)</option>
                    {apiaries.map((apiary) => (
                      <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hive</label>
                  <select
                    value={formData.starter_colony_hive_id}
                    onChange={(e) => setFormData({...formData, starter_colony_hive_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={!formData.starter_apiary_id}
                  >
                    <option value="">Select hive (optional)</option>
                    {filteredHives.map((hive) => (
                      <option key={hive.id} value={hive.id}>{hive.hive_number}</option>
                    ))}
                  </select>
                  {!formData.starter_apiary_id && (
                    <p className="text-xs text-gray-500 mt-1">Select an apiary first</p>
                  )}
                </div>
              </div>
            </div>

            {/* Batch Quantities - Grouped Vertically */}
            <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Batch Quantities</h4>
              <div className="space-y-3">
                {/* Number of Grafts */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Number of Grafts</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.cell_count || '0')
                        if (val > 0) setFormData({...formData, cell_count: (val - 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.cell_count}
                      onChange={(e) => setFormData({...formData, cell_count: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.cell_count || '0')
                        setFormData({...formData, cell_count: (val + 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Grafts Accepted */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Grafts Accepted</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.grafts_accepted || '0')
                        if (val > 0) setFormData({...formData, grafts_accepted: (val - 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.grafts_accepted}
                      onChange={(e) => setFormData({...formData, grafts_accepted: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.grafts_accepted || '0')
                        setFormData({...formData, grafts_accepted: (val + 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Queens Hatched */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Queens Hatched</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_hatched || '0')
                        if (val > 0) setFormData({...formData, queens_hatched: (val - 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.queens_hatched}
                      onChange={(e) => setFormData({...formData, queens_hatched: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_hatched || '0')
                        setFormData({...formData, queens_hatched: (val + 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Queens Mated */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Queens Mated</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_mated || '0')
                        if (val > 0) setFormData({...formData, queens_mated: (val - 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={formData.queens_mated}
                      onChange={(e) => setFormData({...formData, queens_mated: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center"
                      min="0"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(formData.queens_mated || '0')
                        setFormData({...formData, queens_mated: (val + 1).toString()})
                      }}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Weather conditions, acceptance rate, observations..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Notification Preferences - Grouped */}
            <div className="md:col-span-2 bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Notification Preferences</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="browser-notifications"
                    checked={formData.enable_browser_notifications}
                    onChange={(e) => setFormData({...formData, enable_browser_notifications: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="browser-notifications" className="ml-2 text-sm text-gray-700">
                    Enable Browser Notifications
                    <span className="block text-xs text-gray-500 mt-0.5">
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
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="email-digest" className="ml-2 text-sm text-gray-700">
                    Include in Weekly Email Digest
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Receive a weekly summary of upcoming dates for this batch
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {editingBatch ? 'Update' : 'Create'} Batch
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
            </div>
          </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Breeder Queen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Graft Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grafts</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accepted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hatched</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acceptance Check</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {batches.map((batch: Batch) => (
              <tr key={batch.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{batch.batch_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.queens?.queen_number || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatDateIrish(batch.graft_date)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.cell_count || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.grafts_accepted || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.queens_hatched || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{batch.queens_mated || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatDateIrish(batch.acceptance_check_date)}</td>
                <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                  <button onClick={() => handleEdit(batch)} className="text-blue-600 hover:text-blue-900">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(batch.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {batches.length === 0 && (
          <div className="text-center py-8 text-gray-500">No rearing batch found. Create your first!</div>
        )}
          </div>
        </>
      )}

      {/* Selection Tab Content */}
      {activeTab === 'selection' && (
        <div className="space-y-6">
          {/* Filters Row */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Breeder Queen Selection Filters</h3>

            {/* Apiary Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Apiary</label>
              <select
                value={selectedApiary}
                onChange={(e) => setSelectedApiary(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTimePeriod('currentyear')}
                  className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                    timePeriod === 'currentyear'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  Current Year ({new Date().getFullYear()})
                </button>
                <button
                  onClick={() => setTimePeriod('6months')}
                  className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                    timePeriod === '6months'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  Last 6 Months
                </button>
                <button
                  onClick={() => setTimePeriod('1year')}
                  className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                    timePeriod === '1year'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  Last Year
                </button>
                <button
                  onClick={() => setTimePeriod('all')}
                  className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                    timePeriod === 'all'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setTimePeriod('custom')}
                  className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                    timePeriod === 'custom'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  Custom Range
                </button>
              </div>
            </div>

            {/* Custom Date Range Inputs */}
            {timePeriod === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 mt-4 pl-0 md:pl-0">
                <label className="text-sm font-medium text-gray-700">From:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <label className="text-sm font-medium text-gray-700">To:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
                <button
                  onClick={() => {
                    setCustomStartDate('')
                    setCustomEndDate('')
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Weights Row */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weight Criterias (1-5)</h3>
            <p className="text-sm text-gray-600 mb-4">Assign importance to each trait. Higher weights = more influence on ranking.</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Brood Pattern Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Brood Pattern</label>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => setWeights({ ...weights, brood_pattern: weight })}
                      className={`w-10 h-10 rounded-md font-semibold transition-all ${
                        weights.brood_pattern === weight
                          ? 'bg-blue-600 text-white shadow-md scale-110'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>

              {/* Population Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Population</label>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => setWeights({ ...weights, population: weight })}
                      className={`w-10 h-10 rounded-md font-semibold transition-all ${
                        weights.population === weight
                          ? 'bg-blue-600 text-white shadow-md scale-110'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperament Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Temperament</label>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => setWeights({ ...weights, temperament: weight })}
                      className={`w-10 h-10 rounded-md font-semibold transition-all ${
                        weights.temperament === weight
                          ? 'bg-blue-600 text-white shadow-md scale-110'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>

              {/* Swarming Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Swarming (Low=Good)</label>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => setWeights({ ...weights, swarming: weight })}
                      className={`w-10 h-10 rounded-md font-semibold transition-all ${
                        weights.swarming === weight
                          ? 'bg-blue-600 text-white shadow-md scale-110'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>

              {/* Honey Yield Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Honey Yield</label>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((weight) => (
                    <button
                      key={weight}
                      onClick={() => setWeights({ ...weights, honey_yield: weight })}
                      className={`w-10 h-10 rounded-md font-semibold transition-all ${
                        weights.honey_yield === weight
                          ? 'bg-blue-600 text-white shadow-md scale-110'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Optional Criteria */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Optional Criteria</h3>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalColumns.calmness}
                  onChange={(e) => setOptionalColumns({ ...optionalColumns, calmness: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Calmness</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalColumns.recapping}
                  onChange={(e) => setOptionalColumns({ ...optionalColumns, recapping: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Recapping</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalColumns.vsh}
                  onChange={(e) => setOptionalColumns({ ...optionalColumns, vsh: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">VSH</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalColumns.smr}
                  onChange={(e) => setOptionalColumns({ ...optionalColumns, smr: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">SMR</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionalColumns.chalkbrood}
                  onChange={(e) => setOptionalColumns({ ...optionalColumns, chalkbrood: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Chalkbrood</span>
              </label>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Ranked Hives</h3>
              <p className="text-sm text-gray-600 mt-1">Based on inspection averages and weighted scores</p>
            </div>

            {loadingScores ? (
              <div className="p-12">
                <LoadingSpinner text="Calculating scores..." />
              </div>
            ) : hiveScores.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">Not enough data to calculate scores</p>
                <p className="text-sm">Each hive requires at least 3 inspection records in the selected period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hive</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Apiary</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspections</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brood Pattern</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Population</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temperament</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Swarming %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Honey Yield</th>
                      {optionalColumns.calmness && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calmness</th>
                      )}
                      {optionalColumns.recapping && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recapping</th>
                      )}
                      {optionalColumns.vsh && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">VSH</th>
                      )}
                      {optionalColumns.smr && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SMR</th>
                      )}
                      {optionalColumns.chalkbrood && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chalkbrood</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {hiveScores.map((hive, index) => (
                      <tr key={hive.hive_id} className={index < 3 ? 'bg-green-50' : ''}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index === 0 && <span className="text-yellow-500">🥇</span>}
                          {index === 1 && <span className="text-gray-400">🥈</span>}
                          {index === 2 && <span className="text-orange-400">🥉</span>}
                          {index > 2 && <span className="text-gray-500">{index + 1}</span>}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {hive.hive_number}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {hive.apiary_name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {hive.inspection_count}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                          {hive.score.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {hive.averages.brood_pattern.toFixed(1)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {hive.averages.population.toFixed(1)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {hive.averages.temperament.toFixed(1)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {(hive.averages.swarming * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {hive.averages.honey_yield.toFixed(1)}
                        </td>
                        {optionalColumns.calmness && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {hive.averages.calmness.toFixed(1)}
                          </td>
                        )}
                        {optionalColumns.recapping && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {hive.averages.recapping.toFixed(1)}
                          </td>
                        )}
                        {optionalColumns.vsh && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {hive.averages.vsh.toFixed(1)}
                          </td>
                        )}
                        {optionalColumns.smr && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {hive.averages.smr.toFixed(1)}
                          </td>
                        )}
                        {optionalColumns.chalkbrood && (
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
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
  )
}