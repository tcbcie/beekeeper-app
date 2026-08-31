'use client'

import { useState, useEffect, useCallback } from 'react'
import { Camera, X } from 'lucide-react'
import Image from 'next/image'
import type { VarroaCheck, Hive, Apiary } from '@/types/records'
import { useImageUpload } from '@/hooks/useImageUpload'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'

interface VarroaCheckFormProps {
  check: VarroaCheck | null
  hives: Hive[]
  apiaries: Apiary[]
  selectedApiaryId?: string
  selectedHiveId?: string
  checkMethodOptions: string[]
  existingChecks: VarroaCheck[]
  userHasActiveSubscription: boolean
  onSubmit: (check: VarroaCheck, imageFile: File | null) => Promise<void>
  onCancel: () => void
  onImageClick: (url: string) => void
}

export default function VarroaCheckForm({
  check,
  hives,
  apiaries,
  selectedApiaryId = '',
  selectedHiveId = '',
  checkMethodOptions,
  existingChecks,
  userHasActiveSubscription,
  onSubmit,
  onCancel,
  onImageClick
}: VarroaCheckFormProps) {
  const [formData, setFormData] = useState<VarroaCheck>(check || {
    id: '',
    hive_id: '',
    user_id: '',
    check_date: new Date().toISOString().slice(0, 16),
    method: '',
    mites_count: null,
    sample_size: null,
    infestation_rate: null,
    action_threshold_reached: false,
    notes: '',
    image_url: null
  })

  const [formApiaryId, setFormApiaryId] = useState<string>('')
  const [otherCheckMethod, setOtherCheckMethod] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isEditing = Boolean(check?.id)

  const {
    imageFile,
    imagePreview,
    handleImageChange,
    handleRemoveImage,
    setPreviewFromUrl,
    reset: resetImage
  } = useImageUpload({
    bucket: 'inspection-images',
    folder: 'varroa-checks'
  })

  // Update form data when check prop changes
  useEffect(() => {
    if (check) {
      // Ensure date format is compatible with datetime-local input (YYYY-MM-DDTHH:mm)
      const formattedCheck = {
        ...check,
        check_date: check.check_date.slice(0, 16)
      }
      setFormData(formattedCheck)
      
      // Find apiary for selected hive
      const hive = hives.find(h => h.id === check.hive_id)
      setFormApiaryId(hive?.apiary_id ?? selectedApiaryId)
      // Check if method is custom
      if (check.method && !checkMethodOptions.includes(check.method)) {
        setOtherCheckMethod(check.method)
      } else {
        setOtherCheckMethod('')
      }
      // Set image preview if exists
      if (check.image_url) {
        setPreviewFromUrl(check.image_url)
      } else {
        resetImage()
      }
    }
  }, [check, checkMethodOptions, hives, resetImage, selectedApiaryId, setPreviewFromUrl])

  useEffect(() => {
    if (isEditing) {
      return
    }

    if (selectedHiveId) {
      const selectedHive = hives.find(hive => hive.id === selectedHiveId)

      if (!selectedHive) {
        return
      }

      const nextApiaryId = selectedHive.apiary_id ?? selectedApiaryId
      setFormApiaryId(prev => prev !== nextApiaryId ? nextApiaryId : prev)
      setFormData(prev => prev.hive_id !== selectedHiveId ? { ...prev, hive_id: selectedHiveId } : prev)
      return
    }

    if (!selectedApiaryId) {
      return
    }

    setFormApiaryId(prev => prev !== selectedApiaryId ? selectedApiaryId : prev)
    setFormData(prev => {
      if (!prev.hive_id) {
        return prev
      }

      const hiveApiaryId = hives.find(hive => hive.id === prev.hive_id)?.apiary_id ?? ''
      return hiveApiaryId && hiveApiaryId !== selectedApiaryId
        ? { ...prev, hive_id: '' }
        : prev
    })
  }, [hives, isEditing, selectedApiaryId, selectedHiveId])

  const isNaturalDrop = formData.method === 'Natural Mite Drop' || formData.method === 'Screening Board'

  // Calculate infestation rate and action threshold
  const calculateRateAndThreshold = useCallback((mitesCount: number | null, sampleSize: number | null, method: string, checkDate: string) => {
    let infestationRate: number | null = null
    let actionThreshold = false

    if (mitesCount !== null && sampleSize !== null && sampleSize > 0) {
      if (method === 'Natural Mite Drop' || method === 'Screening Board') {
        // Daily Mite Drop = Total Mites / Number of Days
        infestationRate = parseFloat((mitesCount / sampleSize).toFixed(2))
        // Auto-check action threshold if daily mite drop >= 5
        if (infestationRate >= 5) {
          actionThreshold = true
        }
      } else {
        // Standard Infestation Rate = (Mites / Sample Size) * 100
        infestationRate = parseFloat(((mitesCount / sampleSize) * 100).toFixed(2))

        // Determine season based on check date
        const month = new Date(checkDate).getMonth() + 1
        const isSpring = month >= 3 && month <= 5
        const isMidLate = month >= 6 && month <= 10

        // Apply treatment thresholds based on season
        if (isSpring && infestationRate >= 1) {
          actionThreshold = true
        } else if (isMidLate && infestationRate >= 3) {
          actionThreshold = true
        }
      }
    }

    return { infestationRate, actionThreshold }
  }, [])

  // Auto-populate Days from last check with same method for the selected hive (new checks only)
  useEffect(() => {
    if (check?.id || !formData.hive_id || !isNaturalDrop) return

    const lastCheck = existingChecks
      .filter(c => c.hive_id === formData.hive_id && c.method === formData.method)
      .sort((a, b) => new Date(b.check_date).getTime() - new Date(a.check_date).getTime())[0]

    if (!lastCheck) return

    const currentDate = new Date(formData.check_date)
    const lastDate = new Date(lastCheck.check_date)
    const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays > 0) {
      setFormData(prev => {
        const { infestationRate, actionThreshold } = calculateRateAndThreshold(
          prev.mites_count, diffDays, prev.method, prev.check_date
        )
        return {
          ...prev,
          sample_size: diffDays,
          infestation_rate: infestationRate,
          action_threshold_reached: actionThreshold
        }
      })
    }
  }, [check?.id, formData.hive_id, formData.method, formData.check_date, isNaturalDrop, existingChecks, calculateRateAndThreshold])

  const handleMitesChange = (value: string) => {
    const mitesCount = value ? parseInt(value) : null
    const { infestationRate, actionThreshold } = calculateRateAndThreshold(
      mitesCount,
      formData.sample_size,
      formData.method,
      formData.check_date
    )
    setFormData(prev => ({
      ...prev,
      mites_count: mitesCount,
      infestation_rate: infestationRate,
      action_threshold_reached: actionThreshold
    }))
  }

  const handleSampleSizeChange = (value: string) => {
    const sampleSize = value ? parseInt(value) : null
    const { infestationRate, actionThreshold } = calculateRateAndThreshold(
      formData.mites_count,
      sampleSize,
      formData.method,
      formData.check_date
    )
    setFormData(prev => ({
      ...prev,
      sample_size: sampleSize,
      infestation_rate: infestationRate,
      action_threshold_reached: actionThreshold
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(formData, imageFile)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    resetImage()
    onCancel()
  }

  const handleRemoveCurrentImage = () => {
    handleRemoveImage()
    setFormData(prev => ({ ...prev, image_url: null }))
  }

  const filteredHives = hives
    .filter(h => !h.archived_at)
    .filter(h => !formApiaryId || h.apiary_id === formApiaryId)

  // Get season-based interpretation guidance
  const getInfestationGuidance = () => {
    if (formData.infestation_rate === null || isNaturalDrop) return null

    const rate = formData.infestation_rate
    const month = new Date(formData.check_date).getMonth() + 1
    const isSpring = month >= 3 && month <= 5
    const isMidLate = month >= 6 && month <= 10

    if (rate < 1) {
      return <span className="text-green-600">✓ Usually safe, but monitor.</span>
    } else if (isSpring && rate >= 1) {
      return <span className="text-orange-600 font-semibold">⚠ Spring: Treat (≥1%)</span>
    } else if (isMidLate && rate >= 3) {
      return <span className="text-red-600 font-semibold">⚠ Mid/Late Season: Treat immediately (≥3%)</span>
    } else if (isMidLate && rate >= 1) {
      return <span className="text-yellow-600">⚠ Monitor closely - approaching treatment threshold</span>
    } else if (rate >= 1) {
      return <span className="text-yellow-600">⚠ Monitor closely</span>
    }
    return null
  }

  return (
    <div className="bg-surface dark:bg-surface rounded-lg shadow border border-border p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="text-xl font-semibold">
          {check?.id ? 'Edit Varroa Check' : 'Record New Varroa Check'}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            type="submit"
            form="check-form"
            disabled={submitting}
            tone="amber"
            className="px-6 py-3 sm:py-2 min-h-[48px] touch-manipulation font-medium disabled:opacity-50"
          >
            {submitting ? 'Saving...' : (check?.id ? 'Update' : 'Save')} Check
          </Button>
          <Button
            type="button"
            onClick={handleCancel}
            tone="neutral"
            className="px-6 py-3 sm:py-2 min-h-[48px] touch-manipulation font-medium"
          >
            Cancel
          </Button>
        </div>
      </div>

      <form id="check-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Apiary</label>
          <select
            value={formApiaryId}
            onChange={(e) => {
              setFormApiaryId(e.target.value)
              setFormData(prev => ({ ...prev, hive_id: '' }))
            }}
            className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
          >
            <option value="">All Apiaries</option>
            {apiaries.map((apiary) => (
              <option key={apiary.id} value={apiary.id}>
                {apiary.name}{apiary.is_shared ? ' (Shared)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Hive *</label>
          <select
            value={formData.hive_id}
            onChange={(e) => {
              const hiveId = e.target.value
              setFormData(prev => ({ ...prev, hive_id: hiveId }))
              setFormApiaryId(prev => hiveId ? (hives.find(h => h.id === hiveId)?.apiary_id ?? prev) : prev)
            }}
            className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            required
          >
            <option value="">Select hive</option>
            {filteredHives.map((h) => (
              <option key={h.id} value={h.id}>{h.hive_number}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Check Date & Time *</label>
          <input
            type="datetime-local"
            value={formData.check_date}
            onChange={(e) => setFormData(prev => ({ ...prev, check_date: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Method *</label>
          <select
            value={checkMethodOptions.includes(formData.method) ? formData.method : 'Other'}
            onChange={(e) => {
              if (e.target.value === 'Other') {
                setOtherCheckMethod('')
                setFormData(prev => ({ ...prev, method: '' }))
              } else {
                setOtherCheckMethod('')
                setFormData(prev => ({ ...prev, method: e.target.value }))
              }
            }}
            className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            required={!otherCheckMethod}
          >
            <option value="">Select method</option>
            {checkMethodOptions.map((method) => (
              <option key={method} value={method}>{method}</option>
            ))}
            <option value="Other">Other (specify below)</option>
          </select>
          {(!checkMethodOptions.includes(formData.method) || otherCheckMethod) && (
            <input
              type="text"
              value={otherCheckMethod || formData.method}
              onChange={(e) => {
                setOtherCheckMethod(e.target.value)
                setFormData(prev => ({ ...prev, method: e.target.value }))
              }}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground mt-2"
              placeholder="Specify other method"
              required
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {isNaturalDrop ? 'Total Mite Drop' : 'Mites Count'}
          </label>
          <input
            type="number"
            value={formData.mites_count ?? ''}
            onChange={(e) => handleMitesChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {isNaturalDrop ? 'Days' : 'Sample Size'}
          </label>
          <input
            type="number"
            value={formData.sample_size ?? ''}
            onChange={(e) => handleSampleSizeChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            {isNaturalDrop ? 'Daily Mite Drop' : 'Infestation Rate (%)'}
            {formData.mites_count !== null && formData.sample_size !== null && formData.sample_size > 0 && (
              <span className="ml-2 text-sm text-green-600 font-normal">(Auto-calculated)</span>
            )}
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.infestation_rate ?? ''}
            onChange={(e) => setFormData(prev => ({ ...prev, infestation_rate: e.target.value ? parseFloat(e.target.value) : null }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            placeholder="Optional (or auto-calculated)"
          />
          {/* Season-based interpretation guidance */}
          {formData.infestation_rate !== null && !isNaturalDrop && (
            <div className="mt-2 text-sm">
              {getInfestationGuidance()}
            </div>
          )}
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.action_threshold_reached}
              onChange={(e) => setFormData(prev => ({ ...prev, action_threshold_reached: e.target.checked }))}
              className="h-5 w-5 rounded border-border text-orange-600"
            />
            <span className="text-sm font-medium text-text-secondary">
              Action Threshold Reached
              {isNaturalDrop ? (
                <span className="ml-2 text-sm text-text-tertiary font-normal">(Auto-checked if ≥ 5 mites/day)</span>
              ) : (
                <span className="ml-2 text-sm text-text-tertiary font-normal">(Auto-checked: Spring ≥1%, Mid/Late ≥3%)</span>
              )}
            </span>
          </label>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            rows={4}
            placeholder="Optional notes about the check"
          />
        </div>

        {userHasActiveSubscription && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-2">Photo (optional)</label>
            <div className="flex items-start gap-3">
              {(imagePreview || formData.image_url) && (
                <div className="relative w-20 h-20 flex-shrink-0 group">
                  <div
                    className="relative w-full h-full cursor-pointer"
                    onDoubleClick={() => onImageClick(imagePreview || formData.image_url || '')}
                    title="Double-click to enlarge"
                  >
                    <Image
                      src={imagePreview || formData.image_url || ''}
                      alt="Preview"
                      fill
                      className="object-cover rounded-lg border-2 border-border shadow-sm"
                      sizes="80px"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-40 rounded-lg pointer-events-none">
                      <Camera size={16} className="text-white" />
                    </div>
                  </div>
                  <IconButton
                    type="button"
                    onClick={handleRemoveCurrentImage}
                    tone="danger"
                    size="sm"
                    className="absolute -top-2 -right-2 z-10 shadow-lg transition-all"
                    title="Remove image"
                  >
                    <X size={16} />
                  </IconButton>
                </div>
              )}
              <label className="flex-1 flex flex-col items-center justify-center min-h-[80px] border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-orange-500 dark:hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all p-4">
                <div className="flex flex-col items-center justify-center">
                  <Camera size={24} className="text-text-tertiary mb-1" />
                  <p className="text-sm text-text-tertiary text-center">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-sm text-text-tertiary">PNG, JPG, WEBP up to 10MB</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
