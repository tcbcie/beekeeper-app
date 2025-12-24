'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface UseImageUploadOptions {
  bucket?: string
  folder: string
  onError?: (message: string) => void
}

interface UseImageUploadReturn {
  imageFile: File | null
  imagePreview: string | null
  uploading: boolean
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleRemoveImage: () => void
  uploadImage: (file: File) => Promise<string | null>
  reset: () => void
  setPreviewFromUrl: (url: string | null) => void
}

const MIME_MAP: Record<string, string> = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp'
}

/**
 * Custom hook for handling image uploads to Supabase Storage.
 * Consolidates duplicated image handling logic.
 */
export function useImageUpload(options: UseImageUploadOptions): UseImageUploadReturn {
  const { bucket = 'inspection-images', folder, onError } = options

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleRemoveImage = useCallback(() => {
    setImageFile(null)
    setImagePreview(null)
  }, [])

  const reset = useCallback(() => {
    setImageFile(null)
    setImagePreview(null)
    setUploading(false)
  }, [])

  const setPreviewFromUrl = useCallback((url: string | null) => {
    setImagePreview(url)
    setImageFile(null)
  }, [])

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      // Determine correct MIME type - fallback based on extension if file.type is wrong/empty
      let contentType = file.type
      if (!contentType || contentType === 'application/json') {
        contentType = MIME_MAP[fileExt || ''] || 'image/jpeg'
      }

      // Create a new File object with the correct MIME type
      const correctedFile = new File([file], file.name, { type: contentType })

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, correctedFile, {
          contentType: contentType,
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Image upload error:', uploadError)
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Failed to upload image:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      onError?.(`Failed to upload image: ${errorMessage}`)
      return null
    } finally {
      setUploading(false)
    }
  }, [bucket, folder, onError])

  return {
    imageFile,
    imagePreview,
    uploading,
    handleImageChange,
    handleRemoveImage,
    uploadImage,
    reset,
    setPreviewFromUrl
  }
}
