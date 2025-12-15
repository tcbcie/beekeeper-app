'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/lib/auth'
import { Plus, Edit2, Trash2, X, MapPin, Loader2, Map } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Mapbox
const MapLocationPicker = dynamic(() => import('@/components/MapLocationPicker'), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-sage-100 dark:bg-slate-800 rounded-lg animate-pulse flex items-center justify-center text-text-tertiary">Loading map...</div>
})
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

interface Apiary {
  id: string
  name: string
  location: string | null
  city: string | null
  eircode: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
  created_at?: string
}

interface FormData {
  name: string
  location: string
  city: string
  eircode: string
  latitude: string
  longitude: string
  notes: string
  is_uk_ni: boolean
}

export default function ApiariesPage() {
  const toast = useToast()
  const [apiaries, setApiaries] = useState<Apiary[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingApiary, setEditingApiary] = useState<Apiary | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    location: '',
    city: '',
    eircode: '',
    latitude: '',
    longitude: '',
    notes: '',
    is_uk_ni: false,
  })
  const [geocoding, setGeocoding] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)

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

    if (data) setApiaries(data)
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
      const dataToSave = {
        name: formData.name,
        location: formData.location || null,
        city: formData.city || null,
        eircode: formData.eircode || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        notes: formData.notes || null,
        is_uk_ni: formData.is_uk_ni,
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
    })
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
    setFormData({
      name: '',
      location: '',
      city: '',
      eircode: '',
      latitude: '',
      longitude: '',
      notes: '',
      is_uk_ni: false,
    })
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
              <p className="text-xs text-text-tertiary mt-2">Required for GDD calculations. Use &quot;Pick on Map&quot; for exact positioning, or &quot;Get Coordinates&quot; for approximate location from Eircode/postcode.</p>
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

            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2 bg-forest-600 dark:bg-forest-500 text-white rounded-lg hover:bg-forest-700 dark:hover:bg-forest-600 min-h-[48px]">
                {editingApiary ? 'Update' : 'Add'} Apiary
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-sage-200 dark:bg-slate-700 text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 min-h-[48px]">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {apiaries.map((apiary: Apiary) => {
          return (
            <div key={apiary.id} className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-border">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">{apiary.name}</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    {apiary.city && apiary.location ? `${apiary.city} - ${apiary.location}` :
                     apiary.city || apiary.location || 'No location specified'}
                  </p>
                  {apiary.eircode && (
                    <p className="text-sm text-forest-600 dark:text-forest-400 font-medium mt-1">
                      Eircode: {apiary.eircode}
                    </p>
                  )}
                </div>
              </div>

              {apiary.notes && (
                <div className="mb-4 p-3 bg-sage-50 dark:bg-slate-800/50 rounded text-sm text-text-primary border border-sage-200 dark:border-slate-700">
                  {apiary.notes}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(apiary)}
                  className="flex-1 px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 font-medium flex items-center justify-center gap-2 border border-blue-300 dark:border-blue-800 min-h-[48px]"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(apiary.id)}
                  className="flex-1 px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 font-medium flex items-center justify-center gap-2 border border-red-300 dark:border-red-800 min-h-[48px]"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {apiaries.length === 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-12 text-center text-text-secondary border border-border">
          No apiaries found. Add your first location!
        </div>
      )}
    </div>
  )
}