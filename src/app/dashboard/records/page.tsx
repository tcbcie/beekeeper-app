'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, HelpCircle, Camera, X, Minus, Search, Bug, Syringe, Wheat, Droplet, ExternalLink, Home } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface HiveConfiguration {
  brood_boxes?: number // Legacy field
  brood_boxes_full?: number
  brood_boxes_half?: number
  honey_supers?: number
  queen_excluder?: boolean
  feeder?: boolean
  feeder_type?: string
  entrance_reducer?: boolean
  varroa_mesh_floor?: string
  right_sized_broodbox?: boolean
}

interface Hive {
  id: string
  hive_number: string
  apiary_id: string | null
  configuration: HiveConfiguration | null
}

interface Apiary {
  id: string
  name: string
}

interface Inspection {
  id: string
  hive_id: string
  user_id: string
  inspection_date: string
  inspection_time: string | null
  weight: number | null
  queen_seen: boolean
  eggs_present: boolean
  drones_present: number
  drone_brood_present: boolean | null
  brood_frames: number | null
  right_sized_frames: number | null
  brood_pattern_rating: number
  temperament_rating: number
  population_strength: number
  swarming_tendency: number
  calmness: number
  frames_foundation: number
  frames_brood: number
  frames_drawn: number
  honey_supers: number
  drone_frames: number
  store_frames: number
  recapping: number
  vsh: number
  smr: number
  afb_disease: number
  efb_disease: number
  chalkbrood_disease: number
  nosemosis_disease: number
  dwv_disease: number
  iapv_cbpv_disease: number
  notes: string
  image_url: string | null
  weather_temp: number | null
  weather_condition: string | null
  weather_humidity: number | null
  weather_wind_speed: number | null
  hives?: {
    hive_number: string
    apiaries?: {
      eircode: string | null
    }
  }
  profiles?: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

interface VarroaTreatment {
  id: string
  hive_id: string
  user_id: string
  treatment_date: string
  treatment_type: string
  dosage: string
  temperature: number | null
  weather_conditions: string
  notes: string
  hives?: {
    hive_number: string
    apiary_id: string | null
  }
  profiles?: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

interface VarroaCheck {
  id: string
  hive_id: string
  user_id: string
  check_date: string
  method: string
  mites_count: number | null
  sample_size: number | null
  infestation_rate: number | null
  action_threshold_reached: boolean
  notes: string
  hives?: {
    hive_number: string
  }
  profiles?: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

interface Feeding {
  id: string
  hive_id: string
  user_id: string
  feed_date: string
  feed_type: string
  quantity: number | null
  unit: string
  notes: string
  hives?: {
    hive_number: string
  }
  profiles?: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

interface Harvest {
  id: string
  hive_id: string
  user_id: string
  harvest_date: string
  honey_weight: number | null
  wax_weight: number | null
  unit: string
  frames_harvested: number | null
  notes: string
  hives?: {
    hive_number: string
  }
  profiles?: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

// Unified record type for displaying all records together
type UnifiedRecord =
  | (Inspection & { record_type: 'inspection', date: string })
  | (VarroaTreatment & { record_type: 'varroa_treatment', date: string })
  | (VarroaCheck & { record_type: 'varroa_check', date: string })
  | (Feeding & { record_type: 'feeding', date: string })
  | (Harvest & { record_type: 'harvest', date: string })

interface FormData {
  hive_id: string
  inspection_date: string
  inspection_time: string
  weight: number | null
  queen_seen: boolean
  eggs_present: boolean
  drones_present: number
  drone_brood_present: boolean | null
  brood_frames: number | null
  right_sized_frames: number | null
  brood_pattern_rating: number
  temperament_rating: number
  population_strength: number
  swarming_tendency: number
  calmness: number
  frames_foundation: number
  frames_brood: number
  frames_drawn: number
  honey_supers: number
  drone_frames: number
  store_frames: number
  recapping: number
  vsh: number
  smr: number
  afb_disease: number
  efb_disease: number
  chalkbrood_disease: number
  nosemosis_disease: number
  dwv_disease: number
  iapv_cbpv_disease: number
  notes: string
  image_url: string | null
}

interface TreatmentProduct {
  id: string
  product_name: string
  active_ingredients: string | null
  application_method: string | null
  treatment_duration: string | null
  temperature_range: string | null
  honey_flow_restrictions: string | null
  withdrawal_period_days: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export default function InspectionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [varroaTreatments, setVarroaTreatments] = useState<VarroaTreatment[]>([])
  const [varroaChecks, setVarroaChecks] = useState<VarroaCheck[]>([])
  const [feedings, setFeedings] = useState<Feeding[]>([])
  const [harvests, setHarvests] = useState<Harvest[]>([])
  const [allRecords, setAllRecords] = useState<UnifiedRecord[]>([])
  const [hives, setHives] = useState<Hive[]>([])
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<'inspection' | 'varroa_treatment' | 'varroa_check' | 'feeding' | 'harvest'>('inspection')
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null)
  const [editingTreatment, setEditingTreatment] = useState<VarroaTreatment | null>(null)
  const [editingCheck, setEditingCheck] = useState<VarroaCheck | null>(null)
  const [editingFeeding, setEditingFeeding] = useState<Feeding | null>(null)
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [filterHiveId, setFilterHiveId] = useState<string>('')
  const [filterApiaryId, setFilterApiaryId] = useState<string>('')
  const [timePeriod, setTimePeriod] = useState<string>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [ownershipFilter, setOwnershipFilter] = useState<'my' | 'team' | 'all'>('my')
  const [recordTypeFilter, setRecordTypeFilter] = useState<'all' | 'inspection' | 'varroa_treatment' | 'varroa_check' | 'feeding' | 'harvest'>('all')
  const [showDropdown, setShowDropdown] = useState(false)
  const [sourceHiveId, setSourceHiveId] = useState<string>('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_lastInspection, setLastInspection] = useState<Inspection | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [fetchingWeather, setFetchingWeather] = useState(false)
  const [formApiaryId, setFormApiaryId] = useState<string>('')
  const [givenTakenExpanded, setGivenTakenExpanded] = useState(false)
  const [dronesExpanded, setDronesExpanded] = useState(false)
  const [diseaseExpanded, setDiseaseExpanded] = useState(false)
  const [hygienicBehaviourExpanded, setHygienicBehaviourExpanded] = useState(false)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null)
  const [checkMethodOptions, setCheckMethodOptions] = useState<string[]>([])
  const [otherCheckMethod, setOtherCheckMethod] = useState<string>('')
  const [treatmentProducts, setTreatmentProducts] = useState<TreatmentProduct[]>([])
  const [otherTreatmentType, setOtherTreatmentType] = useState<string>('')
  const [isOtherTreatment, setIsOtherTreatment] = useState<boolean>(false)
  const [showIpmTips, setShowIpmTips] = useState<boolean>(false)
  const [feedTypeOptions, setFeedTypeOptions] = useState<string[]>([])
  const [otherFeedType, setOtherFeedType] = useState<string>('')
  const [isOtherFeedType, setIsOtherFeedType] = useState<boolean>(false)
  const [formData, setFormData] = useState<FormData>({
    hive_id: '',
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_time: new Date().toTimeString().slice(0, 5),
    weight: null,
    queen_seen: false,
    eggs_present: false,
    drones_present: -1,
    drone_brood_present: null,
    brood_frames: null,
    right_sized_frames: null,
    brood_pattern_rating: 3,
    temperament_rating: 3,
    population_strength: 3,
    swarming_tendency: 3,
    calmness: 3,
    frames_foundation: 0,
    frames_brood: 0,
    frames_drawn: 0,
    honey_supers: 0,
    drone_frames: 0,
    store_frames: 0,
    recapping: 0,
    vsh: 0,
    smr: 0,
    afb_disease: 0,
    efb_disease: 0,
    chalkbrood_disease: 0,
    nosemosis_disease: 0,
    dwv_disease: 0,
    iapv_cbpv_disease: 0,
    notes: '',
    image_url: null,
  })

  const fetchInspections = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // Optimize: Get shared hive IDs using a single query with joins
    // This replaces 3 sequential queries with 1 query
    const { data: sharedHiveData } = await supabase
      .from('team_members')
      .select(`
        team_id,
        teams!inner(
          team_apiaries!inner(
            apiary_id,
            apiaries!inner(
              hives!inner(id)
            )
          )
        )
      `)
      .eq('user_id', currentUserId)

    // Extract shared hive IDs from the nested structure
    const sharedHiveIds: string[] = []
    if (sharedHiveData) {
      type TeamData = {
        teams?: {
          team_apiaries?: Array<{
            apiaries?: {
              hives?: Array<{ id: string }>
            }
          }>
        }
      }
      (sharedHiveData as TeamData[]).forEach(tm => {
        if (tm.teams?.team_apiaries) {
          tm.teams.team_apiaries.forEach(ta => {
            if (ta.apiaries?.hives) {
              ta.apiaries.hives.forEach(h => {
                if (h.id) sharedHiveIds.push(h.id)
              })
            }
          })
        }
      })
    }

    // Build query based on ownership filter
    let query = supabase
      .from('inspections')
      .select('*, hives(hive_number, apiaries(eircode)), profiles!inspections_user_id_fkey(first_name, last_name, email)')

    // Apply ownership filter
    if (ownershipFilter === 'my') {
      query = query.eq('user_id', currentUserId)
    } else if (ownershipFilter === 'team') {
      // Only inspections for hives from shared apiaries
      if (sharedHiveIds.length > 0) {
        query = query.in('hive_id', sharedHiveIds)
      } else {
        // No shared hives, return empty result
        setInspections([])
        setLoading(false)
        return
      }
    } else {
      // 'all' = my inspections + inspections for hives from shared apiaries
      if (sharedHiveIds.length > 0) {
        query = query.or(`user_id.eq.${currentUserId},hive_id.in.(${sharedHiveIds.join(',')})`)
      } else {
        // No shared hives, only show my inspections
        query = query.eq('user_id', currentUserId)
      }
    }

    const { data } = await query
      .order('inspection_date', { ascending: false })
      .limit(500)  // Limit to most recent 500 inspections for performance

    if (data && data.length > 0) {
      // If profiles data is missing, fetch it manually (fallback for missing foreign key)
      if (data[0] && !data[0].profiles) {
        const userIds = [...new Set(data.map(i => i.user_id).filter(Boolean))]

        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds)

          if (profilesData) {
            const profilesMap = new Map(profilesData.map(p => [p.id, p]))
            data.forEach((inspection: Inspection) => {
              if (inspection.user_id) {
                const profile = profilesMap.get(inspection.user_id)
                if (profile) {
                  inspection.profiles = {
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    email: profile.email
                  }
                }
              }
            })
          }
        }
      }
    }

    if (data) setInspections(data as Inspection[])
    setLoading(false)
  }, [userId, ownershipFilter])

  const fetchVarroaTreatments = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('varroa_treatments')
      .select('*, hives(hive_number, apiary_id), profiles(first_name, last_name, email)')
      .eq('user_id', currentUserId)
      .order('treatment_date', { ascending: false })
      .limit(500)  // Limit to most recent 500 treatments for performance

    if (data) setVarroaTreatments(data as VarroaTreatment[])
  }, [userId])

  const fetchVarroaChecks = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('varroa_checks')
      .select('*, hives(hive_number), profiles(first_name, last_name, email)')
      .eq('user_id', currentUserId)
      .order('check_date', { ascending: false })
      .limit(500)  // Limit to most recent 500 checks for performance

    if (data) setVarroaChecks(data as VarroaCheck[])
  }, [userId])

  const fetchFeedings = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('feedings')
      .select('*, hives(hive_number), profiles(first_name, last_name, email)')
      .eq('user_id', currentUserId)
      .order('feed_date', { ascending: false })
      .limit(500)  // Limit to most recent 500 feedings for performance

    if (data) setFeedings(data as Feeding[])
  }, [userId])

  const fetchHarvests = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('harvests')
      .select('*, hives(hive_number), profiles(first_name, last_name, email)')
      .eq('user_id', currentUserId)
      .order('harvest_date', { ascending: false })
      .limit(500)  // Limit to most recent 500 harvests for performance

    if (data) setHarvests(data as Harvest[])
  }, [userId])

  const fetchHives = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // Fetch user's own hives
    const { data: ownHives, error: ownError } = await supabase
      .from('hives')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('status', 'active')
      .order('hive_number')

    if (ownError) {
    }

    // Fetch team memberships to get shared hives
    const { data: teamMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', currentUserId)

    const teamIds = teamMemberships?.map(tm => tm.team_id) || []

    let sharedHives: Hive[] = []
    if (teamIds.length > 0) {
      const { data: teamApiaryData } = await supabase
        .from('team_apiaries')
        .select('apiary_id')
        .in('team_id', teamIds)

      const sharedApiaryIds = teamApiaryData?.map(ta => ta.apiary_id) || []

      if (sharedApiaryIds.length > 0) {
        const { data: sharedHivesData } = await supabase
          .from('hives')
          .select('*')
          .in('apiary_id', sharedApiaryIds)
          .eq('status', 'active')
          .order('hive_number')

        sharedHives = sharedHivesData || []
      }
    }

    // Combine own and shared hives, removing duplicates
    const allHives = [...(ownHives || []), ...sharedHives]
    const uniqueHives = Array.from(
      new Map(allHives.map(h => [h.id, h])).values()
    ).sort((a, b) => a.hive_number.localeCompare(b.hive_number))

    setHives(uniqueHives as Hive[])
  }, [userId])

  const fetchApiaries = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // Fetch user's own apiaries
    const { data: ownApiaries } = await supabase
      .from('apiaries')
      .select('id, name')
      .eq('user_id', currentUserId)
      .order('name')

    // Fetch team memberships to get shared apiaries
    const { data: teamMemberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', currentUserId)

    const teamIds = teamMemberships?.map(tm => tm.team_id) || []

    let sharedApiaries: Apiary[] = []
    if (teamIds.length > 0) {
      const { data: teamApiaryData } = await supabase
        .from('team_apiaries')
        .select('apiary_id, apiaries(id, name)')
        .in('team_id', teamIds)

      if (teamApiaryData) {
        sharedApiaries = teamApiaryData
          .filter(ta => ta.apiaries)
          .map(ta => {
            const apiary = Array.isArray(ta.apiaries) ? ta.apiaries[0] : ta.apiaries
            return {
              id: apiary!.id,
              name: apiary!.name
            }
          })
      }
    }

    // Combine own and shared apiaries, removing duplicates
    const allApiaries = [...(ownApiaries || []), ...sharedApiaries]
    const uniqueApiaries = Array.from(
      new Map(allApiaries.map(a => [a.id, a])).values()
    ).sort((a, b) => a.name.localeCompare(b.name))

    setApiaries(uniqueApiaries)
  }, [userId])

  const fetchCheckMethods = useCallback(async () => {
    try {
      // Fetch the varroa_check_method category (shared across all users)
      const { data: category } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_key', 'varroa_check_method')
        .single()

      if (category) {
        // Fetch active dropdown values for this category
        const { data: values } = await supabase
          .from('dropdown_values')
          .select('value')
          .eq('category_id', category.id)
          .eq('is_active', true)
          .order('display_order')

        if (values) {
          const methods = values.map(v => v.value)
          setCheckMethodOptions(methods)
        }
      }
    } catch {
    }
  }, [])

  const fetchFeedTypes = useCallback(async () => {
    try {
      // Fetch the feed_type category (shared across all users)
      const { data: category } = await supabase
        .from('dropdown_categories')
        .select('id')
        .eq('category_key', 'feed_type')
        .single()

      if (category) {
        // Fetch active dropdown values for this category
        const { data: values } = await supabase
          .from('dropdown_values')
          .select('value')
          .eq('category_id', category.id)
          .eq('is_active', true)
          .order('display_order')

        if (values) {
          const types = values.map(v => v.value)
          setFeedTypeOptions(types)
        }
      }
    } catch {
    }
  }, [])

  const fetchTreatmentProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('varroa_treatment_products')
        .select('*')
        .order('product_name')

      if (error) {
      } else if (data) {
        setTreatmentProducts(data)
      }
    } catch {
    }
  }, [])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)

      // Fetch all data in parallel for better performance
      await Promise.all([
        fetchInspections(id),
        fetchVarroaTreatments(id),
        fetchVarroaChecks(id),
        fetchFeedings(id),
        fetchHarvests(id),
        fetchHives(id),
        fetchApiaries(id),
        fetchCheckMethods(),
        fetchFeedTypes(),
        fetchTreatmentProducts()
      ])
    }
    initUser()
  }, [router, fetchInspections, fetchVarroaTreatments, fetchVarroaChecks, fetchFeedings, fetchHarvests, fetchHives, fetchApiaries, fetchCheckMethods, fetchFeedTypes, fetchTreatmentProducts])

  // Handle URL query parameters to open specific form dialogs
  useEffect(() => {
    const hiveParam = searchParams.get('hive')
    const typeParam = searchParams.get('type')

    if (hiveParam && typeParam && hives.length > 0) {
      // Set the hive filter and source hive ID for navigation
      setFilterHiveId(hiveParam)
      setSourceHiveId(hiveParam)

      // Set the form type and open the form
      const validTypes = ['inspection', 'varroa-check', 'varroa-treatment', 'feeding', 'harvest']
      if (validTypes.includes(typeParam)) {
        const mappedType = typeParam === 'varroa-check' ? 'varroa_check' :
                          typeParam === 'varroa-treatment' ? 'varroa_treatment' :
                          typeParam as 'inspection' | 'varroa_treatment' | 'varroa_check' | 'feeding' | 'harvest'

        const currentDate = new Date().toISOString().split('T')[0]

        // Set the appropriate form data based on type
        if (mappedType === 'inspection') {
          setFormData(prev => ({
            ...prev,
            hive_id: hiveParam
          }))
        } else if (mappedType === 'varroa_treatment') {
          setEditingTreatment({
            id: '',
            hive_id: hiveParam,
            treatment_date: currentDate,
            treatment_type: '',
            dosage: '',
            temperature: null,
            weather_conditions: '',
            notes: '',
            user_id: userId || '',
          })
        } else if (mappedType === 'varroa_check') {
          setEditingCheck({
            id: '',
            hive_id: hiveParam,
            check_date: currentDate,
            method: '',
            mites_count: null,
            sample_size: null,
            infestation_rate: null,
            action_threshold_reached: false,
            notes: '',
            user_id: userId || '',
          })
        } else if (mappedType === 'feeding') {
          setEditingFeeding({
            id: '',
            hive_id: hiveParam,
            feed_date: currentDate,
            feed_type: '',
            quantity: null,
            unit: '',
            notes: '',
            user_id: userId || '',
          })
        } else if (mappedType === 'harvest') {
          setEditingHarvest({
            id: '',
            hive_id: hiveParam,
            harvest_date: currentDate,
            honey_weight: null,
            wax_weight: null,
            unit: '',
            frames_harvested: null,
            notes: '',
            user_id: userId || '',
          })
        }

        setFormType(mappedType)
        setShowForm(true)

        // Clear the URL parameters after opening the form
        router.replace('/dashboard/records')
      }
    }
  }, [searchParams, hives, router, userId])

  // Merge all records whenever any record type changes
  useEffect(() => {
    const merged: UnifiedRecord[] = [
      ...inspections.map(i => ({ ...i, record_type: 'inspection' as const, date: i.inspection_date })),
      ...varroaTreatments.map(vt => ({ ...vt, record_type: 'varroa_treatment' as const, date: vt.treatment_date })),
      ...varroaChecks.map(vc => ({ ...vc, record_type: 'varroa_check' as const, date: vc.check_date })),
      ...feedings.map(f => ({ ...f, record_type: 'feeding' as const, date: f.feed_date })),
      ...harvests.map(h => ({ ...h, record_type: 'harvest' as const, date: h.harvest_date }))
    ]

    // Sort by date descending (most recent first)
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setAllRecords(merged)
  }, [inspections, varroaTreatments, varroaChecks, feedings, harvests])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showDropdown && !target.closest('.dropdown-container')) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  const fetchLastInspection = async (hiveId: string) => {
    if (!hiveId || !userId) {
      setLastInspection(null)
      return
    }

    const { data } = await supabase
      .from('inspections')
      .select('*')
      .eq('hive_id', hiveId)
      .eq('user_id', userId)
      .order('inspection_date', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      setLastInspection(data[0] as Inspection)
    } else {
      setLastInspection(null)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setFormData({ ...formData, image_url: null })
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `inspections/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('inspection-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('inspection-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch {
      alert('Failed to upload image')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const fetchWeatherData = async (eircode: string) => {
    try {
      // Remove spaces and encode the Eircode for the URL
      const cleanedEircode = eircode.trim().replace(/\s+/g, '').toUpperCase()

      // Nominatim requires a User-Agent header
      const headers = {
        'User-Agent': 'HiveCraic/1.0'
      }

      // First, try searching with just the Eircode and Ireland
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedEircode)},Ireland&format=json&limit=1`,
        { headers }
      )
      const geocodeData = await geocodeResponse.json()

      if (!geocodeData || geocodeData.length === 0) {
        // Try with different format - just search term
        const altResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedEircode + ' Ireland')}&format=json&limit=1`,
          { headers }
        )
        const altData = await altResponse.json()

        if (!altData || altData.length === 0) {
          // Fallback to Dublin city center coordinates if Eircode lookup fails
          return await getWeatherFromCoordinates('53.3498', '-6.2603')
        }

        const { lat, lon } = altData[0]
        return await getWeatherFromCoordinates(lat, lon)
      }

      const { lat, lon } = geocodeData[0]
      return await getWeatherFromCoordinates(lat, lon)
    } catch {
      // Fallback to Dublin coordinates on error
      return await getWeatherFromCoordinates('53.3498', '-6.2603')
    }
  }

  const getWeatherFromCoordinates = async (lat: string, lon: string) => {
    try {
      // Get current weather from Open-Meteo API (free, no API key required)
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe/Dublin`
      )
      const weatherData = await weatherResponse.json()

      if (!weatherData.current) {
        return null
      }

      // Map weather codes to conditions
      const weatherCodeMap: { [key: number]: string } = {
        0: 'Clear',
        1: 'Mainly Clear',
        2: 'Partly Cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing Rime Fog',
        51: 'Light Drizzle',
        53: 'Moderate Drizzle',
        55: 'Dense Drizzle',
        61: 'Slight Rain',
        63: 'Moderate Rain',
        65: 'Heavy Rain',
        71: 'Slight Snow',
        73: 'Moderate Snow',
        75: 'Heavy Snow',
        80: 'Slight Rain Showers',
        81: 'Moderate Rain Showers',
        82: 'Violent Rain Showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with Hail',
      }

      const result = {
        temp: Math.round(weatherData.current.temperature_2m),
        condition: weatherCodeMap[weatherData.current.weather_code] || 'Unknown',
        humidity: weatherData.current.relative_humidity_2m,
        wind_speed: Math.round(weatherData.current.wind_speed_10m),
      }

      return result
    } catch {
      return null
    }
  }

  const handleHiveChange = async (hiveId: string) => {
    await fetchLastInspection(hiveId)

    // Don't update if we're editing an existing inspection
    if (editingInspection) {
      setFormData({ ...formData, hive_id: hiveId })
      return
    }

    if (!userId) return

    // Fetch last inspection for this hive
    const { data } = await supabase
      .from('inspections')
      .select('*')
      .eq('hive_id', hiveId)
      .eq('user_id', userId)
      .order('inspection_date', { ascending: false })
      .limit(1)

    const lastInsp = data && data.length > 0 ? data[0] as Inspection : null

    setFormData({
      ...formData,
      hive_id: hiveId,
      brood_pattern_rating: lastInsp?.brood_pattern_rating || 3,
      temperament_rating: lastInsp?.temperament_rating || 3,
      population_strength: lastInsp?.population_strength || 3,
      image_url: null,
    })
  }

  // Varroa Treatment CRUD Handler
  const handleTreatmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !editingTreatment) return

    try {
      const submitData = {
        hive_id: editingTreatment.hive_id,
        treatment_date: editingTreatment.treatment_date,
        treatment_type: editingTreatment.treatment_type,
        dosage: editingTreatment.dosage,
        temperature: editingTreatment.temperature,
        weather_conditions: editingTreatment.weather_conditions || '',
        notes: editingTreatment.notes || '',
      }

      if (editingTreatment.id) {
        // Update existing treatment
        const { error } = await supabase
          .from('varroa_treatments')
          .update(submitData)
          .eq('id', editingTreatment.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        // Insert new treatment
        const { error } = await supabase
          .from('varroa_treatments')
          .insert([{ ...submitData, user_id: userId }])

        if (error) throw error
      }

      fetchVarroaTreatments()
      setShowForm(false)
      setEditingTreatment(null)
    } catch (error) {
      if (error instanceof Error) {
        alert('Error saving treatment: ' + error.message)
      }
    }
  }

  // Varroa Check CRUD Handler
  const handleCheckSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !editingCheck) return

    try {
      const submitData = {
        hive_id: editingCheck.hive_id,
        check_date: editingCheck.check_date,
        method: editingCheck.method,
        mites_count: editingCheck.mites_count,
        sample_size: editingCheck.sample_size,
        infestation_rate: editingCheck.infestation_rate,
        action_threshold_reached: editingCheck.action_threshold_reached,
        notes: editingCheck.notes || '',
      }

      if (editingCheck.id) {
        // Update existing check
        const { error } = await supabase
          .from('varroa_checks')
          .update(submitData)
          .eq('id', editingCheck.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        // Insert new check
        const { error } = await supabase
          .from('varroa_checks')
          .insert([{ ...submitData, user_id: userId }])

        if (error) throw error
      }

      fetchVarroaChecks()
      setShowForm(false)
      setEditingCheck(null)
    } catch (error) {
      if (error instanceof Error) {
        alert('Error saving check: ' + error.message)
      }
    }
  }

  // Feeding CRUD Handler
  const handleFeedingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !editingFeeding) return

    try {
      // Use otherFeedType if "Other" is selected, otherwise use the dropdown value
      const finalFeedType = isOtherFeedType ? otherFeedType : editingFeeding.feed_type

      const submitData = {
        hive_id: editingFeeding.hive_id,
        feed_date: editingFeeding.feed_date,
        feed_type: finalFeedType,
        quantity: editingFeeding.quantity,
        unit: editingFeeding.unit,
        notes: editingFeeding.notes || '',
      }

      if (editingFeeding.id) {
        // Update existing feeding
        const { error } = await supabase
          .from('feedings')
          .update(submitData)
          .eq('id', editingFeeding.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        // Insert new feeding
        const { error } = await supabase
          .from('feedings')
          .insert([{ ...submitData, user_id: userId }])

        if (error) throw error
      }

      fetchFeedings()
      setShowForm(false)
      setEditingFeeding(null)
      setIsOtherFeedType(false)
      setOtherFeedType('')
    } catch (error) {
      if (error instanceof Error) {
        alert('Error saving feeding: ' + error.message)
      }
    }
  }

  // Harvest CRUD Handler
  const handleHarvestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !editingHarvest) return

    try {
      const submitData = {
        hive_id: editingHarvest.hive_id,
        harvest_date: editingHarvest.harvest_date,
        honey_weight: editingHarvest.honey_weight,
        wax_weight: editingHarvest.wax_weight,
        unit: editingHarvest.unit,
        frames_harvested: editingHarvest.frames_harvested,
        notes: editingHarvest.notes || '',
      }

      if (editingHarvest.id) {
        // Update existing harvest
        const { error } = await supabase
          .from('harvests')
          .update(submitData)
          .eq('id', editingHarvest.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        // Insert new harvest
        const { error } = await supabase
          .from('harvests')
          .insert([{ ...submitData, user_id: userId }])

        if (error) throw error
      }

      fetchHarvests()
      setShowForm(false)
      setEditingHarvest(null)
    } catch (error) {
      if (error instanceof Error) {
        alert('Error saving harvest: ' + error.message)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Upload image if one was selected
      let imageUrl = formData.image_url
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      }

      // Fetch weather data based on hive's apiary Eircode
      setFetchingWeather(true)
      let weatherData = null
      const selectedHive = hives.find(h => h.id === formData.hive_id)

      if (selectedHive?.apiary_id) {
        const { data: apiaryData } = await supabase
          .from('apiaries')
          .select('eircode')
          .eq('id', selectedHive.apiary_id)
          .single()

        if (apiaryData?.eircode) {
          weatherData = await fetchWeatherData(apiaryData.eircode)
        }
      }
      setFetchingWeather(false)

      const submitData = {
        hive_id: formData.hive_id,
        inspection_date: formData.inspection_date,
        inspection_time: formData.inspection_time,
        weight: formData.weight,
        queen_seen: formData.queen_seen,
        eggs_present: formData.eggs_present,
        drones_present: formData.drones_present,
        drone_brood_present: formData.drone_brood_present,
        brood_frames: formData.brood_frames,
        right_sized_frames: formData.right_sized_frames,
        brood_pattern_rating: formData.brood_pattern_rating,
        temperament_rating: formData.temperament_rating,
        population_strength: formData.population_strength,
        swarming_tendency: formData.swarming_tendency,
        calmness: formData.calmness,
        frames_foundation: formData.frames_foundation,
        frames_brood: formData.frames_brood,
        frames_drawn: formData.frames_drawn,
        honey_supers: formData.honey_supers,
        drone_frames: formData.drone_frames,
        store_frames: formData.store_frames,
        recapping: formData.recapping,
        vsh: formData.vsh,
        smr: formData.smr,
        afb_disease: formData.afb_disease,
        efb_disease: formData.efb_disease,
        chalkbrood_disease: formData.chalkbrood_disease,
        nosemosis_disease: formData.nosemosis_disease,
        dwv_disease: formData.dwv_disease,
        iapv_cbpv_disease: formData.iapv_cbpv_disease,
        notes: formData.notes,
        image_url: imageUrl,
        weather_temp: weatherData?.temp || null,
        weather_condition: weatherData?.condition || null,
        weather_humidity: weatherData?.humidity || null,
        weather_wind_speed: weatherData?.wind_speed || null,
      }

      if (!userId) return

      if (editingInspection) {
        const { error } = await supabase
          .from('inspections')
          .update(submitData)
          .eq('id', editingInspection.id)
          .eq('user_id', userId)
          .select()

        if (error) {
          throw error
        }
      } else {
        const { error } = await supabase
          .from('inspections')
          .insert([{ ...submitData, user_id: userId }])
          .select()

        if (error) {
          throw error
        }
      }

      fetchInspections()
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      }
    }
  }

  const handleEdit = (inspection: Inspection) => {
    setEditingInspection(inspection)

    // Find the hive's apiary to pre-populate the apiary selector
    const selectedHive = hives.find(h => h.id === inspection.hive_id)
    if (selectedHive?.apiary_id) {
      setFormApiaryId(selectedHive.apiary_id)
    } else {
      setFormApiaryId('')
    }

    setFormData({
      hive_id: inspection.hive_id,
      inspection_date: inspection.inspection_date,
      inspection_time: inspection.inspection_time || '',
      weight: inspection.weight ?? null,
      queen_seen: inspection.queen_seen || false,
      eggs_present: inspection.eggs_present || false,
      drones_present: inspection.drones_present ?? -1,
      drone_brood_present: inspection.drone_brood_present ?? null,
      brood_frames: inspection.brood_frames ?? null,
      right_sized_frames: inspection.right_sized_frames ?? null,
      brood_pattern_rating: inspection.brood_pattern_rating ?? 3,
      temperament_rating: inspection.temperament_rating ?? 3,
      population_strength: inspection.population_strength ?? 3,
      swarming_tendency: inspection.swarming_tendency ?? 3,
      calmness: inspection.calmness ?? 3,
      frames_foundation: inspection.frames_foundation ?? 0,
      frames_brood: inspection.frames_brood ?? 0,
      frames_drawn: inspection.frames_drawn ?? 0,
      honey_supers: inspection.honey_supers ?? 0,
      drone_frames: inspection.drone_frames ?? 0,
      store_frames: inspection.store_frames ?? 0,
      recapping: inspection.recapping ?? 0,
      vsh: inspection.vsh ?? 0,
      smr: inspection.smr ?? 0,
      afb_disease: inspection.afb_disease ?? 0,
      efb_disease: inspection.efb_disease ?? 0,
      chalkbrood_disease: inspection.chalkbrood_disease ?? 0,
      nosemosis_disease: inspection.nosemosis_disease ?? 0,
      dwv_disease: inspection.dwv_disease ?? 0,
      iapv_cbpv_disease: inspection.iapv_cbpv_disease ?? 0,
      notes: inspection.notes || '',
      image_url: inspection.image_url || null,
    })

    // Set image preview if there's an existing image
    if (inspection.image_url) {
      setImagePreview(inspection.image_url)
    } else {
      setImagePreview(null)
    }
    setImageFile(null)

    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this inspection?')) {
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (!error) fetchInspections()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingInspection(null)
    setFormApiaryId('')
    setImageFile(null)
    setImagePreview(null)
    setGivenTakenExpanded(false)
    setDronesExpanded(false)
    setDiseaseExpanded(false)
    setHygienicBehaviourExpanded(false)
    setFormData({
      hive_id: '',
      inspection_date: new Date().toISOString().split('T')[0],
      inspection_time: new Date().toTimeString().slice(0, 5),
      weight: null,
      queen_seen: false,
      eggs_present: false,
      drones_present: 0,
      drone_brood_present: false,
      brood_frames: null,
      right_sized_frames: null,
      brood_pattern_rating: 3,
      temperament_rating: 3,
      population_strength: 3,
      swarming_tendency: 3,
      calmness: 3,
      frames_foundation: 0,
      frames_brood: 0,
      frames_drawn: 0,
      honey_supers: 0,
      drone_frames: 0,
      store_frames: 0,
      recapping: 0,
      vsh: 0,
      smr: 0,
      afb_disease: 0,
      efb_disease: 0,
      chalkbrood_disease: 0,
      nosemosis_disease: 0,
      dwv_disease: 0,
      iapv_cbpv_disease: 0,
      notes: '',
      image_url: null,
    })
  }

  const renderStars = (rating: number) => '⭐'.repeat(rating || 0)

  // Calculate date range based on time period
  const getDateRange = () => {
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
  }

  // Filter all records based on record type, apiary, hive and time period
  const filteredRecords = allRecords.filter(record => {
    // Filter by record type
    if (recordTypeFilter !== 'all' && record.record_type !== recordTypeFilter) {
      return false
    }

    // Filter by apiary (checks if the record's hive belongs to the selected apiary)
    if (filterApiaryId) {
      const hive = hives.find(h => h.id === record.hive_id)
      if (!hive || hive.apiary_id !== filterApiaryId) {
        return false
      }
    }

    // Filter by hive
    if (filterHiveId && record.hive_id !== filterHiveId) {
      return false
    }

    // Filter by time period
    const startDate = getDateRange()
    if (startDate) {
      const recordDate = new Date(record.date)

      // For custom range, check both start and end dates
      if (timePeriod === 'custom') {
        if (customStartDate && recordDate < new Date(customStartDate)) {
          return false
        }
        if (customEndDate && recordDate > new Date(customEndDate)) {
          return false
        }
      } else {
        // For preset ranges, just check start date
        if (recordDate < startDate) {
          return false
        }
      }
    }

    return true
  })

  if (loading) return <LoadingSpinner text="Loading records..." />

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-responsive-3xl font-bold text-gray-900">Records 📋</h1>
          {sourceHiveId && (
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/dashboard/hives/${sourceHiveId}`)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="View hive detail"
              >
                <ExternalLink size={18} />
                Hive Detail
              </button>
              <button
                onClick={() => router.push('/dashboard/hives')}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Go to hives page"
              >
                <Home size={18} />
                Hives
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <select
            value={ownershipFilter}
            onChange={(e) => {
              setOwnershipFilter(e.target.value as 'my' | 'team' | 'all')
              fetchInspections()
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
          >
            <option value="my">My Records</option>
            <option value="team">Team Records</option>
            <option value="all">All Records</option>
          </select>
          <select
            value={recordTypeFilter}
            onChange={(e) => {
              setRecordTypeFilter(e.target.value as typeof recordTypeFilter)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
          >
            <option value="all">All Types</option>
            <option value="inspection">Hive Inspection</option>
            <option value="varroa_treatment">Varroa Treatment</option>
            <option value="varroa_check">Varroa Check</option>
            <option value="feeding">Feeding</option>
            <option value="harvest">Harvest</option>
          </select>
          <select
            value={filterApiaryId}
            onChange={(e) => {
              setFilterApiaryId(e.target.value)
              setFilterHiveId('') // Clear hive filter when apiary changes
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          >
            <option value="">All Apiaries</option>
            {apiaries.map((apiary) => (
              <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
            ))}
          </select>
          <select
            value={filterHiveId}
            onChange={(e) => setFilterHiveId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          >
            <option value="">All Hives</option>
            {hives
              .filter(hive => !filterApiaryId || hive.apiary_id === filterApiaryId)
              .map((hive) => (
                <option key={hive.id} value={hive.id}>{hive.hive_number}</option>
              ))}
          </select>
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-4 py-2 min-h-[48px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 font-medium flex items-center gap-2 justify-center touch-manipulation w-full sm:w-auto"
            >
              <Plus size={18} />
              New Record
              <ChevronDown size={18} />
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <button
                  onClick={() => {
                    setFormType('inspection')
                    setShowForm(true)
                    setShowDropdown(false)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-2 rounded-t-lg transition-colors"
                >
                  <Plus size={16} />
                  Hive Inspection
                </button>
                <button
                  onClick={() => {
                    setFormType('varroa_treatment')
                    setEditingTreatment({
                      id: '',
                      hive_id: '',
                      user_id: userId || '',
                      treatment_date: new Date().toISOString().split('T')[0],
                      treatment_type: '',
                      dosage: '',
                      temperature: null,
                      weather_conditions: '',
                      notes: '',
                    })
                    setOtherTreatmentType('')
                    setIsOtherTreatment(false)
                    setShowForm(true)
                    setShowDropdown(false)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  Varroa Treatment
                </button>
                <button
                  onClick={() => {
                    setFormType('varroa_check')
                    setEditingCheck({
                      id: '',
                      hive_id: '',
                      user_id: userId || '',
                      check_date: new Date().toISOString().split('T')[0],
                      method: '',
                      mites_count: null,
                      sample_size: null,
                      infestation_rate: null,
                      action_threshold_reached: false,
                      notes: '',
                    })
                    setShowForm(true)
                    setShowDropdown(false)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  Varroa Check
                </button>
                <button
                  onClick={() => {
                    setFormType('feeding')
                    setEditingFeeding({
                      id: '',
                      hive_id: '',
                      user_id: userId || '',
                      feed_date: new Date().toISOString().split('T')[0],
                      feed_type: '',
                      quantity: null,
                      unit: 'L',
                      notes: '',
                    })
                    setIsOtherFeedType(false)
                    setOtherFeedType('')
                    setShowForm(true)
                    setShowDropdown(false)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} />
                  Feeding
                </button>
                <button
                  onClick={() => {
                    setFormType('harvest')
                    setEditingHarvest({
                      id: '',
                      hive_id: '',
                      user_id: userId || '',
                      harvest_date: new Date().toISOString().split('T')[0],
                      honey_weight: null,
                      wax_weight: null,
                      unit: 'kg',
                      frames_harvested: null,
                      notes: '',
                    })
                    setShowForm(true)
                    setShowDropdown(false)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-2 rounded-b-lg transition-colors"
                >
                  <Plus size={16} />
                  Harvest
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Time Period Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Time Period:</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTimePeriod('all')}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                  timePeriod === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setTimePeriod('3months')}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                  timePeriod === '3months'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                Last 3 Months
              </button>
              <button
                onClick={() => setTimePeriod('6months')}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                  timePeriod === '6months'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                Last 6 Months
              </button>
              <button
                onClick={() => setTimePeriod('1year')}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                  timePeriod === '1year'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                Last Year
              </button>
              <button
                onClick={() => setTimePeriod('custom')}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                  timePeriod === 'custom'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Custom Date Range Inputs */}
          {timePeriod === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 pl-0 md:pl-28">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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

      {showForm && formType === 'inspection' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-xl font-semibold">
              {editingInspection ? 'Edit Inspection' : 'Record New Inspection'}
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="submit"
                form="inspection-form"
                disabled={uploadingImage || fetchingWeather}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all touch-manipulation font-medium"
              >
                {uploadingImage ? 'Uploading Image...' : fetchingWeather ? 'Fetching Weather...' : editingInspection ? 'Update' : 'Save'} Inspection
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
          <form id="inspection-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inspection Details Section - Grouped */}
            <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Inspection Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apiary</label>
                  <select
                    value={formApiaryId}
                    onChange={(e) => {
                      setFormApiaryId(e.target.value)
                      setFormData({...formData, hive_id: ''}) // Reset hive selection when apiary changes
                    }}
                    className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
                  >
                    <option value="">All Apiaries</option>
                    {apiaries.map((apiary) => (
                      <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hive *</label>
                  <select
                    value={formData.hive_id}
                    onChange={(e) => handleHiveChange(e.target.value)}
                    className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
                    required
                  >
                    <option value="">Select hive</option>
                    {hives
                      .filter(h => !formApiaryId || h.apiary_id === formApiaryId)
                      .map((h) => (
                        <option key={h.id} value={h.id}>{h.hive_number}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.inspection_date}
                    onChange={(e) => setFormData({...formData, inspection_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    value={formData.inspection_time}
                    onChange={(e) => setFormData({...formData, inspection_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight ?? ''}
                    onChange={(e) => setFormData({...formData, weight: e.target.value ? parseFloat(e.target.value) : null})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {/* Queen & Brood Section - Grouped */}
            <div className="md:col-span-2 bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Queen & Brood</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer touch-manipulation hover:bg-gray-50 active:bg-gray-100 border border-purple-100">
                  <input
                    type="checkbox"
                    checked={formData.queen_seen}
                    onChange={(e) => setFormData({...formData, queen_seen: e.target.checked})}
                    className="h-5 w-5 min-h-[20px] min-w-[20px] rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Queen Seen</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer touch-manipulation hover:bg-gray-50 active:bg-gray-100 border border-purple-100">
                  <input
                    type="checkbox"
                    checked={formData.eggs_present}
                    onChange={(e) => setFormData({...formData, eggs_present: e.target.checked})}
                    className="h-5 w-5 min-h-[20px] min-w-[20px] rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Eggs Present</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Frames with Brood {formData.brood_frames !== null ? `(${formData.brood_frames})` : ''}
                </label>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-11 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setFormData({...formData, brood_frames: num})}
                      className={`min-h-[48px] min-w-[48px] sm:min-h-[52px] sm:min-w-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                        formData.brood_frames === num
                          ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300'
                          : 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, brood_frames: null})}
                    className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-sm transition-all touch-manipulation col-span-5 sm:col-span-2 md:col-span-1 ${
                      formData.brood_frames === null
                        ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                        : 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {hives.find(h => h.id === formData.hive_id)?.configuration?.right_sized_broodbox && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Right-Sized to How Many Frames {formData.right_sized_frames !== null ? `(${formData.right_sized_frames})` : ''}
                  </label>
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-11 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({...formData, right_sized_frames: num})}
                        className={`min-h-[48px] min-w-[48px] sm:min-h-[52px] sm:min-w-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                          formData.right_sized_frames === num
                            ? 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-300'
                            : 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, right_sized_frames: null})}
                      className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-sm transition-all touch-manipulation col-span-5 sm:col-span-2 md:col-span-1 ${
                        formData.right_sized_frames === null
                          ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                          : 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Behaviour Section - Grouped */}
            <div className="md:col-span-2 bg-teal-50 p-4 rounded-lg border-2 border-teal-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Behaviour</h4>

              {/* Population */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Population: {formData.population_strength === 0 ? 'Not Recorded' : renderStars(formData.population_strength)}
                  </label>
                  <div className="relative group">
                    <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      <div className="font-semibold mb-2">Population Rating Guide:</div>
                      <div className="space-y-1">
                        <div><strong>⭐ (1):</strong> Very Weak - Few bees, struggling colony</div>
                        <div><strong>⭐⭐ (2):</strong> Weak - Low population, needs attention</div>
                        <div><strong>⭐⭐⭐ (3):</strong> Moderate - Average strength, room to grow</div>
                        <div><strong>⭐⭐⭐⭐ (4):</strong> Strong - Good population, healthy colony</div>
                        <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Very Strong - Bursting with bees, may need space</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                        Population strength indicates colony health and productivity potential.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({...formData, population_strength: rating})}
                      className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                        formData.population_strength === rating
                          ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                          : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, population_strength: 0})}
                    className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                      formData.population_strength === 0
                        ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                        : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    Not Recorded
                  </button>
                </div>
              </div>

              {/* Temperament */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Temperament: {formData.temperament_rating === 0 ? 'Not Recorded' : renderStars(formData.temperament_rating)}
                  </label>
                  <div className="relative group">
                    <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      <div className="font-semibold mb-2">Temperament Rating Guide:</div>
                      <div className="space-y-1">
                        <div><strong>⭐ (1):</strong> Aggressive - Very defensive, difficult to work with</div>
                        <div><strong>⭐⭐ (2):</strong> Defensive - Quite agitated, requires care</div>
                        <div><strong>⭐⭐⭐ (3):</strong> Average - Some defensiveness, manageable</div>
                        <div><strong>⭐⭐⭐⭐ (4):</strong> Calm - Easy to work with, minimal smoke needed</div>
                        <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Gentle - Very calm, pleasant to inspect</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                        Temperament affects how easy the colony is to manage and inspect safely.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({...formData, temperament_rating: rating})}
                      className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                        formData.temperament_rating === rating
                          ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                          : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, temperament_rating: 0})}
                    className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                      formData.temperament_rating === 0
                        ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                        : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    Not Recorded
                  </button>
                </div>
              </div>

              {/* Brood Pattern */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Brood Pattern: {formData.brood_pattern_rating === 0 ? 'Not Recorded' : renderStars(formData.brood_pattern_rating)}
                  </label>
                  <div className="relative group">
                    <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      <div className="font-semibold mb-2">Brood Pattern Rating Guide:</div>
                      <div className="space-y-1">
                        <div><strong>⭐ (1):</strong> Poor - Many empty cells, spotty pattern</div>
                        <div><strong>⭐⭐ (2):</strong> Fair - Some gaps, irregular pattern</div>
                        <div><strong>⭐⭐⭐ (3):</strong> Good - Mostly solid with few gaps</div>
                        <div><strong>⭐⭐⭐⭐ (4):</strong> Very Good - Solid pattern, minimal gaps</div>
                        <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Excellent - Solid, compact brood pattern</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                        A good brood pattern indicates a healthy, productive queen laying eggs consistently.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({...formData, brood_pattern_rating: rating})}
                      className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                        formData.brood_pattern_rating === rating
                          ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                          : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, brood_pattern_rating: 0})}
                    className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                      formData.brood_pattern_rating === 0
                        ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                        : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    Not Recorded
                  </button>
                </div>
              </div>

              {/* Swarming Tendency */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Swarming Tendency: {formData.swarming_tendency === 0 ? 'Not Recorded' : renderStars(formData.swarming_tendency)}
                  </label>
                  <div className="relative group">
                    <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      <div className="font-semibold mb-2">Swarming Tendency Rating Guide:</div>
                      <div className="space-y-1">
                        <div><strong>⭐ (1):</strong> Very Low - Rarely swarms, stable colony</div>
                        <div><strong>⭐⭐ (2):</strong> Low - Occasional signs, manageable</div>
                        <div><strong>⭐⭐⭐ (3):</strong> Moderate - Average swarming behavior</div>
                        <div><strong>⭐⭐⭐⭐ (4):</strong> High - Frequent queen cells, needs attention</div>
                        <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Very High - Strong swarm preparations evident</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                        Monitor swarming tendency to prevent losing half your colony.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({...formData, swarming_tendency: rating})}
                      className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                        formData.swarming_tendency === rating
                          ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                          : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, swarming_tendency: 0})}
                    className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                      formData.swarming_tendency === 0
                        ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                        : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    Not Recorded
                  </button>
                </div>
              </div>

              {/* Calmness */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Calmness: {formData.calmness === 0 ? 'Not Recorded' : renderStars(formData.calmness)}
                  </label>
                  <div className="relative group">
                    <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                      <div className="font-semibold mb-2">Calmness Rating Guide:</div>
                      <div className="space-y-1">
                        <div><strong>⭐ (1):</strong> Very Nervous - Runs on comb, easily agitated</div>
                        <div><strong>⭐⭐ (2):</strong> Nervous - Some running, fairly reactive</div>
                        <div><strong>⭐⭐⭐ (3):</strong> Average - Normal bee behavior</div>
                        <div><strong>⭐⭐⭐⭐ (4):</strong> Calm - Stay on comb, minimal disturbance</div>
                        <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Very Calm - Hardly notice inspection, very gentle</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                        Calm bees make inspections easier and safer for both bees and beekeeper.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({...formData, calmness: rating})}
                      className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                        formData.calmness === rating
                          ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                          : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, calmness: 0})}
                    className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                      formData.calmness === 0
                        ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                        : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    Not Recorded
                  </button>
                </div>
              </div>
            </div>

            {/* Given/Taken Section - Collapsible */}
            <div className="md:col-span-2 bg-orange-50 rounded-lg border-2 border-orange-200">
              <button
                type="button"
                onClick={() => setGivenTakenExpanded(!givenTakenExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-orange-100 transition-colors rounded-t-lg"
              >
                <h4 className="text-sm font-semibold text-gray-900">Given/Taken</h4>
                {givenTakenExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {givenTakenExpanded && (
                <div className="p-2 sm:p-4 pt-0 space-y-3 sm:space-y-4">
                  {/* Frames-Foundation */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      <span className="hidden sm:inline">Frames-Foundation</span>
                      <span className="sm:hidden">Foundation</span>
                    </label>
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, frames_foundation: formData.frames_foundation - 1})}
                        className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 font-bold text-xl transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      >
                        <Minus size={16} className="sm:hidden" />
                        <Minus size={20} className="hidden sm:block" />
                      </button>
                      <input
                        type="number"
                        value={formData.frames_foundation}
                        onChange={(e) => setFormData({...formData, frames_foundation: parseInt(e.target.value) || 0})}
                        className="flex-1 text-center px-1 sm:px-3 py-2 min-h-[40px] sm:min-h-[48px] border-2 border-gray-300 rounded-lg font-semibold text-sm sm:text-lg w-0"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, frames_foundation: formData.frames_foundation + 1})}
                        className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 font-bold text-xl transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      >
                        <Plus size={16} className="sm:hidden" />
                        <Plus size={20} className="hidden sm:block" />
                      </button>
                    </div>
                  </div>

                  {/* Brood-Frames */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      <span className="hidden sm:inline">Brood-Frames</span>
                      <span className="sm:hidden">Brood</span>
                    </label>
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, frames_brood: formData.frames_brood - 1})}
                        className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 font-bold text-xl transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      >
                        <Minus size={16} className="sm:hidden" />
                        <Minus size={20} className="hidden sm:block" />
                      </button>
                      <input
                        type="number"
                        value={formData.frames_brood}
                        onChange={(e) => setFormData({...formData, frames_brood: parseInt(e.target.value) || 0})}
                        className="flex-1 text-center px-1 sm:px-3 py-2 min-h-[40px] sm:min-h-[48px] border-2 border-gray-300 rounded-lg font-semibold text-sm sm:text-lg w-0"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, frames_brood: formData.frames_brood + 1})}
                        className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 font-bold text-xl transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      >
                        <Plus size={16} className="sm:hidden" />
                        <Plus size={20} className="hidden sm:block" />
                      </button>
                    </div>
                  </div>

                  {/* Drawn-Frames */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      <span className="hidden sm:inline">Drawn-Frames</span>
                      <span className="sm:hidden">Drawn</span>
                    </label>
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, frames_drawn: formData.frames_drawn - 1})}
                        className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 font-bold text-xl transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      >
                        <Minus size={16} className="sm:hidden" />
                        <Minus size={20} className="hidden sm:block" />
                      </button>
                      <input
                        type="number"
                        value={formData.frames_drawn}
                        onChange={(e) => setFormData({...formData, frames_drawn: parseInt(e.target.value) || 0})}
                        className="flex-1 text-center px-1 sm:px-3 py-2 min-h-[40px] sm:min-h-[48px] border-2 border-gray-300 rounded-lg font-semibold text-sm sm:text-lg w-0"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, frames_drawn: formData.frames_drawn + 1})}
                        className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 font-bold text-xl transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      >
                        <Plus size={16} className="sm:hidden" />
                        <Plus size={20} className="hidden sm:block" />
                      </button>
                    </div>
                  </div>

                  {/* Honey Supers */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      <span className="hidden sm:inline">Honey Supers</span>
                      <span className="sm:hidden">Supers</span>
                    </label>
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, honey_supers: formData.honey_supers - 1})}
                        className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 font-bold text-xl transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      >
                        <Minus size={16} className="sm:hidden" />
                        <Minus size={20} className="hidden sm:block" />
                      </button>
                      <input
                        type="number"
                        value={formData.honey_supers}
                        onChange={(e) => setFormData({...formData, honey_supers: parseInt(e.target.value) || 0})}
                        className="flex-1 text-center px-1 sm:px-3 py-2 min-h-[40px] sm:min-h-[48px] border-2 border-gray-300 rounded-lg font-semibold text-sm sm:text-lg w-0"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, honey_supers: formData.honey_supers + 1})}
                        className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 font-bold text-xl transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      >
                        <Plus size={16} className="sm:hidden" />
                        <Plus size={20} className="hidden sm:block" />
                      </button>
                    </div>
                  </div>

                  {/* Drone-Frames */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      <span className="hidden sm:inline">Drone-Frames</span>
                      <span className="sm:hidden">Drone</span>
                    </label>
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, drone_frames: formData.drone_frames - 1})}
                        className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 font-bold text-xl transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      >
                        <Minus size={16} className="sm:hidden" />
                        <Minus size={20} className="hidden sm:block" />
                      </button>
                      <input
                        type="number"
                        value={formData.drone_frames}
                        onChange={(e) => setFormData({...formData, drone_frames: parseInt(e.target.value) || 0})}
                        className="flex-1 text-center px-1 sm:px-3 py-2 min-h-[40px] sm:min-h-[48px] border-2 border-gray-300 rounded-lg font-semibold text-sm sm:text-lg w-0"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, drone_frames: formData.drone_frames + 1})}
                        className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 font-bold text-xl transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      >
                        <Plus size={16} className="sm:hidden" />
                        <Plus size={20} className="hidden sm:block" />
                      </button>
                    </div>
                  </div>

                  {/* Store-Frames */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                      <span className="hidden sm:inline">Store-Frames</span>
                      <span className="sm:hidden">Store</span>
                    </label>
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, store_frames: Math.max(0, formData.store_frames - 1)})}
                        className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 font-bold text-xl transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      >
                        <Minus size={16} className="sm:hidden" />
                        <Minus size={20} className="hidden sm:block" />
                      </button>
                      <input
                        type="number"
                        value={formData.store_frames}
                        onChange={(e) => setFormData({...formData, store_frames: Math.max(0, parseInt(e.target.value) || 0)})}
                        className="flex-1 text-center px-1 sm:px-3 py-2 min-h-[40px] sm:min-h-[48px] border-2 border-gray-300 rounded-lg font-semibold text-sm sm:text-lg w-0"
                        min="0"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, store_frames: formData.store_frames + 1})}
                        className="min-h-[40px] min-w-[40px] sm:min-h-[48px] sm:min-w-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 font-bold text-xl transition-all touch-manipulation flex items-center justify-center flex-shrink-0"
                      >
                        <Plus size={16} className="sm:hidden" />
                        <Plus size={20} className="hidden sm:block" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drones Section - Collapsible */}
            <div className="md:col-span-2 bg-amber-50 rounded-lg border-2 border-amber-200">
              <button
                type="button"
                onClick={() => setDronesExpanded(!dronesExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-amber-100 transition-colors rounded-t-lg"
              >
                <h4 className="text-sm font-semibold text-gray-900">Drones</h4>
                {dronesExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {dronesExpanded && (
                <div className="p-4 pt-0 space-y-6">
                  {/* Drones present slider with Not recorded option */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Drones present
                    </label>
                    <div className="px-2 mb-4">
                      <input
                        type="range"
                        min="-1"
                        max="3"
                        value={formData.drones_present}
                        onChange={(e) => setFormData({...formData, drones_present: parseInt(e.target.value)})}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                      <div className="flex justify-between text-xs text-gray-600 mt-2">
                        <span>Not recorded</span>
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                        <span>Extreme</span>
                      </div>
                    </div>
                  </div>

                  {/* Drone brood present YES/NO buttons with null state */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Drone brood present
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, drone_brood_present: true})}
                        className={`min-h-[48px] rounded-lg font-semibold transition-all touch-manipulation flex items-center justify-center gap-2 ${
                          formData.drone_brood_present === true
                            ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-300'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        <span className="text-xl">✓</span>
                        <span>YES</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, drone_brood_present: false})}
                        className={`min-h-[48px] rounded-lg font-semibold transition-all touch-manipulation flex items-center justify-center gap-2 ${
                          formData.drone_brood_present === false
                            ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-300'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        <span className="text-xl">✕</span>
                        <span>NO</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, drone_brood_present: null})}
                        className={`min-h-[48px] rounded-lg font-medium text-xs transition-all touch-manipulation ${
                          formData.drone_brood_present === null
                            ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        Not Recorded
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hygienic Behaviour Section - Collapsible */}
            <div className="md:col-span-2 bg-teal-50 rounded-lg border-2 border-teal-200">
              <button
                type="button"
                onClick={() => setHygienicBehaviourExpanded(!hygienicBehaviourExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-teal-100 transition-colors rounded-t-lg"
              >
                <h4 className="text-sm font-semibold text-gray-900">Hygienic Behaviour</h4>
                {hygienicBehaviourExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {hygienicBehaviourExpanded && (
                <div className="p-4 pt-0 space-y-6">
                  {/* Recapping */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Recapping: {formData.recapping === 0 ? 'Not Recorded' : renderStars(formData.recapping)}
                      </label>
                      <div className="relative group">
                        <HelpCircle size={16} className="text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                          <div className="font-semibold mb-2">Recapping Rating Guide:</div>
                          <div className="space-y-1">
                            <div><strong>⭐ (1):</strong> Very Low - Rarely uncap and remove diseased brood</div>
                            <div><strong>⭐⭐ (2):</strong> Low - Occasionally remove diseased brood</div>
                            <div><strong>⭐⭐⭐ (3):</strong> Moderate - Average hygienic behavior</div>
                            <div><strong>⭐⭐⭐⭐ (4):</strong> High - Good at detecting and removing diseased brood</div>
                            <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Excellent - Rapidly detect and remove diseased brood</div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                            Bees that recap cells may be identifying and removing diseased or parasitized brood.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormData({...formData, recapping: rating})}
                          className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                            formData.recapping === rating
                              ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, recapping: 0})}
                        className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                          formData.recapping === 0
                            ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        Not Recorded
                      </button>
                    </div>
                  </div>

                  {/* VSH (Varroa Sensitive Hygiene) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        VSH (Varroa Sensitive Hygiene): {formData.vsh === 0 ? 'Not Recorded' : renderStars(formData.vsh)}
                      </label>
                      <div className="relative group">
                        <HelpCircle size={16} className="text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                          <div className="font-semibold mb-2">VSH Rating Guide:</div>
                          <div className="space-y-1">
                            <div><strong>⭐ (1):</strong> Very Low - No VSH behavior observed</div>
                            <div><strong>⭐⭐ (2):</strong> Low - Minimal detection of varroa-infested brood</div>
                            <div><strong>⭐⭐⭐ (3):</strong> Moderate - Some ability to detect infested brood</div>
                            <div><strong>⭐⭐⭐⭐ (4):</strong> High - Good at identifying and removing infested brood</div>
                            <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Excellent - Highly sensitive to varroa presence in brood</div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                            VSH bees can detect and remove brood infested with reproducing varroa mites.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormData({...formData, vsh: rating})}
                          className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                            formData.vsh === rating
                              ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, vsh: 0})}
                        className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                          formData.vsh === 0
                            ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        Not Recorded
                      </button>
                    </div>
                  </div>

                  {/* SMR (Suppressed Mite Reproduction) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        SMR (Suppressed Mite Reproduction): {formData.smr === 0 ? 'Not Recorded' : renderStars(formData.smr)}
                      </label>
                      <div className="relative group">
                        <HelpCircle size={16} className="text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                          <div className="font-semibold mb-2">SMR Rating Guide:</div>
                          <div className="space-y-1">
                            <div><strong>⭐ (1):</strong> Very Low - Varroa reproduce freely</div>
                            <div><strong>⭐⭐ (2):</strong> Low - Little suppression of mite reproduction</div>
                            <div><strong>⭐⭐⭐ (3):</strong> Moderate - Some suppression observed</div>
                            <div><strong>⭐⭐⭐⭐ (4):</strong> High - Good suppression of mite reproduction</div>
                            <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Excellent - Strong suppression, fewer viable offspring</div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                            SMR trait limits varroa mite reproduction in capped brood cells.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormData({...formData, smr: rating})}
                          className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                            formData.smr === rating
                              ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, smr: 0})}
                        className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                          formData.smr === 0
                            ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        Not Recorded
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Disease Section - Collapsible */}
            <div className="md:col-span-2 bg-teal-50 rounded-lg border-2 border-teal-200">
              <button
                type="button"
                onClick={() => setDiseaseExpanded(!diseaseExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-teal-100 transition-colors rounded-t-lg"
              >
                <h4 className="text-sm font-semibold text-gray-900">Disease</h4>
                {diseaseExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {diseaseExpanded && (
                <div className="p-4 pt-0 space-y-6">
                  {/* American Foulbrood (AFB) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        American Foulbrood (AFB): {formData.afb_disease === 0 ? 'Not Recorded' : renderStars(formData.afb_disease)}
                      </label>
                      <div className="relative group">
                        <HelpCircle size={16} className="text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                          <div className="font-semibold mb-2">AFB Severity Rating:</div>
                          <div className="space-y-1">
                            <div><strong>⭐ (1):</strong> Minimal - Very few signs, easily treated</div>
                            <div><strong>⭐⭐ (2):</strong> Low - Some affected cells, manageable</div>
                            <div><strong>⭐⭐⭐ (3):</strong> Moderate - Notable infection, requires intervention</div>
                            <div><strong>⭐⭐⭐⭐ (4):</strong> High - Significant infection, urgent action needed</div>
                            <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Severe - Extensive infection, colony at risk</div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                            AFB is a highly contagious bacterial disease that requires immediate reporting and treatment.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormData({...formData, afb_disease: rating})}
                          className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                            formData.afb_disease === rating
                              ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, afb_disease: 0})}
                        className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                          formData.afb_disease === 0
                            ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        Not Recorded
                      </button>
                    </div>
                  </div>

                  {/* European Foulbrood (EFB) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        European Foulbrood (EFB): {formData.efb_disease === 0 ? 'Not Recorded' : renderStars(formData.efb_disease)}
                      </label>
                      <div className="relative group">
                        <HelpCircle size={16} className="text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                          <div className="font-semibold mb-2">EFB Severity Rating:</div>
                          <div className="space-y-1">
                            <div><strong>⭐ (1):</strong> Minimal - Few affected larvae, colony strong</div>
                            <div><strong>⭐⭐ (2):</strong> Low - Some dead larvae, manageable</div>
                            <div><strong>⭐⭐⭐ (3):</strong> Moderate - Notable infection, intervention needed</div>
                            <div><strong>⭐⭐⭐⭐ (4):</strong> High - Many dead larvae, serious concern</div>
                            <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Severe - Extensive infection, colony struggling</div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                            EFB affects young larvae and can weaken the colony significantly.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormData({...formData, efb_disease: rating})}
                          className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                            formData.efb_disease === rating
                              ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, efb_disease: 0})}
                        className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                          formData.efb_disease === 0
                            ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        Not Recorded
                      </button>
                    </div>
                  </div>

                  {/* Chalkbrood */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Chalkbrood: {formData.chalkbrood_disease === 0 ? 'Not Recorded' : renderStars(formData.chalkbrood_disease)}
                      </label>
                      <div className="relative group">
                        <HelpCircle size={16} className="text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                          <div className="font-semibold mb-2">Chalkbrood Severity Rating:</div>
                          <div className="space-y-1">
                            <div><strong>⭐ (1):</strong> Minimal - Occasional mummified larvae</div>
                            <div><strong>⭐⭐ (2):</strong> Low - Few mummies, not spreading</div>
                            <div><strong>⭐⭐⭐ (3):</strong> Moderate - Regular mummies, some impact</div>
                            <div><strong>⭐⭐⭐⭐ (4):</strong> High - Many mummies, colony weakened</div>
                            <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Severe - Extensive mummies, serious concern</div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                            Chalkbrood is a fungal disease that creates hard, chalk-like mummies.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormData({...formData, chalkbrood_disease: rating})}
                          className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                            formData.chalkbrood_disease === rating
                              ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, chalkbrood_disease: 0})}
                        className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                          formData.chalkbrood_disease === 0
                            ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        Not Recorded
                      </button>
                    </div>
                  </div>

                  {/* Nosemosis */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Nosemosis: {formData.nosemosis_disease === 0 ? 'Not Recorded' : renderStars(formData.nosemosis_disease)}
                      </label>
                      <div className="relative group">
                        <HelpCircle size={16} className="text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                          <div className="font-semibold mb-2">Nosemosis Severity Rating:</div>
                          <div className="space-y-1">
                            <div><strong>⭐ (1):</strong> Minimal - Light spotting, minor dysentery</div>
                            <div><strong>⭐⭐ (2):</strong> Low - Some spotting visible, manageable</div>
                            <div><strong>⭐⭐⭐ (3):</strong> Moderate - Notable spotting, intervention needed</div>
                            <div><strong>⭐⭐⭐⭐ (4):</strong> High - Heavy spotting, colony weakened</div>
                            <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Severe - Extensive spotting, serious health issue</div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                            Nosemosis is caused by microsporidian parasites affecting bee digestion.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormData({...formData, nosemosis_disease: rating})}
                          className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                            formData.nosemosis_disease === rating
                              ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, nosemosis_disease: 0})}
                        className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                          formData.nosemosis_disease === 0
                            ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        Not Recorded
                      </button>
                    </div>
                  </div>

                  {/* Deformed Wing Virus (DWV) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Deformed Wing Virus (DWV): {formData.dwv_disease === 0 ? 'Not Recorded' : renderStars(formData.dwv_disease)}
                      </label>
                      <div className="relative group">
                        <HelpCircle size={16} className="text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                          <div className="font-semibold mb-2">DWV Severity Rating:</div>
                          <div className="space-y-1">
                            <div><strong>⭐ (1):</strong> Minimal - Rare deformed bees observed</div>
                            <div><strong>⭐⭐ (2):</strong> Low - Few deformed bees, limited spread</div>
                            <div><strong>⭐⭐⭐ (3):</strong> Moderate - Regular deformed bees, concern</div>
                            <div><strong>⭐⭐⭐⭐ (4):</strong> High - Many deformed bees, varroa issues</div>
                            <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Severe - Extensive deformities, urgent intervention</div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                            DWV often indicates varroa mite issues. Bees have shrunken, deformed wings.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormData({...formData, dwv_disease: rating})}
                          className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                            formData.dwv_disease === rating
                              ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, dwv_disease: 0})}
                        className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                          formData.dwv_disease === 0
                            ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        Not Recorded
                      </button>
                    </div>
                  </div>

                  {/* IAPV & CBPV */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        IAPV & CBPV: {formData.iapv_cbpv_disease === 0 ? 'Not Recorded' : renderStars(formData.iapv_cbpv_disease)}
                      </label>
                      <div className="relative group">
                        <HelpCircle size={16} className="text-gray-400 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                          <div className="font-semibold mb-2">IAPV & CBPV Severity Rating:</div>
                          <div className="space-y-1">
                            <div><strong>⭐ (1):</strong> Minimal - Few trembling/hairless bees</div>
                            <div><strong>⭐⭐ (2):</strong> Low - Some affected bees, limited spread</div>
                            <div><strong>⭐⭐⭐ (3):</strong> Moderate - Notable symptoms, monitoring needed</div>
                            <div><strong>⭐⭐⭐⭐ (4):</strong> High - Many affected bees, colony weakened</div>
                            <div><strong>⭐⭐⭐⭐⭐ (5):</strong> Severe - Extensive symptoms, serious concern</div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                            IAPV causes paralysis; CBPV causes trembling and hairless appearance.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setFormData({...formData, iapv_cbpv_disease: rating})}
                          className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-semibold transition-all touch-manipulation text-base sm:text-lg ${
                            formData.iapv_cbpv_disease === rating
                              ? 'bg-teal-600 text-white shadow-lg ring-2 ring-teal-300'
                              : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, iapv_cbpv_disease: 0})}
                        className={`min-h-[48px] sm:min-h-[52px] rounded-lg font-medium text-xs sm:text-sm transition-all touch-manipulation col-span-3 sm:col-span-1 ${
                          formData.iapv_cbpv_disease === 0
                            ? 'bg-gray-500 text-white shadow-lg ring-2 ring-gray-400'
                            : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        Not Recorded
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={4}
                placeholder="General observations, actions taken, tasks for next inspection..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Inspection Photo (optional)</label>
              <div className="flex items-start gap-3">
                {imagePreview ? (
                  <div className="relative w-20 h-20 flex-shrink-0 group">
                    <div
                      className="relative w-full h-full cursor-pointer"
                      onDoubleClick={() => {
                        setModalImageUrl(imagePreview)
                        setImageModalOpen(true)
                      }}
                      title="Double-click to enlarge"
                    >
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                        sizes="80px"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-40 rounded-lg pointer-events-none">
                        <Camera size={16} className="text-white" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 shadow-lg transition-all z-10"
                      title="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : null}
                <label className="flex-1 flex flex-col items-center justify-center min-h-[80px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all p-4">
                  <div className="flex flex-col items-center justify-center">
                    <Camera size={24} className="text-gray-400 mb-1" />
                    <p className="text-xs text-gray-500 text-center">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG, WEBP up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={uploadingImage || fetchingWeather}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all touch-manipulation font-medium"
              >
                {uploadingImage ? 'Uploading Image...' : fetchingWeather ? 'Fetching Weather...' : editingInspection ? 'Update' : 'Save'} Inspection
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

      {showForm && formType === 'varroa_treatment' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold">
                {editingTreatment ? 'Edit Varroa Treatment' : 'Record New Varroa Treatment'}
              </h3>
              <button
                type="button"
                onClick={() => setShowIpmTips(true)}
                className="text-amber-600 hover:text-amber-700 transition-colors"
                title="View IPM Tips"
              >
                <HelpCircle size={20} />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="submit"
                form="treatment-form"
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-all touch-manipulation font-medium"
              >
                {editingTreatment ? 'Update' : 'Save'} Treatment
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingTreatment(null)
                }}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-gray-200 rounded-lg hover:bg-gray-300 active:bg-gray-400 touch-manipulation font-medium"
              >
                Cancel
              </button>
            </div>
          </div>

          <form id="treatment-form" onSubmit={handleTreatmentSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apiary</label>
              <select
                value={formApiaryId}
                onChange={(e) => setFormApiaryId(e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
              >
                <option value="">All Apiaries</option>
                {apiaries.map((apiary) => (
                  <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hive *</label>
              <select
                value={editingTreatment?.hive_id || ''}
                onChange={async (e) => {
                  const hiveId = e.target.value
                  if (!editingTreatment) return

                  setEditingTreatment({...editingTreatment, hive_id: hiveId})

                  // Fetch weather data for the selected hive
                  if (hiveId) {
                    setFetchingWeather(true)
                    try {
                      const selectedHive = hives.find(h => h.id === hiveId)
                      if (selectedHive?.apiary_id) {
                        const { data: apiaryData } = await supabase
                          .from('apiaries')
                          .select('eircode')
                          .eq('id', selectedHive.apiary_id)
                          .single()

                        if (apiaryData?.eircode) {
                          const weatherData = await fetchWeatherData(apiaryData.eircode)
                          if (weatherData) {
                            setEditingTreatment(prev => prev ? {
                              ...prev,
                              temperature: weatherData.temp,
                              weather_conditions: `${weatherData.condition}, ${weatherData.humidity}% humidity, ${weatherData.wind_speed} km/h wind`
                            } : null)
                          }
                        }
                      }
                    } catch {
                    } finally {
                      setFetchingWeather(false)
                    }
                  }
                }}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
                required
              >
                <option value="">Select hive</option>
                {hives
                  .filter(h => !formApiaryId || h.apiary_id === formApiaryId)
                  .map((h) => (
                    <option key={h.id} value={h.id}>{h.hive_number}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Date *</label>
              <input
                type="date"
                value={editingTreatment?.treatment_date || ''}
                onChange={(e) => setEditingTreatment(editingTreatment ? {...editingTreatment, treatment_date: e.target.value} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Product *</label>
              <div className="relative group">
                <select
                  value={
                    otherTreatmentType
                      ? 'Other'
                      : editingTreatment?.treatment_type || ''
                  }
                  onChange={(e) => {
                    if (e.target.value === 'Other') {
                      // Switch to manual entry mode
                      setIsOtherTreatment(true)
                      setOtherTreatmentType(editingTreatment?.treatment_type || '')
                      if (editingTreatment) {
                        setEditingTreatment({
                          ...editingTreatment,
                          treatment_type: ''
                        })
                      }
                    } else {
                      // Set treatment_type to the selected product name
                      setIsOtherTreatment(false)
                      if (editingTreatment) {
                        setEditingTreatment({
                          ...editingTreatment,
                          treatment_type: e.target.value
                        })
                      }
                      setOtherTreatmentType('')
                    }
                  }}
                  className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
                  required
                >
                  <option value="">Select treatment product</option>
                  {treatmentProducts.map((product) => (
                    <option key={product.id} value={product.product_name}>
                      {product.product_name} - {product.active_ingredients || 'No active ingredient listed'}
                    </option>
                  ))}
                  <option value="Other">Other (specify below)</option>
                </select>

                {/* Product details tooltip - shown on hover when a product is selected */}
                {editingTreatment?.treatment_type && !isOtherTreatment && treatmentProducts.find(p => p.product_name === editingTreatment.treatment_type) && (
                  <div className="absolute z-10 invisible group-hover:visible w-full sm:w-96 bg-white border-2 border-blue-500 rounded-lg shadow-xl p-4 mt-1 left-0 sm:left-auto sm:right-0">
                    {(() => {
                      const selectedProduct = treatmentProducts.find(p => p.product_name === editingTreatment.treatment_type)
                      if (!selectedProduct) return null
                      return (
                        <>
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <h4 className="font-semibold text-gray-900">{selectedProduct.product_name}</h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            {selectedProduct.active_ingredients && (
                              <div>
                                <span className="font-medium text-gray-700">Active Ingredients:</span>
                                <span className="text-gray-600 ml-2">{selectedProduct.active_ingredients}</span>
                              </div>
                            )}
                            {selectedProduct.application_method && (
                              <div>
                                <span className="font-medium text-gray-700">Application Method:</span>
                                <span className="text-gray-600 ml-2">{selectedProduct.application_method}</span>
                              </div>
                            )}
                            {selectedProduct.treatment_duration && (
                              <div>
                                <span className="font-medium text-gray-700">Duration:</span>
                                <span className="text-gray-600 ml-2">{selectedProduct.treatment_duration}</span>
                              </div>
                            )}
                            {selectedProduct.temperature_range && (
                              <div>
                                <span className="font-medium text-gray-700">Temperature:</span>
                                <span className="text-gray-600 ml-2">{selectedProduct.temperature_range}</span>
                              </div>
                            )}
                            {selectedProduct.honey_flow_restrictions && (
                              <div>
                                <span className="font-medium text-gray-700">Honey Flow:</span>
                                <span className="text-gray-600 ml-2">{selectedProduct.honey_flow_restrictions}</span>
                              </div>
                            )}
                            {selectedProduct.withdrawal_period_days !== null && (
                              <div>
                                <span className="font-medium text-gray-700">Withdrawal:</span>
                                <span className="text-gray-600 ml-2">{selectedProduct.withdrawal_period_days} days</span>
                              </div>
                            )}
                            {selectedProduct.notes && (
                              <div className="pt-2 border-t border-gray-200">
                                <span className="font-medium text-gray-700 block mb-1">Notes:</span>
                                <span className="text-gray-600 text-xs">{selectedProduct.notes}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Show manual input if "Other" is selected */}
            {isOtherTreatment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specify Treatment Product *
                </label>
                <input
                  type="text"
                  value={otherTreatmentType}
                  onChange={(e) => {
                    setOtherTreatmentType(e.target.value)
                    if (editingTreatment) {
                      setEditingTreatment({
                        ...editingTreatment,
                        treatment_type: e.target.value
                      })
                    }
                  }}
                  className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
                  placeholder="Enter custom treatment product name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage *</label>
              <input
                type="text"
                value={editingTreatment?.dosage || ''}
                onChange={(e) => setEditingTreatment(editingTreatment ? {...editingTreatment, dosage: e.target.value} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                placeholder="e.g., 5ml per hive"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature (°C)
                {fetchingWeather && <span className="ml-2 text-xs text-blue-600">Fetching...</span>}
              </label>
              <input
                type="number"
                step="0.1"
                value={editingTreatment?.temperature ?? ''}
                onChange={(e) => setEditingTreatment(editingTreatment ? {...editingTreatment, temperature: e.target.value ? parseFloat(e.target.value) : null} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                placeholder={fetchingWeather ? "Loading weather data..." : "Auto-populated from hive location"}
                disabled={fetchingWeather}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weather Conditions
                {fetchingWeather && <span className="ml-2 text-xs text-blue-600">Fetching...</span>}
              </label>
              <input
                type="text"
                value={editingTreatment?.weather_conditions || ''}
                onChange={(e) => setEditingTreatment(editingTreatment ? {...editingTreatment, weather_conditions: e.target.value} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                placeholder={fetchingWeather ? "Loading weather data..." : "Auto-populated from hive location"}
                disabled={fetchingWeather}
              />
              {editingTreatment?.hive_id && !fetchingWeather && (
                <p className="text-xs text-gray-500 mt-1">
                  Weather data auto-populated based on hive location. You can edit if needed.
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editingTreatment?.notes || ''}
                onChange={(e) => setEditingTreatment(editingTreatment ? {...editingTreatment, notes: e.target.value} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                rows={4}
                placeholder="Optional notes about the treatment"
              />
            </div>
          </form>
        </div>
      )}

      {showForm && formType === 'varroa_check' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-xl font-semibold">
              {editingCheck ? 'Edit Varroa Check' : 'Record New Varroa Check'}
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="submit"
                form="check-form"
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 transition-all touch-manipulation font-medium"
              >
                {editingCheck ? 'Update' : 'Save'} Check
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingCheck(null)
                }}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-gray-200 rounded-lg hover:bg-gray-300 active:bg-gray-400 touch-manipulation font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
          <form id="check-form" onSubmit={handleCheckSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apiary</label>
              <select
                value={formApiaryId}
                onChange={(e) => setFormApiaryId(e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
              >
                <option value="">All Apiaries</option>
                {apiaries.map((apiary) => (
                  <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hive *</label>
              <select
                value={editingCheck?.hive_id || ''}
                onChange={(e) => setEditingCheck(editingCheck ? {...editingCheck, hive_id: e.target.value} : null)}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
                required
              >
                <option value="">Select hive</option>
                {hives
                  .filter(h => !formApiaryId || h.apiary_id === formApiaryId)
                  .map((h) => (
                    <option key={h.id} value={h.id}>{h.hive_number}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check Date *</label>
              <input
                type="date"
                value={editingCheck?.check_date || ''}
                onChange={(e) => setEditingCheck(editingCheck ? {...editingCheck, check_date: e.target.value} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method *</label>
              <select
                value={editingCheck?.method && checkMethodOptions.includes(editingCheck.method) ? editingCheck.method : 'Other'}
                onChange={(e) => {
                  if (e.target.value === 'Other') {
                    setOtherCheckMethod(editingCheck?.method && !checkMethodOptions.includes(editingCheck.method) ? editingCheck.method : '')
                  } else {
                    setEditingCheck(editingCheck ? {...editingCheck, method: e.target.value} : null)
                    setOtherCheckMethod('')
                  }
                }}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
                required
              >
                <option value="">Select method</option>
                {checkMethodOptions.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
                <option value="Other">Other (specify below)</option>
              </select>
              {(editingCheck?.method && !checkMethodOptions.includes(editingCheck.method) || otherCheckMethod) && (
                <input
                  type="text"
                  value={otherCheckMethod || (editingCheck?.method && !checkMethodOptions.includes(editingCheck.method) ? editingCheck.method : '')}
                  onChange={(e) => {
                    setOtherCheckMethod(e.target.value)
                    setEditingCheck(editingCheck ? {...editingCheck, method: e.target.value} : null)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white mt-2"
                  placeholder="Specify other method"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mites Count</label>
              <input
                type="number"
                value={editingCheck?.mites_count ?? ''}
                onChange={(e) => setEditingCheck(editingCheck ? {...editingCheck, mites_count: e.target.value ? parseInt(e.target.value) : null} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sample Size</label>
              <input
                type="number"
                value={editingCheck?.sample_size ?? ''}
                onChange={(e) => setEditingCheck(editingCheck ? {...editingCheck, sample_size: e.target.value ? parseInt(e.target.value) : null} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Infestation Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={editingCheck?.infestation_rate ?? ''}
                onChange={(e) => setEditingCheck(editingCheck ? {...editingCheck, infestation_rate: e.target.value ? parseFloat(e.target.value) : null} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                placeholder="Optional"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingCheck?.action_threshold_reached || false}
                  onChange={(e) => setEditingCheck(editingCheck ? {...editingCheck, action_threshold_reached: e.target.checked} : null)}
                  className="h-5 w-5 rounded border-gray-300 text-orange-600"
                />
                <span className="text-sm font-medium text-gray-700">Action Threshold Reached</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editingCheck?.notes || ''}
                onChange={(e) => setEditingCheck(editingCheck ? {...editingCheck, notes: e.target.value} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                rows={4}
                placeholder="Optional notes about the check"
              />
            </div>
          </form>
        </div>
      )}

      {showForm && formType === 'feeding' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-xl font-semibold">
              {editingFeeding ? 'Edit Feeding' : 'Record New Feeding'}
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="submit"
                form="feeding-form"
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-all touch-manipulation font-medium"
              >
                {editingFeeding ? 'Update' : 'Save'} Feeding
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingFeeding(null)
                  setIsOtherFeedType(false)
                  setOtherFeedType('')
                }}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-gray-200 rounded-lg hover:bg-gray-300 active:bg-gray-400 touch-manipulation font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
          <form id="feeding-form" onSubmit={handleFeedingSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apiary</label>
              <select
                value={formApiaryId}
                onChange={(e) => setFormApiaryId(e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
              >
                <option value="">All Apiaries</option>
                {apiaries.map((apiary) => (
                  <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hive *</label>
              <select
                value={editingFeeding?.hive_id || ''}
                onChange={(e) => setEditingFeeding(editingFeeding ? {...editingFeeding, hive_id: e.target.value} : null)}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
                required
              >
                <option value="">Select hive</option>
                {hives
                  .filter(h => !formApiaryId || h.apiary_id === formApiaryId)
                  .map((h) => (
                    <option key={h.id} value={h.id}>{h.hive_number}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feed Date *</label>
              <input
                type="date"
                value={editingFeeding?.feed_date || ''}
                onChange={(e) => setEditingFeeding(editingFeeding ? {...editingFeeding, feed_date: e.target.value} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feed Type *</label>
              <select
                value={editingFeeding?.feed_type || ''}
                onChange={(e) => {
                  const value = e.target.value
                  setEditingFeeding(editingFeeding ? {...editingFeeding, feed_type: value} : null)
                  setIsOtherFeedType(value === 'Other')
                  if (value !== 'Other') {
                    setOtherFeedType('')
                  }
                }}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
                required
              >
                <option value="">Select feed type</option>
                {feedTypeOptions.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {isOtherFeedType && (
                <input
                  type="text"
                  value={otherFeedType}
                  onChange={(e) => setOtherFeedType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white mt-2"
                  placeholder="Enter custom feed type"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                step="0.1"
                value={editingFeeding?.quantity ?? ''}
                onChange={(e) => setEditingFeeding(editingFeeding ? {...editingFeeding, quantity: e.target.value ? parseFloat(e.target.value) : null} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <select
                value={editingFeeding?.unit || 'L'}
                onChange={(e) => setEditingFeeding(editingFeeding ? {...editingFeeding, unit: e.target.value} : null)}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
                required
              >
                <option value="L">Liters (L)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editingFeeding?.notes || ''}
                onChange={(e) => setEditingFeeding(editingFeeding ? {...editingFeeding, notes: e.target.value} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                rows={4}
                placeholder="Optional notes about the feeding"
              />
            </div>
          </form>
        </div>
      )}

      {showForm && formType === 'harvest' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-xl font-semibold">
              {editingHarvest ? 'Edit Harvest' : 'Record New Harvest'}
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="submit"
                form="harvest-form"
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 active:bg-yellow-800 transition-all touch-manipulation font-medium"
              >
                {editingHarvest ? 'Update' : 'Save'} Harvest
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingHarvest(null)
                }}
                className="px-6 py-3 sm:py-2 min-h-[48px] bg-gray-200 rounded-lg hover:bg-gray-300 active:bg-gray-400 touch-manipulation font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
          <form id="harvest-form" onSubmit={handleHarvestSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apiary</label>
              <select
                value={formApiaryId}
                onChange={(e) => setFormApiaryId(e.target.value)}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
              >
                <option value="">All Apiaries</option>
                {apiaries.map((apiary) => (
                  <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hive *</label>
              <select
                value={editingHarvest?.hive_id || ''}
                onChange={(e) => setEditingHarvest(editingHarvest ? {...editingHarvest, hive_id: e.target.value} : null)}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
                required
              >
                <option value="">Select hive</option>
                {hives
                  .filter(h => !formApiaryId || h.apiary_id === formApiaryId)
                  .map((h) => (
                    <option key={h.id} value={h.id}>{h.hive_number}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Harvest Date *</label>
              <input
                type="date"
                value={editingHarvest?.harvest_date || ''}
                onChange={(e) => setEditingHarvest(editingHarvest ? {...editingHarvest, harvest_date: e.target.value} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Honey Weight</label>
              <input
                type="number"
                step="0.1"
                value={editingHarvest?.honey_weight ?? ''}
                onChange={(e) => setEditingHarvest(editingHarvest ? {...editingHarvest, honey_weight: e.target.value ? parseFloat(e.target.value) : null} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wax Weight</label>
              <input
                type="number"
                step="0.1"
                value={editingHarvest?.wax_weight ?? ''}
                onChange={(e) => setEditingHarvest(editingHarvest ? {...editingHarvest, wax_weight: e.target.value ? parseFloat(e.target.value) : null} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <select
                value={editingHarvest?.unit || 'kg'}
                onChange={(e) => setEditingHarvest(editingHarvest ? {...editingHarvest, unit: e.target.value} : null)}
                className="w-full px-3 py-2 min-h-[48px] border border-gray-300 rounded-md bg-white"
                required
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="lb">Pounds (lb)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frames Harvested</label>
              <input
                type="number"
                value={editingHarvest?.frames_harvested ?? ''}
                onChange={(e) => setEditingHarvest(editingHarvest ? {...editingHarvest, frames_harvested: e.target.value ? parseInt(e.target.value) : null} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                placeholder="Optional"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editingHarvest?.notes || ''}
                onChange={(e) => setEditingHarvest(editingHarvest ? {...editingHarvest, notes: e.target.value} : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                rows={4}
                placeholder="Optional notes about the harvest"
              />
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {filteredRecords.map((record) => {
          // Render different card types based on record_type
          if (record.record_type === 'inspection') {
            const inspection = record
            return (
          <div key={`inspection-${inspection.id}`} className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-4 gap-4">
              <div className="flex items-start gap-3 flex-1">
                {/* Icon Badge */}
                <div className="w-12 h-12 flex-shrink-0 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Search size={24} className="text-blue-600" />
                </div>
                {inspection.image_url && (
                  <div
                    className="relative w-16 h-16 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity group"
                    onDoubleClick={() => {
                      setModalImageUrl(inspection.image_url)
                      setImageModalOpen(true)
                    }}
                    title="Double-click to enlarge"
                  >
                    <Image
                      src={inspection.image_url}
                      alt="Inspection"
                      fill
                      className="object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                      sizes="64px"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-40 rounded-lg">
                      <Camera size={20} className="text-white" />
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold">Hive: {inspection.hives?.hive_number || 'Unknown'}</h3>
                  <p className="text-sm text-gray-500">
                    {inspection.inspection_date}
                    {inspection.inspection_time && ` at ${inspection.inspection_time}`}
                  </p>
                  {inspection.profiles && (
                    <p className="text-xs text-gray-500 mt-1">
                      Recorded by: <span className="font-medium text-gray-700">
                        {(inspection.profiles.first_name && inspection.profiles.last_name)
                          ? `${inspection.profiles.first_name} ${inspection.profiles.last_name}`
                          : inspection.profiles.email}
                      </span>
                    </p>
                  )}
                  {inspection.weight && (
                    <p className="text-sm text-gray-600 font-medium mt-1">
                      Weight: {inspection.weight} kg
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEdit(inspection)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-600 hover:text-blue-900 hover:bg-blue-50 active:bg-blue-100 rounded-lg touch-manipulation"
                  aria-label="Edit inspection"
                >
                  <Edit2 size={20} />
                </button>
                <button
                  onClick={() => handleDelete(inspection.id)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-600 hover:text-red-900 hover:bg-red-50 active:bg-red-100 rounded-lg touch-manipulation"
                  aria-label="Delete inspection"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            {/* Queen & Brood Section - Grouped Display */}
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Queen & Brood</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-white rounded shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Queen Seen</div>
                  <div className="text-2xl">{inspection.queen_seen ? '✅' : '❌'}</div>
                </div>
                <div className="text-center p-3 bg-white rounded shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Eggs</div>
                  <div className="text-2xl">{inspection.eggs_present ? '✅' : '❌'}</div>
                </div>
                <div className="text-center p-3 bg-white rounded shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Brood Frames</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {inspection.brood_frames ?? '-'}
                  </div>
                </div>
                {hives.find(h => h.id === inspection.hive_id)?.configuration?.right_sized_broodbox && (
                  <div className="text-center p-3 bg-white rounded shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Right-Sized Frames</div>
                    <div className="text-2xl font-bold text-amber-600">
                      {inspection.right_sized_frames ?? '-'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drones Section Display - Only show if any value is recorded */}
            {(inspection.drones_present !== -1 || inspection.drone_brood_present !== null) && (
            <div className="mb-4 p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Drones</h4>
              <div className="grid grid-cols-2 gap-3">
                {inspection.drones_present !== -1 && (
                  <div className="text-center p-3 bg-white rounded shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Drones present</div>
                    <div className="text-lg font-bold text-amber-600">
                      {inspection.drones_present === 0 && 'Low'}
                      {inspection.drones_present === 1 && 'Medium'}
                      {inspection.drones_present === 2 && 'High'}
                      {inspection.drones_present === 3 && 'Extreme'}
                    </div>
                  </div>
                )}
                {inspection.drone_brood_present !== null && (
                  <div className="text-center p-3 bg-white rounded shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Drone brood present</div>
                    <div className="text-2xl">{inspection.drone_brood_present ? '✅' : '❌'}</div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Behaviour Section - Grouped Display */}
            <div className="mb-4 p-4 bg-teal-50 rounded-lg border-2 border-teal-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Behaviour</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="text-center p-3 bg-white rounded shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Population</div>
                  <div className="text-sm">{renderStars(inspection.population_strength)}</div>
                </div>
                <div className="text-center p-3 bg-white rounded shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Temperament</div>
                  <div className="text-sm">{renderStars(inspection.temperament_rating)}</div>
                </div>
                <div className="text-center p-3 bg-white rounded shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Brood Pattern</div>
                  <div className="text-sm">{renderStars(inspection.brood_pattern_rating)}</div>
                </div>
                <div className="text-center p-3 bg-white rounded shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Swarming Tendency</div>
                  <div className="text-sm">{renderStars(inspection.swarming_tendency)}</div>
                </div>
                <div className="text-center p-3 bg-white rounded shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">Calmness</div>
                  <div className="text-sm">{renderStars(inspection.calmness)}</div>
                </div>
              </div>
            </div>

            {/* Given/Taken Section - Display (only show if any values are non-zero) */}
            {(inspection.frames_foundation > 0 || inspection.frames_brood > 0 || inspection.frames_drawn > 0 ||
              inspection.honey_supers > 0 || inspection.drone_frames > 0 || inspection.store_frames > 0) && (
              <div className="mb-4 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Given/Taken</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {inspection.frames_foundation > 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Frames-Foundation</div>
                      <div className="text-2xl font-bold text-orange-600">{inspection.frames_foundation}</div>
                    </div>
                  )}
                  {inspection.frames_brood > 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Brood-Frames</div>
                      <div className="text-2xl font-bold text-orange-600">{inspection.frames_brood}</div>
                    </div>
                  )}
                  {inspection.frames_drawn > 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Drawn-Frames</div>
                      <div className="text-2xl font-bold text-orange-600">{inspection.frames_drawn}</div>
                    </div>
                  )}
                  {inspection.honey_supers > 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Honey Supers</div>
                      <div className="text-2xl font-bold text-orange-600">{inspection.honey_supers}</div>
                    </div>
                  )}
                  {inspection.drone_frames > 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Drone-Frames</div>
                      <div className="text-2xl font-bold text-orange-600">{inspection.drone_frames}</div>
                    </div>
                  )}
                  {inspection.store_frames > 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Store-Frames</div>
                      <div className="text-2xl font-bold text-orange-600">{inspection.store_frames}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hygienic Behaviour Section - Display (only show if any values are non-zero and not default 3) */}
            {((inspection.recapping !== 3 && inspection.recapping !== 0) ||
              (inspection.vsh !== 3 && inspection.vsh !== 0) ||
              (inspection.smr !== 3 && inspection.smr !== 0)) && (
              <div className="mb-4 p-4 bg-teal-50 rounded-lg border-2 border-teal-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Hygienic Behaviour</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {inspection.recapping !== 3 && inspection.recapping !== 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Recapping</div>
                      <div className="text-sm">{renderStars(inspection.recapping)}</div>
                    </div>
                  )}
                  {inspection.vsh !== 3 && inspection.vsh !== 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">VSH</div>
                      <div className="text-sm">{renderStars(inspection.vsh)}</div>
                    </div>
                  )}
                  {inspection.smr !== 3 && inspection.smr !== 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">SMR</div>
                      <div className="text-sm">{renderStars(inspection.smr)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(inspection.weather_temp !== null || inspection.weather_condition) && (
              <div className="mb-4 p-3 bg-sky-50 rounded border-2 border-sky-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🌤️</span>
                  <span className="text-sm font-medium text-sky-700">Weather Conditions</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm ml-7">
                  {inspection.weather_temp !== null && (
                    <div>
                      <span className="font-medium text-gray-700">Temperature:</span> {inspection.weather_temp}°C
                    </div>
                  )}
                  {inspection.weather_condition && (
                    <div>
                      <span className="font-medium text-gray-700">Condition:</span> {inspection.weather_condition}
                    </div>
                  )}
                  {inspection.weather_humidity !== null && (
                    <div>
                      <span className="font-medium text-gray-700">Humidity:</span> {inspection.weather_humidity}%
                    </div>
                  )}
                  {inspection.weather_wind_speed !== null && (
                    <div>
                      <span className="font-medium text-gray-700">Wind:</span> {inspection.weather_wind_speed} km/h
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Disease Section - Display (only show if any values are recorded) */}
            {(inspection.afb_disease > 0 || inspection.efb_disease > 0 || inspection.chalkbrood_disease > 0 ||
              inspection.nosemosis_disease > 0 || inspection.dwv_disease > 0 || inspection.iapv_cbpv_disease > 0) && (
              <div className="mb-4 p-4 bg-teal-50 rounded-lg border-2 border-teal-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Disease</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {inspection.afb_disease > 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">AFB</div>
                      <div className="text-sm">{renderStars(inspection.afb_disease)}</div>
                    </div>
                  )}
                  {inspection.efb_disease > 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">EFB</div>
                      <div className="text-sm">{renderStars(inspection.efb_disease)}</div>
                    </div>
                  )}
                  {inspection.chalkbrood_disease > 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Chalkbrood</div>
                      <div className="text-sm">{renderStars(inspection.chalkbrood_disease)}</div>
                    </div>
                  )}
                  {inspection.nosemosis_disease > 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Nosemosis</div>
                      <div className="text-sm">{renderStars(inspection.nosemosis_disease)}</div>
                    </div>
                  )}
                  {inspection.dwv_disease > 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">DWV</div>
                      <div className="text-sm">{renderStars(inspection.dwv_disease)}</div>
                    </div>
                  )}
                  {inspection.iapv_cbpv_disease > 0 && (
                    <div className="text-center p-3 bg-white rounded shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">IAPV & CBPV</div>
                      <div className="text-sm">{renderStars(inspection.iapv_cbpv_disease)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {inspection.notes && (
              <div className="p-3 bg-blue-50 rounded">
                <span className="text-sm font-medium text-gray-700">Notes: </span>
                <span className="text-sm text-gray-600">{inspection.notes}</span>
              </div>
            )}
          </div>
            )
          } else if (record.record_type === 'varroa_treatment') {
            const treatment = record
            return (
              <div key={`treatment-${treatment.id}`} className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Icon Badge */}
                    <div className="w-12 h-12 flex-shrink-0 bg-red-100 rounded-lg flex items-center justify-center">
                      <Syringe size={24} className="text-red-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">Varroa Treatment</span>
                        <h3 className="text-lg font-bold">Hive: {treatment.hives?.hive_number || 'Unknown'}</h3>
                      </div>
                    <p className="text-sm text-gray-600">
                      {new Date(treatment.treatment_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {' at '}
                      {new Date(treatment.treatment_date).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                    {treatment.profiles && (
                      <p className="text-xs text-gray-500 mt-1">
                        Recorded by: <span className="font-medium text-gray-700">
                          {(treatment.profiles.first_name && treatment.profiles.last_name)
                            ? `${treatment.profiles.first_name} ${treatment.profiles.last_name}`
                            : treatment.profiles.email}
                        </span>
                      </p>
                    )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingTreatment(treatment)
                        setFormType('varroa_treatment')
                        // Set otherTreatmentType if the treatment type is not in the products list
                        if (treatment.treatment_type && !treatmentProducts.some(p => p.product_name === treatment.treatment_type)) {
                          setOtherTreatmentType(treatment.treatment_type)
                          setIsOtherTreatment(true)
                        } else {
                          setOtherTreatmentType('')
                          setIsOtherTreatment(false)
                        }
                        setShowForm(true)
                      }}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-600 hover:text-blue-900 hover:bg-blue-50 active:bg-blue-100 rounded-lg touch-manipulation transition-colors"
                      aria-label="Edit treatment"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!userId) return
                        if (confirm('Are you sure you want to delete this treatment record?')) {
                          const { error } = await supabase
                            .from('varroa_treatments')
                            .delete()
                            .eq('id', treatment.id)
                            .eq('user_id', userId)
                          if (!error) fetchVarroaTreatments()
                        }
                      }}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-600 hover:text-red-900 hover:bg-red-50 active:bg-red-100 rounded-lg touch-manipulation transition-colors"
                      aria-label="Delete treatment"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-red-50 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 mb-1">Treatment Product</span>
                    <span className="text-sm font-medium text-gray-900">{treatment.treatment_type}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 mb-1">Dosage</span>
                    <span className="text-sm font-medium text-gray-900">{treatment.dosage}</span>
                  </div>
                  {treatment.temperature && (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">Temperature</span>
                      <span className="text-sm font-medium text-gray-900">{treatment.temperature}°C</span>
                    </div>
                  )}
                  {treatment.weather_conditions && (
                    <div className="flex flex-col md:col-span-2">
                      <span className="text-xs text-gray-500 mb-1">Weather Conditions</span>
                      <span className="text-sm font-medium text-gray-900">{treatment.weather_conditions}</span>
                    </div>
                  )}
                </div>

                {treatment.notes && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-500 mb-1 block">Notes</span>
                    <span className="text-sm text-gray-700">{treatment.notes}</span>
                  </div>
                )}
              </div>
            )
          } else if (record.record_type === 'varroa_check') {
            const check = record
            return (
              <div key={`check-${check.id}`} className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Icon Badge */}
                    <div className="w-12 h-12 flex-shrink-0 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Bug size={24} className="text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">Varroa Check</span>
                        <h3 className="text-lg font-bold">Hive: {check.hives?.hive_number || 'Unknown'}</h3>
                      </div>
                    <p className="text-sm text-gray-600">
                      {new Date(check.check_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {' at '}
                      {new Date(check.check_date).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                    {check.profiles && (
                      <p className="text-xs text-gray-500 mt-1">
                        Recorded by: <span className="font-medium text-gray-700">
                          {(check.profiles.first_name && check.profiles.last_name)
                            ? `${check.profiles.first_name} ${check.profiles.last_name}`
                            : check.profiles.email}
                        </span>
                      </p>
                    )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingCheck(check)
                        setFormType('varroa_check')
                        setShowForm(true)
                      }}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-600 hover:text-blue-900 hover:bg-blue-50 active:bg-blue-100 rounded-lg touch-manipulation transition-colors"
                      aria-label="Edit check"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!userId) return
                        if (confirm('Are you sure you want to delete this check record?')) {
                          const { error } = await supabase
                            .from('varroa_checks')
                            .delete()
                            .eq('id', check.id)
                            .eq('user_id', userId)
                          if (!error) fetchVarroaChecks()
                        }
                      }}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-600 hover:text-red-900 hover:bg-red-50 active:bg-red-100 rounded-lg touch-manipulation transition-colors"
                      aria-label="Delete check"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-orange-50 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 mb-1">Method</span>
                    <span className="text-sm font-medium text-gray-900">{check.method}</span>
                  </div>
                  {check.mites_count !== null && (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">Mites Count</span>
                      <span className="text-sm font-medium text-gray-900">{check.mites_count}</span>
                    </div>
                  )}
                  {check.sample_size !== null && (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">Sample Size</span>
                      <span className="text-sm font-medium text-gray-900">{check.sample_size}</span>
                    </div>
                  )}
                  {check.infestation_rate !== null && (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">Infestation Rate</span>
                      <span className={`text-sm font-bold ${check.infestation_rate > 3 ? 'text-red-600' : 'text-green-600'}`}>
                        {check.infestation_rate}%
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col md:col-span-2">
                    <span className="text-xs text-gray-500 mb-1">Action Threshold</span>
                    <span className={`text-sm font-bold ${check.action_threshold_reached ? 'text-red-600' : 'text-green-600'}`}>
                      {check.action_threshold_reached ? '⚠️ Reached - Treatment Needed' : '✓ Not Reached'}
                    </span>
                  </div>
                </div>

                {check.notes && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-500 mb-1 block">Notes</span>
                    <span className="text-sm text-gray-700">{check.notes}</span>
                  </div>
                )}
              </div>
            )
          } else if (record.record_type === 'feeding') {
            const feeding = record
            return (
              <div key={`feeding-${feeding.id}`} className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Icon Badge */}
                    <div className="w-12 h-12 flex-shrink-0 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Wheat size={24} className="text-yellow-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">Feeding</span>
                        <h3 className="text-lg font-bold">Hive: {feeding.hives?.hive_number || 'Unknown'}</h3>
                      </div>
                    <p className="text-sm text-gray-600">
                      {new Date(feeding.feed_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {' at '}
                      {new Date(feeding.feed_date).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                    {feeding.profiles && (
                      <p className="text-xs text-gray-500 mt-1">
                        Recorded by: <span className="font-medium text-gray-700">
                          {(feeding.profiles.first_name && feeding.profiles.last_name)
                            ? `${feeding.profiles.first_name} ${feeding.profiles.last_name}`
                            : feeding.profiles.email}
                        </span>
                      </p>
                    )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        // Check if feed_type is in dropdown options or is a custom value
                        const isInDropdown = feedTypeOptions.includes(feeding.feed_type)
                        if (!isInDropdown && feeding.feed_type) {
                          // Custom feed type - set to "Other" and store actual value
                          setIsOtherFeedType(true)
                          setOtherFeedType(feeding.feed_type)
                          setEditingFeeding({...feeding, feed_type: 'Other'})
                        } else {
                          setIsOtherFeedType(false)
                          setOtherFeedType('')
                          setEditingFeeding(feeding)
                        }
                        setFormType('feeding')
                        setShowForm(true)
                      }}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-600 hover:text-blue-900 hover:bg-blue-50 active:bg-blue-100 rounded-lg touch-manipulation transition-colors"
                      aria-label="Edit feeding"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!userId) return
                        if (confirm('Are you sure you want to delete this feeding record?')) {
                          const { error} = await supabase
                            .from('feedings')
                            .delete()
                            .eq('id', feeding.id)
                            .eq('user_id', userId)
                          if (!error) fetchFeedings()
                        }
                      }}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-600 hover:text-red-900 hover:bg-red-50 active:bg-red-100 rounded-lg touch-manipulation transition-colors"
                      aria-label="Delete feeding"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-yellow-50 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 mb-1">Feed Type</span>
                    <span className="text-sm font-medium text-gray-900">{feeding.feed_type}</span>
                  </div>
                  {feeding.quantity !== null && (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">Quantity</span>
                      <span className="text-sm font-medium text-gray-900">{feeding.quantity} {feeding.unit}</span>
                    </div>
                  )}
                </div>

                {feeding.notes && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-500 mb-1 block">Notes</span>
                    <span className="text-sm text-gray-700">{feeding.notes}</span>
                  </div>
                )}
              </div>
            )
          } else if (record.record_type === 'harvest') {
            const harvest = record
            return (
              <div key={`harvest-${harvest.id}`} className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Icon Badge */}
                    <div className="w-12 h-12 flex-shrink-0 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Droplet size={24} className="text-amber-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Harvest</span>
                        <h3 className="text-lg font-bold">Hive: {harvest.hives?.hive_number || 'Unknown'}</h3>
                      </div>
                    <p className="text-sm text-gray-600">
                      {new Date(harvest.harvest_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {' at '}
                      {new Date(harvest.harvest_date).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                    {harvest.profiles && (
                      <p className="text-xs text-gray-500 mt-1">
                        Recorded by: <span className="font-medium text-gray-700">
                          {(harvest.profiles.first_name && harvest.profiles.last_name)
                            ? `${harvest.profiles.first_name} ${harvest.profiles.last_name}`
                            : harvest.profiles.email}
                        </span>
                      </p>
                    )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingHarvest(harvest)
                        setFormType('harvest')
                        setShowForm(true)
                      }}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-600 hover:text-blue-900 hover:bg-blue-50 active:bg-blue-100 rounded-lg touch-manipulation transition-colors"
                      aria-label="Edit harvest"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!userId) return
                        if (confirm('Are you sure you want to delete this harvest record?')) {
                          const { error } = await supabase
                            .from('harvests')
                            .delete()
                            .eq('id', harvest.id)
                            .eq('user_id', userId)
                          if (!error) fetchHarvests()
                        }
                      }}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-600 hover:text-red-900 hover:bg-red-50 active:bg-red-100 rounded-lg touch-manipulation transition-colors"
                      aria-label="Delete harvest"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-amber-50 rounded-lg">
                  {harvest.honey_weight !== null && (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">Honey Weight</span>
                      <span className="text-sm font-medium text-gray-900">{harvest.honey_weight} {harvest.unit}</span>
                    </div>
                  )}
                  {harvest.wax_weight !== null && (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">Wax Weight</span>
                      <span className="text-sm font-medium text-gray-900">{harvest.wax_weight} {harvest.unit}</span>
                    </div>
                  )}
                  {harvest.frames_harvested !== null && (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">Frames Harvested</span>
                      <span className="text-sm font-medium text-gray-900">{harvest.frames_harvested}</span>
                    </div>
                  )}
                </div>

                {harvest.notes && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-500 mb-1 block">Notes</span>
                    <span className="text-sm text-gray-700">{harvest.notes}</span>
                  </div>
                )}
              </div>
            )
          }
          return null
        })}
      </div>

      {filteredRecords.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          {filterHiveId
            ? `No records found for this hive. Select "All Hives" or record a new activity.`
            : recordTypeFilter !== 'all'
              ? `No ${recordTypeFilter.replace('_', ' ')} records found. Try changing the filters or record a new activity.`
              : 'No records found. Start tracking your hive activities!'}
        </div>
      )}

      {/* Image Modal */}
      {imageModalOpen && modalImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => {
            setImageModalOpen(false)
            setModalImageUrl(null)
          }}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => {
                setImageModalOpen(false)
                setModalImageUrl(null)
              }}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors shadow-lg"
              aria-label="Close modal"
            >
              <X size={24} className="text-gray-700" />
            </button>
            <div className="relative w-full h-full">
              <Image
                src={modalImageUrl}
                alt="Inspection photo full size"
                fill
                className="object-contain"
                sizes="(max-width: 1280px) 100vw, 1280px"
                priority
              />
            </div>
          </div>
        </div>
      )}

      {/* IPM Tips Modal */}
      {showIpmTips && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Integrated Pest Management (IPM) Tips for Varroa Control
              </h3>
              <button
                onClick={() => setShowIpmTips(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>
            <div className="px-6 py-4">
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-amber-600 font-bold flex-shrink-0">•</span>
                  <span className="text-gray-700">
                    <strong>Rotate treatments annually</strong> to prevent resistance development.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-amber-600 font-bold flex-shrink-0">•</span>
                  <span className="text-gray-700">
                    <strong>Monitor mite levels regularly</strong> using sugar shake or alcohol wash.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-amber-600 font-bold flex-shrink-0">•</span>
                  <span className="text-gray-700">
                    <strong>Apply treatments according to label instructions</strong> and seasonal timing.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-amber-600 font-bold flex-shrink-0">•</span>
                  <span className="text-gray-700">
                    <strong>Ensure adequate colony ventilation</strong> during treatment.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-amber-600 font-bold flex-shrink-0">•</span>
                  <span className="text-gray-700">
                    <strong>Avoid treating during honey flow</strong> unless product is approved for use.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-amber-600 font-bold flex-shrink-0">•</span>
                  <span className="text-gray-700">
                    <strong>Combine chemical treatments with biotechnical methods</strong> (e.g., drone brood removal).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-amber-600 font-bold flex-shrink-0">•</span>
                  <span className="text-gray-700">
                    <strong>Maintain strong, healthy colonies</strong> through good nutrition and disease management.
                  </span>
                </li>
              </ul>
            </div>
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowIpmTips(false)}
                className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}