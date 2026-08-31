'use client'

import { useState } from 'react'
import { Camera, X, CheckCircle, Upload } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useImageUpload } from '@/hooks/useImageUpload'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'

interface DiagnosisUploaderProps {
  userId: string
}

const DIAGNOSIS_TYPES = [
  { value: 'disease', label: 'Disease' },
  { value: 'varroa_pest', label: 'Varroa/Pest' },
  { value: 'general', label: 'General Hive Issue' },
  { value: 'frame_comb', label: 'Frame/Comb Analysis' }
]

export default function DiagnosisUploader({ userId }: DiagnosisUploaderProps) {
  const [diagnosisType, setDiagnosisType] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    imageFile,
    imagePreview,
    uploading,
    handleImageChange,
    handleRemoveImage,
    uploadImage,
    reset: resetImage
  } = useImageUpload({
    bucket: 'inspection-images',
    folder: 'diagnoses',
    onError: (message) => setError(message)
  })

  const resetForm = () => {
    setDiagnosisType('')
    setDescription('')
    setError(null)
    setSuccess(false)
    resetImage()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!imageFile) {
      setError('Please select an image to upload')
      return
    }

    if (!diagnosisType) {
      setError('Please select a diagnosis type')
      return
    }

    if (!description.trim()) {
      setError('Please provide a description')
      return
    }

    setSubmitting(true)

    try {
      // Upload image to storage
      const imageUrl = await uploadImage(imageFile)
      if (!imageUrl) {
        throw new Error('Failed to upload image')
      }

      // Insert record to database
      const { error: dbError } = await supabase
        .from('diagnosis_images')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          description: description.trim(),
          diagnosis_type: diagnosisType
        })

      if (dbError) {
        throw dbError
      }

      setSuccess(true)
      // Reset form after short delay to show success
      setTimeout(() => {
        resetForm()
      }, 2000)

    } catch (err) {
      console.error('Failed to save diagnosis image:', err)
      setError(err instanceof Error ? err.message : 'Failed to save diagnosis image')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Image Uploaded Successfully</h3>
        <p className="text-text-secondary">Your diagnosis image has been saved.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <Upload size={24} className="text-forest-600 dark:text-forest-400" />
        Diagnosis Image Upload
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Diagnosis Type */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Diagnosis Type *
          </label>
          <select
            value={diagnosisType}
            onChange={(e) => setDiagnosisType(e.target.value)}
            className="w-full px-3 py-2 min-h-[48px] border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            required
          >
            <option value="">Select type</option>
            {DIAGNOSIS_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-surface dark:bg-surface text-foreground"
            rows={3}
            placeholder="Describe what you see and any concerns..."
            required
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Photo *
          </label>
          <div className="flex items-start gap-3">
            {imagePreview && (
              <div className="relative w-20 h-20 flex-shrink-0 group">
                <div className="relative w-full h-full">
                  <Image
                    src={imagePreview}
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
                  onClick={handleRemoveImage}
                  tone="danger"
                  size="sm"
                  className="absolute -top-2 -right-2 rounded-full shadow-lg transition-all z-10"
                  title="Remove image"
                >
                  <X size={16} />
                </IconButton>
              </div>
            )}
            <label className="flex-1 flex flex-col items-center justify-center min-h-[80px] border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-forest-500 dark:hover:border-forest-400 hover:bg-forest-50 dark:hover:bg-forest-900/20 transition-all p-4">
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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={submitting || uploading || !imageFile}
          tone="blue"
          fullWidth
          className="min-h-[48px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting || uploading ? 'Uploading...' : 'Upload for Diagnosis'}
        </Button>
      </form>

      {/* Info Note */}
      <div className="mt-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Upload clear, well-lit photos for better diagnosis. Include multiple angles if needed.
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Your submission is anonymous. We are looking for high-quality images to help train an AI model that will provide automated diagnosis in the future.
        </p>
      </div>
    </div>
  )
}
