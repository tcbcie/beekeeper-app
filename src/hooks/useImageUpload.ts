'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { uploadImageFile } from '@/lib/upload-image'

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
    mountedRef.current = true
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

  // Validation and the storage call itself live in @/lib/upload-image so that
  // non-hook callers (the inspection form uploads several photos in a loop) run
  // exactly the same checks. This wrapper only adds the React-lifecycle concerns:
  // the uploading flag, and not reporting an error after unmount.
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      return await uploadImageFile(file, {
        bucket,
        folder,
        onError: (message) => {
          if (mountedRef.current) onError?.(message)
        }
      })
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
