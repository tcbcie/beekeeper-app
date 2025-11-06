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
  brood_boxes: number // Legacy field - will be deprecated
  brood_boxes_full: number
  brood_boxes_half: number
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
  order_in_apiary: number | null
  row_in_apiary: number | null
  order_direction: 'entrances' | 'backs' | null
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
  user_id?: string
  apiaries?: {
    name: string
  }
  queens?: {
    id: string
    queen_number: string
    marking_color?: string
  }
  queen_last_seen?: string | null
  eggs_last_present?: string | null
  team_name?: string | null
  is_shared?: boolean
  last_record?: {
    date: string
    type: string
  } | null
}

interface FormData {
  hive_number: string
  apiary_id: string
  order_in_apiary: number | null
  row_in_apiary: number | null
  order_direction: 'entrances' | 'backs'
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

  // Initialize filters from sessionStorage
  const [filterApiaryId, setFilterApiaryId] = useState<string>('')
  const [ownershipFilter, setOwnershipFilter] = useState<'my' | 'team' | 'all'>('my')
  const [filtersLoaded, setFiltersLoaded] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    hive_number: '',
    apiary_id: '',
    order_in_apiary: null,
    row_in_apiary: null,
    order_direction: 'entrances',
    queen_id: '',
    queen_marked: false,
    queen_marking_color: '',
    queen_mated: false,
    queen_clipped: false,
    status: 'active',
    notes: '',
    colony_established_date: new Date().toISOString().split('T')[0],
    queen_installed_date: new Date().toISOString().split('T')[0],
    hive_type: '',
    configuration: {
      brood_boxes: 1, // Legacy field
      brood_boxes_full: 1,
      brood_boxes_half: 0,
      honey_supers: 0,
      queen_excluder: false,
      feeder: false,
      feeder_type: '',
      entrance_reducer: false,
      varroa_mesh_floor: 'closed',
      right_sized_broodbox: false,
    },
  })

  const fetchHives = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // First, get list of shared apiary IDs for this user (apiaries shared WITH teams they're in)
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

    // Build query based on ownership filter with joins for better performance
    let query = supabase
      .from('hives')
      .select(`
        *,
        apiaries(name)
      `)

    // Apply ownership filter
    if (ownershipFilter === 'my') {
      // Only my hives
      query = query.eq('user_id', currentUserId)
    } else if (ownershipFilter === 'team') {
      // Only team hives (hives from shared apiaries that I'm not the owner of)
      if (sharedApiaryIds.length > 0) {
        query = query
          .in('apiary_id', sharedApiaryIds)
          .neq('user_id', currentUserId)
      } else {
        // No shared apiaries, return empty result
        setHives([])
        setLoading(false)
        return
      }
    } else {
      // 'all' = my hives + hives from shared apiaries only
      if (sharedApiaryIds.length > 0) {
        query = query.or(`user_id.eq.${currentUserId},and(apiary_id.in.(${sharedApiaryIds.join(',')}),user_id.neq.${currentUserId})`)
      } else {
        // No shared apiaries, only show my hives
        query = query.eq('user_id', currentUserId)
      }
    }

    const { data, error } = await query.order('hive_number')

    if (error) {
      console.error('Error fetching hives:', error)
      alert(`Error loading hives: ${error.message}`)
      setHives([])
    } else if (data && data.length > 0) {
      // Use joined data from query - apiaries and queens are already included
      const hiveIds = data.map(h => h.id)

      // Batch query for team info for shared apiaries
      const sharedApiaryIds = [...new Set(
        data
          .filter(h => h.user_id !== currentUserId && h.apiary_id)
          .map(h => h.apiary_id)
          .filter((id): id is string => id !== null)
      )]

      const teamDataMap = new Map<string, { name: string }>()
      if (sharedApiaryIds.length > 0) {
        const { data: teamApiaryData } = await supabase
          .from('team_apiaries')
          .select('apiary_id, teams(name)')
          .in('apiary_id', sharedApiaryIds)

        if (teamApiaryData) {
          teamApiaryData.forEach((ta) => {
            const typedData = ta as { apiary_id: string; teams: { name: string } | { name: string }[] | null }
            if (typedData.teams) {
              const teamName = Array.isArray(typedData.teams)
                ? typedData.teams[0]?.name || ''
                : typedData.teams.name
              if (teamName) {
                teamDataMap.set(typedData.apiary_id, { name: teamName })
              }
            }
          })
        }
      }

      // Batch query for queens
      const queenIds = [...new Set(
        data
          .filter(h => h.queen_id)
          .map(h => h.queen_id)
          .filter((id): id is string => id !== null)
      )]

      const queensMap = new Map<string, { id: string; queen_number: string; marking_color?: string }>()
      if (queenIds.length > 0) {
        const { data: queensData } = await supabase
          .from('queens')
          .select('id, queen_number, marking_color')
          .in('id', queenIds)

        queensData?.forEach(queen => {
          queensMap.set(queen.id, queen)
        })
      }

      // Batch query for all inspections for these hives
      const { data: allInspections } = await supabase
        .from('inspections')
        .select('hive_id, inspection_date, brood_frames, right_sized_frames, brood_pattern_rating, temperament_rating, population_strength, queen_seen, eggs_present')
        .in('hive_id', hiveIds)
        .eq('user_id', currentUserId)
        .order('inspection_date', { ascending: false })

      // Group inspections by hive_id
      const inspectionsByHive = new Map<string, typeof allInspections>()
      allInspections?.forEach(inspection => {
        if (!inspectionsByHive.has(inspection.hive_id)) {
          inspectionsByHive.set(inspection.hive_id, [])
        }
        inspectionsByHive.get(inspection.hive_id)!.push(inspection)
      })

      // Batch query for last record of each type for these hives
      const [
        { data: lastInspections },
        { data: lastTreatments },
        { data: lastChecks },
        { data: lastFeedings },
        { data: lastHarvests }
      ] = await Promise.all([
        supabase
          .from('inspections')
          .select('hive_id, inspection_date')
          .in('hive_id', hiveIds)
          .eq('user_id', currentUserId)
          .order('inspection_date', { ascending: false })
          .limit(hiveIds.length),
        supabase
          .from('varroa_treatments')
          .select('hive_id, treatment_date')
          .in('hive_id', hiveIds)
          .eq('user_id', currentUserId)
          .order('treatment_date', { ascending: false })
          .limit(hiveIds.length),
        supabase
          .from('varroa_checks')
          .select('hive_id, check_date')
          .in('hive_id', hiveIds)
          .eq('user_id', currentUserId)
          .order('check_date', { ascending: false })
          .limit(hiveIds.length),
        supabase
          .from('feedings')
          .select('hive_id, feed_date')
          .in('hive_id', hiveIds)
          .eq('user_id', currentUserId)
          .order('feed_date', { ascending: false })
          .limit(hiveIds.length),
        supabase
          .from('harvests')
          .select('hive_id, harvest_date')
          .in('hive_id', hiveIds)
          .eq('user_id', currentUserId)
          .order('harvest_date', { ascending: false })
          .limit(hiveIds.length)
      ])

      // Build map of most recent record for each hive
      const lastRecordByHive = new Map<string, { date: string; type: string }>()

      hiveIds.forEach(hiveId => {
        const records: Array<{ date: string; type: string }> = []

        const inspection = lastInspections?.find(i => i.hive_id === hiveId)
        if (inspection) records.push({ date: inspection.inspection_date, type: 'Inspection' })

        const treatment = lastTreatments?.find(t => t.hive_id === hiveId)
        if (treatment) records.push({ date: treatment.treatment_date, type: 'Varroa Treatment' })

        const check = lastChecks?.find(c => c.hive_id === hiveId)
        if (check) records.push({ date: check.check_date, type: 'Varroa Check' })

        const feeding = lastFeedings?.find(f => f.hive_id === hiveId)
        if (feeding) records.push({ date: feeding.feed_date, type: 'Feeding' })

        const harvest = lastHarvests?.find(h => h.hive_id === hiveId)
        if (harvest) records.push({ date: harvest.harvest_date, type: 'Harvest' })

        // Find the most recent record
        if (records.length > 0) {
          records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          lastRecordByHive.set(hiveId, records[0])
        }
      })

      // Enrich hives with last seen info for each hive
      const enrichedHives = data.map((hive) => {
        const inspections = inspectionsByHive.get(hive.id) || []

        // Find last queen seen and eggs present
        const queenInspection = inspections.find(i => i.queen_seen === true)
        const eggsInspection = inspections.find(i => i.eggs_present === true)

        // Determine team info for shared hives
        const isShared = hive.user_id !== currentUserId
        const teamData = hive.apiary_id ? teamDataMap.get(hive.apiary_id) : undefined

        // Get queen data if queen is assigned
        const queenData = hive.queen_id ? queensMap.get(hive.queen_id) : undefined

        // Get last record for this hive
        const lastRecord = lastRecordByHive.get(hive.id) || null

        return {
          ...hive,
          queens: queenData,
          queen_last_seen: queenInspection?.inspection_date || null,
          eggs_last_present: eggsInspection?.inspection_date || null,
          team_name: teamData?.name || null,
          is_shared: isShared,
          last_record: lastRecord,
        }
      })

      setHives(enrichedHives as Hive[])
    } else {
      setHives([])
    }
    setLoading(false)
  }, [userId, ownershipFilter])

  const fetchApiaries = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data, error } = await supabase
      .from('apiaries')
      .select('id, name')
      .eq('user_id', currentUserId)
      .order('name')

    if (!error && data) {
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

    if (!error && data) {
      setQueens(data as Queen[])
    }
  }, [userId])

  // Load filters from sessionStorage on mount and validate against available apiaries
  useEffect(() => {
    if (typeof window !== 'undefined' && !filtersLoaded && apiaries.length > 0) {
      const savedApiary = sessionStorage.getItem('hives_filter_apiary')
      const savedOwnership = sessionStorage.getItem('hives_filter_ownership')

      // Only restore apiary filter if it's valid (exists in current apiaries list)
      if (savedApiary && savedApiary !== '') {
        const apiaryExists = apiaries.some(a => a.id === savedApiary)
        if (apiaryExists) {
          setFilterApiaryId(savedApiary)
        } else {
          // Apiary no longer exists, clear the saved filter
          sessionStorage.removeItem('hives_filter_apiary')
        }
      }

      if (savedOwnership && (savedOwnership === 'my' || savedOwnership === 'team' || savedOwnership === 'all')) {
        setOwnershipFilter(savedOwnership)
      }

      setFiltersLoaded(true)
    }
  }, [filtersLoaded, apiaries])

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

  // Save filter settings to sessionStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && filtersLoaded) {
      sessionStorage.setItem('hives_filter_apiary', filterApiaryId)
    }
  }, [filterApiaryId, filtersLoaded])

  useEffect(() => {
    if (typeof window !== 'undefined' && filtersLoaded) {
      sessionStorage.setItem('hives_filter_ownership', ownershipFilter)
    }
  }, [ownershipFilter, filtersLoaded])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      const dataToSubmit = {
        ...formData,
        apiary_id: formData.apiary_id || null,
        queen_id: formData.queen_id || null,
      }

      // Validate queen assignment: check if queen is already assigned to another active hive
      if (dataToSubmit.queen_id) {
        const { data: existingHives, error: checkError } = await supabase
          .from('hives')
          .select('id, hive_number, apiaries(name)')
          .eq('queen_id', dataToSubmit.queen_id)
          .eq('status', 'active')
          .eq('user_id', userId)

        if (checkError) {
          throw new Error('Failed to validate queen assignment')
        }

        // Filter out the current hive being edited (if editing)
        const otherHives = existingHives?.filter(h => h.id !== editingHive?.id) || []

        if (otherHives.length > 0) {
          const hive = otherHives[0]
          const apiaryData = hive.apiaries as { name: string } | { name: string }[] | null
          const apiaryName = Array.isArray(apiaryData) ? apiaryData[0]?.name : apiaryData?.name
          const apiaryText = apiaryName || 'Unknown apiary'
          const selectedQueen = queens.find(q => q.id === dataToSubmit.queen_id)
          const queenName = selectedQueen?.queen_number || 'this queen'

          alert(`Cannot assign queen: ${queenName} is already assigned to active hive "${hive.hive_number}" at ${apiaryText}.\n\nA queen can only be in one active hive at a time.`)
          return
        }
      }

      // Validate row + order combination: check if this combination is already used in the same apiary
      if (dataToSubmit.apiary_id && dataToSubmit.row_in_apiary !== null && dataToSubmit.order_in_apiary !== null) {
        const { data: existingPosition, error: positionError } = await supabase
          .from('hives')
          .select('id, hive_number')
          .eq('apiary_id', dataToSubmit.apiary_id)
          .eq('row_in_apiary', dataToSubmit.row_in_apiary)
          .eq('order_in_apiary', dataToSubmit.order_in_apiary)
          .neq('id', editingHive?.id || '')

        if (positionError) {
          throw new Error('Failed to validate position assignment')
        }

        if (existingPosition && existingPosition.length > 0) {
          alert(`Row ${dataToSubmit.row_in_apiary}, Position ${dataToSubmit.order_in_apiary} is already used by hive "${existingPosition[0].hive_number}" in this apiary.\n\nEach hive must have a unique row and order combination within the apiary.`)
          return
        }
      }

      if (editingHive) {
        const { error } = await supabase
          .from('hives')
          .update(dataToSubmit)
          .eq('id', editingHive.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        // Insert without user_id - database trigger will set it automatically
        const { error } = await supabase
          .from('hives')
          .insert([dataToSubmit])

        if (error) throw error
      }

      fetchHives()
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to save hive: ${error.message}`)
      }
    }
  }

  const handleEdit = (hive: Hive) => {
    setEditingHive(hive)
    setFormData({
      hive_number: hive.hive_number,
      apiary_id: hive.apiary_id || '',
      order_in_apiary: hive.order_in_apiary ?? null,
      row_in_apiary: hive.row_in_apiary ?? null,
      order_direction: hive.order_direction || 'entrances',
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
      configuration: {
        brood_boxes: hive.configuration?.brood_boxes || 1, // Legacy field
        brood_boxes_full: hive.configuration?.brood_boxes_full ?? (hive.configuration?.brood_boxes || 1),
        brood_boxes_half: hive.configuration?.brood_boxes_half ?? 0,
        honey_supers: hive.configuration?.honey_supers || 0,
        queen_excluder: hive.configuration?.queen_excluder || false,
        feeder: hive.configuration?.feeder || false,
        feeder_type: hive.configuration?.feeder_type || '',
        entrance_reducer: hive.configuration?.entrance_reducer || false,
        varroa_mesh_floor: hive.configuration?.varroa_mesh_floor || 'closed',
        right_sized_broodbox: hive.configuration?.right_sized_broodbox || false,
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
      order_in_apiary: null,
      row_in_apiary: null,
      order_direction: 'entrances',
      queen_id: '',
      queen_marked: false,
      queen_marking_color: '',
      queen_mated: false,
      queen_clipped: false,
      status: 'active',
      notes: '',
      colony_established_date: new Date().toISOString().split('T')[0],
      queen_installed_date: new Date().toISOString().split('T')[0],
      hive_type: '',
      configuration: {
        brood_boxes: 1, // Legacy field
        brood_boxes_full: 1,
        brood_boxes_half: 0,
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

  // Filter and sort hives based on selected apiary and position
  const filteredHives = [...hives]
    .filter(hive => {
      if (filterApiaryId && hive.apiary_id !== filterApiaryId) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      // First, sort by apiary name
      const apiaryA = a.apiaries?.name || ''
      const apiaryB = b.apiaries?.name || ''
      if (apiaryA !== apiaryB) {
        return apiaryA.localeCompare(apiaryB)
      }

      // Within same apiary, sort by row (nulls last)
      const rowA = a.row_in_apiary ?? Number.MAX_SAFE_INTEGER
      const rowB = b.row_in_apiary ?? Number.MAX_SAFE_INTEGER
      if (rowA !== rowB) {
        return rowA - rowB
      }

      // Within same row, sort by order (nulls last)
      const orderA = a.order_in_apiary ?? Number.MAX_SAFE_INTEGER
      const orderB = b.order_in_apiary ?? Number.MAX_SAFE_INTEGER
      if (orderA !== orderB) {
        return orderA - orderB
      }

      // Finally, sort by hive number as fallback
      return a.hive_number.localeCompare(b.hive_number)
    })

  if (loading) return <LoadingSpinner text="Loading hives..." />

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-responsive-3xl font-bold text-gray-900">Hives 🐝</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select
            value={ownershipFilter}
            onChange={(e) => {
              setOwnershipFilter(e.target.value as 'my' | 'team' | 'all')
              fetchHives()
            }}
            className="px-4 py-2 min-h-[48px] border border-gray-300 rounded-lg bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          >
            <option value="my">My Hives</option>
            <option value="team">Team Hives</option>
            <option value="all">All Hives</option>
          </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Row in Apiary
                <span className="block text-xs font-normal text-gray-500 mt-0.5 invisible">Placeholder for alignment</span>
              </label>
              <div className="flex gap-2 mb-2 invisible">
                <label className="flex items-center gap-2">
                  <input type="radio" className="w-4 h-4" />
                  <span className="text-sm">Placeholder</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" className="w-4 h-4" />
                  <span className="text-sm">Placeholder</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, row_in_apiary: Math.max(1, (formData.row_in_apiary ?? 1) - 1)})}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-md border border-gray-300 font-bold text-lg"
                >
                  −
                </button>
                <input
                  type="number"
                  value={formData.row_in_apiary ?? ''}
                  onChange={(e) => setFormData({...formData, row_in_apiary: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="Optional"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center"
                  min="1"
                />
                <button
                  type="button"
                  onClick={() => setFormData({...formData, row_in_apiary: (formData.row_in_apiary ?? 0) + 1})}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-md border border-gray-300 font-bold text-lg"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hive in Row
                <span className="block text-xs font-normal text-gray-500 mt-0.5">
                  For looking left to right choose option
                </span>
              </label>
              <div className="flex gap-2 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="order_direction"
                    value="entrances"
                    checked={formData.order_direction === 'entrances'}
                    onChange={(e) => setFormData({...formData, order_direction: e.target.value as 'entrances' | 'backs'})}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">Entrances</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="order_direction"
                    value="backs"
                    checked={formData.order_direction === 'backs'}
                    onChange={(e) => setFormData({...formData, order_direction: e.target.value as 'entrances' | 'backs'})}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-gray-700">Backs</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, order_in_apiary: Math.max(1, (formData.order_in_apiary ?? 1) - 1)})}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-md border border-gray-300 font-bold text-lg"
                >
                  −
                </button>
                <input
                  type="number"
                  value={formData.order_in_apiary ?? ''}
                  onChange={(e) => setFormData({...formData, order_in_apiary: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="Optional"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-center"
                  min="1"
                />
                <button
                  type="button"
                  onClick={() => setFormData({...formData, order_in_apiary: (formData.order_in_apiary ?? 0) + 1})}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-md border border-gray-300 font-bold text-lg"
                >
                  +
                </button>
              </div>
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
                      onClick={() => setFormData({
                        ...formData,
                        queen_marked: !formData.queen_marked,
                        queen_marking_color: !formData.queen_marked ? formData.queen_marking_color : ''
                      })}
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
                    Full-Size Brood Boxes: {formData.configuration.brood_boxes_full}
                  </label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({...formData, configuration: {...formData.configuration, brood_boxes_full: num}})}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          formData.configuration.brood_boxes_full === num
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
                    Half-Size Brood Boxes: {formData.configuration.brood_boxes_half}
                  </label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({...formData, configuration: {...formData.configuration, brood_boxes_half: num}})}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          formData.configuration.brood_boxes_half === num
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
            {/* Select & New Record Button - Top of Card */}
            <button
              onClick={() => router.push(`/dashboard/hives/${hive.id}`)}
              className="w-full px-4 py-3 mb-4 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-sm"
            >
              Select & New Record
            </button>

            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold text-gray-900">{hive.hive_number}</h3>
                {hive.is_shared && hive.team_name && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded flex items-center gap-1 w-fit">
                    <span>👥</span>
                    <span>Shared via {hive.team_name}</span>
                  </span>
                )}
              </div>
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
                <span className="font-medium">{hive.apiaries?.name || 'No apiary'}</span>
                {(hive.order_in_apiary || hive.row_in_apiary) && (
                  <span className="text-xs text-gray-600 ml-1">
                    ({hive.row_in_apiary ? `Row ${hive.row_in_apiary}` : ''}{hive.row_in_apiary && hive.order_in_apiary ? ', ' : ''}{hive.order_in_apiary ? `Hive ${hive.order_in_apiary}` : ''})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">👑</span>
                {hive.queens?.id ? (
                  <span className="flex items-center gap-1">
                    {hive.queens.marking_color && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        hive.queens.marking_color === 'White' ? 'bg-gray-200 text-gray-800' :
                        hive.queens.marking_color === 'Yellow' ? 'bg-yellow-200 text-yellow-900' :
                        hive.queens.marking_color === 'Red' ? 'bg-red-200 text-red-900' :
                        hive.queens.marking_color === 'Green' ? 'bg-green-200 text-green-900' :
                        hive.queens.marking_color === 'Blue' ? 'bg-blue-200 text-blue-900' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {hive.queens.marking_color}
                      </span>
                    )}
                    <span className="font-medium">Queen</span>
                    <Link
                      href={`/dashboard/queens?id=${hive.queens.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      {hive.queens.queen_number}
                      <ExternalLink size={12} />
                    </Link>
                  </span>
                ) : hive.queen_marked ? (
                  <span className="flex items-center gap-1">
                    {hive.queen_marking_color && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        hive.queen_marking_color === 'White' ? 'bg-gray-200 text-gray-800' :
                        hive.queen_marking_color === 'Yellow' ? 'bg-yellow-200 text-yellow-900' :
                        hive.queen_marking_color === 'Red' ? 'bg-red-200 text-red-900' :
                        hive.queen_marking_color === 'Green' ? 'bg-green-200 text-green-900' :
                        hive.queen_marking_color === 'Blue' ? 'bg-blue-200 text-blue-900' :
                        'bg-gray-200 text-gray-800'
                      }`}>
                        {hive.queen_marking_color}
                      </span>
                    )}
                    <span className="font-medium">Queen</span>
                  </span>
                ) : (
                  <span>No details</span>
                )}
              </div>
              {hive.last_record && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">📋</span>
                  <span className="text-xs">
                    <span className="font-medium text-gray-700">{hive.last_record.type}</span>
                    <span className="text-gray-500"> • {new Date(hive.last_record.date).toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </span>
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

                  {/* Half-Size Brood Boxes (same height as honey supers) - Above full boxes */}
                  {Array.from({ length: hive.configuration.brood_boxes_half || 0 }).map((_, i) => (
                    <div key={`brood-half-${i}`} className="w-full h-8 bg-amber-300 border-2 border-amber-600 rounded flex items-center justify-center text-xs font-semibold">
                      🐝 Brood Half {i + 1}
                    </div>
                  ))}

                  {/* Full-Size Brood Boxes (top to bottom) - Below half boxes */}
                  {Array.from({ length: hive.configuration.brood_boxes_full || hive.configuration.brood_boxes || 0 }).map((_, i) => (
                    <div key={`brood-full-${i}`} className="w-full h-10 bg-amber-200 border-2 border-amber-500 rounded flex items-center justify-center text-xs font-semibold">
                      🐝 Brood Full {i + 1}
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