'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { deleteUploadedImages } from '@/lib/upload-image'
import { Plus, Edit2, X, MapPin, Camera, TreeDeciduous, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, ClipboardList, User, Filter } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useImageUpload } from '@/hooks/useImageUpload'
import Image from 'next/image'

const MapLocationPicker = dynamic(() => import('@/components/MapLocationPicker'), {
 ssr: false,
 loading: () => <div className="h-[300px] bg-surface-secondary rounded-lg animate-pulse flex items-center justify-center text-text-tertiary">Loading map...</div>
})
import { useToast } from '@/components/ui/Toast'
import WildColonyInspectionPanel from '@/components/wild-colonies/WildColonyInspectionPanel'
import TextLink from '@/components/ui/TextLink'
import Button from '@/components/ui/Button'

interface WildColoniesTabProps {
 userId: string
}

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
 image_url_location: string | null
 created_at: string
 updated_at: string | null
 reviewed_by: string | null
 contact_name: string | null
 contact_email: string | null
 contact_phone: string | null
 share_contact_details: boolean
 last_edited_by: string | null
 last_edited_at: string | null
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
 { value: 'unconfirmed', label: 'Unconfirmed' },
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

export default function WildColoniesTab({ userId }: WildColoniesTabProps) {
 const toast = useToast()
 const [colonies, setColonies] = useState<WildColony[]>([])
 const [pendingColonies, setPendingColonies] = useState<WildColony[]>([])
 const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all')
 const [showForm, setShowForm] = useState(false)
 const [editingColony, setEditingColony] = useState<WildColony | null>(null)
 const [loading, setLoading] = useState(true)
 const [showMapPicker, setShowMapPicker] = useState(false)
 const [expandedColonyId, setExpandedColonyId] = useState<string | null>(null)
 const [statusFilter, setStatusFilter] = useState<string[]>([])
 const [lastEditorName, setLastEditorName] = useState<string | null>(null)

 // Location Aid photo upload
 const {
 imagePreview: locationImagePreview,
 uploading: locationUploading,
 handleImageChange: handleLocationImageChange,
 handleRemoveImage: handleRemoveLocationImage,
 uploadImage: uploadLocationImage,
 reset: resetLocationImage,
 setPreviewFromUrl: setLocationPreviewFromUrl,
 imageFile: locationImageFile
 } = useImageUpload({
 folder: 'wild-colonies',
 onError: (msg) => toast.error(msg)
 })

 // Colony photo upload
 const {
 imagePreview: colonyImagePreview,
 uploading: colonyUploading,
 handleImageChange: handleColonyImageChange,
 handleRemoveImage: handleRemoveColonyImage,
 uploadImage: uploadColonyImage,
 reset: resetColonyImage,
 setPreviewFromUrl: setColonyPreviewFromUrl,
 imageFile: colonyImageFile
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

 const fetchColonies = useCallback(async () => {
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
 }, [])

 useEffect(() => {
 fetchColonies()
 }, [fetchColonies])

 const handleSubmit = async (e: React.FormEvent, overrideStatus?: string) => {
 e.preventDefault()

 if (!formData.latitude || !formData.longitude) {
 toast.error('Please select a location on the map')
 return
 }

 // Photos uploaded during this attempt. If the save then fails they belong to no
 // row and nothing else will ever collect them, so they are removed. Once the row
 // is saved it owns them and the cleanup must stop.
 const uploadedUrls: string[] = []
 let recordSaved = false

 try {
 // Handle location image. A failed upload aborts the save: it used to fall
 // through and keep the previous URL, so the record saved with the old photo
 // and the observer had no way to tell their new one had not been stored.
 let locationImageUrl = editingColony?.image_url_location || null
 if (locationImageFile) {
 const uploadedUrl = await uploadLocationImage(locationImageFile)
 if (!uploadedUrl) return
 locationImageUrl = uploadedUrl
 uploadedUrls.push(uploadedUrl)
 } else if (!locationImagePreview && editingColony?.image_url_location) {
 locationImageUrl = null
 }

 // Handle colony image
 let colonyImageUrl = editingColony?.image_url || null
 if (colonyImageFile) {
 const uploadedUrl = await uploadColonyImage(colonyImageFile)
 if (!uploadedUrl) {
 // The location image may already be up; it would be orphaned by returning.
 await deleteUploadedImages(uploadedUrls)
 return
 }
 colonyImageUrl = uploadedUrl
 uploadedUrls.push(uploadedUrl)
 } else if (!colonyImagePreview && editingColony?.image_url) {
 colonyImageUrl = null
 }

 const dataToSave = {
 latitude: parseFloat(formData.latitude),
 longitude: parseFloat(formData.longitude),
 status: overrideStatus || formData.status,
 nesting_type: formData.nesting_type || null,
 estimated_size: formData.estimated_size || null,
 observation_date: formData.observation_date,
 entrance_description: formData.entrance_description || null,
 notes: formData.notes || null,
 image_url: colonyImageUrl,
 image_url_location: locationImageUrl,
 share_contact_details: editingColony?.share_contact_details || false,
 contact_name: editingColony?.contact_name || null,
 contact_email: editingColony?.contact_email || null,
 contact_phone: editingColony?.contact_phone || null,
 reviewed_by: overrideStatus ? userId : editingColony?.reviewed_by || null
 }

 if (editingColony) {
 const { error } = await supabase
 .from('wild_colonies')
 .update({ ...dataToSave, last_edited_by: userId, last_edited_at: new Date().toISOString() })
 .eq('id', editingColony.id)

 if (error) throw error
 recordSaved = true

 if (overrideStatus === 'confirmed') {
 toast.success('Colony confirmed')
 } else if (overrideStatus === 'unconfirmed') {
 toast.success('Colony marked as unconfirmed')
 } else {
 toast.success('Colony updated successfully')
 }
 } else {
 // Fetch user profile for contact details when creating new record
 const { data: profile } = await supabase
 .from('profiles')
 .select('full_name, email, mobile_number')
 .eq('id', userId)
 .single()

 const newRecordData = {
 ...dataToSave,
 user_id: userId,
 share_contact_details: true,
 contact_name: profile?.full_name || null,
 contact_email: profile?.email || null,
 contact_phone: profile?.mobile_number || null
 }

 const { error } = await supabase
 .from('wild_colonies')
 .insert([newRecordData])

 if (error) throw error
 recordSaved = true
 toast.success('Colony added successfully')
 }

 fetchColonies()
 resetForm()
 } catch (error) {
 // Only when the row never landed - a saved colony owns its photos.
 if (!recordSaved) await deleteUploadedImages(uploadedUrls)
 const errorMessage = error instanceof Error ? error.message : 'An error occurred'
 toast.error(errorMessage)
 }
 }

 const handleEdit = async (colony: WildColony) => {
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
 if (colony.image_url_location) {
 setLocationPreviewFromUrl(colony.image_url_location)
 }
 if (colony.image_url) {
 setColonyPreviewFromUrl(colony.image_url)
 }
 // Fetch last editor's name if exists
 if (colony.last_edited_by) {
 const { data: editorProfile } = await supabase
 .from('profiles')
 .select('full_name, email')
 .eq('id', colony.last_edited_by)
 .single()
 setLastEditorName(editorProfile?.full_name || editorProfile?.email || null)
 } else {
 setLastEditorName(null)
 }
 setShowForm(true)
 }

 const resetForm = () => {
 setShowForm(false)
 setEditingColony(null)
 setShowMapPicker(false)
 resetLocationImage()
 resetColonyImage()
 setLastEditorName(null)
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

 if (loading) {
 return (
 <div className="flex items-center justify-center py-12">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
 </div>
 )
 }

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <div className="flex items-center gap-2">
 <TreeDeciduous className="text-amber-600" size={24} />
 <h2 className="text-xl font-semibold text-foreground">Wild Colonies</h2>
 </div>
 <Button
 onClick={() => setShowForm(!showForm)}
 className="px-4 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 font-medium flex items-center gap-2 min-h-[48px]"
 >
 {showForm ? <X size={16} /> : <Plus size={16} />}
 {showForm ? 'Cancel' : 'Add Colony'}
 </Button>
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
 {editingColony.last_edited_at && (
 <p>Last edited: {formatDate(editingColony.last_edited_at)}{lastEditorName && ` by ${lastEditorName}`}</p>
 )}
 </div>
 )}
 </div>
 <form onSubmit={handleSubmit} className="space-y-4">
 {/* Map Location Picker */}
 <div className="bg-surface-secondary/50 p-4 rounded-lg border border-border">
 <div className="flex items-center justify-between mb-3">
 <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
 <MapPin size={16} />
 Location *
 </label>
 <Button
 type="button"
 onClick={() => setShowMapPicker(!showMapPicker)}
 className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
 >
 <MapPin size={14} />
 {showMapPicker ? 'Hide Map' : 'Pick on Map'}
 </Button>
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

 {/* Photo Uploads */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Location Aid Photo */}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2">Location Aid Photo</label>
 <p className="text-xs text-text-tertiary mb-2">A photo to help find the location</p>
 <div className="flex items-start">
 {locationImagePreview ? (
 <div className="relative">
 <Image
 src={locationImagePreview}
 alt="Location preview"
 width={120}
 height={120}
 className="w-30 h-30 object-cover rounded-lg border border-border"
 />
 <Button
 type="button"
 onClick={handleRemoveLocationImage}
 className="absolute -top-2 -right-2 flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
 >
 <X size={14} />
 </Button>
 </div>
 ) : (
 <label className="flex flex-col items-center justify-center w-30 h-30 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
 <Camera size={24} className="text-text-tertiary mb-1" />
 <span className="text-xs text-text-tertiary text-center">Location</span>
 <input
 type="file"
 accept="image/*"
 onChange={handleLocationImageChange}
 className="hidden"
 />
 </label>
 )}
 </div>
 </div>

 {/* Colony Photo */}
 <div>
 <label className="block text-sm font-medium text-text-secondary mb-2">Colony Photo</label>
 <p className="text-xs text-text-tertiary mb-2">A photo of the colony entrance or bees</p>
 <div className="flex items-start">
 {colonyImagePreview ? (
 <div className="relative">
 <Image
 src={colonyImagePreview}
 alt="Colony preview"
 width={120}
 height={120}
 className="w-30 h-30 object-cover rounded-lg border border-border"
 />
 <Button
 type="button"
 onClick={handleRemoveColonyImage}
 className="absolute -top-2 -right-2 flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
 >
 <X size={14} />
 </Button>
 </div>
 ) : (
 <label className="flex flex-col items-center justify-center w-30 h-30 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
 <Camera size={24} className="text-text-tertiary mb-1" />
 <span className="text-xs text-text-tertiary text-center">Colony</span>
 <input
 type="file"
 accept="image/*"
 onChange={handleColonyImageChange}
 className="hidden"
 />
 </label>
 )}
 </div>
 </div>
 </div>

 <div className="flex flex-wrap gap-3">
 {editingColony?.status === 'pending_review' ? (
 <>
 <Button
 type="button"
 onClick={(e) => handleSubmit(e, 'confirmed')}
 disabled={locationUploading || colonyUploading}
 className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 min-h-[48px] disabled:opacity-50 flex items-center gap-2"
 >
 <CheckCircle size={18} />
 {locationUploading || colonyUploading ? 'Uploading...' : 'Confirm'}
 </Button>
 <Button
 type="button"
 onClick={(e) => handleSubmit(e, 'unconfirmed')}
 disabled={locationUploading || colonyUploading}
 className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 min-h-[48px] disabled:opacity-50 flex items-center gap-2"
 >
 <XCircle size={18} />
 {locationUploading || colonyUploading ? 'Uploading...' : 'Unconfirmed'}
 </Button>
 <Button type="button" onClick={resetForm} className="px-6 py-2 bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated min-h-[48px]">
 Cancel
 </Button>
 </>
 ) : (
 <>
 <Button
 type="submit"
 disabled={locationUploading || colonyUploading}
 className="px-6 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 min-h-[48px] disabled:opacity-50"
 >
 {locationUploading || colonyUploading ? 'Uploading...' : editingColony ? 'Update' : 'Add'} Colony
 </Button>
 <Button type="button" onClick={resetForm} className="px-6 py-2 bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated min-h-[48px]">
 Cancel
 </Button>
 </>
 )}
 </div>
 </form>
 </div>
 )}

 {/* Tabs */}
 <div className="flex gap-2 border-b border-border">
 <Button
 onClick={() => setActiveTab('all')}
 className={`px-4 py-2 font-medium transition-colors ${
 activeTab === 'all'
 ? 'text-amber-600 border-b-2 border-amber-600'
 : 'text-text-secondary hover:text-foreground'
 }`}
 >
 All Colonies ({colonies.length})
 </Button>
 <Button
 onClick={() => setActiveTab('pending')}
 className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
 activeTab === 'pending'
 ? 'text-amber-600 border-b-2 border-amber-600'
 : 'text-text-secondary hover:text-foreground'
 }`}
 >
 <Clock size={16} />
 Pending Review ({pendingColonies.length})
 </Button>
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
 <th className="px-4 py-3 w-16">Actions</th>
 <th className="px-4 py-3">Date</th>
 <th className="px-4 py-3">Location</th>
 <th className="px-4 py-3">Type</th>
 <th className="px-4 py-3">Size</th>
 <th className="px-4 py-3">Contact</th>
 <th className="px-4 py-3">Description</th>
 <th className="px-4 py-3">Location Photo</th>
 <th className="px-4 py-3">Colony Photo</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
 {pendingColonies.map((colony) => (
 <tr key={colony.id} className="hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
 <td className="px-4 py-3">
 <Button
 onClick={() => handleEdit(colony)}
 className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
 title="Edit & Review"
 >
 <Edit2 size={18} />
 </Button>
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
 <TextLink
 href={`mailto:${colony.contact_email}`}
 className="text-blue-600 block truncate max-w-[150px]"
 title={colony.contact_email}
 >
 {colony.contact_email}
 </TextLink>
 )}
 {colony.contact_phone && (
 <TextLink href={`tel:${colony.contact_phone}`} className="text-blue-600 block">
 {colony.contact_phone}
 </TextLink>
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
 {colony.image_url_location ? (
 <Image
 src={colony.image_url_location}
 alt="Location"
 width={40}
 height={40}
 className="w-10 h-10 object-cover rounded border border-border cursor-pointer"
 onClick={() => window.open(colony.image_url_location!, '_blank')}
 />
 ) : (
 <span className="text-text-tertiary">-</span>
 )}
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
 <>
 {/* Status Filter */}
 <div className="flex items-center gap-3 mb-4 flex-wrap">
 <div className="flex items-center gap-2">
 <Filter size={16} className="text-text-secondary" />
 <label className="text-sm font-medium text-text-secondary">Status:</label>
 </div>
 <div className="flex flex-wrap gap-2">
 {STATUS_OPTIONS.filter(opt => opt.value !== 'pending_review').map(opt => {
 const isSelected = statusFilter.includes(opt.value)
 return (
 <Button
 key={opt.value}
 onClick={() => {
 setStatusFilter(prev =>
 isSelected
 ? prev.filter(s => s !== opt.value)
 : [...prev, opt.value]
 )
 }}
 className={`px-3 py-1 text-sm rounded-full border transition-colors ${
 isSelected
 ? 'bg-amber-600 text-white border-amber-600'
 : 'bg-surface border-border text-text-secondary hover:border-amber-500'
 }`}
 >
 {opt.label}
 </Button>
 )
 })}
 </div>
 {statusFilter.length > 0 && (
 <Button
 onClick={() => setStatusFilter([])}
 className="text-xs text-text-secondary hover:text-foreground"
 >
 Clear all
 </Button>
 )}
 </div>

 <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-surface-secondary border-b border-border text-xs uppercase text-text-secondary font-semibold">
 <th className="px-1 py-2 w-8"></th>
 <th className="px-2 py-2">Actions</th>
 <th className="px-2 py-2">Status</th>
 <th className="px-2 py-2">Inspections</th>
 <th className="px-2 py-2">Submitted By</th>
 <th className="px-2 py-2">Date</th>
 <th className="px-2 py-2">Location</th>
 <th className="px-2 py-2">Type</th>
 <th className="px-2 py-2">Size</th>
 <th className="px-2 py-2">Description</th>
 <th className="px-2 py-2">Loc Photo</th>
 <th className="px-2 py-2">Colony Photo</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {colonies.filter(c => statusFilter.length === 0 || statusFilter.includes(c.status)).map((colony) => (
 <React.Fragment key={colony.id}>
 <tr
 className={`hover:bg-surface-secondary/30 transition-colors cursor-pointer ${
 expandedColonyId === colony.id ? 'bg-surface-secondary/30' : ''
 }`}
 onClick={() => toggleExpanded(colony.id)}
 >
 <td className="px-1 py-2">
 <Button
 className="p-0.5 text-text-secondary hover:text-foreground transition-colors"
 title={expandedColonyId === colony.id ? 'Collapse' : 'Expand inspections'}
 >
 {expandedColonyId === colony.id ? (
 <ChevronUp size={16} />
 ) : (
 <ChevronDown size={16} />
 )}
 </Button>
 </td>
 <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
 <Button
 onClick={() => handleEdit(colony)}
 className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
 title="Edit"
 >
 <Edit2 size={14} />
 </Button>
 </td>
 <td className="px-2 py-2">
 <span className={`px-2 py-0.5 text-xs font-medium rounded-full inline-flex items-center gap-1.5 ${
 colony.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
 colony.status === 'observed' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
 colony.status === 'unconfirmed' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
 colony.status === 'lost' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
 'bg-surface-secondary text-foreground'
 }`}>
 {getStatusLabel(colony.status)}
 </span>
 </td>
 <td className="px-2 py-2">
 {colony.inspection_count && colony.inspection_count > 0 ? (
 <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
 <ClipboardList size={10} />
 {colony.inspection_count}
 </span>
 ) : (
 <span className="text-text-tertiary text-xs">-</span>
 )}
 </td>
 <td className="px-2 py-2 text-xs text-text-secondary">
 {getUserDisplayName(colony) ? (
 <span className="flex items-center gap-1">
 <User size={12} className="text-text-tertiary" />
 {getUserDisplayName(colony)}
 </span>
 ) : (
 <span className="text-text-tertiary">-</span>
 )}
 </td>
 <td className="px-2 py-2 text-xs text-text-primary whitespace-nowrap">
 {formatDate(colony.observation_date)}
 </td>
 <td className="px-2 py-2 text-xs text-text-secondary whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
 <a
 href={`https://www.google.com/maps/search/?api=1&query=${colony.latitude},${colony.longitude}`}
 target="_blank"
 rel="noopener noreferrer"
 className="hover:text-blue-600 flex items-center gap-1"
 >
 <MapPin size={12} />
 {colony.latitude.toFixed(4)}, {colony.longitude.toFixed(4)}
 </a>
 </td>
 <td className="px-2 py-2 text-xs text-text-primary">
 {getNestingTypeLabel(colony.nesting_type)}
 </td>
 <td className="px-2 py-2 text-xs text-text-primary">
 {getSizeLabel(colony.estimated_size)}
 </td>
 <td className="px-2 py-2 text-xs text-text-secondary max-w-[120px] truncate" title={colony.entrance_description || ''}>
 {colony.entrance_description || '-'}
 </td>
 <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
 {colony.image_url_location ? (
 <Image
 src={colony.image_url_location}
 alt="Location"
 width={32}
 height={32}
 className="w-8 h-8 object-cover rounded border border-border cursor-pointer"
 onClick={() => window.open(colony.image_url_location!, '_blank')}
 />
 ) : (
 <span className="text-text-tertiary text-xs">-</span>
 )}
 </td>
 <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
 {colony.image_url ? (
 <Image
 src={colony.image_url}
 alt="Colony"
 width={32}
 height={32}
 className="w-8 h-8 object-cover rounded border border-border cursor-pointer"
 onClick={() => window.open(colony.image_url!, '_blank')}
 />
 ) : (
 <span className="text-text-tertiary text-xs">-</span>
 )}
 </td>
 </tr>
 {/* Expanded Inspection Panel */}
 {expandedColonyId === colony.id && (
 <tr>
 <td colSpan={12} className="p-0">
 <WildColonyInspectionPanel
 colonyId={colony.id}
 userId={userId}
 colonyLatitude={colony.latitude}
 colonyLongitude={colony.longitude}
 onInspectionChange={fetchColonies}
 canEditAll={true}
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
 </>
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

