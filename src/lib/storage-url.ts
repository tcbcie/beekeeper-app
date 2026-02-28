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
