'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, hasActiveSubscription } from '@/lib/auth'
import { Home, X, ClipboardList } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import FormActionRow from '@/components/ui/FormActionRow'
import ModalShell from '@/components/ui/ModalShell'
import FieldLabel from '@/components/ui/FieldLabel'
import SelectField from '@/components/ui/SelectField'
import TextAreaField from '@/components/ui/TextAreaField'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import { useToast } from '@/components/ui/Toast'
import { useRecordsData } from '@/hooks/useRecordsData'
import { useRecordFilters } from '@/hooks/useRecordFilters'
import { toLocalDateString, toLocalDateTimeInputValue } from '@/lib/date-utils'
import ImageZoomModal from '@/components/ui/ImageZoomModal'
import { normaliseStoragePublicUrl } from '@/lib/storage-url'
import {
  RecordFiltersBar,
  NewRecordDropdown,
  InspectionCard,
  VarroaCheckCard,
  TreatmentCard,
  FeedingCard,
  HarvestCard,
  ArchiveCard,
  InspectionForm,
  VarroaCheckForm,
  VarroaTreatmentForm,
  FeedingForm,
  HarvestForm
} from '@/components/records'
import type {
  RecordType,
  UnifiedRecord,
  Inspection,
  VarroaTreatment,
  VarroaCheck,
  Feeding,
  Harvest,
  InspectionFormData,
  ArchiveFormData
} from '@/types/records'
import { getDefaultArchiveFormData, getDefaultInspectionFormData } from '@/types/records'

interface NominatimResult {
  lat: string
  lon: string
}

interface OpenMeteoCurrent {
  temperature_2m: number
  relative_humidity_2m: number
  weather_code: number
  wind_speed_10m: number
}

interface OpenMeteoResponse {
  current?: OpenMeteoCurrent | null
}

const WEATHER_REQUEST_TIMEOUT_MS = 8000
const RECORD_DEEP_LINK_TYPES = new Set<RecordType>(['inspection', 'varroa_check', 'varroa_treatment', 'feeding', 'harvest'])

function mapTypeParamToRecordType(typeParam: string | null): RecordType | null {
  if (!typeParam) return null
  if (typeParam === 'varroa-check') return 'varroa_check'
  if (typeParam === 'varroa-treatment') return 'varroa_treatment'
  if (typeParam === 'inspection' || typeParam === 'feeding' || typeParam === 'harvest' || typeParam === 'archive') {
    return typeParam
  }
  return null
}

export default function RecordsPage() {
  const router = useRouter()
  const toast = useToast()
  const searchParams = useSearchParams()
  const formRef = useRef<HTMLDivElement>(null)
  const hasInitialisedApiaryFilterRef = useRef(false)
  const scrolledRecordKeyRef = useRef<string | null>(null)

  // User state
  const [userId, setUserId] = useState<string | null>(null)
  const [userHasActiveSubscription, setUserHasActiveSubscription] = useState(false)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<RecordType>('inspection')
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null)
  const [inspectionDraft, setInspectionDraft] = useState<InspectionFormData | null>(null)
  const [editingTreatment, setEditingTreatment] = useState<VarroaTreatment | null>(null)
  const [editingCheck, setEditingCheck] = useState<VarroaCheck | null>(null)
  const [editingFeeding, setEditingFeeding] = useState<Feeding | null>(null)
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null)
  const [archiveData, setArchiveData] = useState<ArchiveFormData>(getDefaultArchiveFormData())

  // UI state
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null)
  const [showIpmTips, setShowIpmTips] = useState(false)
  const [fetchingWeather, setFetchingWeather] = useState(false)
  const [highlightedRecordKey, setHighlightedRecordKey] = useState<string | null>(null)

  // Use the data hook
  const {
    inspections,
    varroaTreatments,
    varroaChecks,
    feedings,
    harvests,
    archiveRecords,
    hives,
    apiaries,
    checkMethodOptions,
    feedTypeOptions,
    floralSourceOptions,
    treatmentProducts,
    archiveReasons,
    applicationMethods,
    loading,
    isTeamMember,
    isUkNiResident,
    sharedHiveIds,
    fetchInspections,
    fetchVarroaTreatments,
    fetchVarroaChecks,
    fetchFeedings,
    fetchHarvests,
    fetchArchiveRecords,
    fetchHives,
    fetchAllData
  } = useRecordsData()

  // Merge all records
  const allRecords = useMemo(() => {
    const merged: UnifiedRecord[] = [
      ...inspections.map(i => ({ ...i, record_type: 'inspection' as const, date: i.inspection_date })),
      ...varroaTreatments.map(vt => ({ ...vt, record_type: 'varroa_treatment' as const, date: vt.treatment_date })),
      ...varroaChecks.map(vc => ({ ...vc, record_type: 'varroa_check' as const, date: vc.check_date })),
      ...feedings.map(f => ({ ...f, record_type: 'feeding' as const, date: f.feed_date })),
      ...harvests.map(h => ({ ...h, record_type: 'harvest' as const, date: h.harvest_date })),
      ...archiveRecords.map(a => ({ ...a, record_type: 'archive' as const, date: a.archived_at }))
    ]

    merged.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      if (isNaN(dateA) && isNaN(dateB)) return 0
      if (isNaN(dateA)) return 1
      if (isNaN(dateB)) return -1
      return dateB - dateA
    })

    return merged
  }, [inspections, varroaTreatments, varroaChecks, feedings, harvests, archiveRecords])

  const previousRightSizedFramesByHive = useMemo<Record<string, number | null>>(() => {
    const latestValues: Record<string, number | null> = {}

    for (const inspection of inspections) {
      if (!inspection.hive_id || inspection.hive_id in latestValues) {
        continue
      }

      latestValues[inspection.hive_id] =
        inspection.right_sized_frames != null && inspection.right_sized_frames > 0
          ? inspection.right_sized_frames
          : null
    }

    return latestValues
  }, [inspections])

  const inspectionFormData = useMemo<InspectionFormData | null>(() => {
    if (inspectionDraft) {
      return inspectionDraft
    }

    if (!editingInspection) {
      return null
    }

    const defaults = getDefaultInspectionFormData()

    return {
      hive_id: editingInspection.hive_id ?? defaults.hive_id,
      inspection_date: editingInspection.inspection_date ?? defaults.inspection_date,
      inspection_time: editingInspection.inspection_time ?? '',
      weight: editingInspection.weight ?? defaults.weight,
      queen_seen: editingInspection.queen_seen ?? defaults.queen_seen,
      eggs_present: editingInspection.eggs_present ?? defaults.eggs_present,
      drones_present: editingInspection.drones_present ?? defaults.drones_present,
      drone_brood_present: editingInspection.drone_brood_present ?? defaults.drone_brood_present,
      propolis_level: editingInspection.propolis_level ?? defaults.propolis_level,
      brood_frames: editingInspection.brood_frames ?? defaults.brood_frames,
      right_sized_frames: editingInspection.right_sized_frames ?? defaults.right_sized_frames,
      brood_pattern_rating: editingInspection.brood_pattern_rating ?? defaults.brood_pattern_rating,
      temperament_rating: editingInspection.temperament_rating ?? defaults.temperament_rating,
      population_strength: editingInspection.population_strength ?? defaults.population_strength,
      swarming_tendency: editingInspection.swarming_tendency ?? defaults.swarming_tendency,
      calmness: editingInspection.calmness ?? defaults.calmness,
      frames_foundation: editingInspection.frames_foundation ?? defaults.frames_foundation,
      frames_brood: editingInspection.frames_brood ?? defaults.frames_brood,
      frames_drawn: editingInspection.frames_drawn ?? defaults.frames_drawn,
      honey_supers: editingInspection.honey_supers ?? defaults.honey_supers,
      drone_frames: editingInspection.drone_frames ?? defaults.drone_frames,
      store_frames: editingInspection.store_frames ?? defaults.store_frames,
      recapping: editingInspection.recapping ?? defaults.recapping,
      vsh: editingInspection.vsh ?? defaults.vsh,
      smr: editingInspection.smr ?? defaults.smr,
      afb_disease: editingInspection.afb_disease ?? defaults.afb_disease,
      efb_disease: editingInspection.efb_disease ?? defaults.efb_disease,
      chalkbrood_disease: editingInspection.chalkbrood_disease ?? defaults.chalkbrood_disease,
      nosemosis_disease: editingInspection.nosemosis_disease ?? defaults.nosemosis_disease,
      dwv_disease: editingInspection.dwv_disease ?? defaults.dwv_disease,
      iapv_cbpv_disease: editingInspection.iapv_cbpv_disease ?? defaults.iapv_cbpv_disease,
      varroa_disease: editingInspection.varroa_disease ?? defaults.varroa_disease,
      varroa_seen_on_bees: editingInspection.varroa_seen_on_bees ?? defaults.varroa_seen_on_bees,
      varroa_seen_in_brood: editingInspection.varroa_seen_in_brood ?? defaults.varroa_seen_in_brood,
      varroa_brood_worker: editingInspection.varroa_brood_worker ?? defaults.varroa_brood_worker,
      varroa_brood_drone: editingInspection.varroa_brood_drone ?? defaults.varroa_brood_drone,
      queen_cups: editingInspection.queen_cups ?? defaults.queen_cups,
      queen_cups_number: editingInspection.queen_cups_number ?? defaults.queen_cups_number,
      queen_cups_removed_all: editingInspection.queen_cups_removed_all ?? defaults.queen_cups_removed_all,
      swarm_cells: editingInspection.swarm_cells ?? defaults.swarm_cells,
      swarm_cells_number: editingInspection.swarm_cells_number ?? defaults.swarm_cells_number,
      swarm_cells_removed_all: editingInspection.swarm_cells_removed_all ?? defaults.swarm_cells_removed_all,
      supercedure_cells: editingInspection.supercedure_cells ?? defaults.supercedure_cells,
      supercedure_cells_number: editingInspection.supercedure_cells_number ?? defaults.supercedure_cells_number,
      supercedure_cells_removed_all: editingInspection.supercedure_cells_removed_all ?? defaults.supercedure_cells_removed_all,
      emergency_cells: editingInspection.emergency_cells ?? defaults.emergency_cells,
      emergency_cells_number: editingInspection.emergency_cells_number ?? defaults.emergency_cells_number,
      emergency_cells_removed_all: editingInspection.emergency_cells_removed_all ?? defaults.emergency_cells_removed_all,
      removed_cells: editingInspection.removed_cells ?? defaults.removed_cells,
      remaining_cells: editingInspection.remaining_cells ?? defaults.remaining_cells,
      queen_cells_notes: editingInspection.queen_cells_notes ?? defaults.queen_cells_notes,
      notes: editingInspection.notes ?? defaults.notes,
      image_url: editingInspection.image_url ?? defaults.image_url
    }
  }, [editingInspection, inspectionDraft])

  // Use the filters hook
  const {
    filters,
    setHiveId,
    setApiaryId,
    setShowArchivedHives,
    setTimePeriod,
    setCustomStartDate,
    setCustomEndDate,
    setOwnershipFilter,
    setRecordTypeFilter,
    filteredRecords,
    timePeriodCounts
  } = useRecordFilters({ allRecords, hives })

  // Initialize user and fetch data
  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)

      const hasSubscription = await hasActiveSubscription()
      setUserHasActiveSubscription(hasSubscription)

      await fetchAllData(id, filters.ownershipFilter)
    }
    initUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Refetch all record types when ownership filter changes
  useEffect(() => {
    if (userId) {
      fetchAllData(userId, filters.ownershipFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.ownershipFilter, userId])

  useEffect(() => {
    if (hasInitialisedApiaryFilterRef.current) {
      return
    }

    if (searchParams.get('hive')) {
      hasInitialisedApiaryFilterRef.current = true
      return
    }

    if (filters.apiaryId || filters.hiveId) {
      hasInitialisedApiaryFilterRef.current = true
      return
    }

    if (apiaries.length === 1) {
      setApiaryId(apiaries[0].id)
      hasInitialisedApiaryFilterRef.current = true
      return
    }

    if (apiaries.length > 1) {
      hasInitialisedApiaryFilterRef.current = true
    }
  }, [apiaries, filters.apiaryId, filters.hiveId, searchParams, setApiaryId])

  // New record handler - defined before useEffect that uses it
  const handleNewRecord = useCallback((type: RecordType, presetHiveId?: string) => {
    const now = new Date()
    const currentDate = toLocalDateString(now)
    const currentDateTime = toLocalDateTimeInputValue(now)

    setFormType(type)
    setEditingInspection(null)
    setInspectionDraft(null)
    setEditingTreatment(null)
    setEditingCheck(null)
    setEditingFeeding(null)
    setEditingHarvest(null)

    if (type === 'inspection') {
      const nextInspectionDraft = getDefaultInspectionFormData()
      nextInspectionDraft.hive_id = presetHiveId || ''
      setInspectionDraft(nextInspectionDraft)
    } else if (type === 'archive') {
      setArchiveData({
        hive_id: presetHiveId || '',
        archive_reason_id: '',
        archive_notes: ''
      })
    } else if (type === 'varroa_treatment') {
      setEditingTreatment({
        id: '',
        hive_id: presetHiveId || '',
        treatment_date: currentDate,
        treatment_time: new Date().toTimeString().slice(0, 5),
        treatment_type: '',
        dosage: '',
        temperature: null,
        weather_conditions: '',
        notes: '',
        user_id: userId || '',
        application_method_id: null
      })
    } else if (type === 'varroa_check') {
      setEditingCheck({
        id: '',
        hive_id: presetHiveId || '',
        check_date: currentDateTime,
        method: '',
        mites_count: null,
        sample_size: null,
        infestation_rate: null,
        action_threshold_reached: false,
        notes: '',
        image_url: null,
        user_id: userId || ''
      })
    } else if (type === 'feeding') {
      setEditingFeeding({
        id: '',
        hive_id: presetHiveId || '',
        feed_date: currentDate,
        feed_type: '',
        quantity: null,
        unit: '',
        notes: '',
        user_id: userId || ''
      })
    } else if (type === 'harvest') {
      setEditingHarvest({
        id: '',
        hive_id: presetHiveId || '',
        harvest_date: currentDate,
        honey_weight: null,
        wax_weight: null,
        unit: '',
        frames_harvested: null,
        floral_source: null,
        moisture_content: null,
        notes: '',
        user_id: userId || ''
      })
    }

    setShowForm(true)

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [userId])

  // Handle URL query parameters
  useEffect(() => {
    const hiveParam = searchParams.get('hive')
    const typeParam = searchParams.get('type')
    const createParam = searchParams.get('create')
    const recordParam = searchParams.get('record')
    const mappedType = mapTypeParamToRecordType(typeParam)

    if (hiveParam && hives.length > 0) {
      // Auto-switch to 'all' if the hive is shared (not owned by current user)
      const targetHive = hives.find(h => h.id === hiveParam)
      if (targetHive && userId && targetHive.user_id !== userId) {
        setOwnershipFilter('all')
      }

      setHiveId(hiveParam)

      if (recordParam && mappedType && RECORD_DEEP_LINK_TYPES.has(mappedType)) {
        setShowArchivedHives(true)
        setRecordTypeFilter(mappedType)
        setHighlightedRecordKey(`${mappedType}-${recordParam}`)
        scrolledRecordKeyRef.current = null
      } else if (mappedType) {
        const validCreateTypes = new Set<RecordType>(['inspection', 'varroa_check', 'varroa_treatment', 'feeding', 'harvest', 'archive'])
        if (validCreateTypes.has(mappedType)) {
          handleNewRecord(mappedType, hiveParam)
        }
      }

      router.replace('/dashboard/records')
    } else if (!hiveParam && recordParam && mappedType && RECORD_DEEP_LINK_TYPES.has(mappedType)) {
      setShowArchivedHives(true)
      setRecordTypeFilter(mappedType)
      setHighlightedRecordKey(`${mappedType}-${recordParam}`)
      scrolledRecordKeyRef.current = null
      router.replace('/dashboard/records')
    } else if (createParam) {
      // Handle quick action links from dashboard (optionally with apiary pre-selected)
      const apiaryParam = searchParams.get('apiary')
      if (apiaryParam) {
        setApiaryId(apiaryParam)
      }
      const validTypes: RecordType[] = ['inspection', 'varroa_check', 'varroa_treatment', 'feeding', 'harvest']
      if (validTypes.includes(createParam as RecordType)) {
        handleNewRecord(createParam as RecordType)
      }
      router.replace('/dashboard/records')
    }
  }, [searchParams, hives, router, userId, setHiveId, setOwnershipFilter, handleNewRecord, setApiaryId, setRecordTypeFilter, setShowArchivedHives])

  useEffect(() => {
    if (!highlightedRecordKey || scrolledRecordKeyRef.current === highlightedRecordKey) return
    if (!filteredRecords.some(record => `${record.record_type}-${record.id}` === highlightedRecordKey)) return

    scrolledRecordKeyRef.current = highlightedRecordKey

    requestAnimationFrame(() => {
      document.getElementById(`record-card-${highlightedRecordKey}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  }, [filteredRecords, highlightedRecordKey])


  // Weather fetching
  const fetchJsonWithTimeout = async <T,>(
    url: string,
    init: RequestInit = {},
    timeoutMs: number = WEATHER_REQUEST_TIMEOUT_MS
  ): Promise<T> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      return await response.json() as T
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const fetchWeatherData = async (eircode: string, isUkNi: boolean = false) => {
    try {
      const cleanedCode = eircode.trim().replace(/\s+/g, '').toUpperCase()
      const headers = { 'User-Agent': 'HiveCraic/1.0' }
      const country = isUkNi ? 'United Kingdom' : 'Ireland'
      const fallbackLat = isUkNi ? '54.5973' : '53.3498'
      const fallbackLon = isUkNi ? '-5.9301' : '-6.2603'

      const geocodeData = await fetchJsonWithTimeout<NominatimResult[]>(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCode)},${country}&format=json&limit=1`,
        { headers }
      )

      if (!Array.isArray(geocodeData) || geocodeData.length === 0) {
        const altData = await fetchJsonWithTimeout<NominatimResult[]>(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCode + ' ' + country)}&format=json&limit=1`,
          { headers }
        )

        if (!Array.isArray(altData) || altData.length === 0) {
          return await getWeatherFromCoordinates(fallbackLat, fallbackLon)
        }
        return await getWeatherFromCoordinates(altData[0].lat, altData[0].lon)
      }

      return await getWeatherFromCoordinates(geocodeData[0].lat, geocodeData[0].lon)
    } catch {
      const fallbackLat = isUkNi ? '54.5973' : '53.3498'
      const fallbackLon = isUkNi ? '-5.9301' : '-6.2603'
      return await getWeatherFromCoordinates(fallbackLat, fallbackLon)
    }
  }

  const getWeatherFromCoordinates = async (lat: string, lon: string) => {
    try {
      const weatherData = await fetchJsonWithTimeout<OpenMeteoResponse>(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe/Dublin`
      )
      const current = weatherData?.current
      if (
        !current ||
        typeof current.temperature_2m !== 'number' ||
        typeof current.relative_humidity_2m !== 'number' ||
        typeof current.weather_code !== 'number' ||
        typeof current.wind_speed_10m !== 'number'
      ) {
        return null
      }

      const weatherCodeMap: { [key: number]: string } = {
        0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing Rime Fog', 51: 'Light Drizzle', 53: 'Moderate Drizzle',
        55: 'Dense Drizzle', 61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
        71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow', 80: 'Slight Rain Showers',
        81: 'Moderate Rain Showers', 82: 'Violent Rain Showers', 95: 'Thunderstorm', 96: 'Thunderstorm with Hail'
      }

      return {
        temp: Math.round(current.temperature_2m),
        condition: weatherCodeMap[current.weather_code] ?? 'Unknown',
        humidity: current.relative_humidity_2m,
        wind_speed: Math.round(current.wind_speed_10m)
      }
    } catch {
      return null
    }
  }

  const handleFetchWeatherForHive = async (hiveId: string) => {
    const selectedHive = hives.find(h => h.id === hiveId)
    if (!selectedHive?.apiary_id) return null

    const { data: apiaryData } = await supabase
      .from('apiaries')
      .select('eircode, is_uk_ni')
      .eq('id', selectedHive.apiary_id)
      .single()

    if (!apiaryData?.eircode) return null

    return await fetchWeatherData(apiaryData.eircode, apiaryData.is_uk_ni || false)
  }

  // Image upload helper
  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      let contentType = file.type
      if (!contentType || contentType === 'application/json') {
        const mimeMap: Record<string, string> = {
          'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
          'gif': 'image/gif', 'webp': 'image/webp'
        }
        contentType = mimeMap[fileExt || ''] || 'image/jpeg'
      }

      const correctedFile = new File([file], file.name, { type: contentType })

      const { error: uploadError } = await supabase.storage
        .from('inspection-images')
        .upload(filePath, correctedFile, { contentType, cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('inspection-images')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return null
    }
  }

  // Inspection handlers
  const handleInspectionSubmit = async (formData: InspectionFormData, imageFile: File | null) => {
    if (!userId) return

    try {
      let imageUrl = formData.image_url
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile, 'inspections')
        if (!uploadedUrl) {
          // Upload failed - error already shown via toast in uploadImage
          return
        }
        imageUrl = uploadedUrl
      }

      let weatherData = null
      setFetchingWeather(true)
      try {
        const selectedHive = hives.find(h => h.id === formData.hive_id)
        if (selectedHive?.apiary_id) {
          const { data: apiaryData, error: apiaryError } = await supabase
            .from('apiaries')
            .select('eircode, is_uk_ni')
            .eq('id', selectedHive.apiary_id)
            .single()

          if (apiaryError) {
            console.error('Failed to fetch apiary weather metadata:', apiaryError)
          } else if (apiaryData?.eircode) {
            weatherData = await fetchWeatherData(apiaryData.eircode, apiaryData.is_uk_ni || false)
          }
        }
      } finally {
        setFetchingWeather(false)
      }

      const submitData = {
        ...formData,
        drones_present: formData.drones_present === -1 ? null : formData.drones_present,
        propolis_level: formData.propolis_level === -1 ? null : formData.propolis_level,
        image_url: imageUrl,
        weather_temp: weatherData?.temp ?? null,
        weather_condition: weatherData?.condition ?? null,
        weather_humidity: weatherData?.humidity ?? null,
        weather_wind_speed: weatherData?.wind_speed ?? null
      }

      if (editingInspection?.id) {
        const { error } = await supabase
          .from('inspections')
          .update(submitData)
          .eq('id', editingInspection.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('inspections')
          .insert([{ ...submitData, user_id: userId }])

        if (error) throw error
      }

      await fetchInspections(userId, filters.ownershipFilter)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving inspection')
    }
  }

  const handleInspectionEdit = (inspection: Inspection) => {
    setInspectionDraft(null)
    setEditingInspection(inspection)
    setFormType('inspection')
    setShowForm(true)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleInspectionDelete = async (id: string) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this inspection?')) {
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (!error && userId) await fetchInspections(userId, filters.ownershipFilter)
    }
  }

  // Treatment handlers
  const handleTreatmentSubmit = async (treatment: VarroaTreatment, isOther: boolean, otherType: string) => {
    if (!userId) return

    try {
      const submitData = {
        hive_id: treatment.hive_id,
        treatment_date: treatment.treatment_date,
        treatment_time: treatment.treatment_time || null,
        treatment_type: isOther ? otherType : treatment.treatment_type,
        dosage: treatment.dosage,
        batch_number: treatment.batch_number || null,
        temperature: treatment.temperature,
        weather_conditions: treatment.weather_conditions || '',
        notes: treatment.notes || '',
        application_method_id: treatment.application_method_id || null
      }

      if (treatment.id) {
        const { error } = await supabase
          .from('varroa_treatments')
          .update(submitData)
          .eq('id', treatment.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('varroa_treatments')
          .insert([{ ...submitData, user_id: userId }])

        if (error) throw error
      }

      await fetchVarroaTreatments(userId, filters.ownershipFilter)
      resetForm()
    } catch (error) {
      toast.error('Error saving treatment: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleTreatmentEdit = (treatment: VarroaTreatment) => {
    setEditingTreatment(treatment)
    setFormType('varroa_treatment')
    setShowForm(true)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleTreatmentDelete = async (treatment: VarroaTreatment) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this treatment?')) {
      const { error } = await supabase
        .from('varroa_treatments')
        .delete()
        .eq('id', treatment.id)
        .eq('user_id', userId)

      if (!error) await fetchVarroaTreatments(userId, filters.ownershipFilter)
    }
  }

  // Check handlers
  const handleCheckSubmit = async (check: VarroaCheck, imageFile: File | null) => {
    if (!userId) return

    try {
      let imageUrl = check.image_url
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile, 'varroa-checks')
        if (!uploadedUrl) {
          // Upload failed - error already shown via toast in uploadImage
          return
        }
        imageUrl = uploadedUrl
      }

      const submitData = {
        hive_id: check.hive_id,
        check_date: check.check_date,
        method: check.method,
        mites_count: check.mites_count,
        sample_size: check.sample_size,
        infestation_rate: check.infestation_rate,
        action_threshold_reached: check.action_threshold_reached,
        notes: check.notes || '',
        image_url: imageUrl
      }

      if (check.id) {
        const { error } = await supabase
          .from('varroa_checks')
          .update(submitData)
          .eq('id', check.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('varroa_checks')
          .insert([{ ...submitData, user_id: userId }])

        if (error) throw error

        // Create treatment task if threshold reached
        if (check.action_threshold_reached) {
          const selectedHive = hives.find(h => h.id === check.hive_id)
          const taskDate = new Date()
          taskDate.setDate(taskDate.getDate() + 1)

          await supabase.from('tasks_events').insert([{
            user_id: userId,
            title: `Treat hive ${selectedHive?.hive_number || 'Unknown'} for varroa`,
            description: `Action threshold reached. Infestation rate: ${check.infestation_rate?.toFixed(2)}%`,
            event_type: 'task',
            category: 'Treatment',
            priority: 'high',
            start_date: taskDate.toISOString().split('T')[0],
            start_time: '09:00',
            hive_id: check.hive_id,
            apiary_id: selectedHive?.apiary_id || null,
            reminder_enabled: true,
            reminder_minutes_before: 60,
            notes: `Auto-created from varroa check with ${check.method} method`,
            completed: false
          }])
        }
      }

      await fetchVarroaChecks(userId, filters.ownershipFilter)
      resetForm()
    } catch (error) {
      toast.error('Error saving check: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleCheckEdit = (check: VarroaCheck) => {
    setEditingCheck(check)
    setFormType('varroa_check')
    setShowForm(true)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleCheckDelete = async (check: VarroaCheck) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this varroa check?')) {
      const { error } = await supabase
        .from('varroa_checks')
        .delete()
        .eq('id', check.id)
        .eq('user_id', userId)

      if (!error) await fetchVarroaChecks(userId, filters.ownershipFilter)
    }
  }

  // Feeding handlers
  const handleFeedingSubmit = async (feeding: Feeding, isOther: boolean, otherType: string) => {
    if (!userId) return

    try {
      const submitData = {
        hive_id: feeding.hive_id,
        feed_date: feeding.feed_date,
        feed_type: isOther ? otherType : feeding.feed_type,
        quantity: feeding.quantity,
        unit: feeding.unit,
        notes: feeding.notes || ''
      }

      if (feeding.id) {
        const { error } = await supabase
          .from('feedings')
          .update(submitData)
          .eq('id', feeding.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('feedings')
          .insert([{ ...submitData, user_id: userId }])

        if (error) throw error
      }

      await fetchFeedings(userId, filters.ownershipFilter)
      resetForm()
    } catch (error) {
      toast.error('Error saving feeding: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleFeedingEdit = (feeding: Feeding) => {
    setEditingFeeding(feeding)
    setFormType('feeding')
    setShowForm(true)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleFeedingDelete = async (feeding: Feeding) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this feeding record?')) {
      const { error } = await supabase
        .from('feedings')
        .delete()
        .eq('id', feeding.id)
        .eq('user_id', userId)

      if (!error) await fetchFeedings(userId, filters.ownershipFilter)
    }
  }

  // Harvest handlers
  const handleHarvestSubmit = async (harvest: Harvest) => {
    if (!userId) return

    try {
      const submitData = {
        hive_id: harvest.hive_id,
        harvest_date: harvest.harvest_date,
        honey_weight: harvest.honey_weight,
        wax_weight: harvest.wax_weight,
        unit: harvest.unit,
        frames_harvested: harvest.frames_harvested,
        floral_source: harvest.floral_source,
        notes: harvest.notes || ''
      }

      if (harvest.id) {
        const { error } = await supabase
          .from('harvests')
          .update(submitData)
          .eq('id', harvest.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('harvests')
          .insert([{ ...submitData, user_id: userId }])

        if (error) throw error
      }

      await fetchHarvests(userId, filters.ownershipFilter)
      resetForm()
    } catch (error) {
      toast.error('Error saving harvest: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleHarvestEdit = (harvest: Harvest) => {
    setEditingHarvest(harvest)
    setFormType('harvest')
    setShowForm(true)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleHarvestDelete = async (harvest: Harvest) => {
    if (!userId) return
    if (confirm('Are you sure you want to delete this harvest record?')) {
      const { error } = await supabase
        .from('harvests')
        .delete()
        .eq('id', harvest.id)
        .eq('user_id', userId)

      if (!error) await fetchHarvests(userId, filters.ownershipFilter)
    }
  }

  // Archive handler
  const handleArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !archiveData.hive_id) return

    try {
      const { error } = await supabase
        .from('hives')
        .update({
          archived_at: new Date().toISOString(),
          archive_reason_id: archiveData.archive_reason_id || null,
          archive_notes: archiveData.archive_notes || null,
          status: 'archived'
        })
        .eq('id', archiveData.hive_id)
        .eq('user_id', userId)

      if (error) throw error

      await Promise.all([
        fetchHives(userId),
        fetchArchiveRecords(userId)
      ])
      resetForm()
      toast.success('Hive archived successfully')
    } catch (error) {
      toast.error('Error archiving hive: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingInspection(null)
    setInspectionDraft(null)
    setEditingTreatment(null)
    setEditingCheck(null)
    setEditingFeeding(null)
    setEditingHarvest(null)
    setArchiveData(getDefaultArchiveFormData())
    setShowIpmTips(false)
  }

  const handleImageClick = (url: string) => {
    setModalImageUrl(normaliseStoragePublicUrl(url))
    setImageModalOpen(true)
  }

  const handleHiveChange = async (hiveId: string) => {
    // Fetch weather data when hive changes (for inspection form)
    if (hiveId) {
      await handleFetchWeatherForHive(hiveId)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <IconButton
              onClick={() => router.push('/dashboard')}
              className="flex-shrink-0"
              aria-label="Back to dashboard"
            >
              <Home size={24} />
            </IconButton>
            <h1 className="text-2xl font-bold text-foreground truncate">Records</h1>
          </div>
          <div className="flex-shrink-0">
            <NewRecordDropdown onSelectType={handleNewRecord} />
          </div>
        </div>

        {/* Filters */}
        <RecordFiltersBar
          hives={hives}
          apiaries={apiaries}
          isTeamMember={isTeamMember}
          ownershipFilter={filters.ownershipFilter}
          recordTypeFilter={filters.recordTypeFilter}
          apiaryId={filters.apiaryId}
          hiveId={filters.hiveId}
          showArchivedHives={filters.showArchivedHives}
          timePeriod={filters.timePeriod}
          customStartDate={filters.customStartDate}
          customEndDate={filters.customEndDate}
          timePeriodCounts={timePeriodCounts}
          onHiveChange={setHiveId}
          onApiaryChange={setApiaryId}
          onShowArchivedChange={setShowArchivedHives}
          onTimePeriodChange={setTimePeriod}
          onCustomStartDateChange={setCustomStartDate}
          onCustomEndDateChange={setCustomEndDate}
          onOwnershipChange={setOwnershipFilter}
          onRecordTypeChange={setRecordTypeFilter}
        />

        {/* Form Section */}
        {showForm && (
          <div ref={formRef} className="field-journal-panel mb-6 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {formType === 'inspection' && (editingInspection ? 'Edit Inspection' : 'New Inspection')}
                {formType === 'varroa_treatment' && (editingTreatment?.id ? 'Edit Treatment' : 'New Treatment')}
                {formType === 'varroa_check' && (editingCheck?.id ? 'Edit Varroa Check' : 'New Varroa Check')}
                {formType === 'feeding' && (editingFeeding?.id ? 'Edit Feeding' : 'New Feeding')}
                {formType === 'harvest' && (editingHarvest?.id ? 'Edit Harvest' : 'New Harvest')}
                {formType === 'archive' && 'Archive Hive'}
              </h2>
              <IconButton
                onClick={resetForm}
                aria-label="Close form"
              >
                <X size={20} />
              </IconButton>
            </div>

            {formType === 'inspection' && (
              <InspectionForm
                initialData={inspectionFormData}
                hives={hives}
                apiaries={apiaries}
                previousRightSizedFramesByHive={previousRightSizedFramesByHive}
                selectedApiaryId={filters.apiaryId}
                selectedHiveId={filters.hiveId}
                isEditing={Boolean(editingInspection?.id)}
                userHasActiveSubscription={userHasActiveSubscription}
                onSubmit={handleInspectionSubmit}
                onCancel={resetForm}
                onHiveChange={handleHiveChange}
                onImageClick={handleImageClick}
                fetchingWeather={fetchingWeather}
              />
            )}

            {formType === 'varroa_treatment' && editingTreatment && (
              <VarroaTreatmentForm
                treatment={editingTreatment}
                hives={hives}
                apiaries={apiaries}
                selectedApiaryId={filters.apiaryId}
                selectedHiveId={filters.hiveId}
                treatmentProducts={treatmentProducts}
                applicationMethods={applicationMethods}
                isUkNiResident={isUkNiResident}
                onSubmit={handleTreatmentSubmit}
                onCancel={resetForm}
                onShowIpmTips={() => setShowIpmTips(true)}
                onFetchWeather={handleFetchWeatherForHive}
              />
            )}

            {formType === 'varroa_check' && editingCheck && (
              <VarroaCheckForm
                check={editingCheck}
                hives={hives}
                apiaries={apiaries}
                selectedApiaryId={filters.apiaryId}
                selectedHiveId={filters.hiveId}
                checkMethodOptions={checkMethodOptions}
                existingChecks={varroaChecks}
                userHasActiveSubscription={userHasActiveSubscription}
                onSubmit={handleCheckSubmit}
                onCancel={resetForm}
                onImageClick={handleImageClick}
              />
            )}

            {formType === 'feeding' && editingFeeding && (
              <FeedingForm
                feeding={editingFeeding}
                hives={hives}
                apiaries={apiaries}
                selectedApiaryId={filters.apiaryId}
                selectedHiveId={filters.hiveId}
                feedTypeOptions={feedTypeOptions}
                onSubmit={handleFeedingSubmit}
                onCancel={resetForm}
              />
            )}

            {formType === 'harvest' && editingHarvest && (
              <HarvestForm
                harvest={editingHarvest}
                hives={hives}
                apiaries={apiaries}
                selectedApiaryId={filters.apiaryId}
                selectedHiveId={filters.hiveId}
                floralSourceOptions={floralSourceOptions}
                onSubmit={handleHarvestSubmit}
                onCancel={resetForm}
              />
            )}

            {formType === 'archive' && (
              <form onSubmit={handleArchiveSubmit} className="space-y-4">
                <div>
                  <FieldLabel>Hive</FieldLabel>
                  <SelectField
                    value={archiveData.hive_id}
                    onChange={(e) => setArchiveData({ ...archiveData, hive_id: e.target.value })}
                    required
                  >
                    <option value="">Select hive...</option>
                    {hives.filter(h => !h.archived_at).map(hive => (
                      <option key={hive.id} value={hive.id}>{hive.hive_number}</option>
                    ))}
                  </SelectField>
                </div>
                <div>
                  <FieldLabel>Reason</FieldLabel>
                  <SelectField
                    value={archiveData.archive_reason_id}
                    onChange={(e) => setArchiveData({ ...archiveData, archive_reason_id: e.target.value })}
                  >
                    <option value="">Select reason...</option>
                    {archiveReasons.map(reason => (
                      <option key={reason.id} value={reason.id}>{reason.value}</option>
                    ))}
                  </SelectField>
                </div>
                <div>
                  <FieldLabel>Notes</FieldLabel>
                  <TextAreaField
                    value={archiveData.archive_notes}
                    onChange={(e) => setArchiveData({ ...archiveData, archive_notes: e.target.value })}
                    rows={3}
                    placeholder="Optional notes..."
                  />
                </div>
                <FormActionRow>
                  <Button
                    type="button"
                    onClick={resetForm}
                    tone="neutral"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    tone="danger"
                    className="flex-1"
                  >
                    Archive Hive
                  </Button>
                </FormActionRow>
              </form>
            )}
          </div>
        )}

        {/* Records List */}
        <div className="space-y-4">
          {filteredRecords.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No Records Found"
              description="No records match your current filters. Try adjusting your filters or add a new record."
            />
          ) : (
            filteredRecords.map(record => {
              const recordKey = `${record.record_type}-${record.id}`
              const isHighlighted = highlightedRecordKey === recordKey
              let card: React.ReactNode = null

              switch (record.record_type) {
                case 'inspection':
                  card = (
                    <InspectionCard
                      inspection={record}
                      userId={userId}
                      sharedHiveIds={sharedHiveIds}
                      userHasActiveSubscription={userHasActiveSubscription}
                      hives={hives}
                      apiaries={apiaries}
                      onEdit={handleInspectionEdit}
                      onDelete={handleInspectionDelete}
                      onImageClick={handleImageClick}
                    />
                  )
                  break
                case 'varroa_check':
                  card = (
                    <VarroaCheckCard
                      check={record}
                      userId={userId}
                      sharedHiveIds={sharedHiveIds}
                      userHasActiveSubscription={userHasActiveSubscription}
                      onEdit={handleCheckEdit}
                      onDelete={handleCheckDelete}
                      onImageClick={handleImageClick}
                    />
                  )
                  break
                case 'varroa_treatment':
                  card = (
                    <TreatmentCard
                      treatment={record}
                      userId={userId}
                      sharedHiveIds={sharedHiveIds}
                      onEdit={handleTreatmentEdit}
                      onDelete={handleTreatmentDelete}
                    />
                  )
                  break
                case 'feeding':
                  card = (
                    <FeedingCard
                      feeding={record}
                      userId={userId}
                      sharedHiveIds={sharedHiveIds}
                      onEdit={handleFeedingEdit}
                      onDelete={handleFeedingDelete}
                    />
                  )
                  break
                case 'harvest':
                  card = (
                    <HarvestCard
                      harvest={record}
                      userId={userId}
                      sharedHiveIds={sharedHiveIds}
                      onEdit={handleHarvestEdit}
                      onDelete={handleHarvestDelete}
                    />
                  )
                  break
                case 'archive':
                  card = (
                    <ArchiveCard
                      archiveRecord={record}
                    />
                  )
                  break
                default:
                  card = null
              }

              if (!card) return null

              return (
                <div
                  key={recordKey}
                  id={`record-card-${recordKey}`}
                  className={`scroll-mt-24 rounded-lg transition-all cursor-pointer ${
                    isHighlighted
                      ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background shadow-lg bg-blue-50 dark:bg-blue-950/30'
                      : 'hover:ring-1 hover:ring-border'
                  }`}
                  onClick={() => setHighlightedRecordKey(isHighlighted ? null : recordKey)}
                >
                  {card}
                </div>
              )
            })
          )}
        </div>

        {/* IPM Tips Modal */}
        {showIpmTips && (
          <ModalShell
            title="IPM Tips for Varroa Control"
            onClose={() => setShowIpmTips(false)}
            maxWidthClassName="max-w-lg"
            shellClassName="max-h-[80vh] flex flex-col"
            bodyClassName="flex-1 overflow-y-auto p-6"
          >
            <div className="space-y-4 text-sm text-text-secondary">
              <p><strong>Integrated Pest Management (IPM)</strong> combines multiple strategies:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Drone Comb Trapping:</strong> Insert drone foundation frames, allow bees to build and queen to lay, then remove and freeze before drones emerge.</li>
                <li><strong>Brood Breaks:</strong> Cage the queen or create splits to interrupt the mite reproduction cycle.</li>
                <li><strong>Screened Bottom Boards:</strong> Allow mites to fall through and away from the colony.</li>
                <li><strong>Powdered Sugar Dusting:</strong> Encourages grooming behavior.</li>
                <li><strong>Regular Monitoring:</strong> Check mite levels every 4-6 weeks during the active season.</li>
              </ul>
              <p className="text-amber-800 dark:text-amber-400 font-medium">
                Note: Always follow treatment product instructions and respect withdrawal periods before harvesting honey.
              </p>
            </div>
          </ModalShell>
        )}

        {/* Image Modal */}
        <ImageZoomModal
          isOpen={imageModalOpen}
          imageUrl={modalImageUrl}
          onClose={() => setImageModalOpen(false)}
        />
      </div>
    </div>
  )
}
