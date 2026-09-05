import { supabase } from '@/lib/supabase'
import { storagePathFromPublicUrl } from '@/lib/storage-url'

export interface UploadImageOptions {
  bucket?: string
  folder: string
  onError?: (message: string) => void
}

const MIME_MAP: Record<string, string> = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp'
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/**
 * Check one file is a genuine, in-budget image. Returns a human-readable problem,
 * or null when the file is fine.
 *
 * Exported so callers can validate at the moment the beekeeper *picks* a photo
 * rather than at save. That matters once several photos are attached: validating
 * only at save means the first failure aborts the whole save after earlier photos
 * have already been uploaded, and tells someone their file is wrong long after
 * they chose it.
 */
export async function validateImageFile(file: File): Promise<string | null> {
  const fileExt = file.name.split('.').pop()?.toLowerCase()

  if (!fileExt || !MIME_MAP[fileExt]) {
    const allowed = Object.keys(MIME_MAP).join(', ')
    return `Invalid file type ".${fileExt || ''}". Allowed: ${allowed}`
  }

  // Magic bytes, so a renamed file cannot pose as an image
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const isValidImage =
    (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) || // JPEG
    (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) || // PNG
    (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) || // GIF
    (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
     header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) // WebP (RIFF...WEBP)
  if (!isValidImage) {
    return 'File does not appear to be a valid image. Please select a real image file.'
  }

  if (file.size === 0) return 'File is empty.'
  if (file.size > MAX_IMAGE_BYTES) return 'File exceeds the 10MB size limit.'

  return null
}

/**
 * Remove storage objects this session just uploaded, given their public URLs.
 *
 * Used to undo a partially-completed batch upload: if photo three of four fails,
 * the first two are already in the bucket but no row will reference them, so they
 * would be orphaned the moment the save aborts. Best-effort - a failure to tidy
 * up must never mask the original error.
 *
 * Note this is only for files that never reached a row. Photos that WERE saved
 * and are later replaced or deleted are handled by the storage_cleanup_queue
 * trigger and the nightly sweeper, because those deletions can happen inside the
 * database (a hive delete cascades) where no client code ever sees them.
 */
export async function deleteUploadedImages(publicUrls: string[]): Promise<void> {
  // Group by bucket rather than trusting a caller-supplied one: the bucket is
  // part of the URL, and storagePathFromPublicUrl drops anything that is not a
  // public object URL of this project.
  const byBucket = new Map<string, string[]>()
  for (const url of publicUrls) {
    const ref = storagePathFromPublicUrl(url)
    if (!ref) continue
    const existing = byBucket.get(ref.bucket)
    if (existing) existing.push(ref.path)
    else byBucket.set(ref.bucket, [ref.path])
  }

  for (const [bucket, paths] of byBucket) {
    try {
      const { error } = await supabase.storage.from(bucket).remove(paths)
      if (error) console.error(`Failed to clean up uploads in ${bucket}:`, error)
    } catch (error) {
      console.error('Failed to clean up partially uploaded images:', error)
    }
  }
}

/**
 * Validate one image and upload it to Supabase Storage, returning its public URL.
 *
 * Extracted from useImageUpload so callers that are not a single-file React form —
 * the inspection form uploads several photos in a loop — get exactly the same
 * checks. Before this existed, src/app/dashboard/records/page.tsx carried its own
 * copy that skipped the magic-byte, MIME and size checks entirely, so the app's
 * most-used upload path was its least validated one.
 *
 * Returns null on any rejection, after reporting through onError. Callers decide
 * whether a rejection aborts the whole save.
 */
export async function uploadImageFile(
  file: File,
  { bucket = 'inspection-images', folder, onError }: UploadImageOptions
): Promise<string | null> {
  try {
    const problem = await validateImageFile(file)
    if (problem) {
      onError?.(problem)
      return null
    }

    // validateImageFile has already proved this is a known extension.
    const fileExt = file.name.split('.').pop()?.toLowerCase() ?? ''
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    onError?.(`Failed to upload image: ${errorMessage}`)
    return null
  }
}
