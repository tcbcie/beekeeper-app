'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { getTeamAccess } from '@/lib/team-access'
import { isValidEircode, formatEircode } from '@/lib/eircode'
import { deleteUploadedImages } from '@/lib/upload-image'
import { Plus, X, MapPin, Loader2, Map, UserPlus, Camera, MapPinOff } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import ImageZoomModal from '@/components/ui/ImageZoomModal'
import ModalShell from '@/components/ui/ModalShell'
import FormActionRow from '@/components/ui/FormActionRow'
import FieldLabel from '@/components/ui/FieldLabel'
import SelectField from '@/components/ui/SelectField'
import TextInput from '@/components/ui/TextInput'
import TextAreaField from '@/components/ui/TextAreaField'
import CheckboxInput from '@/components/ui/CheckboxInput'
import Button from '@/components/ui/Button'
import Image from 'next/image'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Mapbox
const MapLocationPicker = dynamic(() => import('@/components/MapLocationPicker'), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-surface-secondary rounded-lg animate-pulse flex items-center justify-center text-text-tertiary">Loading map...</div>
})
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import { useImageUpload } from '@/hooks/useImageUpload'
import { usePersistentState } from '@/hooks/usePersistentState'
import { useListPositionMemory } from '@/hooks/useListPositionMemory'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Apiary, ApiaryFormData, UserOption } from '@/types/apiary'
import ApiaryCard from '@/components/apiaries/ApiaryCard'
import { fetchElevation } from '@/lib/elevation'
import { toIrishGridRef } from '@/lib/irish-grid'
import { normaliseStoragePublicUrl } from '@/lib/storage-url'

/**
 * Outcome of a coordinate lookup. The failure reason is carried so the UI can tell a deployment
 * problem ('not-configured', 'denied') apart from a postcode that genuinely cannot be found.
 */
type GeocodeOutcome =
  | { ok: true; lat: string; lon: string }
  | { ok: false; reason: 'not-configured' | 'denied' | 'not-found'; detail?: string }

export default function ApiariesPage() {
  const toast = useToast()
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingApiary, setEditingApiary] = useState<Apiary | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const [formData, setFormData] = useState<ApiaryFormData>({
    name: '',
    location: '',
    city: '',
    eircode: '',
    latitude: '',
    longitude: '',
    elevation: '',
    grid_reference: '',
    notes: '',
    is_uk_ni: false,
    share_location: false,
    is_conservation_area: false,
    ca_radius_km: '1',
    is_mating_apiary: false,
  })
  const [geocoding, setGeocoding] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  // Named confirmDialog so it never shadows the native window.confirm() used elsewhere on this page.
  const confirmDialog = useConfirm()

  // Transfer ownership state
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferTargetUser, setTransferTargetUser] = useState<string>('')
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [transferring, setTransferring] = useState(false)

  const [isTeamMember, setIsTeamMember] = useState(false)
  const [categoryFilter, setCategoryFilter] = usePersistentState<'all' | 'own' | 'shared' | 'mating'>(
    'apiaries:category',
    'all',
    (v) => v === 'all' || v === 'own' || v === 'shared' || v === 'mating'
  )

  // Image zoom modal state
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null)

  const handleImageClick = (url: string) => {
    setModalImageUrl(normaliseStoragePublicUrl(url))
    setImageModalOpen(true)
  }

  // Image upload
  const {
    imageFile,
    imagePreview,
    uploading,
    handleImageChange,
    handleRemoveImage,
    uploadImage,
    reset: resetImage,
    setPreviewFromUrl
  } = useImageUpload({
    bucket: 'apiary-images',
    folder: userId || 'unknown',
    onError: (message) => toast.error(message)
  })

  /**
   * Geocode an Eircode/postcode to coordinates.
   *
   * Returns *why* it failed, not just null: a missing API key and a genuinely unknown postcode need
   * very different messages, and previously both surfaced as "could not find this location", which
   * made a deployment configuration problem look like bad user input.
   *
   * Note there is deliberately no keyless fallback for Irish Eircodes. Nominatim does not index
   * them and answers confidently wrong — "H91 ADP9" (Spiddal, Co. Galway) resolves to the National
   * Gallery in Dublin, ~200 km away. Guessing is worse than failing here, because the result feeds
   * elevation, the Irish Grid square and inspection weather.
   */
  const geocodeAddress = async (
    eircode: string,
    city: string,
    isUkNi: boolean
  ): Promise<GeocodeOutcome> => {
    if (!eircode && !city) return { ok: false, reason: 'not-found' }

    setGeocoding(true)
    try {
      // UK/NI: Use Postcodes.io (free, no API key, very accurate)
      if (isUkNi && eircode) {
        const cleanPostcode = encodeURIComponent(eircode.trim().replace(/\s+/g, ' '))
        const response = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`)
        const data = await response.json()

        if (data.status === 200 && data.result) {
          return { ok: true, lat: String(data.result.latitude), lon: String(data.result.longitude) }
        }
      }

      // Ireland: geocode via our own server route rather than calling Google from the browser.
      // The Geocoding web service refuses referrer-restricted keys, which is how a NEXT_PUBLIC_ key
      // would normally be locked down, and this keeps the key out of the client bundle entirely.
      const searchAddress = eircode ? formatEircode(eircode) : city
      const { data: { session } } = await supabase.auth.getSession()

      if (session && searchAddress) {
        const response = await fetch(
          `/api/geocode?address=${encodeURIComponent(searchAddress)}&country=${isUkNi ? 'GB' : 'IE'}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        )
        const data = await response.json()

        if (data?.ok && data.lat && data.lon) {
          return { ok: true, lat: String(data.lat), lon: String(data.lon) }
        }
        // Configuration problems are reported as-is; only fall through to the city-level lookup
        // when the address genuinely could not be found.
        if (data?.reason === 'denied' || data?.reason === 'not-configured') {
          if (data.detail) console.error('Geocoding unavailable:', data.reason, data.detail)
          return { ok: false, reason: data.reason, detail: data.detail ?? undefined }
        }
      }

      if (!isUkNi && !city) {
        // An Irish Eircode is the only thing to go on and it did not resolve — nothing safe left
        // to try, since Nominatim answers confidently wrong for Eircodes.
        return { ok: false, reason: 'not-found' }
      }

      // Fallback: Nominatim with city only (Nominatim cannot handle Irish eircodes)
      const country = isUkNi ? 'United Kingdom' : 'Ireland'
      const searchQuery = city
        ? `${city}, ${country}`
        : isUkNi
          ? `${eircode}, ${country}`
          : null
      if (!searchQuery) return { ok: false, reason: 'not-found' }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&countrycodes=${isUkNi ? 'gb' : 'ie'}`,
        { headers: { 'User-Agent': 'HiveCraic/1.0' } }
      )
      const data = await response.json()

      if (data && data.length > 0) {
        return { ok: true, lat: data[0].lat, lon: data[0].lon }
      }
      return { ok: false, reason: 'not-found' }
    } catch {
      return { ok: false, reason: 'not-found' }
    } finally {
      setGeocoding(false)
    }
  }

  // Lookup coordinates when eircode or city changes
  const handleLookupCoordinates = async () => {
    const result = await geocodeAddress(formData.eircode, formData.city, formData.is_uk_ni)
    if (result.ok) {
      setFormData(prev => ({
        ...prev,
        latitude: result.lat,
        longitude: result.lon
      }))
      lookupElevation(result.lat, result.lon)
      lookupGridReference(result.lat, result.lon)
      // Show warning that coordinates are approximate
      toast.info('Coordinates are approximate. Use "Pick on Map" to verify exact location.')
      return
    }

    // Opening the picker is more useful than asking for raw latitude/longitude by hand.
    const detail = result.detail ? ` (${result.detail})` : ''
    toast.warning(
      result.reason === 'not-configured'
        ? `Eircode lookup is not configured on this deployment${detail}. Drop a pin on the map instead.`
        : result.reason === 'denied'
          ? `The map service refused the coordinate lookup${detail}. Drop a pin on the map instead.`
          : 'Could not find coordinates for that Eircode. Drop a pin on the map instead.'
    )
    setShowMapPicker(true)
  }

  // Handle location change from map picker
  const handleMapLocationChange = (lat: string, lng: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }))
    lookupElevation(lat, lng)
    lookupGridReference(lat, lng)
  }

  // Handle city change from map reverse geocoding
  const handleMapCityChange = (city: string) => {
    setFormData(prev => ({
      ...prev,
      city: city
    }))
  }

  // Look up Irish Grid reference for given coordinates and update form
  const lookupGridReference = (lat: string, lng: string) => {
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (isNaN(latNum) || isNaN(lngNum)) return
    const ref = toIrishGridRef(latNum, lngNum)
    setFormData(prev => ({ ...prev, grid_reference: ref || '' }))
  }

  // Look up elevation for given coordinates and update form
  const lookupElevation = async (lat: string, lng: string) => {
    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)
    if (isNaN(latNum) || isNaN(lngNum)) return
    const elev = await fetchElevation(latNum, lngNum)
    if (elev !== null) {
      setFormData(prev => ({ ...prev, elevation: String(Math.round(elev)) }))
    }
  }

  // Backfill elevation for existing apiaries missing it (runs once on load)
  const backfillElevations = async (apiariesMissing: Apiary[]) => {
    for (const a of apiariesMissing) {
      const elev = await fetchElevation(Number(a.latitude), Number(a.longitude))
      if (elev !== null) {
        const rounded = Math.round(elev)
        await supabase.from('apiaries').update({ elevation: rounded }).eq('id', a.id)
        setApiaries(prev => prev.map(p => p.id === a.id ? { ...p, elevation: rounded } : p))
      }
    }
  }

  // Backfill grid references for existing apiaries missing them (runs once on load)
  const backfillGridReferences = async (apiariesMissing: Apiary[], currentUserId: string) => {
    for (const a of apiariesMissing) {
      const ref = toIrishGridRef(Number(a.latitude), Number(a.longitude))
      if (ref) {
        await supabase.from('apiaries').update({ grid_reference: ref }).eq('id', a.id).eq('user_id', currentUserId)
        setApiaries(prev => prev.map(p => p.id === a.id ? { ...p, grid_reference: ref } : p))
      }
    }
  }

  const fetchApiaries = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    // One memoised round trip for team membership + shared apiary access
    const { isTeamMember: hasTeams, sharedApiaryIds } = await getTeamAccess(currentUserId)
    setIsTeamMember(hasTeams)

    // Fetch own + shared apiaries
    let query = supabase.from('apiaries').select('*')
    if (sharedApiaryIds.length > 0) {
      query = query.or(`user_id.eq.${currentUserId},id.in.(${sharedApiaryIds.join(',')})`)
    } else {
      query = query.eq('user_id', currentUserId)
    }
    const { data } = await query.order('name')

    if (data) {
      // Look up team names for shared apiaries
      const teamNameMap: Record<string, string> = {}
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
                teamNameMap[typedData.apiary_id] = teamName
              }
            }
          })
        }
      }

      // Enrich with hive counts and last inspection dates (active hives only)
      const apiaryIds = data.map(a => a.id)
      const { data: activeHives } = await supabase
        .from('hives')
        .select('id, apiary_id')
        .in('apiary_id', apiaryIds)
        .is('archived_at', null)

      const hiveCounts: Record<string, number> = {}
      const activeHiveIds: string[] = []
      const hiveToApiary: Record<string, string> = {}
      ;(activeHives || []).forEach(h => {
        hiveCounts[h.apiary_id] = (hiveCounts[h.apiary_id] || 0) + 1
        activeHiveIds.push(h.id)
        hiveToApiary[h.id] = h.apiary_id
      })

      // Only fetch inspections for active hives
      const lastInspections: Record<string, string> = {}
      if (activeHiveIds.length > 0) {
        const { data: inspData } = await supabase
          .from('inspections')
          .select('hive_id, inspection_date')
          .in('hive_id', activeHiveIds)
          .order('inspection_date', { ascending: false })

        ;((inspData || []) as Array<{ hive_id: string; inspection_date: string }>).forEach(i => {
          const apiaryId = hiveToApiary[i.hive_id]
          if (apiaryId && !lastInspections[apiaryId]) {
            lastInspections[apiaryId] = i.inspection_date
          }
        })
      }

      const enriched = data.map(a => ({
        ...a,
        image_url: normaliseStoragePublicUrl(a.image_url),
        hive_count: hiveCounts[a.id] || 0,
        last_inspection_date: lastInspections[a.id] || undefined,
        is_shared: a.user_id !== currentUserId,
        team_name: teamNameMap[a.id] || null,
      }))
      setApiaries(enriched)

      // Backfill only owned apiaries — never attempt writes to shared apiaries
      const owned = enriched.filter(a => !a.is_shared)

      // Backfill elevation for apiaries that have coordinates but no elevation
      const missing = owned.filter(a => a.latitude && a.longitude && a.elevation == null)
      if (missing.length > 0) {
        backfillElevations(missing)
      }

      // Backfill grid references for Irish apiaries that have coordinates but no grid_reference
      // Rough Ireland bounding box to avoid perpetual backfill attempts for non-Irish apiaries
      const missingGrid = owned.filter(a =>
        a.latitude && a.longitude && !a.grid_reference &&
        Number(a.latitude) >= 51 && Number(a.latitude) <= 56 &&
        Number(a.longitude) >= -11 && Number(a.longitude) <= -5.5
      )
      if (missingGrid.length > 0) {
        backfillGridReferences(missingGrid, currentUserId)
      }
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
      fetchApiaries(id)
    }
    initUser()
  }, [router, fetchApiaries])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    // Photos uploaded during this attempt. If the save then fails they belong to
    // no row and nothing else will ever collect them, so they are removed. Once
    // the row is saved it owns them and the cleanup must stop.
    const uploadedUrls: string[] = []
    let recordSaved = false

    // Only validate Irish Eircodes; UK/NI postcodes use a different format. A *missing* postcode
    // is not rejected here — it is folded into the single address check below, so the user is
    // never asked two consecutive questions about the same incomplete address.
    const eircodeProvided = Boolean(formData.eircode && formData.eircode.trim() !== '')
    if (eircodeProvided && !formData.is_uk_ni && !isValidEircode(formData.eircode)) {
      toast.error('Enter a valid Eircode (e.g. D02 XY45), tick "UK/NI Postcode", or leave it blank.')
      return
    }

    try {
      // Coordinates drive the elevation and Irish Grid square, both of which are reported on the
      // NIHBS return for a mating site. Resolve anything missing here rather than silently saving
      // an apiary with no location data (the existing backfill only repairs rows that already
      // have coordinates, so a postcode-only apiary would never be picked up).
      //
      // Deliberately resolved BEFORE the image upload: this step can abort the save when the user
      // opts to drop a pin instead, and an upload done first would leave an orphaned file in
      // storage on every attempt.
      let latitude = formData.latitude
      let longitude = formData.longitude
      let elevation = formData.elevation
      let gridReference = formData.grid_reference

      let geocodeAttempted = false
      if ((!latitude || !longitude) && (formData.eircode || formData.city)) {
        geocodeAttempted = true
        const result = await geocodeAddress(formData.eircode, formData.city, formData.is_uk_ni)
        if (result.ok) {
          latitude = result.lat
          longitude = result.lon
        }
      }

      const latNum = parseFloat(latitude)
      const lngNum = parseFloat(longitude)
      const hasCoordinates = !Number.isNaN(latNum) && !Number.isNaN(lngNum)

      if (hasCoordinates) {
        if (!gridReference) gridReference = toIrishGridRef(latNum, lngNum) || ''
        if (!elevation) {
          const elev = await fetchElevation(latNum, lngNum)
          if (elev !== null) elevation = String(Math.round(elev))
        }
      }

      // A single prompt covering everything missing from this apiary's address. Eircode geocoding
      // is approximate and does not resolve every postcode, so where the position is unknown the
      // map picker is offered as the reliable alternative. The wording reflects what is actually
      // missing, and whether a lookup was attempted at all.
      if (!hasCoordinates || !eircodeProvided) {
        const issues: string[] = []
        if (!hasCoordinates) {
          issues.push(geocodeAttempted
            ? 'Coordinates could not be determined from the Eircode, so the elevation and Irish Grid square will stay blank.'
            : 'No coordinates have been set, so the elevation and Irish Grid square will stay blank.')
          if (formData.is_mating_apiary) {
            issues.push('Both are reported for a mating site on the NIHBS return.')
          }
        }
        if (!eircodeProvided) {
          issues.push('Without an Eircode or postcode, weather is not recorded automatically on inspections here.')
        }

        const proceed = await confirmDialog({
          title: hasCoordinates ? 'No Eircode or postcode' : 'No location set for this apiary',
          message: `${issues.join(' ')} ${hasCoordinates ? 'Save anyway?' : 'Set the location on the map instead?'}`,
          confirmLabel: hasCoordinates ? 'Save anyway' : 'Save without a location',
          cancelLabel: hasCoordinates ? 'Go back' : 'Set on map',
          variant: 'warning',
        })

        if (!proceed) {
          // Only the missing-position case has a remedy to open; otherwise just return to the form.
          if (!hasCoordinates) setShowMapPicker(true)
          return
        }
      }

      // Upload image if a new file was selected.
      //
      // A failed upload aborts the save. It used to fall through and keep the old
      // URL, so the apiary saved successfully with the previous photo still on it
      // and the beekeeper had no way to tell their new one had not been stored.
      let imageUrl: string | null = editingApiary?.image_url || null
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (!uploadedUrl) return  // uploadImage has already reported why
        imageUrl = uploadedUrl
        uploadedUrls.push(uploadedUrl)
      } else if (!imagePreview) {
        // Image was removed. The old object is queued for deletion by the
        // storage_cleanup_queue trigger, so nothing to do here.
        imageUrl = null
      }

      const dataToSave = {
        name: formData.name,
        location: formData.location || null,
        city: formData.city || null,
        eircode: formData.eircode || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        elevation: elevation ? parseFloat(elevation) : null,
        grid_reference: gridReference || null,
        notes: formData.notes || null,
        is_uk_ni: formData.is_uk_ni,
        share_location: formData.share_location,
        is_mating_apiary: formData.is_mating_apiary,
        image_url: imageUrl,
      }

      let apiaryId: string
      if (editingApiary) {
        const { error } = await supabase
          .from('apiaries')
          .update(dataToSave)
          .eq('id', editingApiary.id)
          .eq('user_id', userId)

        if (error) throw error
        recordSaved = true
        apiaryId = editingApiary.id
      } else {
        // Generate ID client-side to avoid INSERT...RETURNING which triggers
        // the SELECT RLS policy (can_access_apiary can't see the uncommitted row)
        const newId = crypto.randomUUID()
        const { error } = await supabase
          .from('apiaries')
          .insert([{ id: newId, ...dataToSave, user_id: userId }])

        if (error) throw error
        recordSaved = true
        apiaryId = newId
      }

      // Handle conservation area record
      const lat = formData.latitude ? parseFloat(formData.latitude) : null
      const lng = formData.longitude ? parseFloat(formData.longitude) : null
      if (formData.is_conservation_area && formData.share_location && lat && lng) {
        const { error: caError } = await supabase
          .from('conservation_areas')
          .upsert({
            apiary_id: apiaryId,
            user_id: userId,
            name: formData.name,
            type: 'apiary',
            latitude: lat,
            longitude: lng,
            radius_km: parseFloat(formData.ca_radius_km) || 1,
            country: formData.is_uk_ni ? 'NI' : 'IE',
            is_active: true,
          }, { onConflict: 'apiary_id' })
        if (caError) throw caError
      } else {
        // Remove CA record if unchecked or location sharing disabled
        const { error: caDelError } = await supabase
          .from('conservation_areas')
          .delete()
          .eq('apiary_id', apiaryId)
          .eq('user_id', userId!)
        if (caDelError) throw caDelError
      }

      fetchApiaries()
      resetForm()
    } catch (error) {
      // Only when the row never landed - past that point the saved apiary
      // references this photo and deleting it would break a real record.
      if (!recordSaved) await deleteUploadedImages(uploadedUrls)
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      toast.error(errorMessage)
    }
  }

  const handleEdit = async (apiary: Apiary) => {
    setEditingApiary(apiary)

    // Check if this apiary has a conservation area record
    let isCA = false
    let caRadius = '1'
    const { data: caData } = await supabase
      .from('conservation_areas')
      .select('id, radius_km')
      .eq('apiary_id', apiary.id)
      .maybeSingle()
    if (caData) {
      isCA = true
      caRadius = caData.radius_km?.toString() || '1'
    }

    setFormData({
      name: apiary.name,
      location: apiary.location || '',
      city: apiary.city || '',
      eircode: apiary.eircode || '',
      latitude: apiary.latitude?.toString() || '',
      longitude: apiary.longitude?.toString() || '',
      elevation: apiary.elevation?.toString() || '',
      grid_reference: apiary.grid_reference || '',
      notes: apiary.notes || '',
      is_uk_ni: apiary.is_uk_ni || false,
      share_location: apiary.share_location || false,
      is_conservation_area: isCA,
      ca_radius_km: caRadius,
      is_mating_apiary: apiary.is_mating_apiary || false,
    })
    // Load existing image
    setPreviewFromUrl(normaliseStoragePublicUrl(apiary.image_url))
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    if (confirm('Delete this apiary? Associated hives will lose their location.')) {
      const { error } = await supabase
        .from('apiaries')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (!error) fetchApiaries()
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingApiary(null)
    setShowMapPicker(false)
    resetImage()
    setFormData({
      name: '',
      location: '',
      city: '',
      eircode: '',
      latitude: '',
      longitude: '',
      elevation: '',
      grid_reference: '',
      notes: '',
      is_uk_ni: false,
      share_location: false,
      is_conservation_area: false,
      ca_radius_km: '1',
      is_mating_apiary: false,
    })
  }

  // Fetch users for transfer dropdown
  const fetchUsersForTransfer = async () => {
    setLoadingUsers(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/users/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Filter out current user
        setAvailableUsers(data.users.filter((u: UserOption) => u.id !== userId))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }

  // Handle opening transfer modal
  const openTransferModal = () => {
    setShowTransferModal(true)
    setTransferTargetUser('')
    fetchUsersForTransfer()
  }

  // Handle transfer ownership
  const handleTransferOwnership = async () => {
    if (!editingApiary || !transferTargetUser) return

    const selectedUser = availableUsers.find(u => u.id === transferTargetUser)
    const userName = selectedUser?.first_name && selectedUser?.last_name
      ? `${selectedUser.first_name} ${selectedUser.last_name}`
      : selectedUser?.email || 'this user'

    if (!confirm(`Are you sure you want to transfer "${editingApiary.name}" to ${userName}?\n\nYou will lose access to this apiary and all its hives.`)) {
      return
    }

    setTransferring(true)
    try {
      const { error } = await supabase.rpc('transfer_apiary_ownership', {
        p_apiary_id: editingApiary.id,
        p_new_owner_id: transferTargetUser
      })

      if (error) throw error

      toast.success(`Apiary transferred to ${userName}`)
      setShowTransferModal(false)
      resetForm()
      fetchApiaries()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transfer failed'
      toast.error(errorMessage)
    } finally {
      setTransferring(false)
    }
  }

  // Reset filter if "shared" is selected but user is no longer a team member
  if (categoryFilter === 'shared' && !isTeamMember) {
    setCategoryFilter('all')
  }

  // Client-side category filtering
  const filteredApiaries = useMemo(() => apiaries.filter(a => {
    if (categoryFilter === 'own') return !a.is_shared && !a.is_mating_apiary
    if (categoryFilter === 'shared') return a.is_shared
    if (categoryFilter === 'mating') return a.is_mating_apiary && !a.is_shared
    return true // 'all'
  }), [apiaries, categoryFilter])

  // Puts the user back on the apiary they just visited instead of at the top of the list.
  const { remember: rememberApiaryPosition, highlightedId } = useListPositionMemory({
    scope: 'apiaries',
    items: filteredApiaries,
    ready: !loading,
    elementIdPrefix: 'apiary-card-',
  })

  if (loading) return <LoadingSpinner text="Loading apiaries..." />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Apiaries 📍</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="fj-btn fj-btn-success min-h-[48px]"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Apiary'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
          <h3 className="text-xl font-semibold mb-4 text-foreground">
            {editingApiary ? 'Edit Apiary' : 'Add New Apiary'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <FieldLabel>Apiary Name *</FieldLabel>
              <TextInput
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Home Garden, North Field"
                className="rounded-md"
                required
              />
            </div>

            {/* Apiary Image */}
            <div>
              <FieldLabel className="mb-2">Apiary Photo</FieldLabel>
              {imagePreview ? (
                <div className="relative max-w-xs group">
                  <div className="relative w-full h-48">
                    <Image
                      src={imagePreview}
                      alt="Apiary preview"
                      fill
                      className="object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(imagePreview)}
                      title="Click to enlarge"
                      unoptimized
                    />
                  </div>
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-lg pointer-events-none"
                  >
                    <Camera size={24} className="text-white" />
                  </div>
                  <Button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 fj-icon-btn fj-icon-btn-danger fj-icon-btn-xs bg-surface/90 dark:bg-surface-elevated/90 z-10"
                    title="Remove image"
                  >
                    <X size={16} />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full max-w-xs h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent-primary hover:bg-surface-elevated/70 transition-colors">
                  <div className="flex flex-col items-center justify-center py-4">
                    <Camera size={24} className="text-text-tertiary mb-2" />
                    <p className="text-sm text-text-tertiary">Click to upload photo</p>
                    <p className="text-sm text-text-tertiary mt-1">PNG, JPG up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
              {uploading && (
                <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary">
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Location</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., North Field, Back Garden"
                  className="rounded-md"
                />
              </div>

              <div>
                <FieldLabel>City</FieldLabel>
                <TextInput
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="e.g., Dublin, Cork"
                  className="rounded-md"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Eircode (Postcode)</FieldLabel>
              <TextInput
                type="text"
                value={formData.eircode}
                onChange={(e) => setFormData({...formData, eircode: e.target.value.toUpperCase()})}
                placeholder={formData.is_uk_ni ? "e.g., BT1 5GS" : "e.g., D02 XY45"}
                className="rounded-md uppercase"
              />
              <div className="flex items-center gap-2 mt-2">
                <CheckboxInput
                  id="is_uk_ni"
                  checked={formData.is_uk_ni}
                  onChange={(e) => setFormData({...formData, is_uk_ni: e.target.checked})}
                />
                <label htmlFor="is_uk_ni" className="text-sm text-text-secondary cursor-pointer">
                  UK/NI Postcode
                </label>
              </div>
              <p className="text-sm text-text-tertiary mt-1">Optional - Used for automatic weather data on inspections</p>
            </div>

            {/* GPS Coordinates */}
            <div className="field-journal-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <MapPin size={16} />
                  GPS Coordinates
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setShowMapPicker(!showMapPicker)}
                    className="fj-btn fj-btn-blue fj-btn-sm"
                  >
                    <Map size={14} />
                    {showMapPicker ? 'Hide Map' : 'Pick on Map'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleLookupCoordinates}
                    disabled={geocoding || (!formData.city && !formData.eircode)}
                    className="fj-btn fj-btn-success fj-btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {geocoding ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                    Get Coordinates
                  </Button>
                </div>
              </div>

              {/* Map Picker */}
              {showMapPicker && (
                <div className="mb-4">
                  <MapLocationPicker
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onLocationChange={handleMapLocationChange}
                    onCityChange={handleMapCityChange}
                    onClose={() => setShowMapPicker(false)}
                    existingApiaries={apiaries}
                    editingApiaryId={editingApiary?.id}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-text-tertiary mb-1">Latitude</label>
                  <TextInput
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => {
                      const val = e.target.value
                      setFormData({...formData, latitude: val})
                      lookupGridReference(val, formData.longitude)
                    }}
                    placeholder="e.g., 53.2744"
                    className="rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-tertiary mb-1">Longitude</label>
                  <TextInput
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => {
                      const val = e.target.value
                      setFormData({...formData, longitude: val})
                      lookupGridReference(formData.latitude, val)
                    }}
                    placeholder="e.g., -9.0490"
                    className="rounded-md text-sm"
                  />
                </div>
              </div>
              {formData.elevation && (
                <div className="mt-3">
                  <label className="block text-sm text-text-tertiary mb-1">Elevation (metres above sea level)</label>
                  <TextInput
                    type="text"
                    value={`${formData.elevation} m`}
                    readOnly
                    className="w-32 rounded-md text-sm cursor-default"
                  />
                </div>
              )}
              {formData.grid_reference && (
                <div className="mt-3">
                  <label className="block text-sm text-text-tertiary mb-1">Irish Grid (10km square)</label>
                  <TextInput
                    type="text"
                    value={formData.grid_reference}
                    readOnly
                    className="w-32 rounded-md text-sm cursor-default"
                  />
                </div>
              )}
              {(!formData.latitude || !formData.longitude) && !showMapPicker && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                  <p>
                    No coordinates set, so elevation and the Irish Grid square cannot be worked out.
                    {formData.is_mating_apiary
                      ? ' Both appear on the NIHBS return for a mating site, so they would be submitted blank.'
                      : ''}
                  </p>
                  <p className="mt-1">
                    Eircode lookup is approximate and does not resolve every postcode, so dropping a pin is the reliable way to set this.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="fj-btn fj-btn-blue fj-btn-sm mt-2"
                  >
                    <Map size={14} />
                    Pick on Map
                  </Button>
                </div>
              )}
              <p className="text-sm text-text-tertiary mt-2">Used for GDD calculations, weather data on inspections, and identifying potential drone congregation areas. Use &quot;Pick on Map&quot; for exact positioning, or &quot;Get Coordinates&quot; for approximate location from Eircode/postcode.</p>
            </div>

            <div>
              <FieldLabel>Notes</FieldLabel>
              <TextAreaField
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Access instructions, nearby forage, etc..."
                className="rounded-md"
              />
            </div>

            {/* Mating Apiary Option */}
            <div className="fj-panel-purple p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                  <CheckboxInput
                    checked={formData.is_mating_apiary}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setFormData({
                      ...formData,
                      is_mating_apiary: checked,
                      // Auto-uncheck sharing options when mating is enabled
                      share_location: checked ? false : formData.share_location,
                      is_conservation_area: checked ? false : formData.is_conservation_area,
                    })
                  }}
                    tone="purple"
                    className="mt-1"
                  />
                <div>
                  <span className="text-sm font-medium text-text-primary">Mating Location (Apiary)</span>
                  <p className="text-sm text-text-tertiary mt-1">
                    Mark this as a mating location used for queen mating that you don&apos;t actively manage.
                  </p>
                </div>
              </label>
            </div>

            {/* Share Location Option — hidden for mating locations */}
            {!formData.is_mating_apiary && (
            <div className="fj-panel-blue p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <CheckboxInput
                    checked={formData.share_location}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setFormData({
                        ...formData,
                        share_location: checked,
                        // Auto-uncheck CA if sharing is disabled
                        is_conservation_area: checked ? formData.is_conservation_area : false,
                      })
                    }}
                    className="mt-1"
                  />
                  <div>
                    <span className="text-sm font-medium text-text-primary">Share apiary location publicly</span>
                    <p className="text-sm text-text-tertiary mt-1">
                      Your exact location will be <strong>obfuscated to a ~5km radius</strong> to protect your privacy.
                      This helps beekeepers identify drone congregation areas and plan apiary placement.
                    </p>
                  </div>
                </label>
            </div>
            )}

            {/* Conservation Area Option — only when sharing is enabled */}
            {formData.share_location && (
              <div className="fj-panel-teal p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <CheckboxInput
                    checked={formData.is_conservation_area}
                    onChange={(e) => setFormData({...formData, is_conservation_area: e.target.checked})}
                    tone="teal"
                    className="mt-1"
                  />
                  <div>
                    <span className="text-sm font-medium text-text-primary">Declare as NIHBS Conservation Area</span>
                    <p className="text-sm text-text-tertiary mt-1">
                      Marks this apiary as a designated AMM (Apis mellifera mellifera) conservation area on the community map.
                    </p>
                  </div>
                </label>
                {formData.is_conservation_area && (
                  <div className="mt-3 ml-7">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Conservation area radius (km)</label>
                      <TextInput
                        type="number"
                        min="0.5"
                      max="50"
                        step="0.5"
                        value={formData.ca_radius_km}
                        onChange={(e) => setFormData({...formData, ca_radius_km: e.target.value})}
                        tone="teal"
                        className="w-32 rounded-md text-sm border-teal-300 dark:border-teal-700"
                      />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button type="submit" className="fj-btn fj-btn-success min-h-[48px] px-6">
                {editingApiary ? 'Update' : 'Add'} Apiary
              </Button>
              <Button type="button" onClick={resetForm} className="fj-btn fj-btn-neutral min-h-[48px] px-6">
                Cancel
              </Button>
              {editingApiary && !formData.is_mating_apiary && (
                <Button
                  type="button"
                  onClick={openTransferModal}
                  className="fj-btn fj-btn-purple min-h-[48px] px-6"
                >
                  <UserPlus size={16} />
                  Transfer Ownership
                </Button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && editingApiary && (
        <ModalShell
          title="Transfer Apiary Ownership"
          titleClassName="text-xl"
          onClose={() => setShowTransferModal(false)}
          bodyClassName="p-6"
          footer={(
            <FormActionRow className="justify-end">
              <Button
                onClick={() => setShowTransferModal(false)}
                className="fj-btn fj-btn-neutral"
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransferOwnership}
                disabled={!transferTargetUser || transferring}
                className="fj-btn fj-btn-blue disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferring ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Transfer
                  </>
                )}
              </Button>
            </FormActionRow>
          )}
        >
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-foreground dark:text-amber-200">
              <strong>Warning:</strong> Transferring &quot;{editingApiary.name}&quot; will give the new owner full control. You will lose access to this apiary and all its hives.
            </p>
          </div>

          <div>
            <FieldLabel className="mb-2">Select New Owner</FieldLabel>
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-text-tertiary">
                <Loader2 size={16} className="animate-spin" />
                Loading users...
              </div>
            ) : (
              <SelectField
                value={transferTargetUser}
                onChange={(e) => setTransferTargetUser(e.target.value)}
              >
                <option value="">Select a user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name} (${user.email})`
                      : user.email}
                  </option>
                ))}
              </SelectField>
            )}
          </div>
        </ModalShell>
      )}

      {/* Category filter and summary stats */}
      {apiaries.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SelectField
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
            className="fj-control-inline rounded-md text-sm w-full sm:w-auto"
          >
            <option value="all">All Apiaries</option>
            <option value="own">My Apiaries</option>
            {isTeamMember && <option value="shared">Shared Apiaries</option>}
            <option value="mating">Mating Location (Apiary)</option>
          </SelectField>
          <p className="text-sm text-text-secondary">
            {filteredApiaries.length} Apiar{filteredApiaries.length !== 1 ? 'ies' : 'y'} | {filteredApiaries.reduce((sum, a) => sum + (a.hive_count || 0), 0)} Total Hives
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredApiaries.map((apiary: Apiary) => (
          <ApiaryCard
            key={apiary.id}
            apiary={apiary}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onImageClick={handleImageClick}
            isReadOnly={apiary.is_shared === true}
            highlighted={highlightedId === apiary.id}
            onOpen={rememberApiaryPosition}
          />
        ))}
      </div>

      {filteredApiaries.length === 0 && apiaries.length > 0 && (
        <p className="text-center text-text-tertiary py-8">No apiaries match the selected filter.</p>
      )}

      {apiaries.length === 0 && (
        <EmptyState
          icon={MapPinOff}
          title="No Apiaries Yet"
          description="Add your first apiary to start tracking your apiary locations, coordinates, and weather data."
          actionLabel="Add Apiary"
          actionOnClick={() => setShowForm(true)}
        />
      )}

      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={imageModalOpen}
        imageUrl={modalImageUrl}
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  )
}

