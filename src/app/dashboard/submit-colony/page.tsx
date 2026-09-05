'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { deleteUploadedImages } from '@/lib/upload-image'
import { getCurrentUserId } from '@/lib/auth'
import { MapPin, Camera, TreeDeciduous, X, CheckCircle } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import dynamic from 'next/dynamic'
import { useImageUpload } from '@/hooks/useImageUpload'
import Image from 'next/image'

const MapLocationPicker = dynamic(() => import('@/components/MapLocationPicker'), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-surface-secondary rounded-lg animate-pulse flex items-center justify-center text-text-tertiary">Loading map...</div>
})
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

interface FormData {
  latitude: string
  longitude: string
  nesting_type: string
  estimated_size: string
  observation_date: string
  entrance_description: string
  notes: string
}

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

export default function SubmitColonyPage() {
  const toast = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [showMapPicker, setShowMapPicker] = useState(false)

  // Location Aid photo upload
  const {
    imagePreview: locationImagePreview,
    uploading: locationUploading,
    handleImageChange: handleLocationImageChange,
    handleRemoveImage: handleRemoveLocationImage,
    uploadImage: uploadLocationImage,
    reset: resetLocationImage,
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
    imageFile: colonyImageFile
  } = useImageUpload({
    folder: 'wild-colonies',
    onError: (msg) => toast.error(msg)
  })

  const [formData, setFormData] = useState<FormData>({
    latitude: '',
    longitude: '',
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

  useEffect(() => {
    const initUser = async () => {
      const id = await getCurrentUserId()
      if (!id) {
        router.push('/login')
        return
      }
      setUserId(id)
      setLoading(false)
    }
    initUser()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    if (!formData.latitude || !formData.longitude) {
      toast.error('Please select a location on the map')
      return
    }

    setSubmitting(true)

    // Photos uploaded during this attempt. If the submission then fails they
    // belong to no row and nothing else will ever collect them.
    const uploadedUrls: string[] = []
    let recordSaved = false

    try {
      let locationImageUrl = null
      let colonyImageUrl = null

      // Upload location aid photo. A failed upload aborts the submission rather
      // than quietly filing a sighting without the photo that was chosen for it.
      if (locationImageFile) {
        const uploadedUrl = await uploadLocationImage(locationImageFile)
        if (!uploadedUrl) return
        locationImageUrl = uploadedUrl
        uploadedUrls.push(uploadedUrl)
      }

      // Upload colony photo
      if (colonyImageFile) {
        const uploadedUrl = await uploadColonyImage(colonyImageFile)
        if (!uploadedUrl) {
          await deleteUploadedImages(uploadedUrls)
          return
        }
        colonyImageUrl = uploadedUrl
        uploadedUrls.push(uploadedUrl)
      }

      // Always fetch user profile data (email is required)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, mobile_number')
        .eq('id', userId)
        .single()

      const contactData = {
        contact_name: profile?.full_name || null,
        contact_email: profile?.email || null,
        contact_phone: profile?.mobile_number || null
      }

      const dataToSave = {
        user_id: userId,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        status: 'pending_review',
        nesting_type: formData.nesting_type || null,
        estimated_size: formData.estimated_size || null,
        observation_date: formData.observation_date,
        entrance_description: formData.entrance_description || null,
        notes: formData.notes || null,
        image_url: colonyImageUrl,
        image_url_location: locationImageUrl,
        share_contact_details: true,
        ...contactData
      }

      const { error } = await supabase
        .from('wild_colonies')
        .insert([dataToSave])

      if (error) throw error
      recordSaved = true

      setSubmitted(true)
      toast.success('Wild colony sighting submitted for review!')
    } catch (error) {
      // Only when the row never landed - a saved sighting owns its photos.
      if (!recordSaved) await deleteUploadedImages(uploadedUrls)
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSubmitted(false)
    setShowMapPicker(false)
    resetLocationImage()
    resetColonyImage()
    setFormData({
      latitude: '',
      longitude: '',
      nesting_type: '',
      estimated_size: '',
      observation_date: new Date().toISOString().split('T')[0],
      entrance_description: '',
      notes: '',
    })
  }

  if (loading) return <LoadingSpinner text="Loading..." />

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-8 text-center border border-border">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Submission Received!</h2>
          <p className="text-text-secondary mb-6">
            Thank you for reporting this wild colony sighting. A member of the team will review your submission soon.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={resetForm}
              className="px-6 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 font-medium min-h-[48px]"
            >
              Submit Another
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated font-medium min-h-[48px]"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <TreeDeciduous className="text-amber-600" size={32} />
        <h1 className="text-3xl font-bold text-foreground">Report Wild Colony</h1>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Spotted a wild or feral bee colony? Submit the details below and a member of the team will review your sighting.
          Your submission helps track wild bee populations in the community!
        </p>
      </div>

      <div className="bg-surface dark:bg-surface rounded-lg shadow-lg p-6 border border-border">
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
                <label className="block text-sm text-text-tertiary mb-1">Latitude</label>
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
                <label className="block text-sm text-text-tertiary mb-1">Longitude</label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Contact Info Notice */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-text-secondary">
              <strong>Contact Information</strong>
            </p>
            <p className="text-sm text-text-tertiary mt-0.5">
              Your email address (and name/phone if available in your profile) will be shared with reviewers so they can contact you about this sighting.
            </p>
          </div>

          {/* Photo Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location Aid Photo */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Location Aid Photo (optional)</label>
              <p className="text-sm text-text-tertiary mb-2">A photo to help find the location (landmark, building, etc.)</p>
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
              <label className="block text-sm font-medium text-text-secondary mb-2">Colony Photo (optional)</label>
              <p className="text-sm text-text-tertiary mb-2">A photo of the colony entrance or bee activity</p>
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

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={submitting || locationUploading || colonyUploading}
              className="flex-1 px-6 py-3 bg-amber-600 dark:bg-amber-500 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 font-medium min-h-[48px] disabled:opacity-50"
            >
              {submitting || locationUploading || colonyUploading ? 'Submitting...' : 'Submit Sighting'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

