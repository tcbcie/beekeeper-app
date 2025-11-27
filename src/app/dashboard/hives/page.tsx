'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, X, ExternalLink, MoreVertical, ArchiveRestore } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Apiary {
  id: string
  name: string
  user_id?: string
  is_shared?: boolean
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
  frame_orientation: string | null
  hive_size: 'full' | 'nuc'
}

interface Colony {
  id: string
  colony_number: string
  origin_type: string
  origin_date: string
  status: string
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
  colony_id: string | null
  user_id?: string
  configuration_changed_at?: string | null
  configuration_changed_by?: string | null
  configuration_changer?: {
    full_name: string | null
    email: string
  } | null
  apiaries?: {
    name: string
  }
  queens?: {
    id: string
    queen_number: string
    marking_color?: string
  }
  colonies?: Colony
  queen_last_seen?: string | null
  eggs_last_present?: string | null
  team_name?: string | null
  is_shared?: boolean
  shared_with_team?: string | null
  archived_at?: string | null
  archive_reason_id?: string | null
  archive_notes?: string | null
  last_record?: {
    date: string
    type: string
  } | null
  active_tasks_count?: number
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
  const [isTeamMember, setIsTeamMember] = useState(false)
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null)

  // Initialize filters from sessionStorage
  const [filterApiaryId, setFilterApiaryId] = useState<string>('')
  const [ownershipFilter, setOwnershipFilter] = useState<'my' | 'team' | 'all'>('my')
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active')
  const [filtersLoaded, setFiltersLoaded] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
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
      frame_orientation: null,
      hive_size: 'full' as 'full' | 'nuc',
    },
  })

  const fetchHives = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // Fetch team memberships first
    const { data: teamMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', currentUserId)

    const teamIds = teamMemberships?.map(tm => tm.team_id) || []

    // Update isTeamMember state based on whether user has any team memberships
    setIsTeamMember(teamIds.length > 0)

    // Fetch shared apiaries if user is in any teams
    let sharedApiaryIds: string[] = []
    if (teamIds.length > 0) {
      const { data: sharedApiaries } = await supabase
        .from('team_apiaries')
        .select('apiary_id')
        .in('team_id', teamIds)

      sharedApiaryIds = sharedApiaries?.map(sa => sa.apiary_id) || []
    }

    // Build base query with archive filter applied first (important for PostgREST)
    let query = supabase
      .from('hives')
      .select(`
        *,
        apiaries(name),
        configuration_changer:profiles!configuration_changed_by(full_name, email)
      `)

    // Apply archive filter FIRST (before ownership filter for better SQL generation)
    if (archiveFilter === 'active') {
      query = query.is('archived_at', null)
    } else if (archiveFilter === 'archived') {
      // Filter for hives where archived_at is NOT NULL
      query = query.not('archived_at', 'is', null)
    }
    // 'all' shows both active and archived hives (no archive filter applied)

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

      // Batch query for team info for ALL apiaries (shared and owned)
      const allApiaryIds = [...new Set(
        data
          .filter(h => h.apiary_id)
          .map(h => h.apiary_id)
          .filter((id): id is string => id !== null)
      )]

      // Map for shared apiaries (viewing others' hives)
      const teamDataMap = new Map<string, { name: string }>()
      // Map for owner's apiaries that are shared with teams
      const ownerSharedMap = new Map<string, { name: string }>()

      if (allApiaryIds.length > 0) {
        const { data: teamApiaryData } = await supabase
          .from('team_apiaries')
          .select('apiary_id, teams(name)')
          .in('apiary_id', allApiaryIds)

        if (teamApiaryData) {
          teamApiaryData.forEach((ta) => {
            const typedData = ta as { apiary_id: string; teams: { name: string } | { name: string }[] | null }
            if (typedData.teams) {
              const teamName = Array.isArray(typedData.teams)
                ? typedData.teams[0]?.name || ''
                : typedData.teams.name
              if (teamName) {
                // Check if this apiary belongs to current user or someone else
                const hiveForApiary = data.find(h => h.apiary_id === typedData.apiary_id)
                if (hiveForApiary && hiveForApiary.user_id !== currentUserId) {
                  teamDataMap.set(typedData.apiary_id, { name: teamName })
                } else {
                  ownerSharedMap.set(typedData.apiary_id, { name: teamName })
                }
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
        { data: lastHarvests },
        { data: activeTasks }
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
          .limit(hiveIds.length),
        supabase
          .from('tasks_events')
          .select('hive_id')
          .in('hive_id', hiveIds)
          .eq('completed', false)
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

      // Build map of active task counts per hive
      const activeTasksByHive = new Map<string, number>()
      activeTasks?.forEach(task => {
        if (task.hive_id) {
          const count = activeTasksByHive.get(task.hive_id) || 0
          activeTasksByHive.set(task.hive_id, count + 1)
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
        // Get team info for owner's shared apiaries
        const ownerSharedData = hive.apiary_id ? ownerSharedMap.get(hive.apiary_id) : undefined

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
          shared_with_team: ownerSharedData?.name || null,
          last_record: lastRecord,
          active_tasks_count: activeTasksByHive.get(hive.id) || 0,
        }
      })

      setHives(enrichedHives as Hive[])
    } else {
      setHives([])
    }
    setLoading(false)
    // IMPORTANT: ownershipFilter and archiveFilter MUST be in deps so fetchHives
    // can read their current values. The useEffect that calls fetchHives has
    // eslint-disable to prevent infinite loops.
  }, [userId, ownershipFilter, archiveFilter])

  const fetchApiaries = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // Fetch user's own apiaries
    const { data: ownApiaries, error: ownError } = await supabase
      .from('apiaries')
      .select('id, name, user_id')
      .eq('user_id', currentUserId)
      .order('name')

    if (ownError) {
      console.error('Error fetching own apiaries:', ownError)
      return
    }

    // Fetch team memberships to get shared apiaries
    const { data: teamMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', currentUserId)

    const teamIds = teamMemberships?.map(tm => tm.team_id) || []

    let sharedApiaries: Apiary[] = []
    if (teamIds.length > 0) {
      // Get shared apiary IDs
      const { data: teamApiaries } = await supabase
        .from('team_apiaries')
        .select('apiary_id')
        .in('team_id', teamIds)

      const sharedApiaryIds = teamApiaries?.map(ta => ta.apiary_id) || []

      if (sharedApiaryIds.length > 0) {
        // Fetch the actual apiary details for shared apiaries (excluding user's own)
        const { data: sharedApiaryData } = await supabase
          .from('apiaries')
          .select('id, name, user_id')
          .in('id', sharedApiaryIds)
          .neq('user_id', currentUserId)
          .order('name')

        if (sharedApiaryData) {
          sharedApiaries = sharedApiaryData.map(apiary => ({
            ...apiary,
            is_shared: true
          }))
        }
      }
    }

    // Combine own apiaries and shared apiaries
    const allApiaries = [
      ...(ownApiaries || []).map(a => ({ ...a, is_shared: false })),
      ...sharedApiaries
    ]

    setApiaries(allApiaries as Apiary[])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

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

  // Refetch hives when ownership or archive filter changes
  useEffect(() => {
    if (userId) {
      fetchHives(userId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownershipFilter, archiveFilter, userId])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (openMenuId && !target.closest('.context-menu-container')) {
        setOpenMenuId(null)
      }
    }

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      type HiveSubmitData = Omit<typeof formData, 'apiary_id' | 'queen_id'> & {
        apiary_id: string | null
        queen_id: string | null
        configuration_changed_at?: string
        configuration_changed_by?: string
      }

      let dataToSubmit: HiveSubmitData = {
        ...formData,
        apiary_id: formData.apiary_id || null,
        queen_id: formData.queen_id || null,
      }

      // Check if configuration has changed (for existing hives)
      if (editingHive) {
        const configChanged = JSON.stringify(editingHive.configuration) !== JSON.stringify(formData.configuration)

        if (configChanged) {
          dataToSubmit = {
            ...dataToSubmit,
            configuration_changed_at: new Date().toISOString(),
            configuration_changed_by: userId,
          }
        }
      } else {
        // New hive - set initial configuration tracking
        dataToSubmit = {
          ...dataToSubmit,
          configuration_changed_at: new Date().toISOString(),
          configuration_changed_by: userId,
        }
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
        let query = supabase
          .from('hives')
          .select('id, hive_number')
          .eq('apiary_id', dataToSubmit.apiary_id)
          .eq('row_in_apiary', dataToSubmit.row_in_apiary)
          .eq('order_in_apiary', dataToSubmit.order_in_apiary)

        // Only exclude current hive when editing (not when creating new)
        if (editingHive?.id) {
          query = query.neq('id', editingHive.id)
        }

        const { data: existingPosition, error: positionError } = await query

        if (positionError) {
          throw new Error('Failed to validate position assignment')
        }

        if (existingPosition && existingPosition.length > 0) {
          alert(`Row ${dataToSubmit.row_in_apiary}, Position ${dataToSubmit.order_in_apiary} is already used by hive "${existingPosition[0].hive_number}" in this apiary.\n\nEach hive must have a unique row and order combination within the apiary.`)
          return
        }
      }

      if (editingHive) {
        // Update hive - RLS policies will handle permissions for both owned and shared hives
        const { error } = await supabase
          .from('hives')
          .update(dataToSubmit)
          .eq('id', editingHive.id)

        if (error) throw error

        // Record configuration change in history if configuration changed
        const configChanged = JSON.stringify(editingHive.configuration) !== JSON.stringify(formData.configuration)
        if (configChanged) {
          const { error: historyError } = await supabase
            .from('hive_configuration_history')
            .insert([{
              hive_id: editingHive.id,
              changed_at: new Date().toISOString(),
              changed_by: userId,
              configuration: formData.configuration
            }])

          if (historyError) {
            console.error('Failed to record configuration history:', historyError)
            // Don't throw - configuration was updated successfully, history is supplementary
          }
        }
      } else {
        // Verify apiary ownership before inserting
        if (dataToSubmit.apiary_id) {
          const { data: apiaryCheck, error: apiaryError } = await supabase
            .from('apiaries')
            .select('id, user_id, name')
            .eq('id', dataToSubmit.apiary_id)
            .single()

          if (apiaryError) {
            throw new Error('Failed to verify apiary ownership')
          }

          if (!apiaryCheck || apiaryCheck.user_id !== userId) {
            throw new Error(`Cannot create hive: The selected apiary "${apiaryCheck?.name || 'Unknown'}" does not belong to you. Hives can only be added to your own apiaries.`)
          }
        }

        // Insert with user_id for RLS policy compliance
        const insertData = { ...dataToSubmit, user_id: userId }

        // Verify the session is valid
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
        }

        if (!session) {
          throw new Error('No active session found. Please refresh the page and try again.')
        }

        // Test if we can call the ownership function directly
        if (insertData.apiary_id) {
          const { error: ownershipError } = await supabase
            .rpc('check_user_owns_apiary', {
              apiary_uuid: insertData.apiary_id,
              user_uuid: userId
            })

          if (ownershipError) {
            console.error('Direct ownership check error:', ownershipError)
          }
        }

        const { data: newHive, error } = await supabase
          .from('hives')
          .insert([insertData])
          .select('id')
          .single()

        if (error) {
          console.error('Hive insert error:', error)
          console.error('Error code:', error.code)
          console.error('Error details:', error.details)
          console.error('Error hint:', error.hint)
          throw error
        }

        // Record initial configuration in history for new hive
        if (newHive) {
          const { error: historyError } = await supabase
            .from('hive_configuration_history')
            .insert([{
              hive_id: newHive.id,
              changed_at: new Date().toISOString(),
              changed_by: userId,
              configuration: formData.configuration
            }])

          if (historyError) {
            console.error('Failed to record initial configuration history:', historyError)
            // Don't throw - hive was created successfully, history is supplementary
          }
        }
      }

      if (userId) fetchHives(userId)
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
        frame_orientation: hive.configuration?.frame_orientation || null,
        hive_size: (hive.configuration?.hive_size as 'full' | 'nuc') || 'full',
      },
    })
    setShowForm(true)

    // Scroll to the top where the form is
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this hive?')) {
      const { error } = await supabase
        .from('hives')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (!error && userId) fetchHives(userId)
    }
  }

  const handleUnarchive = async (hive: Hive) => {
    if (!userId) return

    const confirmed = window.confirm(
      `Are you sure you want to unarchive hive ${hive.hive_number}?\n\n` +
      'This will:\n' +
      '- Set the hive status back to active\n' +
      '- Clear the archive date and reason\n' +
      '- Make the hive visible in your active hives list'
    )

    if (!confirmed) return

    try {
      // Unarchive hive - RLS policies will handle permissions for both owned and shared hives
      const { error } = await supabase
        .from('hives')
        .update({
          archived_at: null,
          archive_reason_id: null,
          archive_notes: null,
          status: 'active'
        })
        .eq('id', hive.id)

      if (error) {
        console.error('Error unarchiving hive:', error)
        alert('Failed to unarchive hive: ' + error.message)
      } else {
        alert(`Hive ${hive.hive_number} has been successfully unarchived!`)
        setOpenMenuId(null) // Close the menu
        fetchHives(userId) // Refresh hives list
      }
    } catch (error) {
      console.error('Error unarchiving hive:', error)
      alert('Failed to unarchive hive')
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
        frame_orientation: null,
        hive_size: 'full' as 'full' | 'nuc',
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
        <h1 className="text-responsive-3xl font-bold text-foreground">Hives</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {isTeamMember && (
            <select
              value={ownershipFilter}
              onChange={(e) => {
                setOwnershipFilter(e.target.value as 'my' | 'team' | 'all')
                if (userId) fetchHives(userId)
              }}
              className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition-all"
            >
              <option value="my">My Hives</option>
              <option value="team">Team Hives</option>
              <option value="all">All Hives</option>
            </select>
          )}
          <select
            value={filterApiaryId}
            onChange={(e) => setFilterApiaryId(e.target.value)}
            className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-forest-500 focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 transition-all"
          >
            <option value="">All Apiaries</option>
            {apiaries.map((apiary) => (
              <option key={apiary.id} value={apiary.id}>
                {apiary.name}{apiary.is_shared ? ' (Shared)' : ''}
              </option>
            ))}
          </select>
          <select
            value={archiveFilter}
            onChange={(e) => {
              setArchiveFilter(e.target.value as 'active' | 'archived' | 'all')
            }}
            className="px-4 py-2 min-h-[48px] border border-border rounded-lg bg-surface dark:bg-surface-elevated text-foreground hover:border-border focus:border-border focus:ring-2 focus:ring-border/20 transition-all"
          >
            <option value="active">Active Hives</option>
            <option value="archived">Archived Hives</option>
            <option value="all">All (Active + Archived)</option>
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 active:bg-forest-800 dark:active:bg-forest-700 font-medium flex items-center justify-center gap-2 touch-manipulation w-full sm:w-auto"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Cancel' : 'Add Hive'}
          </button>
        </div>
      </div>

      {showForm && (
        <div ref={formRef} className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-xl font-semibold text-foreground">
              {editingHive ? 'Edit Hive' : 'Add New Hive'}
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="submit"
                form="hive-form"
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 active:bg-forest-800 dark:active:bg-forest-700 touch-manipulation font-medium"
              >
                {editingHive ? 'Update' : 'Add'} Hive
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-surface dark:bg-surface-elevated text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 active:bg-sage-400 dark:active:bg-slate-500 touch-manipulation font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
          <form id="hive-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Hive Number *</label>
              <input
                type="text"
                value={formData.hive_number}
                onChange={(e) => setFormData({...formData, hive_number: e.target.value})}
                placeholder="e.g., A-1, B-3"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Apiary *
                <span className="block text-xs font-normal text-text-tertiary mt-0.5">
                  Required for weather data in inspection records
                </span>
              </label>
              <select
                value={formData.apiary_id}
                onChange={(e) => setFormData({...formData, apiary_id: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                required
              >
                <option value="">Select apiary</option>
                {apiaries.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.is_shared ? ' (Shared)' : ''}
                  </option>
                ))}
              </select>
              {apiaries.length === 0 && (
                <p className="mt-1 text-xs text-amber-400">
                  No apiaries available. Please create an apiary first to enable weather data for inspections.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Row in Apiary
                <span className="block text-xs font-normal text-text-tertiary mt-0.5 invisible">Placeholder for alignment</span>
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
                  className="px-3 sm:px-4 py-2 bg-surface dark:bg-surface-elevated hover:bg-surface-elevated dark:hover:bg-slate-600 active:bg-surface-elevated dark:active:bg-slate-500 text-text-primary rounded-md border border-border font-bold text-lg flex-shrink-0"
                >
                  −
                </button>
                <input
                  type="number"
                  value={formData.row_in_apiary ?? ''}
                  onChange={(e) => setFormData({...formData, row_in_apiary: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="Optional"
                  className="flex-1 min-w-0 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-center placeholder-text-tertiary"
                  min="1"
                />
                <button
                  type="button"
                  onClick={() => setFormData({...formData, row_in_apiary: (formData.row_in_apiary ?? 0) + 1})}
                  className="px-3 sm:px-4 py-2 bg-surface dark:bg-surface-elevated hover:bg-surface-elevated dark:hover:bg-slate-600 active:bg-surface-elevated dark:active:bg-slate-500 text-text-primary rounded-md border border-border font-bold text-lg flex-shrink-0"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Hive in Row
                <span className="block text-xs font-normal text-text-tertiary mt-0.5">
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
                    className="w-4 h-4 text-forest-600 dark:text-forest-400"
                  />
                  <span className="text-sm text-text-secondary">Entrances</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="order_direction"
                    value="backs"
                    checked={formData.order_direction === 'backs'}
                    onChange={(e) => setFormData({...formData, order_direction: e.target.value as 'entrances' | 'backs'})}
                    className="w-4 h-4 text-forest-600 dark:text-forest-400"
                  />
                  <span className="text-sm text-text-secondary">Backs</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, order_in_apiary: Math.max(1, (formData.order_in_apiary ?? 1) - 1)})}
                  className="px-3 sm:px-4 py-2 bg-surface dark:bg-surface-elevated hover:bg-surface-elevated dark:hover:bg-slate-600 active:bg-surface-elevated dark:active:bg-slate-500 text-text-primary rounded-md border border-border font-bold text-lg flex-shrink-0"
                >
                  −
                </button>
                <input
                  type="number"
                  value={formData.order_in_apiary ?? ''}
                  onChange={(e) => setFormData({...formData, order_in_apiary: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="Optional"
                  className="flex-1 min-w-0 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground text-center placeholder-text-tertiary"
                  min="1"
                />
                <button
                  type="button"
                  onClick={() => setFormData({...formData, order_in_apiary: (formData.order_in_apiary ?? 0) + 1})}
                  className="px-3 sm:px-4 py-2 bg-surface dark:bg-surface-elevated hover:bg-surface-elevated dark:hover:bg-slate-600 active:bg-surface-elevated dark:active:bg-slate-500 text-text-primary rounded-md border border-border font-bold text-lg flex-shrink-0"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Queen</label>
              <select
                value={formData.queen_id}
                onChange={(e) => setFormData({...formData, queen_id: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              >
                <option value="">Record manual</option>
                {queens.map((q) => (
                  <option key={q.id} value={q.id}>{q.queen_number}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              >
                <option value="active">Active</option>
                <option value="queenless">Queenless</option>
                <option value="retired">Retired</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
              <select
                value={formData.hive_type}
                onChange={(e) => setFormData({...formData, hive_type: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              >
                <option value="">Select type</option>
                <option value="Production">Production</option>
                <option value="Bee production">Bee production</option>
                <option value="Split">Split</option>
                <option value="Swarm">Swarm</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Colony Established Date</label>
              <input
                type="date"
                value={formData.colony_established_date}
                onChange={(e) => setFormData({...formData, colony_established_date: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Queen Installed Date</label>
              <input
                type="date"
                value={formData.queen_installed_date}
                onChange={(e) => setFormData({...formData, queen_installed_date: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              />
            </div>

            {/* Show queen checkboxes only when no queen is assigned */}
            {!formData.queen_id && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-3">Queen Status (if no specific queen assigned)</label>
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
                          ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md hover:bg-forest-700 dark:hover:bg-forest-600 active:bg-forest-800 dark:active:bg-forest-700'
                          : 'bg-surface dark:bg-surface-elevated text-text-primary hover:bg-sage-300 dark:hover:bg-slate-600 active:bg-sage-400 dark:active:bg-slate-500'
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
                          : 'bg-surface dark:bg-surface-elevated text-text-primary hover:bg-sage-300 dark:hover:bg-slate-600 active:bg-sage-400 dark:active:bg-slate-500'
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
                          : 'bg-surface dark:bg-surface-elevated text-text-primary hover:bg-sage-300 dark:hover:bg-slate-600 active:bg-sage-400 dark:active:bg-slate-500'
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
                    <label className="block text-sm font-medium text-text-secondary mb-1">Queen Marking Color</label>
                    <select
                      value={formData.queen_marking_color}
                      onChange={(e) => setFormData({...formData, queen_marking_color: e.target.value})}
                      className="w-full md:w-1/2 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Select color</option>
                      <option value="White">White</option>
                      <option value="Yellow">Yellow</option>
                      <option value="Red">Red</option>
                      <option value="Green">Green</option>
                      <option value="Blue">Blue</option>
                    </select>
                    <p className="text-xs text-text-tertiary mt-1">
                      International standard: White (1,6) | Yellow (2,7) | Red (3,8) | Green (4,9) | Blue (5,0)
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Hive Configuration Section */}
            <div className="md:col-span-2 p-4 bg-surface dark:bg-surface-elevated rounded-lg border-2 border-forest-200 dark:border-forest-900/50">
              <h4 className="text-md font-semibold text-forest-600 dark:text-forest-400 mb-4">Hive Configuration</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
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
                            ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
                            : 'bg-surface dark:bg-surface-elevated text-text-primary border border-border hover:bg-surface-elevated dark:hover:bg-slate-600'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
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
                            ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
                            : 'bg-surface dark:bg-surface-elevated text-text-primary border border-border hover:bg-surface-elevated dark:hover:bg-slate-600'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
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
                            ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
                            : 'bg-surface dark:bg-surface-elevated text-text-primary border border-border hover:bg-surface-elevated dark:hover:bg-slate-600'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Varroa Mesh Floor</label>
                  <select
                    value={formData.configuration.varroa_mesh_floor}
                    onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, varroa_mesh_floor: e.target.value}})}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                  >
                    <option value="closed">Closed</option>
                    <option value="open">Open</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Feeder Type</label>
                  <select
                    value={formData.configuration.feeder_type}
                    onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, feeder_type: e.target.value, feeder: e.target.value !== ''}})}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
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
                        ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
                        : 'bg-surface dark:bg-surface-elevated text-text-primary border border-border hover:bg-surface-elevated dark:hover:bg-slate-600'
                    }`}
                  >
                    {formData.configuration.queen_excluder ? '✓' : '○'} Queen Excluder
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({...formData, configuration: {...formData.configuration, entrance_reducer: !formData.configuration.entrance_reducer}})}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                      formData.configuration.entrance_reducer
                        ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
                        : 'bg-surface dark:bg-surface-elevated text-text-primary border border-border hover:bg-surface-elevated dark:hover:bg-slate-600'
                    }`}
                  >
                    {formData.configuration.entrance_reducer ? '✓' : '○'} Entrance Reducer
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({...formData, configuration: {...formData.configuration, right_sized_broodbox: !formData.configuration.right_sized_broodbox}})}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                      formData.configuration.right_sized_broodbox
                        ? 'bg-forest-600 dark:bg-forest-500 text-white shadow-md'
                        : 'bg-surface dark:bg-surface-elevated text-text-primary border border-border hover:bg-surface-elevated dark:hover:bg-slate-600'
                    }`}
                  >
                    {formData.configuration.right_sized_broodbox ? '✓' : '○'} Right-Sized Broodbox
                  </button>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Frame Orientation
                    <span className="ml-2 text-xs text-text-tertiary font-normal">
                      (Warm way: frames parallel to entrance, Cold way: frames perpendicular to entrance)
                    </span>
                  </label>
                  <select
                    value={formData.configuration.frame_orientation ?? ''}
                    onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, frame_orientation: e.target.value || null}})}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                  >
                    <option value="">Not specified</option>
                    <option value="warm">Warm Way</option>
                    <option value="cold">Cold Way</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Hive Size
                  </label>
                  <select
                    value={formData.configuration.hive_size}
                    onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, hive_size: e.target.value as 'full' | 'nuc'}})}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                  >
                    <option value="full">Full Size Hive</option>
                    <option value="nuc">Nucleus Colony (Nuc)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Special characteristics, equipment, etc..."
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              />
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 active:bg-forest-800 dark:active:bg-forest-700 touch-manipulation font-medium"
              >
                {editingHive ? 'Update' : 'Add'} Hive
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-surface dark:bg-surface-elevated text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 active:bg-sage-400 dark:active:bg-slate-500 touch-manipulation font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHives.map((hive) => (
          <div key={hive.id} className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-border">
            {/* Select & New Record Button - Top of Card */}
            <button
              onClick={() => router.push(`/dashboard/hives/${hive.id}`)}
              className="w-full px-4 py-3 mb-4 text-sm bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 font-semibold shadow-sm min-h-[48px]"
            >
              Select & New Record
            </button>

            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold text-foreground">{hive.hive_number}</h3>
                {hive.is_shared && hive.team_name && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-medium rounded flex items-center gap-1 w-fit border border-blue-300 dark:border-blue-800">
                    <span>👥</span>
                    <span>Shared via {hive.team_name}</span>
                  </span>
                )}
                {!hive.is_shared && hive.shared_with_team && (
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs font-medium rounded flex items-center gap-1 w-fit border border-purple-300 dark:border-purple-800">
                    <span>📤</span>
                    <span>Shared with {hive.shared_with_team}</span>
                  </span>
                )}
                {hive.archived_at && (
                  <span className="px-2 py-0.5 bg-surface dark:bg-surface-elevated text-text-primary text-xs font-medium rounded flex items-center gap-1 w-fit border border-border">
                    <span>📦</span>
                    <span>Archived {new Date(hive.archived_at).toLocaleDateString()}</span>
                  </span>
                )}
                {hive.active_tasks_count !== undefined && hive.active_tasks_count > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded flex items-center gap-1 w-fit border border-amber-400 dark:border-amber-700">
                    <span>📋</span>
                    <span className="font-bold">{hive.active_tasks_count}</span>
                    <span>Active Task{hive.active_tasks_count > 1 ? 's' : ''}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  hive.status === 'active' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800' :
                  hive.status === 'queenless' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800' :
                  hive.status === 'archived' ? 'bg-surface dark:bg-surface-elevated text-text-primary border border-border' :
                  'bg-surface dark:bg-surface-elevated text-text-primary border border-border'
                }`}>
                  {hive.status}
                </span>
                {hive.archived_at && (
                  <div className="relative context-menu-container">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === hive.id ? null : hive.id)
                      }}
                      className="p-1 hover:bg-sage-200 dark:hover:bg-slate-700 rounded transition-colors"
                      aria-label="More options"
                    >
                      <MoreVertical size={16} className="text-text-secondary" />
                    </button>
                    {openMenuId === hive.id && (
                      <div className="absolute right-0 top-full mt-1 bg-surface dark:bg-surface-elevated border border-border rounded-lg shadow-lg z-10 min-w-[160px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnarchive(hive)
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-forest-100 dark:hover:bg-forest-900/50 text-forest-600 dark:text-forest-400 flex items-center gap-2 rounded-lg transition-colors"
                        >
                          <ArchiveRestore size={16} />
                          <span>Unarchive</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2">
                <span className="text-text-tertiary">📍</span>
                <span className="font-medium text-text-primary">{hive.apiaries?.name || 'No apiary'}</span>
                {(hive.order_in_apiary || hive.row_in_apiary) && (
                  <span className="text-xs text-text-tertiary ml-1">
                    ({hive.row_in_apiary ? `Row ${hive.row_in_apiary}` : ''}{hive.row_in_apiary && hive.order_in_apiary ? ', ' : ''}{hive.order_in_apiary ? `Hive ${hive.order_in_apiary}` : ''})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-tertiary">👑</span>
                {hive.queens?.id ? (
                  <span className="flex items-center gap-1">
                    {hive.queens.marking_color && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        hive.queens.marking_color === 'White' ? 'bg-slate-100 dark:bg-slate-700 text-text-primary' :
                        hive.queens.marking_color === 'Yellow' ? 'bg-yellow-200 text-yellow-900' :
                        hive.queens.marking_color === 'Red' ? 'bg-red-200 text-red-900' :
                        hive.queens.marking_color === 'Green' ? 'bg-green-200 text-green-900' :
                        hive.queens.marking_color === 'Blue' ? 'bg-blue-200 text-blue-900' :
                        'bg-slate-100 dark:bg-slate-700 text-text-primary'
                      }`}>
                        {hive.queens.marking_color}
                      </span>
                    )}
                    <span className="font-medium text-text-primary">Queen</span>
                    <Link
                      href={`/dashboard/queens?id=${hive.queens.id}`}
                      className="text-forest-600 dark:text-forest-400 hover:text-forest-700 dark:hover:text-forest-300 hover:underline flex items-center gap-1"
                    >
                      {hive.queens.queen_number}
                      <ExternalLink size={12} />
                    </Link>
                  </span>
                ) : hive.queen_marked ? (
                  <span className="flex items-center gap-1">
                    {hive.queen_marking_color && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        hive.queen_marking_color === 'White' ? 'bg-slate-100 dark:bg-slate-700 text-text-primary' :
                        hive.queen_marking_color === 'Yellow' ? 'bg-yellow-200 text-yellow-900' :
                        hive.queen_marking_color === 'Red' ? 'bg-red-200 text-red-900' :
                        hive.queen_marking_color === 'Green' ? 'bg-green-200 text-green-900' :
                        hive.queen_marking_color === 'Blue' ? 'bg-blue-200 text-blue-900' :
                        'bg-slate-100 dark:bg-slate-700 text-text-primary'
                      }`}>
                        {hive.queen_marking_color}
                      </span>
                    )}
                    <span className="font-medium text-text-primary">Queen</span>
                  </span>
                ) : (
                  <span className="text-text-tertiary">No details</span>
                )}
              </div>
              {hive.last_record && (
                <div className="flex items-center gap-2">
                  <span className="text-text-tertiary">📋</span>
                  <span className="text-xs">
                    <span className="font-medium text-text-secondary">{hive.last_record.type}</span>
                    <span className="text-text-tertiary"> • {new Date(hive.last_record.date).toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                  </span>
                </div>
              )}
              {hive.notes && (
                <div className="mt-3 p-2 bg-surface dark:bg-surface-elevated rounded text-text-primary text-xs border border-border">
                  {hive.notes}
                </div>
              )}
            </div>

            {hive.configuration && (
              <div className="mb-4 p-3 bg-surface dark:bg-surface-elevated rounded border border-forest-200 dark:border-forest-900/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-forest-600 dark:text-forest-400">Hive Setup</div>
                  {hive.configuration.hive_size && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      hive.configuration.hive_size === 'nuc'
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                        : 'bg-emerald-900/50 text-emerald-300 border border-emerald-800'
                    }`}>
                      {hive.configuration.hive_size === 'nuc' ? 'Nuc' : 'Full Size'}
                    </span>
                  )}
                </div>

                {/* Configuration Change Tracking - Only show for shared hives where user is not the owner */}
                {hive.is_shared && hive.user_id !== userId && hive.configuration_changed_at && (
                  <div className="mb-3 pb-2 border-b border-border">
                    <div className="text-xs text-text-tertiary">
                      <span className="font-medium">Last changed:</span>{' '}
                      {new Date(hive.configuration_changed_at).toLocaleDateString('en-IE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {hive.configuration_changer && (
                        <>
                          {' by '}
                          <span className="font-medium text-text-primary">
                            {hive.configuration_changer.full_name || hive.configuration_changer.email}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Visual Hive Stack - Half width for Nuc, full width for standard hive */}
                <div className={`flex flex-col items-center gap-1 mb-3 ${hive.configuration.hive_size === 'nuc' ? 'w-1/2 mx-auto' : 'w-full'}`}>
                  {/* Honey Supers (top to bottom) */}
                  {Array.from({ length: hive.configuration.honey_supers }).map((_, i) => (
                    <div key={`super-${i}`} className="w-full h-8 bg-yellow-300 border-2 border-yellow-500 rounded flex items-center justify-center text-xs font-semibold">
                      🍯 Super {i + 1}
                    </div>
                  ))}

                  {/* Queen Excluder - always directly above brood boxes if present */}
                  {hive.configuration.queen_excluder && (
                    <div className="w-full h-3 bg-slate-300 dark:bg-gray-400 border-2 border-slate-500 dark:border-gray-600 rounded flex items-center justify-center text-xs font-bold">
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
                    <div key={`brood-full-${i}`} className="w-full h-10 bg-amber-200 border-2 border-amber-500 rounded flex items-center justify-center text-xs font-semibold relative">
                      <span className="relative z-10">🐝 Brood Full {i + 1}</span>
                      {/* Frame orientation visualization - show on bottom brood box */}
                      {i === (hive.configuration?.brood_boxes_full || hive.configuration?.brood_boxes || 1) - 1 && hive.configuration?.frame_orientation && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 pointer-events-none">
                          {hive.configuration?.frame_orientation === 'warm' ? (
                            // Warm way: horizontal lines (parallel to entrance)
                            <div className="flex flex-col gap-0.5">
                              <div className="w-16 h-0.5 bg-amber-700 opacity-60"></div>
                              <div className="w-16 h-0.5 bg-amber-700 opacity-60"></div>
                              <div className="w-16 h-0.5 bg-amber-700 opacity-60"></div>
                            </div>
                          ) : (
                            // Cold way: vertical lines (perpendicular to entrance)
                            <div className="flex gap-0.5">
                              <div className="w-0.5 h-4 bg-amber-700 opacity-60"></div>
                              <div className="w-0.5 h-4 bg-amber-700 opacity-60"></div>
                              <div className="w-0.5 h-4 bg-amber-700 opacity-60"></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Varroa Mesh Floor - always at the very bottom with feet */}
                  <div className="w-full relative">
                    <div className={`w-full h-6 ${hive.configuration.varroa_mesh_floor === 'open' ? 'bg-slate-200 dark:bg-gray-200' : 'bg-amber-700'} border-2 border-amber-900 rounded flex items-center justify-center text-xs font-semibold`}>
                      {hive.configuration.varroa_mesh_floor === 'open' ? '▒▒▒' : '███'}
                    </div>
                    {/* Hive stand feet */}
                    <div className="flex justify-between px-2 mt-0.5">
                      <div className="w-3 h-2 bg-amber-900 rounded-sm"></div>
                      <div className="w-3 h-2 bg-amber-900 rounded-sm"></div>
                      <div className="w-3 h-2 bg-amber-900 rounded-sm"></div>
                      <div className="w-3 h-2 bg-amber-900 rounded-sm"></div>
                    </div>
                  </div>
                </div>

                {/* Configuration Details */}
                <div className="grid grid-cols-2 gap-2 text-xs text-text-primary">
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
                className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/70 border border-blue-300 dark:border-blue-800 min-h-[44px]"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(hive.id)}
                className="flex-1 px-3 py-2 text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/70 border border-red-300 dark:border-red-800 min-h-[44px]"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredHives.length === 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-12 text-center text-text-secondary border border-border">
          {filterApiaryId
            ? 'No hives found for this apiary. Select "All Apiaries" or add a new hive.'
            : 'No hives found. Add your first hive!'}
        </div>
      )}
    </div>
  )
}