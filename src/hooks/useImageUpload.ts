'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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
  const readerRef = useRef<FileReader | null>(null)
  const mountedRef = useRef(true)

  // Abort any active FileReader on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (readerRef.current && readerRef.current.readyState === FileReader.LOADING) {
        readerRef.current.abort()
      }
    }
  }, [])

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Abort previous reader if still loading
      if (readerRef.current && readerRef.current.readyState === FileReader.LOADING) {
        readerRef.current.abort()
      }
      setImageFile(file)
      const reader = new FileReader()
      readerRef.current = reader
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

      // Validate file type
      if (!fileExt || !MIME_MAP[fileExt]) {
        const allowed = Object.keys(MIME_MAP).join(', ')
        onError?.(`Invalid file type ".${fileExt || ''}". Allowed: ${allowed}`)
        return null
      }

      // Validate magic bytes to ensure file is a genuine image
      const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
      const isValidImage =
        (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) || // JPEG
        (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) || // PNG
        (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) || // GIF
        (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
         header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) // WebP (RIFF...WEBP)
      if (!isValidImage) {
        onError?.('File does not appear to be a valid image. Please select a real image file.')
        return null
      }

      // Validate file size (max 10MB)
      const MAX_SIZE = 10 * 1024 * 1024
      if (file.size === 0 || file.size > MAX_SIZE) {
        onError?.(file.size === 0 ? 'File is empty.' : 'File exceeds the 10MB size limit.')
        return null
      }

      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      // Determine correct MIME type - fallback based on extension if file.type is wrong/empty
      let contentType = file.type
      if (!contentType || contentType === 'application/json') {
        contentType = MIME_MAP[fileExt] || 'image/jpeg'
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
      if (mountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        onError?.(`Failed to upload image: ${errorMessage}`)
      }
      return null
    } finally {
      if (mountedRef.current) setUploading(false)
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
