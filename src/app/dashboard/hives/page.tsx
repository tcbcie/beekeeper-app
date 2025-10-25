'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Apiary {
  id: string
  name: string
}

interface Queen {
  id: string
  queen_number: string
}

interface HiveConfiguration {
  brood_boxes: number
  honey_supers: number
  queen_excluder: boolean
  feeder: boolean
  feeder_type: string
  entrance_reducer: boolean
  varroa_mesh_floor: string
  right_sized_broodbox: boolean
}

interface Hive {
  id: string
  hive_number: string
  apiary_id: string | null
  queen_id: string | null
  queen_marked: boolean
  queen_marking_color: string | null
  queen_mated: boolean
  queen_clipped: boolean
  status: string
  notes: string | null
  colony_established_date: string | null
  queen_installed_date: string | null
  hive_type: string | null
  configuration: HiveConfiguration | null
  apiaries?: {
    name: string
  }
  queens?: {
    id: string
    queen_number: string
  }
  averages?: {
    brood_frames: number | null
    right_sized_frames: number | null
    brood_pattern: number | null
    temperament: number | null
    population: number | null
    inspection_count: number
  }
  queen_last_seen?: string | null
  eggs_last_present?: string | null
}

interface FormData {
  hive_number: string
  apiary_id: string
  queen_id: string
  queen_marked: boolean
  queen_marking_color: string
  queen_mated: boolean
  queen_clipped: boolean
  status: string
  notes: string
  colony_established_date: string
  queen_installed_date: string
  hive_type: string
  configuration: HiveConfiguration
}

export default function HivesPage() {
  const [hives, setHives] = useState<Hive[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [queens, setQueens] = useState<Queen[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingHive, setEditingHive] = useState<Hive | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const [filterApiaryId, setFilterApiaryId] = useState<string>('')
  const [timePeriod, setTimePeriod] = useState<string>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [formData, setFormData] = useState<FormData>({
    hive_number: '',
    apiary_id: '',
    queen_id: '',
    queen_marked: false,
    queen_marking_color: '',
    queen_mated: false,
    queen_clipped: false,
    status: 'active',
    notes: '',
    colony_established_date: '',
    queen_installed_date: '',
    hive_type: '',
    configuration: {
      brood_boxes: 1,
      honey_supers: 0,
      queen_excluder: false,
      feeder: false,
      feeder_type: '',
      entrance_reducer: false,
      varroa_mesh_floor: 'closed',
      right_sized_broodbox: false,
    },
  })

  // Calculate date range based on time period
  const getDateRange = useCallback(() => {
    const today = new Date()
    let startDate: Date | null = null

    switch (timePeriod) {
      case '3months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
        break
      case '6months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
        break
      case '1year':
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
        break
      case 'custom':
        if (customStartDate) startDate = new Date(customStartDate)
        break
      case 'all':
      default:
        return null
    }

    return startDate
  }, [timePeriod, customStartDate])

  const getLastQueenAndEggsInfo = useCallback(async (hiveId: string, userIdParam: string) => {
    const { data: inspections } = await supabase
      .from('inspections')
      .select('inspection_date, queen_seen, eggs_present')
      .eq('hive_id', hiveId)
      .eq('user_id', userIdParam)
      .order('inspection_date', { ascending: false })

    if (!inspections || inspections.length === 0) {
      return { queen_last_seen: null, eggs_last_present: null }
    }

    // Find most recent inspection where queen was seen
    const queenInspection = inspections.find(i => i.queen_seen === true)

    // Find most recent inspection where eggs were present
    const eggsInspection = inspections.find(i => i.eggs_present === true)

    return {
      queen_last_seen: queenInspection?.inspection_date || null,
      eggs_last_present: eggsInspection?.inspection_date || null,
    }
  }, [])

  const calculateInspectionAverages = useCallback(async (hiveId: string, userIdParam: string) => {
    const { data: inspections } = await supabase
      .from('inspections')
      .select('inspection_date, brood_frames, right_sized_frames, brood_pattern_rating, temperament_rating, population_strength')
      .eq('hive_id', hiveId)
      .eq('user_id', userIdParam)
      .order('inspection_date', { ascending: false })

    if (!inspections || inspections.length === 0) {
      return null
    }

    // Filter by date range
    let filteredInspections = inspections
    const startDate = getDateRange()

    if (startDate) {
      filteredInspections = inspections.filter(inspection => {
        const inspectionDate = new Date(inspection.inspection_date)

        // For custom range, check both start and end dates
        if (timePeriod === 'custom') {
          if (customStartDate && inspectionDate < new Date(customStartDate)) {
            return false
          }
          if (customEndDate && inspectionDate > new Date(customEndDate)) {
            return false
          }
          return true
        } else {
          // For preset ranges, just check start date
          return inspectionDate >= startDate
        }
      })
    }

    if (filteredInspections.length === 0) {
      return null
    }

    // Filter out null/0 values and calculate averages
    const broodFrames = filteredInspections
      .filter(i => i.brood_frames !== null && i.brood_frames > 0)
      .map(i => i.brood_frames)

    const rightSizedFrames = filteredInspections
      .filter(i => i.right_sized_frames !== null && i.right_sized_frames > 0)
      .map(i => i.right_sized_frames)

    const broodPatterns = filteredInspections
      .filter(i => i.brood_pattern_rating !== null && i.brood_pattern_rating > 0)
      .map(i => i.brood_pattern_rating)

    const temperaments = filteredInspections
      .filter(i => i.temperament_rating !== null && i.temperament_rating > 0)
      .map(i => i.temperament_rating)

    const populations = filteredInspections
      .filter(i => i.population_strength !== null && i.population_strength > 0)
      .map(i => i.population_strength)

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null

    // Count unique inspections that have at least one recorded metric
    const inspectionsWithData = new Set<string>()
    filteredInspections.forEach(inspection => {
      if ((inspection.brood_frames !== null && inspection.brood_frames > 0) ||
          (inspection.right_sized_frames !== null && inspection.right_sized_frames > 0) ||
          (inspection.brood_pattern_rating !== null && inspection.brood_pattern_rating > 0) ||
          (inspection.temperament_rating !== null && inspection.temperament_rating > 0) ||
          (inspection.population_strength !== null && inspection.population_strength > 0)) {
        inspectionsWithData.add(inspection.inspection_date)
      }
    })

    return {
      brood_frames: avg(broodFrames),
      right_sized_frames: avg(rightSizedFrames),
      brood_pattern: avg(broodPatterns),
      temperament: avg(temperaments),
      population: avg(populations),
      inspection_count: inspectionsWithData.size,
    }
  }, [timePeriod, customStartDate, customEndDate, getDateRange])

  const fetchHives = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // Try without joins first to see if we can get basic hive data
    const { data, error } = await supabase
      .from('hives')
      .select('*')
      .eq('user_id', currentUserId)
      .order('hive_number')

    console.log('Fetch hives response:', { data, error })

    if (error) {
      console.error('Error fetching hives:', error)
      alert(`Error loading hives: ${error.message}`)
    } else {
      console.log('Hives data received:', data)
      console.log('Number of hives:', data?.length || 0)

      // If we have hives, try to enrich them with apiary and queen data
      if (data && data.length > 0) {
        const enrichedHives = await Promise.all(
          data.map(async (hive) => {
            let apiaryName = null
            let queenNumber = null

            // Fetch apiary if exists
            if (hive.apiary_id) {
              const { data: apiaryData } = await supabase
                .from('apiaries')
                .select('name')
                .eq('id', hive.apiary_id)
                .eq('user_id', currentUserId)
                .single()
              apiaryName = apiaryData?.name
            }

            // Fetch queen if exists
            if (hive.queen_id) {
              const { data: queenData } = await supabase
                .from('queens')
                .select('id, queen_number')
                .eq('id', hive.queen_id)
                .eq('user_id', currentUserId)
                .single()
              if (queenData) {
                queenNumber = queenData.queen_number
              }
            }

            // Fetch inspection averages
            const averages = await calculateInspectionAverages(hive.id, currentUserId)

            // Fetch last queen seen and eggs present info
            const queenEggsInfo = await getLastQueenAndEggsInfo(hive.id, currentUserId)

            return {
              ...hive,
              apiaries: apiaryName ? { name: apiaryName } : undefined,
              queens: hive.queen_id && queenNumber ? { id: hive.queen_id, queen_number: queenNumber } : undefined,
              averages: averages,
              queen_last_seen: queenEggsInfo.queen_last_seen,
              eggs_last_present: queenEggsInfo.eggs_last_present,
            }
          })
        )
        console.log('Enriched hives:', enrichedHives)
        setHives(enrichedHives as Hive[])
      } else {
        setHives([])
      }
    }
    setLoading(false)
  }, [userId, calculateInspectionAverages, getLastQueenAndEggsInfo])

  const fetchApiaries = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data, error } = await supabase
      .from('apiaries')
      .select('id, name')
      .eq('user_id', currentUserId)
      .order('name')

    if (error) {
      console.error('Error fetching apiaries:', error)
    } else if (data) {
      setApiaries(data as Apiary[])
    }
  }, [userId])

  const fetchQueens = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data, error } = await supabase
      .from('queens')
      .select('id, queen_number')
      .eq('status', 'active')
      .eq('user_id', currentUserId)
      .order('queen_number')

    if (error) {
      console.error('Error fetching queens:', error)
    } else if (data) {
      setQueens(data as Queen[])
    }
  }, [userId])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
      fetchHives(id)
      fetchApiaries(id)
      fetchQueens(id)
    }
    initUser()
  }, [router, fetchHives, fetchApiaries, fetchQueens])

  // Refetch hives when time period changes
  useEffect(() => {
    if (!loading) {
      fetchHives()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriod, customStartDate, customEndDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      const dataToSubmit = {
        ...formData,
        apiary_id: formData.apiary_id || null,
        queen_id: formData.queen_id || null,
      }

      if (editingHive) {
        const { error } = await supabase
          .from('hives')
          .update(dataToSubmit)
          .eq('id', editingHive.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('hives')
          .insert([{ ...dataToSubmit, user_id: userId }])

        if (error) throw error
      }

      fetchHives()
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      }
    }
  }

  const handleEdit = (hive: Hive) => {
    setEditingHive(hive)
    setFormData({
      hive_number: hive.hive_number,
      apiary_id: hive.apiary_id || '',
      queen_id: hive.queen_id || '',
      queen_marked: hive.queen_marked || false,
      queen_marking_color: hive.queen_marking_color || '',
      queen_mated: hive.queen_mated || false,
      queen_clipped: hive.queen_clipped || false,
      status: hive.status,
      notes: hive.notes || '',
      colony_established_date: hive.colony_established_date || '',
      queen_installed_date: hive.queen_installed_date || '',
      hive_type: hive.hive_type || '',
      configuration: hive.configuration || {
        brood_boxes: 1,
        honey_supers: 0,
        queen_excluder: false,
        feeder: false,
        feeder_type: '',
        entrance_reducer: false,
        varroa_mesh_floor: 'closed',
        right_sized_broodbox: false,
      },
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this hive?')) {
      const { error } = await supabase
        .from('hives')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (!error) fetchHives()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingHive(null)
    setFormData({
      hive_number: '',
      apiary_id: '',
      queen_id: '',
      queen_marked: false,
      queen_marking_color: '',
      queen_mated: false,
      queen_clipped: false,
      status: 'active',
      notes: '',
      colony_established_date: '',
      queen_installed_date: '',
      hive_type: '',
      configuration: {
        brood_boxes: 1,
        honey_supers: 0,
        queen_excluder: false,
        feeder: false,
        feeder_type: '',
        entrance_reducer: false,
        varroa_mesh_floor: 'closed',
        right_sized_broodbox: false,
      },
    })
  }

  // Filter hives based on selected apiary
  const filteredHives = hives.filter(hive => {
    if (filterApiaryId && hive.apiary_id !== filterApiaryId) {
      return false
    }
    return true
  })

  if (loading) return <LoadingSpinner text="Loading hives..." />

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-responsive-3xl font-bold text-gray-900">Hives 🐝</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select
            value={filterApiaryId}
            onChange={(e) => setFilterApiaryId(e.target.value)}
            className="px-4 py-2 min-h-[48px] border border-gray-300 rounded-lg bg-white hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
          >
            <option value="">All Apiaries</option>
            {apiaries.map((apiary) => (
              <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-3 sm:py-2 min-h-[48px] bg-amber-600 text-white rounded-lg hover:bg-amber-700 active:bg-amber-800 font-medium flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Cancel' : 'Add Hive'}
          </button>
        </div>
      </div>

      {/* Time Period Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Inspection Average Period:</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTimePeriod('all')}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                  timePeriod === 'all'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setTimePeriod('3months')}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                  timePeriod === '3months'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                Last 3 Months
              </button>
              <button
                onClick={() => setTimePeriod('6months')}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                  timePeriod === '6months'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                Last 6 Months
              </button>
              <button
                onClick={() => setTimePeriod('1year')}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                  timePeriod === '1year'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                Last Year
              </button>
              <button
                onClick={() => setTimePeriod('custom')}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                  timePeriod === 'custom'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Custom Date Range Inputs */}
          {timePeriod === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 pl-0 md:pl-40">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
              <button
                onClick={() => {
                  setCustomStartDate('')
                  setCustomEndDate('')
                }}
                className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Clear Dates
              </button>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-xl font-semibold">
              {editingHive ? 'Edit Hive' : 'Add New Hive'}
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="submit"
                form="hive-form"
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-amber-600 text-white rounded-lg hover:bg-amber-700 active:bg-amber-800 touch-manipulation font-medium"
              >
                {editingHive ? 'Update' : 'Add'} Hive
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-gray-200 rounded-lg hover:bg-gray-300 active:bg-gray-400 touch-manipulation font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
          <form id="hive-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hive Number *</label>
              <input
                type="text"
                value={formData.hive_number}
                onChange={(e) => setFormData({...formData, hive_number: e.target.value})}
                placeholder="e.g., A-1, B-3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apiary</label>
              <select
                value={formData.apiary_id}
                onChange={(e) => setFormData({...formData, apiary_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select apiary</option>
                {apiaries.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Queen</label>
              <select
                value={formData.queen_id}
                onChange={(e) => setFormData({...formData, queen_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Record manual</option>
                {queens.map((q) => (
                  <option key={q.id} value={q.id}>{q.queen_number}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="active">Active</option>
                <option value="queenless">Queenless</option>
                <option value="retired">Retired</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.hive_type}
                onChange={(e) => setFormData({...formData, hive_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select type</option>
                <option value="Production">Production</option>
                <option value="Bee production">Bee production</option>
                <option value="Split">Split</option>
                <option value="Swarm">Swarm</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colony Established Date</label>
              <input
                type="date"
                value={formData.colony_established_date}
                onChange={(e) => setFormData({...formData, colony_established_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Queen Installed Date</label>
              <input
                type="date"
                value={formData.queen_installed_date}
                onChange={(e) => setFormData({...formData, queen_installed_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Show queen checkboxes only when no queen is assigned */}
            {!formData.queen_id && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Queen Status (if no specific queen assigned)</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, queen_marked: !formData.queen_marked})}
                      className={`px-4 py-3 min-h-[48px] rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-2 touch-manipulation ${
                        formData.queen_marked
                          ? 'bg-amber-600 text-white shadow-md hover:bg-amber-700 active:bg-amber-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                      }`}
                    >
                      <span className="text-lg">{formData.queen_marked ? '✓' : '○'}</span>
                      Queen Marked
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, queen_mated: !formData.queen_mated})}
                      className={`px-4 py-3 min-h-[48px] rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-2 touch-manipulation ${
                        formData.queen_mated
                          ? 'bg-green-600 text-white shadow-md hover:bg-green-700 active:bg-green-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                      }`}
                    >
                      <span className="text-lg">{formData.queen_mated ? '♥' : '○'}</span>
                      Queen Mated
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, queen_clipped: !formData.queen_clipped})}
                      className={`px-4 py-3 min-h-[48px] rounded-lg font-medium text-sm sm:text-base transition-all flex items-center justify-center gap-2 touch-manipulation ${
                        formData.queen_clipped
                          ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:bg-blue-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                      }`}
                    >
                      <span className="text-lg">{formData.queen_clipped ? '✂' : '○'}</span>
                      Queen Clipped
                    </button>
                  </div>
                </div>

                {/* Show marking color dropdown when Queen Marked is checked */}
                {formData.queen_marked && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Queen Marking Color</label>
                    <select
                      value={formData.queen_marking_color}
                      onChange={(e) => setFormData({...formData, queen_marking_color: e.target.value})}
                      className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select color</option>
                      <option value="White">White</option>
                      <option value="Yellow">Yellow</option>
                      <option value="Red">Red</option>
                      <option value="Green">Green</option>
                      <option value="Blue">Blue</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      International standard: White (1,6) | Yellow (2,7) | Red (3,8) | Green (4,9) | Blue (5,0)
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Hive Configuration Section */}
            <div className="md:col-span-2 p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
              <h4 className="text-md font-semibold text-amber-900 mb-4">Hive Configuration</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brood Boxes: {formData.configuration.brood_boxes}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({...formData, configuration: {...formData.configuration, brood_boxes: num}})}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          formData.configuration.brood_boxes === num
                            ? 'bg-amber-600 text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Honey Supers: {formData.configuration.honey_supers}
                  </label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({...formData, configuration: {...formData.configuration, honey_supers: num}})}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          formData.configuration.honey_supers === num
                            ? 'bg-amber-600 text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Varroa Mesh Floor</label>
                  <select
                    value={formData.configuration.varroa_mesh_floor}
                    onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, varroa_mesh_floor: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="closed">Closed</option>
                    <option value="open">Open</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feeder Type</label>
                  <select
                    value={formData.configuration.feeder_type}
                    onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, feeder_type: e.target.value, feeder: e.target.value !== ''}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">None</option>
                    <option value="top">Top Feeder</option>
                    <option value="frame">Frame Feeder</option>
                    <option value="entrance">Entrance Feeder</option>
                    <option value="boardman">Boardman Feeder</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, configuration: {...formData.configuration, queen_excluder: !formData.configuration.queen_excluder}})}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                      formData.configuration.queen_excluder
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {formData.configuration.queen_excluder ? '✓' : '○'} Queen Excluder
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({...formData, configuration: {...formData.configuration, entrance_reducer: !formData.configuration.entrance_reducer}})}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                      formData.configuration.entrance_reducer
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {formData.configuration.entrance_reducer ? '✓' : '○'} Entrance Reducer
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({...formData, configuration: {...formData.configuration, right_sized_broodbox: !formData.configuration.right_sized_broodbox}})}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                      formData.configuration.right_sized_broodbox
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {formData.configuration.right_sized_broodbox ? '✓' : '○'} Right-Sized Broodbox
                  </button>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Special characteristics, equipment, etc..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-amber-600 text-white rounded-lg hover:bg-amber-700 active:bg-amber-800 touch-manipulation font-medium"
              >
                {editingHive ? 'Update' : 'Add'} Hive
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-gray-200 rounded-lg hover:bg-gray-300 active:bg-gray-400 touch-manipulation font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHives.map((hive) => (
          <div key={hive.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-bold text-gray-900">{hive.hive_number}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                hive.status === 'active' ? 'bg-green-100 text-green-800' :
                hive.status === 'queenless' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {hive.status}
              </span>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">📍</span>
                <span>{hive.apiaries?.name || 'No apiary'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">👑</span>
                {hive.queens?.id ? (
                  <Link
                    href={`/dashboard/queens?id=${hive.queens.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium"
                  >
                    {hive.queens.queen_number}
                    <ExternalLink size={12} />
                  </Link>
                ) : (
                  <span>No queen</span>
                )}
              </div>
              {hive.hive_type && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">🏷️</span>
                  <span className="font-medium text-amber-700">{hive.hive_type}</span>
                </div>
              )}
              {hive.colony_established_date && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">📅</span>
                  <span className="text-xs">Colony est: {new Date(hive.colony_established_date).toLocaleDateString()}</span>
                </div>
              )}
              {hive.queen_installed_date && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">👑📅</span>
                  <span className="text-xs">Queen since: {new Date(hive.queen_installed_date).toLocaleDateString()}</span>
                </div>
              )}
              {hive.queen_last_seen && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">👑👁️</span>
                  <span className="text-xs text-green-700 font-medium">Last seen: {new Date(hive.queen_last_seen).toLocaleDateString()}</span>
                </div>
              )}
              {hive.eggs_last_present && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">🥚</span>
                  <span className="text-xs text-blue-700 font-medium">Eggs: {new Date(hive.eggs_last_present).toLocaleDateString()}</span>
                </div>
              )}
              {hive.notes && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-gray-700 text-xs">
                  {hive.notes}
                </div>
              )}
            </div>

            {hive.configuration && (
              <div className="mb-4 p-3 bg-amber-50 rounded border border-amber-200">
                <div className="text-xs font-semibold text-amber-900 mb-3">Hive Setup</div>

                {/* Visual Hive Stack */}
                <div className="flex flex-col items-center gap-1 mb-3">
                  {/* Honey Supers (top to bottom) */}
                  {Array.from({ length: hive.configuration.honey_supers }).map((_, i) => (
                    <div key={`super-${i}`} className="w-full h-8 bg-yellow-300 border-2 border-yellow-500 rounded flex items-center justify-center text-xs font-semibold">
                      🍯 Super {i + 1}
                    </div>
                  ))}

                  {/* Queen Excluder - always directly above brood boxes if present */}
                  {hive.configuration.queen_excluder && (
                    <div className="w-full h-3 bg-gray-400 border-2 border-gray-600 rounded flex items-center justify-center text-xs font-bold">
                      ═══
                    </div>
                  )}

                  {/* Brood Boxes (top to bottom) */}
                  {Array.from({ length: hive.configuration.brood_boxes }).map((_, i) => (
                    <div key={`brood-${i}`} className="w-full h-10 bg-amber-200 border-2 border-amber-500 rounded flex items-center justify-center text-xs font-semibold">
                      🐝 Brood {i + 1}
                    </div>
                  ))}

                  {/* Varroa Mesh Floor - always at the very bottom */}
                  <div className={`w-full h-6 ${hive.configuration.varroa_mesh_floor === 'open' ? 'bg-gray-200' : 'bg-amber-700'} border-2 border-amber-900 rounded flex items-center justify-center text-xs font-semibold`}>
                    {hive.configuration.varroa_mesh_floor === 'open' ? '▒▒▒' : '███'}
                  </div>
                </div>

                {/* Configuration Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {hive.configuration.feeder_type && (
                    <div className="flex items-center gap-1">
                      <span>🍯</span>
                      <span className="capitalize">{hive.configuration.feeder_type} feeder</span>
                    </div>
                  )}
                  {hive.configuration.entrance_reducer && (
                    <div className="flex items-center gap-1">
                      <span>🚪</span>
                      <span>Entrance reducer</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {hive.averages && (
              <div className="mb-4 p-3 bg-indigo-50 rounded border border-indigo-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-indigo-900">Inspection Averages</span>
                  <span className="text-xs text-indigo-600 font-medium">
                    {hive.averages.inspection_count} inspection{hive.averages.inspection_count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  {hive.averages.brood_frames !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frames with Brood:</span>
                      <span className="font-semibold text-indigo-700">{hive.averages.brood_frames.toFixed(1)}</span>
                    </div>
                  )}
                  {hive.configuration?.right_sized_broodbox && hive.averages.right_sized_frames !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Right-Sized Frames:</span>
                      <span className="font-semibold text-amber-700">{hive.averages.right_sized_frames.toFixed(1)}</span>
                    </div>
                  )}
                  {hive.averages.brood_pattern !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Brood Pattern:</span>
                      <span className="font-semibold text-indigo-700">{'⭐'.repeat(Math.round(hive.averages.brood_pattern))}</span>
                    </div>
                  )}
                  {hive.averages.temperament !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Temperament:</span>
                      <span className="font-semibold text-indigo-700">{'⭐'.repeat(Math.round(hive.averages.temperament))}</span>
                    </div>
                  )}
                  {hive.averages.population !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Population:</span>
                      <span className="font-semibold text-indigo-700">{'⭐'.repeat(Math.round(hive.averages.population))}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(hive)}
                className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(hive.id)}
                className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredHives.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          {filterApiaryId
            ? 'No hives found for this apiary. Select "All Apiaries" or add a new hive.'
            : 'No hives found. Add your first hive!'}
        </div>
      )}
    </div>
  )
}