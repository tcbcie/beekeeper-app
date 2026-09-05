'use client'

import { useState, useEffect } from 'react'
import { X, Star, ChevronDown, ChevronUp, Camera, Cloud, Loader2 } from 'lucide-react'
import Image from 'next/image'
import {
  WildColonyInspectionFormData,
  getDefaultInspectionFormData,
  POPULATION_ESTIMATES,
  COLONY_STATUS_OPTIONS,
  WEATHER_CONDITIONS
} from '@/types/wild-colonies'
import { useImageUpload } from '@/hooks/useImageUpload'
import { deleteUploadedImages } from '@/lib/upload-image'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'

interface WildColonyInspectionFormProps {
  initialData?: Partial<WildColonyInspectionFormData>
  initialImageUrl?: string | null
  onSubmit: (data: WildColonyInspectionFormData, imageUrl: string | null) => Promise<void>
  onCancel: () => void
  isEditing?: boolean
  colonyLatitude?: number
  colonyLongitude?: number
}

// Weather code mapping from Open-Meteo
const WEATHER_CODE_MAP: { [key: number]: string } = {
  0: 'sunny', 1: 'sunny', 2: 'partly_cloudy', 3: 'overcast',
  45: 'cloudy', 48: 'cloudy', 51: 'light_rain', 53: 'light_rain',
  55: 'rain', 61: 'light_rain', 63: 'rain', 65: 'rain',
  71: 'cloudy', 73: 'cloudy', 75: 'cloudy', 80: 'light_rain',
  81: 'rain', 82: 'rain', 95: 'rain', 96: 'rain'
}

// Star rating input component
const StarRatingInput = ({
  value,
  onChange,
  label,
  max = 5
}: {
  value: number
  onChange: (val: number) => void
  label: string
  max?: number
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <Button
            key={i}
            type="button"
            onClick={() => onChange(value === i + 1 ? 0 : i + 1)}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <Star
              size={20}
              className={i < value ? 'fill-amber-400 text-amber-400' : 'text-text-muted hover:text-amber-300'}
            />
          </Button>
        ))}
        {value > 0 && (
          <Button
            type="button"
            onClick={() => onChange(0)}
            className="ml-2 text-xs text-text-tertiary hover:text-red-500"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}

// Collapsible section component
const CollapsibleSection = ({
  title,
  isOpen,
  onToggle,
  children
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) => {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-surface-secondary/50 hover:bg-surface-secondary transition-colors"
      >
        <span className="font-medium text-text-primary">{title}</span>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </Button>
      {isOpen && <div className="p-4 space-y-4">{children}</div>}
    </div>
  )
}

export default function WildColonyInspectionForm({
  initialData,
  initialImageUrl,
  onSubmit,
  onCancel,
  isEditing = false,
  colonyLatitude,
  colonyLongitude
}: WildColonyInspectionFormProps) {
  const toast = useToast()
  const [formData, setFormData] = useState<WildColonyInspectionFormData>({
    ...getDefaultInspectionFormData(),
    ...initialData
  })
  const [submitting, setSubmitting] = useState(false)
  const [fetchingWeather, setFetchingWeather] = useState(false)

  // Collapsible section states
  const [showObservations, setShowObservations] = useState(false)
  const [showBehavior, setShowBehavior] = useState(false)
  const [showHealth, setShowHealth] = useState(false)
  const [showStatus, setShowStatus] = useState(false)
  const [showWeather, setShowWeather] = useState(true) // Open by default to show auto-fetched weather

  // Auto-fetch weather when form loads (for new inspections only)
  useEffect(() => {
    const fetchWeather = async () => {
      if (isEditing || !colonyLatitude || !colonyLongitude) return
      if (formData.weather_temp !== null) return // Already has weather data

      setFetchingWeather(true)
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${colonyLatitude}&longitude=${colonyLongitude}&current=temperature_2m,weather_code&timezone=Europe/Dublin`
        )
        const data = await response.json()

        if (data.current) {
          const temp = Math.round(data.current.temperature_2m)
          const condition = WEATHER_CODE_MAP[data.current.weather_code] || ''

          setFormData(prev => ({
            ...prev,
            weather_temp: temp,
            weather_condition: condition
          }))
        }
      } catch (error) {
        console.error('Failed to fetch weather:', error)
      } finally {
        setFetchingWeather(false)
      }
    }

    fetchWeather()
  }, [colonyLatitude, colonyLongitude, isEditing, formData.weather_temp])

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
    folder: 'wild-colony-inspections',
    onError: (msg) => toast.error(msg)
  })

  // Set initial image preview if editing
  useState(() => {
    if (initialImageUrl) {
      setPreviewFromUrl(initialImageUrl)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // A photo uploaded during an attempt that does not end in a saved row belongs
    // to nothing and nothing else will ever collect it. onSubmit only throws when
    // the row failed to save, so the catch below is an accurate "not saved".
    const uploadedUrls: string[] = []

    try {
      let imageUrl: string | null = initialImageUrl || null

      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        // A failed upload aborts the save. It used to fall through and keep the
        // previous URL, so the inspection saved with the old photo still on it.
        if (!uploadedUrl) return
        imageUrl = uploadedUrl
        uploadedUrls.push(uploadedUrl)
      } else if (!imagePreview && initialImageUrl) {
        // Image was removed. The old object is queued for deletion by the
        // storage_cleanup_queue trigger.
        imageUrl = null
      }

      await onSubmit(formData, imageUrl)
      resetImage()
    } catch (error) {
      await deleteUploadedImages(uploadedUrls)
      console.error('Error submitting inspection:', error)
      toast.error('Failed to save inspection')
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = <K extends keyof WildColonyInspectionFormData>(
    field: K,
    value: WildColonyInspectionFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date and Time - Always visible */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Inspection Date *
          </label>
          <input
            type="date"
            value={formData.inspection_date}
            onChange={(e) => updateField('inspection_date', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-amber-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Time
          </label>
          <input
            type="time"
            value={formData.inspection_time}
            onChange={(e) => updateField('inspection_time', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Main Observations - Always visible */}
      <div className="grid grid-cols-2 gap-4">
        <StarRatingInput
          label="Activity Level"
          value={formData.activity_level}
          onChange={(val) => updateField('activity_level', val)}
        />
        <StarRatingInput
          label="Forager Traffic"
          value={formData.forager_traffic}
          onChange={(val) => updateField('forager_traffic', val)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Population Estimate
        </label>
        <select
          value={formData.population_estimate}
          onChange={(e) => updateField('population_estimate', e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-amber-500"
        >
          {POPULATION_ESTIMATES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Collapsible: Observations */}
      <CollapsibleSection
        title="Observations"
        isOpen={showObservations}
        onToggle={() => setShowObservations(!showObservations)}
      >
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.pollen_observed}
              onChange={(e) => updateField('pollen_observed', e.target.checked)}
              className="w-4 h-4 rounded border-border text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-text-primary">Pollen observed</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.drones_observed}
              onChange={(e) => updateField('drones_observed', e.target.checked)}
              className="w-4 h-4 rounded border-border text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-text-primary">Drones observed</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.orientation_flights}
              onChange={(e) => updateField('orientation_flights', e.target.checked)}
              className="w-4 h-4 rounded border-border text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-text-primary">Orientation flights</span>
          </label>
        </div>
      </CollapsibleSection>

      {/* Collapsible: Behavior */}
      <CollapsibleSection
        title="Behavior"
        isOpen={showBehavior}
        onToggle={() => setShowBehavior(!showBehavior)}
      >
        <StarRatingInput
          label="Temperament (1=calm, 5=aggressive)"
          value={formData.temperament}
          onChange={(val) => updateField('temperament', val)}
        />
        <label className="flex items-center gap-2 cursor-pointer mt-3">
          <input
            type="checkbox"
            checked={formData.robbing_activity}
            onChange={(e) => updateField('robbing_activity', e.target.checked)}
            className="w-4 h-4 rounded border-border text-amber-600 focus:ring-amber-500"
          />
          <span className="text-sm text-text-primary">Robbing activity observed</span>
        </label>
      </CollapsibleSection>

      {/* Collapsible: Health Signs */}
      <CollapsibleSection
        title="Health Signs"
        isOpen={showHealth}
        onToggle={() => setShowHealth(!showHealth)}
      >
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.dead_bees_observed}
            onChange={(e) => updateField('dead_bees_observed', e.target.checked)}
            className="w-4 h-4 rounded border-border text-red-600 focus:ring-red-500"
          />
          <span className="text-sm text-text-primary">Dead bees observed</span>
        </label>
        {formData.dead_bees_observed && (
          <div className="ml-6">
            <label className="block text-sm text-text-secondary mb-1">Approximate count</label>
            <input
              type="number"
              value={formData.dead_bees_count || ''}
              onChange={(e) => updateField('dead_bees_count', e.target.value ? parseInt(e.target.value) : null)}
              className="w-32 px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-red-500"
              min="0"
            />
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer mt-3">
          <input
            type="checkbox"
            checked={formData.deformed_wings_observed}
            onChange={(e) => updateField('deformed_wings_observed', e.target.checked)}
            className="w-4 h-4 rounded border-border text-red-600 focus:ring-red-500"
          />
          <span className="text-sm text-text-primary">Deformed wing virus signs</span>
        </label>
      </CollapsibleSection>

      {/* Collapsible: Status */}
      <CollapsibleSection
        title="Colony Status"
        isOpen={showStatus}
        onToggle={() => setShowStatus(!showStatus)}
      >
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Status
          </label>
          <select
            value={formData.colony_status}
            onChange={(e) => updateField('colony_status', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-amber-500"
          >
            {COLONY_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer mt-3">
          <input
            type="checkbox"
            checked={formData.swarm_activity_observed}
            onChange={(e) => updateField('swarm_activity_observed', e.target.checked)}
            className="w-4 h-4 rounded border-border text-pink-600 focus:ring-pink-500"
          />
          <span className="text-sm text-text-primary">Swarm activity observed</span>
        </label>
      </CollapsibleSection>

      {/* Collapsible: Weather */}
      <CollapsibleSection
        title={fetchingWeather ? "Weather Conditions (loading...)" : "Weather Conditions"}
        isOpen={showWeather}
        onToggle={() => setShowWeather(!showWeather)}
      >
        {fetchingWeather ? (
          <div className="flex items-center gap-2 text-text-secondary">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Fetching current weather from colony location...</span>
          </div>
        ) : (
          <>
            {!isEditing && formData.weather_temp !== null && (
              <div className="flex items-center gap-2 mb-3 text-sm text-green-600 dark:text-green-400">
                <Cloud size={16} />
                <span>Weather auto-populated from colony coordinates</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  value={formData.weather_temp || ''}
                  onChange={(e) => updateField('weather_temp', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Conditions
                </label>
                <select
                  value={formData.weather_condition}
                  onChange={(e) => updateField('weather_condition', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground focus:ring-2 focus:ring-amber-500"
                >
                  {WEATHER_CONDITIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* Notes - Always visible */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
          placeholder="Additional observations..."
          className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface-elevated text-foreground placeholder-text-tertiary focus:ring-2 focus:ring-amber-500"
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
                alt="Preview"
                width={120}
                height={120}
                className="w-30 h-30 object-cover rounded-lg border border-border"
              />
              <Button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X size={14} />
              </Button>
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

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={submitting || uploading}
          className="px-6 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 font-medium min-h-[44px] disabled:opacity-50"
        >
          {submitting || uploading ? 'Saving...' : isEditing ? 'Update' : 'Save'} Inspection
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-surface-secondary text-text-primary rounded-lg hover:bg-surface-elevated font-medium min-h-[44px]"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

