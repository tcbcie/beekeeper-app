'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId, isPowerUserOrAdmin } from '@/lib/auth'
import { Plus, Edit2, Trash2, X, MapPin, Camera, TreeDeciduous, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, ClipboardList, User } from 'lucide-react'
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
import WildColonyInspectionPanel from '@/components/wild-colonies/WildColonyInspectionPanel'

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
  updated_at: string | null
  reviewed_by: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  share_contact_details: boolean
  last_edited_by: string | null
  inspection_count?: number
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
  { value: 'pending_review', label: 'Pending Review' },
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
  const [pendingColonies, setPendingColonies] = useState<WildColony[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingColony, setEditingColony] = useState<WildColony | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [expandedColonyId, setExpandedColonyId] = useState<string | null>(null)

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

    // Fetch confirmed/observed colonies (exclude pending) with inspection counts
    const { data, error } = await supabase
      .from('wild_colonies')
      .select(`
        *,
        wild_colony_inspections(count)
      `)
      .neq('status', 'pending_review')
      .order('observation_date', { ascending: false })

    if (error) {
      console.error('Error fetching colonies:', error)
      return
    }

    if (data) {
      // Transform data to include inspection_count
      const coloniesWithCounts = data.map((colony: WildColony & { wild_colony_inspections: { count: number }[] }) => ({
        ...colony,
        inspection_count: colony.wild_colony_inspections?.[0]?.count || 0,
        wild_colony_inspections: undefined
      }))
      setColonies(coloniesWithCounts)
    }

    // Fetch pending colonies for review
    const { data: pendingData, error: pendingError } = await supabase
      .from('wild_colonies')
      .select('*')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })

    if (!pendingError && pendingData) {
      setPendingColonies(pendingData)
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
        share_contact_details: false,
        contact_name: null,
        contact_email: null,
        contact_phone: null
      }

      if (editingColony) {
        const { error } = await supabase
          .from('wild_colonies')
          .update({ ...dataToSave, last_edited_by: userId })
          .eq('id', editingColony.id)

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

      if (!error) {
        toast.success('Colony deleted')
        fetchColonies()
      }
    }
  }

  const handleApprove = async (id: string) => {
    if (!userId) return
    const { error } = await supabase
      .from('wild_colonies')
      .update({ status: 'confirmed', reviewed_by: userId })
      .eq('id', id)

    if (!error) {
      toast.success('Colony approved and confirmed')
      fetchColonies()
    } else {
      toast.error('Failed to approve colony')
    }
  }

  const handleReject = async (id: string) => {
    if (!userId) return
    if (confirm('Reject and delete this submission?')) {
      const { error } = await supabase
        .from('wild_colonies')
        .delete()
        .eq('id', id)

      if (!error) {
        toast.success('Submission rejected')
        fetchColonies()
      } else {
        toast.error('Failed to reject submission')
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

  const getUserDisplayName = (colony: WildColony) => {
    return colony.contact_name || colony.contact_email || null
  }

  const toggleExpanded = (colonyId: string) => {
    setExpandedColonyId(prev => prev === colonyId ? null : colonyId)
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
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-foreground">
              {editingColony ? 'Edit Wild Colony' : 'Add Wild Colony'}
            </h3>
            {editingColony && (
              <div className="text-sm text-text-secondary mt-2 space-y-1">
                {getUserDisplayName(editingColony) && (
                  <p className="flex items-center gap-1">
                    <User size={14} />
                    Submitted by: {getUserDisplayName(editingColony)}
                  </p>
                )}
                <p>Created: {formatDate(editingColony.created_at)}</p>
                {editingColony.updated_at && editingColony.updated_at !== editingColony.created_at && (
                  <p>Last edited: {formatDate(editingColony.updated_at)}</p>
                )}
              </div>
            )}
          </div>
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'all'
              ? 'text-amber-600 border-b-2 border-amber-600'
              : 'text-text-secondary hover:text-foreground'
          }`}
        >
          All Colonies ({colonies.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'text-amber-600 border-b-2 border-amber-600'
              : 'text-text-secondary hover:text-foreground'
          }`}
        >
          <Clock size={16} />
          Pending Review ({pendingColonies.length})
        </button>
      </div>

      {/* Pending Review Tab */}
      {activeTab === 'pending' && (
        <>
          {pendingColonies.length === 0 ? (
            <div className="bg-surface dark:bg-surface rounded-lg shadow p-8 text-center text-text-secondary border border-border">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <p>No submissions pending review.</p>
            </div>
          ) : (
            <div className="bg-surface dark:bg-surface rounded-lg shadow border border-amber-200 dark:border-amber-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-xs uppercase text-text-secondary font-semibold">
                      <th className="px-4 py-3 w-28">Actions</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Photo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
                    {pendingColonies.map((colony) => (
                      <tr key={colony.id} className="hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleApprove(colony.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                              title="Approve"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button
                              onClick={() => handleReject(colony.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-primary whitespace-nowrap">
                          {formatDate(colony.observation_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${colony.latitude},${colony.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 flex items-center gap-1"
                          >
                            <MapPin size={14} />
                            {colony.latitude.toFixed(4)}, {colony.longitude.toFixed(4)}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-primary">
                          {getNestingTypeLabel(colony.nesting_type)}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-primary">
                          {getSizeLabel(colony.estimated_size)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {colony.share_contact_details && (colony.contact_name || colony.contact_email || colony.contact_phone) ? (
                            <div className="text-xs space-y-0.5">
                              {colony.contact_name && (
                                <p className="text-text-primary">{colony.contact_name}</p>
                              )}
                              {colony.contact_email && (
                                <a href={`mailto:${colony.contact_email}`} className="text-blue-600 hover:underline block truncate max-w-[150px]" title={colony.contact_email}>
                                  {colony.contact_email}
                                </a>
                              )}
                              {colony.contact_phone && (
                                <a href={`tel:${colony.contact_phone}`} className="text-blue-600 hover:underline block">
                                  {colony.contact_phone}
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate" title={colony.entrance_description || colony.notes || ''}>
                          {colony.entrance_description || colony.notes || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {colony.image_url ? (
                            <Image
                              src={colony.image_url}
                              alt="Colony"
                              width={40}
                              height={40}
                              className="w-10 h-10 object-cover rounded border border-border cursor-pointer"
                              onClick={() => window.open(colony.image_url!, '_blank')}
                            />
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* All Colonies Tab */}
      {activeTab === 'all' && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sage-50 dark:bg-slate-800/50 border-b border-border text-xs uppercase text-text-secondary font-semibold">
                  <th className="px-2 py-3 w-10"></th>
                  <th className="px-4 py-3 w-24">Actions</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Inspections</th>
                  <th className="px-4 py-3">Submitted By</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {colonies.map((colony) => (
                  <React.Fragment key={colony.id}>
                    <tr
                      className={`hover:bg-sage-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer ${
                        expandedColonyId === colony.id ? 'bg-sage-50 dark:bg-slate-800/30' : ''
                      }`}
                      onClick={() => toggleExpanded(colony.id)}
                    >
                      <td className="px-2 py-3">
                        <button
                          className="p-1 text-text-secondary hover:text-foreground transition-colors"
                          title={expandedColonyId === colony.id ? 'Collapse' : 'Expand inspections'}
                        >
                          {expandedColonyId === colony.id ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(colony)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(colony.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full inline-flex items-center gap-1.5 ${
                          colony.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          colony.status === 'observed' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                          colony.status === 'lost' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}>
                          {getStatusLabel(colony.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {colony.inspection_count && colony.inspection_count > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <ClipboardList size={12} />
                            {colony.inspection_count}
                          </span>
                        ) : (
                          <span className="text-text-tertiary text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {getUserDisplayName(colony) ? (
                          <span className="flex items-center gap-1">
                            <User size={14} className="text-text-tertiary" />
                            {getUserDisplayName(colony)}
                          </span>
                        ) : (
                          <span className="text-text-tertiary">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary whitespace-nowrap">
                        {formatDate(colony.observation_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${colony.latitude},${colony.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 flex items-center gap-1"
                        >
                          <MapPin size={14} />
                          {colony.latitude.toFixed(4)}, {colony.longitude.toFixed(4)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {getNestingTypeLabel(colony.nesting_type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {getSizeLabel(colony.estimated_size)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary max-w-xs truncate" title={colony.entrance_description || ''}>
                        {colony.entrance_description || '-'}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {colony.image_url ? (
                          <div className="relative group">
                            <Image
                              src={colony.image_url}
                              alt="Colony"
                              width={40}
                              height={40}
                              className="w-10 h-10 object-cover rounded border border-border cursor-pointer"
                              onClick={() => window.open(colony.image_url!, '_blank')}
                            />
                          </div>
                        ) : (
                          <span className="text-text-tertiary">-</span>
                        )}
                      </td>
                    </tr>
                    {/* Expanded Inspection Panel */}
                    {expandedColonyId === colony.id && userId && (
                      <tr>
                        <td colSpan={11} className="p-0">
                          <WildColonyInspectionPanel
                            colonyId={colony.id}
                            userId={userId}
                            colonyLatitude={colony.latitude}
                            colonyLongitude={colony.longitude}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'all' && colonies.length === 0 && (
        <div className="bg-surface dark:bg-surface rounded-lg shadow p-12 text-center text-text-secondary border border-border">
          <TreeDeciduous size={48} className="mx-auto mb-4 text-amber-500" />
          <p>No wild colonies recorded yet.</p>
          <p className="text-sm mt-2">Track wild or feral bee colonies to help the beekeeping community!</p>
        </div>
      )}
    </div>
  )
}
