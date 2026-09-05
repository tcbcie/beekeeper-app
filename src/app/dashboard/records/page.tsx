'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadImageFile, deleteUploadedImages } from '@/lib/upload-image'
import { getCurrentUserId, hasActiveSubscription } from '@/lib/auth'
import { Home, X, ClipboardList } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import FormActionRow from '@/components/ui/FormActionRow'
import ModalShell from '@/components/ui/ModalShell'
import FieldLabel from '@/components/ui/FieldLabel'
import SelectField from '@/components/ui/SelectField'
import TextAreaField from '@/components/ui/TextAreaField'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useReportFormActive } from '@/contexts/BottomSurfaceContext'
import { buildDiscardRecordPrompt } from '@/lib/inspection-discard'
import { buildDeleteRecordPrompt } from '@/lib/record-delete-prompts'
import { syncTreatmentReminder } from '@/lib/treatment-reminder'
import { useNavigationGuard } from '@/hooks/useNavigationGuard'
import { updateManager } from '@/lib/update-manager'
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
  ArchiveFormData,
  FollowUpTaskDraft
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

const RECORD_LABELS: Record<RecordType, string> = {
  inspection: 'inspection',
  varroa_treatment: 'treatment',
  varroa_check: 'varroa check',
  feeding: 'feeding record',
  harvest: 'harvest record',
  archive: 'archive record',
}

export default function RecordsPage() {
  const router = useRouter()
  const toast = useToast()
  const confirmDialog = useConfirm()

  const [formType, setFormType] = useState<RecordType>('inspection')

  // Unsaved-work protection for whichever record form is open. Each form
  // reports its own dirty state; the page holds it in a ref so consulting it
  // never triggers a re-render.
  //
  // This was inspection-only until Phase 4's audit: the other four forms
  // reported nothing, so every guard below treated them as permanently clean
  // and their contents could be discarded without a prompt.
  const formDirtyRef = useRef(false)
  // Mirrored into state as well as the ref: the ref keeps the exit guards free
  // of re-renders, while the shell needs a rendered value to mute Mel and hold
  // back banners. It flips at most twice in a form's lifetime.
  const [formDirty, setFormDirty] = useState(false)

  const handleFormDirtyChange = useCallback((dirty: boolean) => {
    formDirtyRef.current = dirty
    setFormDirty(dirty)
  }, [])

  // Nothing interruptive may take the bottom of the screen while an inspection
  // is part-finished. Deferred banners return once it is saved or discarded.
  useReportFormActive(formDirty)

  // A service-worker update reloads every open client, including ones that
  // never showed the prompt. Reading the ref rather than the state keeps the
  // guard current without re-registering on each change.
  useEffect(() => {
    return updateManager.registerUnsavedWorkGuard(() => formDirtyRef.current)
  }, [])

  // A guard falling quiet is not observable on its own, so the moment the work
  // stops being at risk we ask the manager to run any reload it held back.
  useEffect(() => {
    if (!formDirty) updateManager.flushPendingReload()
  }, [formDirty])

  /** Returns true when it is safe to throw away whatever is in the form. */
  const confirmDiscardOpenForm = useCallback(async () => {
    if (!formDirtyRef.current) return true
    return confirmDialog(buildDiscardRecordPrompt(RECORD_LABELS[formType]))
  }, [confirmDialog, formType])

  // The last of Phase 1's six exit paths. An in-app link now asks before it
  // navigates away from a part-finished inspection, using the same wording as
  // every other discard prompt.
  useNavigationGuard(formDirty, confirmDiscardOpenForm)

  const searchParams = useSearchParams()
  const formRef = useRef<HTMLDivElement>(null)
  const hasInitialisedApiaryFilterRef = useRef(false)
  const scrolledRecordKeyRef = useRef<string | null>(null)

  // User state
  const [userId, setUserId] = useState<string | null>(null)
  const [userHasActiveSubscription, setUserHasActiveSubscription] = useState(false)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null)
  const [inspectionDraft, setInspectionDraft] = useState<InspectionFormData | null>(null)
  const [editingTreatment, setEditingTreatment] = useState<VarroaTreatment | null>(null)
  const [editingCheck, setEditingCheck] = useState<VarroaCheck | null>(null)
  const [editingFeeding, setEditingFeeding] = useState<Feeding | null>(null)
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null)
  const [archiveData, setArchiveData] = useState<ArchiveFormData>(getDefaultArchiveFormData())

  // UI state
  const [imageModalOpen, setImageModalOpen] = useState(false)
  // An array even for the single-image callers (varroa checks), so the viewer has
  // one code path and inspections can hand it a whole gallery.
  const [modalImages, setModalImages] = useState<string[]>([])
  const [modalStartIndex, setModalStartIndex] = useState(0)
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

  // Most recent per-super fullness per hive (inspections are newest-first, so the first
  // occurrence wins), used to pre-fill a new inspection's Super Fullness gauges.
  const previousSuperFullnessByHive = useMemo<Record<string, number[] | null>>(() => {
    const latestValues: Record<string, number[] | null> = {}

    for (const inspection of inspections) {
      if (!inspection.hive_id || inspection.hive_id in latestValues) {
        continue
      }

      latestValues[inspection.hive_id] =
        Array.isArray(inspection.honey_super_fullness) && inspection.honey_super_fullness.length > 0
          ? inspection.honey_super_fullness
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
      brood_frames_per_box: editingInspection.brood_frames_per_box ?? defaults.brood_frames_per_box,
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
      honey_super_fullness: editingInspection.honey_super_fullness ?? defaults.honey_super_fullness,
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
      // This mapping is an explicit whitelist: a field missing here is silently
      // dropped on every edit. image_urls must be carried, never image_url - that
      // one is a generated mirror and writing it is rejected by Postgres.
      image_urls: editingInspection.image_urls ?? defaults.image_urls
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
    searchTerm,
    setSearchTerm,
    timePeriodCounts
  } = useRecordFilters({ allRecords, hives })

  const activeFilterCount = [
    filters.ownershipFilter !== 'my',
    filters.recordTypeFilter !== 'all',
    filters.apiaryId !== '',
    filters.hiveId !== '',
    filters.showArchivedHives,
  ].filter(Boolean).length

  const clearCollapsedFilters = useCallback(() => {
    setOwnershipFilter('my')
    setRecordTypeFilter('all')
    setApiaryId('')
    setHiveId('')
    setShowArchivedHives(false)
  }, [setOwnershipFilter, setRecordTypeFilter, setApiaryId, setHiveId, setShowArchivedHives])

  // Initialize user and fetch data
  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)

      // Load the records and check the subscription concurrently rather than
      // serially -- the subscription result isn't needed to render the data.
      const [hasSubscription] = await Promise.all([
        hasActiveSubscription(),
        fetchAllData(id, filters.ownershipFilter)
      ])
      setUserHasActiveSubscription(hasSubscription)
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
  // Unguarded. Used by the URL deep-link effect, which runs on page load when
  // there is nothing open to discard. Keeping it synchronous matters: the
  // effect calls router.replace() immediately afterwards, and deferring these
  // state updates behind an await would sequence them after that navigation.
  const openNewRecord = useCallback((type: RecordType, presetHiveId?: string) => {
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

  // Guarded. Used by the New Record dropdown, where the user may already have
  // an inspection in progress that opening another record would destroy.
  const handleNewRecord = useCallback(async (type: RecordType, presetHiveId?: string) => {
    if (!(await confirmDiscardOpenForm())) return
    openNewRecord(type, presetHiveId)
  }, [confirmDiscardOpenForm, openNewRecord])

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
          openNewRecord(mappedType, hiveParam)
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
        openNewRecord(createParam as RecordType)
      }
      router.replace('/dashboard/records')
    }
  }, [searchParams, hives, router, userId, setHiveId, setOwnershipFilter, openNewRecord, setApiaryId, setRecordTypeFilter, setShowArchivedHives])

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

  /**
   * Weather for an apiary, preferring its stored coordinates.
   *
   * The Eircode path only exists to approximate a position, and Eircode geocoding does not resolve
   * every postcode (see docs/features/irish-grid-reference.md) — falling back to a city centre when
   * it fails. Where the apiary already has coordinates they are exact, need no lookup, and work for
   * apiaries with no postcode at all. The Eircode remains the fallback for older records.
   */
  const fetchWeatherForApiary = async (apiaryId: string) => {
    const { data: apiaryData, error } = await supabase
      .from('apiaries')
      .select('latitude, longitude, eircode, is_uk_ni')
      .eq('id', apiaryId)
      .single()

    if (error) {
      console.error('Failed to fetch apiary weather metadata:', error)
      return null
    }
    if (!apiaryData) return null

    // Guard explicitly against null/'' — Number(null) is 0, which would silently request
    // weather for the Atlantic at 0°,0°.
    const rawLat = apiaryData.latitude
    const rawLon = apiaryData.longitude
    const lat = rawLat == null || rawLat === '' ? NaN : Number(rawLat)
    const lon = rawLon == null || rawLon === '' ? NaN : Number(rawLon)

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return await getWeatherFromCoordinates(String(lat), String(lon))
    }

    if (apiaryData.eircode) {
      return await fetchWeatherData(apiaryData.eircode, apiaryData.is_uk_ni || false)
    }

    return null
  }

  const handleFetchWeatherForHive = async (hiveId: string) => {
    const selectedHive = hives.find(h => h.id === hiveId)
    if (!selectedHive?.apiary_id) return null

    return await fetchWeatherForApiary(selectedHive.apiary_id)
  }

  // Uploads go through @/lib/upload-image, which is also what useImageUpload calls.
  // This used to be a second, weaker copy that skipped the magic-byte, MIME and
  // 10MB checks - so the app's busiest upload path was its least validated one.
  const uploadImage = (file: File, folder: string): Promise<string | null> =>
    uploadImageFile(file, { folder, onError: (message) => toast.error(message) })

  // Apply a Given/Taken honey-super delta to a hive's stored configuration.
  // Atomic via Postgres RPC: clamps at 0, only mutates the honey_supers key,
  // and serialises concurrent adjustments via row-level lock.
  const HONEY_SUPER_DELTA_MAX = 100
  const adjustHiveHoneySupers = useCallback(async (hiveId: string, delta: number) => {
    if (delta === 0 || !userId) return
    if (!Number.isInteger(delta) || Math.abs(delta) > HONEY_SUPER_DELTA_MAX) {
      toast.warning('Hive super count not updated: adjustment is out of safe range.')
      return
    }
    const { error } = await supabase.rpc('adjust_hive_honey_supers', {
      p_hive_id: hiveId,
      p_delta: delta,
    })
    if (error) {
      console.error('Hive super sync failed:', error)
      toast.warning('Inspection saved. The hive\'s super count could not be updated — open the hive to verify it\'s correct.')
    }
  }, [userId, toast])

  // Inspection handlers
  const handleInspectionSubmit = async (
    formData: InspectionFormData,
    imageFiles: File[],
    followUpTasks: FollowUpTaskDraft[] = []
  ) => {
    if (!userId) return

    // Declared outside the try so the failure paths below can undo it. Anything
    // uploaded during an attempt that does not end in a saved row is rubbish: no
    // record points at it, and nothing in this app ever collects it. Cleaning up
    // also means a retry starts from a clean slate rather than leaving another
    // copy behind on every attempt.
    const uploadedUrls: string[] = []
    // Once the row exists it owns those photos, so the cleanup below must stop.
    let recordSaved = false

    try {
      // formData.image_urls already holds the photos being kept from a previous
      // save, in order and minus any the beekeeper removed. Newly picked files are
      // uploaded and appended. Sequential rather than parallel: a phone on a hive
      // roof gets one upload's worth of bandwidth at a time, and a mid-way failure
      // should abort before burning the rest of the user's data allowance.
      for (const file of imageFiles) {
        const uploadedUrl = await uploadImage(file, 'inspections')
        if (!uploadedUrl) {
          // Upload failed - error already shown via toast in uploadImage.
          await deleteUploadedImages(uploadedUrls)
          return
        }
        uploadedUrls.push(uploadedUrl)
      }
      const imageUrls = [...formData.image_urls, ...uploadedUrls]

      let weatherData = null
      setFetchingWeather(true)
      try {
        const selectedHive = hives.find(h => h.id === formData.hive_id)
        if (selectedHive?.apiary_id) {
          weatherData = await fetchWeatherForApiary(selectedHive.apiary_id)
        }
      } finally {
        setFetchingWeather(false)
      }

      // The hive's current super count is the authority for how many readings may be stored.
      // Trimming here is the last line of defence: without it a stale carry-forward can persist
      // readings for supers that no longer exist, which the next inspection then carries forward
      // again, and the next — the value never self-corrects. When editing, keep the originally
      // recorded length so readings taken before supers were removed are never destroyed.
      const configuredSuperCount = Math.max(0, Math.trunc(
        hives.find(h => h.id === formData.hive_id)?.configuration?.honey_supers ?? 0
      ))
      const recordedSuperCount = Array.isArray(editingInspection?.honey_super_fullness)
        ? editingInspection.honey_super_fullness.length
        : 0
      const maxSuperReadings = Math.max(configuredSuperCount, recordedSuperCount)

      // Only persist valid 0-100 integers; NULL stays NULL ("not recorded"). An array trimmed
      // to nothing means there is nothing to record, so it collapses back to NULL.
      const trimmedSuperFullness = Array.isArray(formData.honey_super_fullness)
        ? formData.honey_super_fullness.slice(0, maxSuperReadings).map(v =>
            Number.isFinite(v) ? Math.min(100, Math.max(0, Math.trunc(v))) : 0
          )
        : null
      const sanitisedSuperFullness = trimmedSuperFullness && trimmedSuperFullness.length > 0
        ? trimmedSuperFullness
        : null

      const submitData = {
        ...formData,
        drones_present: formData.drones_present === -1 ? null : formData.drones_present,
        propolis_level: formData.propolis_level === -1 ? null : formData.propolis_level,
        honey_super_fullness: sanitisedSuperFullness,
        // image_urls is the only writable photo column. inspections.image_url is a
        // GENERATED mirror of image_urls[1] and Postgres rejects any write to it.
        image_urls: imageUrls,
        weather_temp: weatherData?.temp ?? null,
        weather_condition: weatherData?.condition ?? null,
        weather_humidity: weatherData?.humidity ?? null,
        weather_wind_speed: weatherData?.wind_speed ?? null
      }

      if (editingInspection?.id) {
        const { data: updatedRows, error } = await supabase
          .from('inspections')
          .update(submitData)
          .eq('id', editingInspection.id)
          .eq('user_id', userId)
          .select('id')

        if (error) throw error
        if (!updatedRows || updatedRows.length !== 1) {
          await deleteUploadedImages(uploadedUrls)
          toast.error('Inspection could not be updated. It may have been changed elsewhere — please refresh.')
          return
        }
        recordSaved = true

        const oldHiveId = editingInspection.hive_id
        const oldHoneySupers = Number.isInteger(editingInspection.honey_supers)
          ? editingInspection.honey_supers
          : 0

        if (oldHiveId === formData.hive_id) {
          await adjustHiveHoneySupers(formData.hive_id, formData.honey_supers - oldHoneySupers)
        } else {
          // Apply on the new hive first; if the second call fails we end up with
          // an inflated count (visible to the user) rather than a missing one (silent).
          await adjustHiveHoneySupers(formData.hive_id, formData.honey_supers)
          await adjustHiveHoneySupers(oldHiveId, -oldHoneySupers)
        }
      } else {
        const { error } = await supabase
          .from('inspections')
          .insert([{ ...submitData, user_id: userId }])

        if (error) throw error
        recordSaved = true

        await adjustHiveHoneySupers(formData.hive_id, formData.honey_supers)
      }

      if (followUpTasks.length > 0) {
        const selectedHive = hives.find(h => h.id === formData.hive_id)
        const apiaryId = selectedHive?.apiary_id ?? null
        const isTeamTask = !!selectedHive && sharedHiveIds.includes(selectedHive.id)

        const taskRows = followUpTasks.map(draft => ({
          user_id: userId,
          title: draft.title,
          description: draft.description || null,
          event_type: 'task' as const,
          category: 'inspection' as const,
          priority: draft.priority,
          start_date: draft.due_date,
          all_day: true,
          hive_id: formData.hive_id,
          apiary_id: apiaryId,
          equipment_needed: draft.equipment_needed || null,
          notes: `Auto-created from inspection on ${formData.inspection_date}.`,
          is_team_task: isTeamTask,
          completed: false,
        }))

        const { error: tasksError } = await supabase.from('tasks_events').insert(taskRows)
        if (tasksError) {
          console.error('Follow-up task insert failed:', tasksError)
          toast.warning(`Inspection saved, but ${taskRows.length} follow-up task(s) could not be created. Open Tasks to add them manually.`)
        }
      }

      await fetchInspections(userId, filters.ownershipFilter)
      await fetchHives(userId)
      resetForm()
    } catch (error) {
      // Only tidy up when the row never landed. Past that point - a failing
      // refetch, a honey-super adjustment - the saved inspection references these
      // photos, and deleting them would break a record that exists.
      if (!recordSaved) {
        await deleteUploadedImages(uploadedUrls)
      }
      toast.error(error instanceof Error ? error.message : 'Error saving inspection')
    }
  }

  const handleInspectionEdit = async (inspection: Inspection) => {
    // Opening another inspection overwrites the one in the form.
    if (!(await confirmDiscardOpenForm())) return

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
    const inspection = inspections.find((row) => row.id === id)
    const ok = await confirmDialog(
      buildDeleteRecordPrompt({
        recordLabel: 'inspection',
        hiveNumber: inspection?.hives?.hive_number,
        date: inspection?.inspection_date,
        consequence: inspection?.honey_supers
          ? "The hive's honey super count will be reduced to match."
          : undefined,
      }),
    )
    if (!ok) return

    const { data: deletedRows, error } = await supabase
      .from('inspections')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('hive_id, honey_supers')

    if (error) {
      toast.error(error.message)
      return
    }
    if (!deletedRows || deletedRows.length !== 1) {
      toast.error('Inspection could not be deleted. It may have been removed already.')
      return
    }

    const removed = deletedRows[0]
    const removedSupers = Number.isInteger(removed.honey_supers) ? removed.honey_supers : 0
    if (removedSupers) {
      await adjustHiveHoneySupers(removed.hive_id, -removedSupers)
    }
    await fetchInspections(userId, filters.ownershipFilter)
    await fetchHives(userId)
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
        application_method_id: treatment.application_method_id || null,
        planned_removal_date: treatment.planned_removal_date || null,
        removed_date: treatment.planned_removal_date ? (treatment.removed_date || null) : null
      }

      let treatmentId = treatment.id

      if (treatment.id) {
        // RLS allows a team-mate to see a treatment on a shared hive but not to
        // change it, and the card offers Edit to everyone. Without asking which
        // rows matched, that update silently does nothing — and the reminder
        // sync below would then create a stray task owned by someone who cannot
        // edit the treatment it points at.
        const { data, error } = await supabase
          .from('varroa_treatments')
          .update(submitData)
          .eq('id', treatment.id)
          .eq('user_id', userId)
          .select('id')

        if (error) throw error
        if (!data || data.length === 0) {
          toast.error('Only the beekeeper who recorded this treatment can change it.')
          return
        }
      } else {
        const { data, error } = await supabase
          .from('varroa_treatments')
          .insert([{ ...submitData, user_id: userId }])
          .select('id')
          .single()

        if (error) throw error
        treatmentId = data.id
      }

      // The treatment is the source of truth. A reminder that cannot be written
      // is reported and the record still saves, as with inspection follow-ups.
      if (treatmentId) {
        const selectedHive = hives.find(h => h.id === treatment.hive_id)
        const reminder = await syncTreatmentReminder({
          treatmentId,
          userId,
          hiveId: treatment.hive_id,
          hiveNumber: selectedHive?.hive_number ?? treatment.hives?.hive_number ?? null,
          apiaryId: selectedHive?.apiary_id ?? null,
          isTeamTask: !!selectedHive && sharedHiveIds.includes(selectedHive.id),
          treatmentType: submitData.treatment_type,
          treatmentDate: submitData.treatment_date,
          plannedRemovalDate: submitData.planned_removal_date,
          removedDate: submitData.removed_date
        })

        if (!reminder.ok) {
          console.error('Treatment reminder sync failed:', reminder.error)
          toast.warning('Treatment saved, but its removal reminder could not be updated. Open Tasks to add it manually.')
        }
      }

      await fetchVarroaTreatments(userId, filters.ownershipFilter)
      resetForm()
    } catch (error) {
      toast.error('Error saving treatment: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleTreatmentEdit = async (treatment: VarroaTreatment) => {
    // Opening any record form replaces whatever is in the panel, so this
    // needs the same guard the inspection edit path already has.
    if (!(await confirmDiscardOpenForm())) return

    setEditingTreatment(treatment)
    setFormType('varroa_treatment')
    setShowForm(true)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleTreatmentDelete = async (treatment: VarroaTreatment) => {
    if (!userId) return
    const ok = await confirmDialog(
      buildDeleteRecordPrompt({
        recordLabel: 'varroa treatment',
        hiveNumber: treatment.hives?.hive_number,
        date: treatment.treatment_date,
      }),
    )
    if (!ok) return

    const { error } = await supabase
      .from('varroa_treatments')
      .delete()
      .eq('id', treatment.id)
      .eq('user_id', userId)

    if (error) {
      toast.error(error.message)
      return
    }
    await fetchVarroaTreatments(userId, filters.ownershipFilter)
  }

  // Check handlers
  const handleCheckSubmit = async (check: VarroaCheck, imageFile: File | null) => {
    if (!userId) return

    // Same contract as the inspection save: a photo uploaded during an attempt
    // that does not end in a saved row is rubbish nothing else will collect.
    const uploadedUrls: string[] = []
    let recordSaved = false

    try {
      let imageUrl = check.image_url
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile, 'varroa-checks')
        if (!uploadedUrl) {
          // Upload failed - error already shown via toast in uploadImage
          return
        }
        imageUrl = uploadedUrl
        uploadedUrls.push(uploadedUrl)
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
        recordSaved = true
      } else {
        const { error } = await supabase
          .from('varroa_checks')
          .insert([{ ...submitData, user_id: userId }])

        if (error) throw error
        recordSaved = true

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
      // Only when the row never landed - a saved check owns its photo.
      if (!recordSaved) await deleteUploadedImages(uploadedUrls)
      toast.error('Error saving check: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleCheckEdit = async (check: VarroaCheck) => {
    // Opening any record form replaces whatever is in the panel, so this
    // needs the same guard the inspection edit path already has.
    if (!(await confirmDiscardOpenForm())) return

    setEditingCheck(check)
    setFormType('varroa_check')
    setShowForm(true)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleCheckDelete = async (check: VarroaCheck) => {
    if (!userId) return
    const ok = await confirmDialog(
      buildDeleteRecordPrompt({
        recordLabel: 'varroa check',
        hiveNumber: check.hives?.hive_number,
        date: check.check_date,
      }),
    )
    if (!ok) return

    const { error } = await supabase
      .from('varroa_checks')
      .delete()
      .eq('id', check.id)
      .eq('user_id', userId)

    if (error) {
      toast.error(error.message)
      return
    }
    await fetchVarroaChecks(userId, filters.ownershipFilter)
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

  const handleFeedingEdit = async (feeding: Feeding) => {
    // Opening any record form replaces whatever is in the panel, so this
    // needs the same guard the inspection edit path already has.
    if (!(await confirmDiscardOpenForm())) return

    setEditingFeeding(feeding)
    setFormType('feeding')
    setShowForm(true)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleFeedingDelete = async (feeding: Feeding) => {
    if (!userId) return
    const ok = await confirmDialog(
      buildDeleteRecordPrompt({
        recordLabel: 'feeding record',
        hiveNumber: feeding.hives?.hive_number,
        date: feeding.feed_date,
      }),
    )
    if (!ok) return

    const { error } = await supabase
      .from('feedings')
      .delete()
      .eq('id', feeding.id)
      .eq('user_id', userId)

    if (error) {
      toast.error(error.message)
      return
    }
    await fetchFeedings(userId, filters.ownershipFilter)
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

  const handleHarvestEdit = async (harvest: Harvest) => {
    // Opening any record form replaces whatever is in the panel, so this
    // needs the same guard the inspection edit path already has.
    if (!(await confirmDiscardOpenForm())) return

    setEditingHarvest(harvest)
    setFormType('harvest')
    setShowForm(true)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleHarvestDelete = async (harvest: Harvest) => {
    if (!userId) return
    const ok = await confirmDialog(
      buildDeleteRecordPrompt({
        recordLabel: 'harvest record',
        hiveNumber: harvest.hives?.hive_number,
        date: harvest.harvest_date,
      }),
    )
    if (!ok) return

    const { error } = await supabase
      .from('harvests')
      .delete()
      .eq('id', harvest.id)
      .eq('user_id', userId)

    if (error) {
      toast.error(error.message)
      return
    }
    await fetchHarvests(userId, filters.ownershipFilter)
  }

  // Archive handler
  const handleArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !archiveData.hive_id) return

    try {
      // Archiving cascades (disconnect scale, retire the active queen, fail linked tracker
      // distributions) atomically inside the archive_hive_cascade RPC.
      const { data: result, error } = await supabase.rpc('archive_hive_cascade', {
        p_hive_id: archiveData.hive_id,
        p_archive_reason_id: archiveData.archive_reason_id || null,
        p_archive_notes: archiveData.archive_notes || null,
      })

      if (error) throw error

      await Promise.all([
        fetchHives(userId),
        fetchArchiveRecords(userId)
      ])
      resetForm()

      const cascade = (result ?? {}) as {
        queen_retired?: boolean
        scale_disconnected?: boolean
        distributions_failed?: number
      }
      const extras: string[] = []
      if (cascade.scale_disconnected) extras.push('scale disconnected')
      if (cascade.queen_retired) extras.push('queen retired')
      if (cascade.distributions_failed && cascade.distributions_failed > 0) {
        extras.push(`${cascade.distributions_failed} tracker ${cascade.distributions_failed === 1 ? 'entry' : 'entries'} failed`)
      }
      toast.success(extras.length > 0 ? `Hive archived — ${extras.join(', ')}` : 'Hive archived successfully')
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

  /**
   * Cancel for the four forms that do not guard themselves. InspectionForm
   * guards its own Cancel because it must tear down its image and voice hooks
   * only after the user has agreed; guarding it here as well would ask twice.
   */
  const handleGuardedCancel = async () => {
    if (await confirmDiscardOpenForm()) resetForm()
  }

  // Inspections pass their whole photo set and the one tapped; everything else
  // passes a single URL and lands on the same viewer with navigation hidden.
  const handleGalleryClick = (urls: string[], startIndex: number) => {
    const normalised = urls
      .map((url) => normaliseStoragePublicUrl(url))
      .filter((url): url is string => Boolean(url))
    if (normalised.length === 0) return
    setModalImages(normalised)
    setModalStartIndex(Math.min(Math.max(startIndex, 0), normalised.length - 1))
    setImageModalOpen(true)
  }

  const handleImageClick = (url: string) => handleGalleryClick([url], 0)

  const handleHiveChange = async (hiveId: string) => {
    // Fetch weather data when hive changes (for inspection form)
    if (hiveId) {
      await handleFetchWeatherForHive(hiveId)
    }
  }

  if (loading) {
    // Top-aligned skeleton matching the loaded layout (header + filter bar +
    // record rows) so content lands where the placeholder was -- no layout jump.
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-28 !rounded-lg" />
        </div>
        <Skeleton className="h-12 w-full !rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} className="border border-border rounded-lg" />
          ))}
        </div>
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
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilterCount={activeFilterCount}
          onClearFilters={clearCollapsedFilters}
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
                onClick={async () => {
                  if (await confirmDiscardOpenForm()) resetForm()
                }}
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
                previousSuperFullnessByHive={previousSuperFullnessByHive}
                selectedApiaryId={filters.apiaryId}
                selectedHiveId={filters.hiveId}
                isEditing={Boolean(editingInspection?.id)}
                userHasActiveSubscription={userHasActiveSubscription}
                onSubmit={handleInspectionSubmit}
                onCancel={resetForm}
                onHiveChange={handleHiveChange}
                onImageClick={handleGalleryClick}
                fetchingWeather={fetchingWeather}
                onDirtyChange={handleFormDirtyChange}
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
                onCancel={handleGuardedCancel}
                onDirtyChange={handleFormDirtyChange}
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
                onCancel={handleGuardedCancel}
                onDirtyChange={handleFormDirtyChange}
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
                onCancel={handleGuardedCancel}
                onDirtyChange={handleFormDirtyChange}
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
                onCancel={handleGuardedCancel}
                onDirtyChange={handleFormDirtyChange}
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
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  Archiving also disconnects any scale on this hive, retires its active queen, and marks any linked queen-tracker distributions as failed — all using the reason above.
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
              description={
                searchTerm.trim()
                  ? `Nothing matches "${searchTerm.trim()}" in the records loaded. Try a shorter term, or widen the time period to load older records.`
                  : 'No records match your current filters. Try adjusting your filters or add a new record.'
              }
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
                      onImageClick={handleGalleryClick}
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
          images={modalImages}
          startIndex={modalStartIndex}
          onClose={() => setImageModalOpen(false)}
        />
      </div>
    </div>
  )
}
