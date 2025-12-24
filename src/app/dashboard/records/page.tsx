'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, hasActiveSubscription } from '@/lib/auth'
import { Home, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useToast } from '@/components/ui/Toast'
import { useRecordsData } from '@/hooks/useRecordsData'
import { useRecordFilters } from '@/hooks/useRecordFilters'
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
import { getDefaultArchiveFormData } from '@/types/records'

export default function RecordsPage() {
  const router = useRouter()
  const toast = useToast()
  const searchParams = useSearchParams()
  const formRef = useRef<HTMLDivElement>(null)

  // User state
  const [userId, setUserId] = useState<string | null>(null)
  const [userHasActiveSubscription, setUserHasActiveSubscription] = useState(false)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<RecordType>('inspection')
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null)
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
    treatmentProducts,
    archiveReasons,
    loading,
    isTeamMember,
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

  // Refetch inspections when ownership filter changes
  useEffect(() => {
    if (userId) {
      fetchInspections(userId, filters.ownershipFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.ownershipFilter, userId])

  // New record handler - defined before useEffect that uses it
  const handleNewRecord = useCallback((type: RecordType, presetHiveId?: string) => {
    const currentDate = new Date().toISOString().split('T')[0]
    const currentDateTime = new Date().toISOString().slice(0, 16)

    setFormType(type)
    setEditingInspection(null)
    setEditingTreatment(null)
    setEditingCheck(null)
    setEditingFeeding(null)
    setEditingHarvest(null)

    if (type === 'archive') {
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
        user_id: userId || ''
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

    if (hiveParam && !typeParam && hives.length > 0) {
      setHiveId(hiveParam)
      router.replace('/dashboard/records')
      return
    }

    if (hiveParam && typeParam && hives.length > 0) {
      setHiveId(hiveParam)
      const validTypes = ['inspection', 'varroa-check', 'varroa-treatment', 'feeding', 'harvest', 'archive']
      if (validTypes.includes(typeParam)) {
        const mappedType = typeParam === 'varroa-check' ? 'varroa_check' :
                          typeParam === 'varroa-treatment' ? 'varroa_treatment' :
                          typeParam as RecordType

        handleNewRecord(mappedType, hiveParam)
        router.replace('/dashboard/records')
      }
    }
  }, [searchParams, hives, router, userId, setHiveId, handleNewRecord])


  // Weather fetching
  const fetchWeatherData = async (eircode: string, isUkNi: boolean = false) => {
    try {
      const cleanedCode = eircode.trim().replace(/\s+/g, '').toUpperCase()
      const headers = { 'User-Agent': 'HiveCraic/1.0' }
      const country = isUkNi ? 'United Kingdom' : 'Ireland'
      const fallbackLat = isUkNi ? '54.5973' : '53.3498'
      const fallbackLon = isUkNi ? '-5.9301' : '-6.2603'

      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCode)},${country}&format=json&limit=1`,
        { headers }
      )
      const geocodeData = await geocodeResponse.json()

      if (!geocodeData || geocodeData.length === 0) {
        const altResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedCode + ' ' + country)}&format=json&limit=1`,
          { headers }
        )
        const altData = await altResponse.json()

        if (!altData || altData.length === 0) {
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
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe/Dublin`
      )
      const weatherData = await weatherResponse.json()

      if (!weatherData.current) return null

      const weatherCodeMap: { [key: number]: string } = {
        0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing Rime Fog', 51: 'Light Drizzle', 53: 'Moderate Drizzle',
        55: 'Dense Drizzle', 61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
        71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow', 80: 'Slight Rain Showers',
        81: 'Moderate Rain Showers', 82: 'Violent Rain Showers', 95: 'Thunderstorm', 96: 'Thunderstorm with Hail'
      }

      return {
        temp: Math.round(weatherData.current.temperature_2m),
        condition: weatherCodeMap[weatherData.current.weather_code] || 'Unknown',
        humidity: weatherData.current.relative_humidity_2m,
        wind_speed: Math.round(weatherData.current.wind_speed_10m)
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
        if (uploadedUrl) imageUrl = uploadedUrl
      }

      setFetchingWeather(true)
      let weatherData = null
      const selectedHive = hives.find(h => h.id === formData.hive_id)

      if (selectedHive?.apiary_id) {
        const { data: apiaryData } = await supabase
          .from('apiaries')
          .select('eircode, is_uk_ni')
          .eq('id', selectedHive.apiary_id)
          .single()

        if (apiaryData?.eircode) {
          weatherData = await fetchWeatherData(apiaryData.eircode, apiaryData.is_uk_ni || false)
        }
      }
      setFetchingWeather(false)

      const submitData = {
        ...formData,
        drones_present: formData.drones_present === -1 ? null : formData.drones_present,
        image_url: imageUrl,
        weather_temp: weatherData?.temp || null,
        weather_condition: weatherData?.condition || null,
        weather_humidity: weatherData?.humidity || null,
        weather_wind_speed: weatherData?.wind_speed || null
      }

      if (editingInspection) {
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
        temperature: treatment.temperature,
        weather_conditions: treatment.weather_conditions || '',
        notes: treatment.notes || ''
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

      await fetchVarroaTreatments(userId)
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

      if (!error) await fetchVarroaTreatments(userId)
    }
  }

  // Check handlers
  const handleCheckSubmit = async (check: VarroaCheck, imageFile: File | null) => {
    if (!userId) return

    try {
      let imageUrl = check.image_url
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile, 'varroa-checks')
        if (uploadedUrl) imageUrl = uploadedUrl
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

      await fetchVarroaChecks(userId)
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

      if (!error) await fetchVarroaChecks(userId)
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

      await fetchFeedings(userId)
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

      if (!error) await fetchFeedings(userId)
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

      await fetchHarvests(userId)
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

      if (!error) await fetchHarvests(userId)
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
    setEditingTreatment(null)
    setEditingCheck(null)
    setEditingFeeding(null)
    setEditingHarvest(null)
    setArchiveData(getDefaultArchiveFormData())
    setShowIpmTips(false)
  }

  const handleImageClick = (url: string) => {
    setModalImageUrl(url)
    setImageModalOpen(true)
  }

  const handleHiveChange = async (hiveId: string) => {
    // Fetch weather data when hive changes (for inspection form)
    if (hiveId) {
      await handleFetchWeatherForHive(hiveId)
    }
  }

  // Convert inspection to form data
  const getInspectionFormData = (): InspectionFormData | null => {
    if (!editingInspection) return null
    return {
      hive_id: editingInspection.hive_id,
      inspection_date: editingInspection.inspection_date,
      inspection_time: editingInspection.inspection_time || '',
      weight: editingInspection.weight,
      queen_seen: editingInspection.queen_seen || false,
      eggs_present: editingInspection.eggs_present || false,
      drones_present: editingInspection.drones_present ?? -1,
      drone_brood_present: editingInspection.drone_brood_present ?? null,
      brood_frames: editingInspection.brood_frames,
      right_sized_frames: editingInspection.right_sized_frames,
      brood_pattern_rating: editingInspection.brood_pattern_rating ?? 3,
      temperament_rating: editingInspection.temperament_rating ?? 3,
      population_strength: editingInspection.population_strength ?? 3,
      swarming_tendency: editingInspection.swarming_tendency ?? 3,
      calmness: editingInspection.calmness ?? 3,
      frames_foundation: editingInspection.frames_foundation ?? 0,
      frames_brood: editingInspection.frames_brood ?? 0,
      frames_drawn: editingInspection.frames_drawn ?? 0,
      honey_supers: editingInspection.honey_supers ?? 0,
      drone_frames: editingInspection.drone_frames ?? 0,
      store_frames: editingInspection.store_frames ?? 0,
      recapping: editingInspection.recapping ?? 0,
      vsh: editingInspection.vsh ?? 0,
      smr: editingInspection.smr ?? 0,
      afb_disease: editingInspection.afb_disease ?? 0,
      efb_disease: editingInspection.efb_disease ?? 0,
      chalkbrood_disease: editingInspection.chalkbrood_disease ?? 0,
      nosemosis_disease: editingInspection.nosemosis_disease ?? 0,
      dwv_disease: editingInspection.dwv_disease ?? 0,
      iapv_cbpv_disease: editingInspection.iapv_cbpv_disease ?? 0,
      queen_cups: editingInspection.queen_cups ?? false,
      queen_cups_number: editingInspection.queen_cups_number ?? 0,
      queen_cups_removed_all: editingInspection.queen_cups_removed_all ?? false,
      swarm_cells: editingInspection.swarm_cells ?? false,
      swarm_cells_number: editingInspection.swarm_cells_number ?? 0,
      swarm_cells_removed_all: editingInspection.swarm_cells_removed_all ?? false,
      supercedure_cells: editingInspection.supercedure_cells ?? false,
      supercedure_cells_number: editingInspection.supercedure_cells_number ?? 0,
      supercedure_cells_removed_all: editingInspection.supercedure_cells_removed_all ?? false,
      emergency_cells: editingInspection.emergency_cells ?? false,
      emergency_cells_number: editingInspection.emergency_cells_number ?? 0,
      emergency_cells_removed_all: editingInspection.emergency_cells_removed_all ?? false,
      removed_cells: editingInspection.removed_cells ?? 0,
      remaining_cells: editingInspection.remaining_cells ?? 0,
      queen_cells_notes: editingInspection.queen_cells_notes || '',
      notes: editingInspection.notes || '',
      image_url: editingInspection.image_url
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
              aria-label="Back to dashboard"
            >
              <Home size={24} />
            </button>
            <h1 className="text-2xl font-bold text-foreground">Records</h1>
          </div>
          <NewRecordDropdown onSelectType={handleNewRecord} />
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
          <div ref={formRef} className="mb-6 bg-surface rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {formType === 'inspection' && (editingInspection ? 'Edit Inspection' : 'New Inspection')}
                {formType === 'varroa_treatment' && (editingTreatment?.id ? 'Edit Treatment' : 'New Treatment')}
                {formType === 'varroa_check' && (editingCheck?.id ? 'Edit Varroa Check' : 'New Varroa Check')}
                {formType === 'feeding' && (editingFeeding?.id ? 'Edit Feeding' : 'New Feeding')}
                {formType === 'harvest' && (editingHarvest?.id ? 'Edit Harvest' : 'New Harvest')}
                {formType === 'archive' && 'Archive Hive'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            {formType === 'inspection' && (
              <InspectionForm
                initialData={getInspectionFormData()}
                hives={hives}
                apiaries={apiaries}
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
                treatmentProducts={treatmentProducts}
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
                checkMethodOptions={checkMethodOptions}
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
                onSubmit={handleHarvestSubmit}
                onCancel={resetForm}
              />
            )}

            {formType === 'archive' && (
              <form onSubmit={handleArchiveSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Hive</label>
                  <select
                    value={archiveData.hive_id}
                    onChange={(e) => setArchiveData({ ...archiveData, hive_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    required
                  >
                    <option value="">Select hive...</option>
                    {hives.filter(h => !h.archived_at).map(hive => (
                      <option key={hive.id} value={hive.id}>{hive.hive_number}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Reason</label>
                  <select
                    value={archiveData.archive_reason_id}
                    onChange={(e) => setArchiveData({ ...archiveData, archive_reason_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="">Select reason...</option>
                    {archiveReasons.map(reason => (
                      <option key={reason.id} value={reason.id}>{reason.value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
                  <textarea
                    value={archiveData.archive_notes}
                    onChange={(e) => setArchiveData({ ...archiveData, archive_notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    rows={3}
                    placeholder="Optional notes..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-surface-elevated transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Archive Hive
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Records List */}
        <div className="space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <p>No records found matching your filters.</p>
            </div>
          ) : (
            filteredRecords.map(record => {
              switch (record.record_type) {
                case 'inspection':
                  return (
                    <InspectionCard
                      key={`inspection-${record.id}`}
                      inspection={record}
                      userId={userId}
                      sharedHiveIds={sharedHiveIds}
                      userHasActiveSubscription={userHasActiveSubscription}
                      hives={hives}
                      onEdit={handleInspectionEdit}
                      onDelete={handleInspectionDelete}
                      onImageClick={handleImageClick}
                    />
                  )
                case 'varroa_check':
                  return (
                    <VarroaCheckCard
                      key={`check-${record.id}`}
                      check={record}
                      userId={userId}
                      sharedHiveIds={sharedHiveIds}
                      userHasActiveSubscription={userHasActiveSubscription}
                      onEdit={handleCheckEdit}
                      onDelete={handleCheckDelete}
                      onImageClick={handleImageClick}
                    />
                  )
                case 'varroa_treatment':
                  return (
                    <TreatmentCard
                      key={`treatment-${record.id}`}
                      treatment={record}
                      userId={userId}
                      sharedHiveIds={sharedHiveIds}
                      onEdit={handleTreatmentEdit}
                      onDelete={handleTreatmentDelete}
                    />
                  )
                case 'feeding':
                  return (
                    <FeedingCard
                      key={`feeding-${record.id}`}
                      feeding={record}
                      userId={userId}
                      sharedHiveIds={sharedHiveIds}
                      onEdit={handleFeedingEdit}
                      onDelete={handleFeedingDelete}
                    />
                  )
                case 'harvest':
                  return (
                    <HarvestCard
                      key={`harvest-${record.id}`}
                      harvest={record}
                      userId={userId}
                      sharedHiveIds={sharedHiveIds}
                      onEdit={handleHarvestEdit}
                      onDelete={handleHarvestDelete}
                    />
                  )
                case 'archive':
                  return (
                    <ArchiveCard
                      key={`archive-${record.id}`}
                      archiveRecord={record}
                    />
                  )
                default:
                  return null
              }
            })
          )}
        </div>

        {/* IPM Tips Modal */}
        {showIpmTips && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">IPM Tips for Varroa Control</h3>
                <button
                  onClick={() => setShowIpmTips(false)}
                  className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4 text-sm text-text-secondary">
                <p><strong>Integrated Pest Management (IPM)</strong> combines multiple strategies:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Drone Comb Trapping:</strong> Insert drone foundation frames, allow bees to build and queen to lay, then remove and freeze before drones emerge.</li>
                  <li><strong>Brood Breaks:</strong> Cage the queen or create splits to interrupt the mite reproduction cycle.</li>
                  <li><strong>Screened Bottom Boards:</strong> Allow mites to fall through and away from the colony.</li>
                  <li><strong>Powdered Sugar Dusting:</strong> Encourages grooming behavior.</li>
                  <li><strong>Regular Monitoring:</strong> Check mite levels every 4-6 weeks during the active season.</li>
                </ul>
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  Note: Always follow treatment product instructions and respect withdrawal periods before harvesting honey.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {imageModalOpen && modalImageUrl && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setImageModalOpen(false)}
          >
            <div className="relative max-w-4xl w-full max-h-[90vh]">
              <button
                onClick={() => setImageModalOpen(false)}
                className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
                aria-label="Close image"
              >
                <X size={24} />
              </button>
              <Image
                src={modalImageUrl}
                alt="Record image"
                width={1200}
                height={800}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
