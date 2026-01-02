'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, isPowerUserOrAdmin } from '@/lib/auth'
import { Plus, Edit2, Trash2, X, MapPin, Camera, TreeDeciduous } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import dynamic from 'next/dynamic'
import { useImageUpload } from '@/hooks/useImageUpload'
import Image from 'next/image'

const MapLocationPicker = dynamic(() => import('@/components/MapLocationPicker'), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-sage-100 dark:bg-slate-800 rounded-lg animate-pulse flex items-center justify-center text-text-tertiary">Loading map...</div>
})
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

interface WildColony {
  id: string
  user_id: string
  latitude: number
  longitude: number
  status: string
  nesting_type: string | null
  estimated_size: string | null
  observation_date: string
  entrance_description: string | null
  notes: string | null
  image_url: string | null
  created_at: string
}

interface FormData {
  latitude: string
  longitude: string
  status: string
  nesting_type: string
  estimated_size: string
  observation_date: string
  entrance_description: string
  notes: string
}

const STATUS_OPTIONS = [
  { value: 'observed', label: 'Observed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'lost', label: 'Lost' },
  { value: 'removed', label: 'Removed' },
  { value: 'relocated', label: 'Relocated' },
  { value: 'unknown', label: 'Unknown' },
]

const NESTING_TYPE_OPTIONS = [
  { value: '', label: 'Select nesting type...' },
  { value: 'tree_cavity', label: 'Tree Cavity' },
  { value: 'wall_cavity', label: 'Wall Cavity' },
  { value: 'ground', label: 'Ground' },
  { value: 'building', label: 'Building' },
  { value: 'rock_crevice', label: 'Rock Crevice' },
  { value: 'other', label: 'Other' },
]

const SIZE_OPTIONS = [
  { value: '', label: 'Select size...' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'unknown', label: 'Unknown' },
]

export default function WildColoniesPage() {
  const toast = useToast()
  const router = useRouter()
  const [colonies, setColonies] = useState<WildColony[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingColony, setEditingColony] = useState<WildColony | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)

  const {
    imagePreview,
    uploading,
    handleImageChange,
    handleRemoveImage,
    uploadImage,
    reset: resetImage,
    setPreviewFromUrl,
    imageFile
  } = useImageUpload({
    folder: 'wild-colonies',
    onError: (msg) => toast.error(msg)
  })

  const [formData, setFormData] = useState<FormData>({
    latitude: '',
    longitude: '',
    status: 'observed',
    nesting_type: '',
    estimated_size: '',
    observation_date: new Date().toISOString().split('T')[0],
    entrance_description: '',
    notes: '',
  })

  const handleMapLocationChange = (lat: string, lng: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }))
  }

  const fetchColonies = useCallback(async (userIdParam?: string) => {
    const currentUserId = userIdParam || userId
    if (!currentUserId) return

    const { data, error } = await supabase
      .from('wild_colonies')
      .select('*')
      .order('observation_date', { ascending: false })

    if (error) {
      console.error('Error fetching colonies:', error)
      return
    }

    if (data) setColonies(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }

      const access = await isPowerUserOrAdmin()
      if (!access) {
        router.push('/dashboard')
        return
      }

      setHasAccess(true)
      setUserId(id)
      fetchColonies(id)
    }
    initUser()
  }, [router, fetchColonies])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    if (!formData.latitude || !formData.longitude) {
      toast.error('Please select a location on the map')
      return
    }

    try {
      let imageUrl = editingColony?.image_url || null

      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      } else if (!imagePreview && editingColony?.image_url) {
        imageUrl = null
      }

      const dataToSave = {
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        status: formData.status,
        nesting_type: formData.nesting_type || null,
        estimated_size: formData.estimated_size || null,
        observation_date: formData.observation_date,
        entrance_description: formData.entrance_description || null,
        notes: formData.notes || null,
        image_url: imageUrl,
      }

      if (editingColony) {
        const { error } = await supabase
          .from('wild_colonies')
          .update(dataToSave)
          .eq('id', editingColony.id)
          .eq('user_id', userId)

        if (error) throw error
        toast.success('Colony updated successfully')
      } else {
        const { error } = await supabase
          .from('wild_colonies')
          .insert([{ ...dataToSave, user_id: userId }])

        if (error) throw error
        toast.success('Colony added successfully')
      }

      fetchColonies()
      resetForm()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      toast.error(errorMessage)
    }
  }

  const handleEdit = (colony: WildColony) => {
    setEditingColony(colony)
    setFormData({
      latitude: colony.latitude.toString(),
      longitude: colony.longitude.toString(),
      status: colony.status,
      nesting_type: colony.nesting_type || '',
      estimated_size: colony.estimated_size || '',
      observation_date: colony.observation_date,
      entrance_description: colony.entrance_description || '',
      notes: colony.notes || '',
    })
    if (colony.image_url) {
      setPreviewFromUrl(colony.image_url)
    }
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    if (confirm('Delete this wild colony record?')) {
      const { error } = await supabase
        .from('wild_colonies')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (!error) {
        toast.success('Colony deleted')
        fetchColonies()
      }
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingColony(null)
    setShowMapPicker(false)
    resetImage()
    setFormData({
      latitude: '',
      longitude: '',
      status: 'observed',
      nesting_type: '',
      estimated_size: '',
      observation_date: new Date().toISOString().split('T')[0],
      entrance_description: '',
      notes: '',
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getNestingTypeLabel = (value: string | null) => {
    const option = NESTING_TYPE_OPTIONS.find(o => o.value === value)
    return option?.label || value || 'Not specified'
  }

  const getStatusLabel = (value: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === value)
    return option?.label || value
  }

  const getSizeLabel = (value: string | null) => {
    const option = SIZE_OPTIONS.find(o => o.value === value)
    return option?.label || value || 'Not specified'
  }

  if (loading) return <LoadingSpinner text="Loading wild colonies..." />

  if (!hasAccess) {
    return (
      <div className="bg-surface dark:bg-surface rounded-lg shadow p-12 text-center text-text-secondary border border-border">
        Access restricted to Power Users and Administrators.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <TreeDeciduous className="text-amber-600" />
          Wild Colonies
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 font-medium flex items-center gap-2 min-h-[48px]"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Colony'}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
          <h3 className="text-xl font-semibold mb-4 text-foreground">
            {editingColony ? 'Edit Wild Colony' : 'Add Wild Colony'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Map Location Picker */}
            <div className="bg-sage-50 dark:bg-slate-800/50 p-4 rounded-lg border border-sage-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <MapPin size={16} />
                  Location *
                </label>
                <button
                  type="button"
                  onClick={() => setShowMapPicker(!showMapPicker)}
                  className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <MapPin size={14} />
                  {showMapPicker ? 'Hide Map' : 'Pick on Map'}
                </button>
              </div>

              {showMapPicker && (
                <div className="mb-4">
                  <MapLocationPicker
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onLocationChange={handleMapLocationChange}
                    onClose={() => setShowMapPicker(false)}
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
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-tertiary mb-1">Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                    placeholder="e.g., -9.0490"
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Observation Date *</label>
                <input
                  type="date"
                  value={formData.observation_date}
                  onChange={(e) => setFormData({...formData, observation_date: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Estimated Size</label>
                <select
                  value={formData.estimated_size}
                  onChange={(e) => setFormData({...formData, estimated_size: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {SIZE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Nesting Type</label>
              <select
                value={formData.nesting_type}
                onChange={(e) => setFormData({...formData, nesting_type: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {NESTING_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Entrance Description</label>
              <input
                type="text"
                value={formData.entrance_description}
                onChange={(e) => setFormData({...formData, entrance_description: e.target.value})}
                placeholder="e.g., Small hole facing south, 2m up in oak tree"
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Additional observations, bee activity, etc..."
                className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Photo</label>
              <div className="flex items-start gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <Image
                      src={imagePreview}
                      alt="Colony preview"
                      width={120}
                      height={120}
                      className="w-30 h-30 object-cover rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-30 h-30 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
                    <Camera size={24} className="text-text-tertiary mb-1" />
                    <span className="text-xs text-text-tertiary">Add photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={uploading}
                className="px-6 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 min-h-[48px] disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : editingColony ? 'Update' : 'Add'} Colony
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-sage-200 dark:bg-slate-700 text-text-primary rounded-lg hover:bg-sage-300 dark:hover:bg-slate-600 min-h-[48px]">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {colonies.map((colony) => (
          <div key={colony.id} className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-border">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    colony.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    colony.status === 'observed' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                    colony.status === 'lost' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                  }`}>
                    {getStatusLabel(colony.status)}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {formatDate(colony.observation_date)}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">
                  <MapPin size={14} className="inline mr-1" />
                  {colony.latitude.toFixed(4)}, {colony.longitude.toFixed(4)}
                </p>
                {colony.nesting_type && (
                  <p className="text-sm text-text-secondary mt-1">
                    <TreeDeciduous size={14} className="inline mr-1" />
                    {getNestingTypeLabel(colony.nesting_type)}
                  </p>
                )}
                {colony.estimated_size && (
                  <p className="text-sm text-text-secondary mt-1">
                    Size: {getSizeLabel(colony.estimated_size)}
                  </p>
                )}
              </div>
              {colony.image_url && (
                <Image
                  src={colony.image_url}
                  alt="Colony"
                  width={80}
                  height={80}
                  className="w-20 h-20 object-cover rounded-lg border border-border"
                />
              )}
            </div>

            {colony.entrance_description && (
              <p className="text-sm text-text-secondary mb-2">
                <strong>Entrance:</strong> {colony.entrance_description}
              </p>
            )}

            {colony.notes && (
              <div className="mb-4 p-3 bg-sage-50 dark:bg-slate-800/50 rounded text-sm text-text-primary border border-sage-200 dark:border-slate-700">
                {colony.notes}
              </div>
            )}

            {colony.user_id === userId && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(colony)}
                  className="flex-1 px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 font-medium flex items-center justify-center gap-2 border border-blue-300 dark:border-blue-800 min-h-[48px]"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(colony.id)}
                  className="flex-1 px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 font-medium flex items-center justify-center gap-2 border border-red-300 dark:border-red-800 min-h-[48px]"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {colonies.length === 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-12 text-center text-text-secondary border border-border">
          <TreeDeciduous size={48} className="mx-auto mb-4 text-amber-500" />
          <p>No wild colonies recorded yet.</p>
          <p className="text-sm mt-2">Track wild or feral bee colonies to help the beekeeping community!</p>
        </div>
      )}
    </div>
  )
}
