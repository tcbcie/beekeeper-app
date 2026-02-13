'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, X, MapPin, Loader2, Map, UserPlus, Camera, MapPinOff } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import ImageZoomModal from '@/components/ui/ImageZoomModal'
import Image from 'next/image'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Mapbox
const MapLocationPicker = dynamic(() => import('@/components/MapLocationPicker'), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-sage-100 dark:bg-slate-800 rounded-lg animate-pulse flex items-center justify-center text-text-tertiary">Loading map...</div>
})
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import { useImageUpload } from '@/hooks/useImageUpload'
import { Apiary, ApiaryFormData, UserOption } from '@/types/apiary'
import ApiaryCard from '@/components/apiaries/ApiaryCard'

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
    notes: '',
    is_uk_ni: false,
    share_location: false,
  })
  const [geocoding, setGeocoding] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)

  // Transfer ownership state
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferTargetUser, setTransferTargetUser] = useState<string>('')
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [transferring, setTransferring] = useState(false)

  // Image zoom modal state
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null)

  const handleImageClick = (url: string) => {
    setModalImageUrl(url)
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

  // Geocode eircode/postcode to get coordinates
  const geocodeAddress = async (eircode: string, city: string, isUkNi: boolean) => {
    if (!eircode && !city) return null

    setGeocoding(true)
    try {
      // UK/NI: Use Postcodes.io (free, no API key, very accurate)
      if (isUkNi && eircode) {
        const cleanPostcode = eircode.trim().replace(/\s+/g, '%20')
        const response = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`)
        const data = await response.json()

        if (data.status === 200 && data.result) {
          return { lat: String(data.result.latitude), lon: String(data.result.longitude) }
        }
      }

      // Ireland: Use Google Maps Geocoding API (10,000 free/month)
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (googleApiKey) {
        // Build search query - prefer eircode, fallback to city
        const searchAddress = eircode
          ? `${eircode}, ${isUkNi ? 'United Kingdom' : 'Ireland'}`
          : `${city}, ${isUkNi ? 'United Kingdom' : 'Ireland'}`

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchAddress)}&key=${googleApiKey}`
        )
        const data = await response.json()

        if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
          const { lat, lng } = data.results[0].geometry.location
          return { lat: String(lat), lon: String(lng) }
        }
      }

      // Fallback: Nominatim with city (if no Google API key or Google failed)
      const country = isUkNi ? 'United Kingdom' : 'Ireland'
      const searchQuery = city ? `${city}, ${country}` : `${eircode}, ${country}`

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&countrycodes=${isUkNi ? 'gb' : 'ie'}`,
        { headers: { 'User-Agent': 'HiveCraic/1.0' } }
      )
      const data = await response.json()

      if (data && data.length > 0) {
        return { lat: data[0].lat, lon: data[0].lon }
      }
      return null
    } catch {
      return null
    } finally {
      setGeocoding(false)
    }
  }

  // Lookup coordinates when eircode or city changes
  const handleLookupCoordinates = async () => {
    const coords = await geocodeAddress(formData.eircode, formData.city, formData.is_uk_ni)
    if (coords) {
      setFormData(prev => ({
        ...prev,
        latitude: coords.lat,
        longitude: coords.lon
      }))
      // Show warning that coordinates are approximate
      toast.info('Coordinates are approximate. Use "Pick on Map" to verify exact location.')
    } else {
      toast.warning('Could not find coordinates for this location. Please enter them manually.')
    }
  }

  // Handle location change from map picker
  const handleMapLocationChange = (lat: string, lng: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }))
  }

  // Handle city change from map reverse geocoding
  const handleMapCityChange = (city: string) => {
    setFormData(prev => ({
      ...prev,
      city: city
    }))
  }

  const fetchApiaries = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data } = await supabase
      .from('apiaries')
      .select('*')
      .eq('user_id', currentUserId)
      .order('name')

    if (data) {
      // Enrich with hive counts and last inspection dates (active hives only)
      const apiaryIds = data.map(a => a.id)
      const { data: activeHives } = await supabase
        .from('hives')
        .select('id, apiary_id')
        .in('apiary_id', apiaryIds)
        .is('archived_at', null)

      const hiveCounts: Record<string, number> = {}
      const activeHiveIds: string[] = []
      ;(activeHives || []).forEach(h => {
        hiveCounts[h.apiary_id] = (hiveCounts[h.apiary_id] || 0) + 1
        activeHiveIds.push(h.id)
      })

      // Only fetch inspections for active hives
      const lastInspections: Record<string, string> = {}
      if (activeHiveIds.length > 0) {
        const { data: inspData } = await supabase
          .from('inspections')
          .select('hive_id, inspection_date, hives!inner(apiary_id)')
          .in('hive_id', activeHiveIds)
          .order('inspection_date', { ascending: false })

        ;((inspData || []) as Array<{ inspection_date: string; hives: { apiary_id: string }[] }>).forEach(i => {
          const apiaryId = i.hives?.[0]?.apiary_id
          if (apiaryId && !lastInspections[apiaryId]) {
            lastInspections[apiaryId] = i.inspection_date
          }
        })
      }

      setApiaries(data.map(a => ({
        ...a,
        hive_count: hiveCounts[a.id] || 0,
        last_inspection_date: lastInspections[a.id] || undefined,
      })))
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

    // Check if Eircode/Postcode is empty and show confirmation
    if (!formData.eircode || formData.eircode.trim() === '') {
      const confirmed = confirm(
        'You haven\'t entered an Eircode or Postcode.\n\n' +
        'Without a postcode (or an adjacent one), weather information will not be automatically recorded for inspections at this apiary.\n\n' +
        'Do you want to continue without a postcode?'
      )
      if (!confirmed) {
        return // User chose to go back and add postcode
      }
    }

    try {
      // Upload image if a new file was selected
      let imageUrl: string | null = editingApiary?.image_url || null
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      } else if (!imagePreview) {
        // Image was removed
        imageUrl = null
      }

      const dataToSave = {
        name: formData.name,
        location: formData.location || null,
        city: formData.city || null,
        eircode: formData.eircode || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        notes: formData.notes || null,
        is_uk_ni: formData.is_uk_ni,
        share_location: formData.share_location,
        image_url: imageUrl,
      }

      if (editingApiary) {
        const { error } = await supabase
          .from('apiaries')
          .update(dataToSave)
          .eq('id', editingApiary.id)
          .eq('user_id', userId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('apiaries')
          .insert([{ ...dataToSave, user_id: userId }])

        if (error) throw error
      }

      fetchApiaries()
      resetForm()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      toast.error(errorMessage)
    }
  }

  const handleEdit = (apiary: Apiary) => {
    setEditingApiary(apiary)
    setFormData({
      name: apiary.name,
      location: apiary.location || '',
      city: apiary.city || '',
      eircode: apiary.eircode || '',
      latitude: apiary.latitude?.toString() || '',
      longitude: apiary.longitude?.toString() || '',
      notes: apiary.notes || '',
      is_uk_ni: false,
      share_location: apiary.share_location || false,
    })
    // Load existing image
    setPreviewFromUrl(apiary.image_url)
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
      notes: '',
      is_uk_ni: false,
      share_location: false,
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

  if (loading) return <LoadingSpinner text="Loading apiaries..." />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Apiaries 📍</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 font-medium flex items-center gap-2 min-h-[48px]"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Apiary'}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
          <h3 className="text-xl font-semibold mb-4 text-foreground">
            {editingApiary ? 'Edit Apiary' : 'Add New Apiary'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Apiary Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Home Garden, North Field"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                required
              />
            </div>

            {/* Apiary Image */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Apiary Photo</label>
              {imagePreview ? (
                <div className="relative inline-block group">
                  <div className="relative w-full max-w-xs h-48">
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
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                    title="Remove image"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full max-w-xs h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-forest-500 hover:bg-sage-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex flex-col items-center justify-center py-4">
                    <Camera size={24} className="text-text-tertiary mb-2" />
                    <p className="text-sm text-text-tertiary">Click to upload photo</p>
                    <p className="text-xs text-text-tertiary mt-1">PNG, JPG up to 5MB</p>
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
                <label className="block text-sm font-medium text-text-secondary mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., North Field, Back Garden"
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="e.g., Dublin, Cork"
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Eircode (Postcode)</label>
              <input
                type="text"
                value={formData.eircode}
                onChange={(e) => setFormData({...formData, eircode: e.target.value.toUpperCase()})}
                placeholder={formData.is_uk_ni ? "e.g., BT1 5GS" : "e.g., D02 XY45"}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary uppercase focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              />
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="is_uk_ni"
                  checked={formData.is_uk_ni}
                  onChange={(e) => setFormData({...formData, is_uk_ni: e.target.checked})}
                  className="w-4 h-4 text-forest-600 bg-surface border-border rounded focus:ring-forest-500 focus:ring-2"
                />
                <label htmlFor="is_uk_ni" className="text-sm text-text-secondary cursor-pointer">
                  UK/NI Postcode
                </label>
              </div>
              <p className="text-xs text-text-tertiary mt-1">Optional - Used for automatic weather data on inspections</p>
            </div>

            {/* GPS Coordinates */}
            <div className="bg-sage-50 dark:bg-slate-800/50 p-4 rounded-lg border border-sage-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <MapPin size={16} />
                  GPS Coordinates
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(!showMapPicker)}
                    className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Map size={14} />
                    {showMapPicker ? 'Hide Map' : 'Pick on Map'}
                  </button>
                  <button
                    type="button"
                    onClick={handleLookupCoordinates}
                    disabled={geocoding || (!formData.city && !formData.eircode)}
                    className="text-sm px-3 py-1 bg-forest-600 text-white rounded hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {geocoding ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                    Get Coordinates
                  </button>
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
                  <label className="block text-xs text-text-tertiary mb-1">Latitude</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                    placeholder="e.g., 53.2744"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                    placeholder="e.g., -9.0490"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                  />
                </div>
              </div>
              <p className="text-xs text-text-tertiary mt-2">Used for GDD calculations, weather data on inspections, and identifying potential drone congregation areas. Use &quot;Pick on Map&quot; for exact positioning, or &quot;Get Coordinates&quot; for approximate location from Eircode/postcode.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Access instructions, nearby forage, etc..."
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              />
            </div>

            {/* Share Location Option */}
            {formData.latitude && formData.longitude && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.share_location}
                    onChange={(e) => setFormData({...formData, share_location: e.target.checked})}
                    className="mt-1 h-4 w-4 text-forest-600 border-border rounded focus:ring-forest-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-text-primary">Share apiary location publicly</span>
                    <p className="text-xs text-text-tertiary mt-1">
                      Your exact location will be <strong>obfuscated to a ~5km radius</strong> to protect your privacy.
                      This helps beekeepers identify drone congregation areas and plan apiary placement.
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <button type="submit" className="px-6 py-2 bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 min-h-[48px]">
                {editingApiary ? 'Update' : 'Add'} Apiary
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-sage-200 dark:bg-slate-700 text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 min-h-[48px]">
                Cancel
              </button>
              {editingApiary && (
                <button
                  type="button"
                  onClick={openTransferModal}
                  className="px-6 py-2 bg-purple-600 dark:bg-purple-900/30 text-white dark:text-purple-300 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-900/50 min-h-[48px] flex items-center gap-2"
                >
                  <UserPlus size={16} />
                  Transfer Ownership
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && editingApiary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface dark:bg-surface-elevated rounded-lg shadow-xl max-w-md w-full p-6 border border-border">
            <h3 className="text-xl font-semibold mb-4 text-foreground">Transfer Apiary Ownership</h3>

            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-gray-900 dark:text-amber-200">
                <strong>Warning:</strong> Transferring &quot;{editingApiary.name}&quot; will give the new owner full control. You will lose access to this apiary and all its hives.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Select New Owner
              </label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-text-tertiary">
                  <Loader2 size={16} className="animate-spin" />
                  Loading users...
                </div>
              ) : (
                <select
                  value={transferTargetUser}
                  onChange={(e) => setTransferTargetUser(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name} (${user.email})`
                        : user.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 bg-sage-200 dark:bg-slate-700 text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferOwnership}
                disabled={!transferTargetUser || transferring}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary stats bar */}
      {apiaries.length > 0 && (
        <p className="text-sm text-text-secondary">
          {apiaries.length} Apiar{apiaries.length !== 1 ? 'ies' : 'y'} | {apiaries.reduce((sum, a) => sum + (a.hive_count || 0), 0)} Total Hives
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {apiaries.map((apiary: Apiary) => (
          <ApiaryCard
            key={apiary.id}
            apiary={apiary}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onImageClick={handleImageClick}
          />
        ))}
      </div>

      {apiaries.length === 0 && (
        <EmptyState
          icon={MapPinOff}
          title="No Apiaries Yet"
          description="Add your first apiary to start tracking your bee yard locations, coordinates, and weather data."
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