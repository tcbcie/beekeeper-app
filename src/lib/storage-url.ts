const STORAGE_PUBLIC_PATH = '/storage/v1/object/public/'

function getCurrentSupabaseOrigin(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return null
  }

  try {
    return new URL(supabaseUrl).origin
  } catch {
    return null
  }
}

export function normaliseStoragePublicUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return url
  }

  if (!parsedUrl.pathname.includes(STORAGE_PUBLIC_PATH)) {
    return url
  }

  const currentSupabaseOrigin = getCurrentSupabaseOrigin()
  if (!currentSupabaseOrigin || parsedUrl.origin === currentSupabaseOrigin) {
    return url
  }

  return `${currentSupabaseOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
}

export interface StorageObjectRef {
  bucket: string
  path: string
}

/**
 * Resolve a Supabase public URL back to the bucket and object key it points at,
 * so the object can be removed.
 *
 * Returns null - meaning "do not touch this" - rather than guessing, whenever the
 * URL is not a storage public URL belonging to THIS project. That host check is
 * the point of the function: legacy rows carry an older Supabase project
 * hostname (the same reason normaliseStoragePublicUrl exists), and those objects
 * live in a different project's bucket. Deriving a path from one and handing it
 * to remove() would at best silently delete nothing, and at worst delete a
 * same-named object belonging to something else.
 *
 * Splits on the /storage/v1/object/public/ constant rather than on a bucket name,
 * so it works for any bucket and cannot be fooled by a bucket name appearing
 * inside the object key. Query string and fragment are ignored, and each segment
 * is percent-decoded, because remove() wants the raw key.
 */
export function storagePathFromPublicUrl(url: string | null | undefined): StorageObjectRef | null {
  if (!url) return null

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return null
  }

  const markerAt = parsedUrl.pathname.indexOf(STORAGE_PUBLIC_PATH)
  if (markerAt === -1) return null

  const currentSupabaseOrigin = getCurrentSupabaseOrigin()
  if (!currentSupabaseOrigin || parsedUrl.origin !== currentSupabaseOrigin) return null

  const remainder = parsedUrl.pathname.slice(markerAt + STORAGE_PUBLIC_PATH.length)
  const firstSlash = remainder.indexOf('/')
  if (firstSlash <= 0) return null

  try {
    const bucket = decodeURIComponent(remainder.slice(0, firstSlash))
    const path = decodeURIComponent(remainder.slice(firstSlash + 1))
    if (!bucket || !path) return null
    return { bucket, path }
  } catch {
    // Malformed percent-encoding - safer to skip than to delete a guessed key.
    return null
  }
}
