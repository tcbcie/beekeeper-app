import { NextRequest, NextResponse } from 'next/server'

/**
 * Custom verification endpoint for branded auth emails
 *
 * This route forwards verification requests to Supabase's auth endpoint
 * while allowing emails to use hivecraic.com URLs instead of supabase.co
 *
 * Usage in Supabase email templates:
 * https://www.hivecraic.com/auth/verify?token={{ .TokenHash }}&type={{ .Type }}&redirect_to={{ .RedirectTo }}
 */
// Link types our auth emails use.
const ALLOWED_TYPES = new Set(['signup', 'recovery', 'magiclink', 'email_change', 'invite'])
const SITE_ORIGINS = new Set(['https://www.hivecraic.com', 'https://hivecraic.com'])

// Only forward a redirect back to this site; anything else is dropped so Supabase falls back to
// its default Site URL (defence in depth on top of Supabase's own redirect allow-list).
function safeRedirect(raw: string | null, requestOrigin: string): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.origin === requestOrigin || SITE_ORIGINS.has(url.origin) ? url.toString() : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  // Get all verification parameters
  const token = searchParams.get('token')
  const rawType = searchParams.get('type')
  const type = rawType && ALLOWED_TYPES.has(rawType) ? rawType : null
  const redirectTo = safeRedirect(searchParams.get('redirect_to'), origin)

  // Validate required parameters
  if (!token || !type) {
    return NextResponse.redirect(
      new URL('/login?error=invalid_verification_link', request.url)
    )
  }

  // Build the Supabase verification URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL not configured')
    return NextResponse.redirect(
      new URL('/login?error=configuration_error', request.url)
    )
  }

  // Construct verification URL with all parameters
  const verifyUrl = new URL(`${supabaseUrl}/auth/v1/verify`)
  verifyUrl.searchParams.set('token', token)
  verifyUrl.searchParams.set('type', type)

  if (redirectTo) {
    verifyUrl.searchParams.set('redirect_to', redirectTo)
  }

  // Redirect to Supabase verification endpoint
  return NextResponse.redirect(verifyUrl.toString())
}
